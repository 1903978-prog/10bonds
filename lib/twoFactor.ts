import type { NextResponse } from "next/server";
import { accountsSql, type User } from "./accounts";
import { readToken, signToken } from "./session";
import { hashBackup, matchCode, newBackupCodes, newSecret, otpauthUrl } from "./totp";

// Two-factor login for the admin account: password, then a 6-digit code from an authenticator app (or a backup code).
// A browser that passed it gets a signed cookie; without it the admin pages stay closed.

export const MFA_COOKIE = "tb_mfa";
export const MFA_DAYS = 30;
const TICKET_MS = 5 * 60_000;

export const mfaCookieValue = (userId: number) => signToken("mfa", String(userId), MFA_DAYS * 86400_000);
export const mfaCookieOk = (userId: number, value: string | undefined) => readToken("mfa", value) === String(userId);

/** After the password: a short-lived ticket that only the code step accepts. */
export const loginTicket = (userId: number) => signToken("2fa-login", String(userId), TICKET_MS);
export function readTicket(ticket: unknown): number | null {
  const v = typeof ticket === "string" ? readToken("2fa-login", ticket) : null;
  return v && /^\d+$/.test(v) ? Number(v) : null;
}

export function adminStateOf(user: User, mfaCookie: string | undefined): User["adminState"] {
  if (!user.isAdmin) return undefined;
  if (!user.twoFactorOn) return "setup";
  return mfaCookieOk(user.id, mfaCookie) ? "ok" : "needed";
}

/** Starts (or restarts) setup: a new secret kept as pending until a first code confirms it. */
export async function startSetup(user: User): Promise<{ secret: string; url: string }> {
  const secret = newSecret();
  const sql = await accountsSql();
  await sql`update app.users set totp_pending_secret = ${secret} where id = ${user.id} and totp_enabled_at is null`;
  return { secret, url: otpauthUrl(secret, user.email) };
}

/** Confirms setup with a first code. Returns the backup codes (shown once), or null when the code is wrong. */
export async function confirmSetup(userId: number, code: string, now = Date.now()): Promise<string[] | null> {
  const sql = await accountsSql();
  const [row] = await sql<{ totp_pending_secret: string | null }[]>`
    select totp_pending_secret from app.users where id = ${userId} and totp_enabled_at is null`;
  const secret = row?.totp_pending_secret;
  if (!secret) return null;
  const step = matchCode(secret, code, now);
  if (step === null) return null;
  const { codes, hashes } = newBackupCodes();
  const r = await sql`update app.users set totp_secret = ${secret}, totp_pending_secret = null, totp_backup = ${JSON.stringify(hashes)},
    totp_last_step = ${step}, totp_enabled_at = now() where id = ${userId} and totp_enabled_at is null and totp_pending_secret = ${secret}`;
  return r.count === 1 ? codes : null;
}

/** Checks a login code or a backup code (a used backup code is removed; a used app code cannot be replayed). */
export async function verifySecondFactor(userId: number, input: string, now = Date.now()): Promise<boolean> {
  const sql = await accountsSql();
  const [row] = await sql<{ totp_secret: string | null; totp_backup: string | null; totp_last_step: string | null }[]>`
    select totp_secret, totp_backup, totp_last_step from app.users where id = ${userId} and totp_enabled_at is not null`;
  if (!row?.totp_secret) return false;
  const code = input.trim();
  if (/^\d{3}\s?\d{3}$/.test(code)) {
    const last = row.totp_last_step === null ? -1 : Number(row.totp_last_step);
    const step = matchCode(row.totp_secret, code, now, last);
    if (step === null) return false;
    const r = await sql`update app.users set totp_last_step = ${step} where id = ${userId} and coalesce(totp_last_step, -1) < ${step}`;
    return r.count === 1;
  }
  const hashes: string[] = JSON.parse(row.totp_backup ?? "[]");
  const h = hashBackup(code);
  if (!hashes.includes(h)) return false;
  const rest = hashes.filter((x) => x !== h);
  const r = await sql`update app.users set totp_backup = ${JSON.stringify(rest)} where id = ${userId} and totp_backup = ${row.totp_backup}`;
  return r.count === 1;
}

export async function backupCodesLeft(userId: number): Promise<number> {
  const sql = await accountsSql();
  const [row] = await sql<{ totp_backup: string | null }[]>`select totp_backup from app.users where id = ${userId}`;
  return (JSON.parse(row?.totp_backup ?? "[]") as string[]).length;
}

export function setMfaCookie(res: NextResponse, userId: number) {
  const v = mfaCookieValue(userId);
  if (!v) return;
  res.cookies.set(MFA_COOKIE, v, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MFA_DAYS * 86400 });
}
