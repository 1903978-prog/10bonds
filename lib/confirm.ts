import { createHash } from "node:crypto";
import { confirmationEmail, sendEmail, siteUrl } from "./email";
import { readToken, signToken } from "./session";

const TTL = 3 * 86400_000;
// The token carries the user id and a short hash of the address, so a link stops working if the address changes.
const tag = (email: string) => createHash("sha256").update(email).digest("hex").slice(0, 16);

export function confirmLink(userId: number, email: string): string | null {
  const t = signToken("confirm", `${userId}-${tag(email)}`, TTL);
  return t ? `${siteUrl()}/api/auth/confirm?t=${encodeURIComponent(t)}` : null;
}

export function readConfirm(token: string | null): { userId: number; tag: string } | null {
  const p = readToken("confirm", token);
  const m = p?.match(/^(\d+)-([0-9a-f]{16})$/);
  return m ? { userId: Number(m[1]), tag: m[2] } : null;
}

export const emailTag = tag;

export async function sendConfirmation(userId: number, email: string, username: string) {
  const link = confirmLink(userId, email);
  if (!link) return "failed" as const;
  const m = confirmationEmail(username, link);
  return sendEmail(email, m.subject, m.html, m.text);
}
