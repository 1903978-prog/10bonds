import { emailConfigured } from "./email";
import postgres from "postgres";
import { accountsUrl } from "./pgUrl";
import type { Tier } from "./types";

// Accounts live in schema "app" of the 10BONDS database, written with their own login
// (ACCOUNTS_DATABASE_URL). The bond copy keeps its separate read-only login.
let sql: ReturnType<typeof postgres> | null = null;
let ready: Promise<void> | null = null;

export function accountsConfigured(): boolean {
  return Boolean(process.env.ACCOUNTS_DATABASE_URL);
}

function db() {
  const url = process.env.ACCOUNTS_DATABASE_URL;
  if (!url) throw new Error("Accounts are not connected yet.");
  sql ??= postgres(accountsUrl(url, process.env.DATABASE_URL), { ssl: url.includes("localhost") ? false : "require", max: 3, idle_timeout: 20, prepare: false, onnotice: () => {} });
  ready ??= setup(sql).catch((e) => {
    ready = null;
    throw e;
  });
  return { sql, ready };
}

// Tables are created and extended additively; nothing is ever dropped here.
async function setup(sql: ReturnType<typeof postgres>) {
  await sql`
    create table if not exists app.users (
      id bigserial primary key,
      email text not null unique,
      password_hash text not null,
      plan text not null default 'free' check (plan in ('free','plus','premium')),
      created_at timestamptz not null default now(),
      last_login_at timestamptz
    )`;
  await sql`alter table app.users add column if not exists username text`;
  await sql`alter table app.users add column if not exists terms_version text`;
  await sql`alter table app.users add column if not exists terms_accepted_at timestamptz`;
  await sql`alter table app.users add column if not exists email_verified_at timestamptz`;
  await sql`alter table app.users add column if not exists premium_until timestamptz`;
  // One-month Premium trial codes made by the admin. A code is used once.
  await sql`
    create table if not exists app.trial_codes (
      code text primary key,
      days integer not null default 30,
      note text,
      created_at timestamptz not null default now(),
      created_by bigint references app.users(id) on delete set null,
      redeemed_by bigint references app.users(id) on delete set null,
      redeemed_at timestamptz
    )`;
  await sql`create unique index if not exists users_username_key on app.users (lower(username))`;
  // Usage events: only written for visitors who accepted usage stats. No IP address is stored.
  await sql`
    create table if not exists app.events (
      id bigserial primary key,
      at timestamptz not null default now(),
      visitor_id text not null,
      user_id bigint references app.users(id) on delete set null,
      kind text not null,
      path text,
      detail jsonb
    )`;
  await sql`create index if not exists events_at_idx on app.events (at)`;
  await sql`create index if not exists events_kind_at_idx on app.events (kind, at)`;
  // Keep 13 months of usage history.
  await sql`delete from app.events where at < now() - interval '13 months'`;
}

type Plan = Exclude<Tier, "visitor">;
/** `plan` is what the user gets now: Premium while a trial runs, otherwise the plan they hold. */
export type User = {
  id: number;
  email: string;
  username: string | null;
  plan: Plan;
  storedPlan: Plan;
  premiumUntil: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
};

/** Days of free Premium every new account gets. */
export const SIGNUP_TRIAL_DAYS = 7;

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "1903978@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type UserRow = { id: string; email: string; username: string | null; plan: Plan; premium_until: Date | null; email_verified_at: Date | null };
const USER_COLS = "id, email, username, plan, premium_until, email_verified_at";

export function toUser(r: UserRow, now = Date.now()): User {
  const trial = r.premium_until !== null && new Date(r.premium_until).getTime() > now;
  const emailVerified = r.email_verified_at !== null;
  return {
    id: Number(r.id),
    email: r.email,
    username: r.username,
    plan: trial ? "premium" : r.plan,
    storedPlan: r.plan,
    premiumUntil: r.premium_until ? new Date(r.premium_until).toISOString() : null,
    emailVerified,
    // Admin needs the address to be confirmed once confirmation e-mails are switched on. Until then the one
    // account holding the admin address is admin (an address can be used by one account only).
    isAdmin: ADMIN_EMAILS.includes(r.email) && (emailVerified || !emailConfigured()),
  };
}

/** 3-24 characters: letters, digits, dot, dash, underscore. */
export function normaliseUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim();
  return /^[A-Za-z0-9._-]{3,24}$/.test(u) ? u : null;
}

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export async function createUser(email: string, username: string, passwordHash: string, termsVersion: string): Promise<User | "email-taken" | "username-taken"> {
  const { sql, ready } = db();
  await ready;
  const taken = await sql<{ email: string }[]>`
    select email from app.users where email = ${email} or lower(username) = lower(${username})`;
  if (taken.some((t) => t.email === email)) return "email-taken";
  if (taken.length) return "username-taken";
  try {
    const rows = await sql<UserRow[]>`
      insert into app.users (email, username, password_hash, terms_version, terms_accepted_at, premium_until)
      values (${email}, ${username}, ${passwordHash}, ${termsVersion}, now(), now() + make_interval(days => ${SIGNUP_TRIAL_DAYS}))
      returning ${sql.unsafe(USER_COLS)}`;
    return toUser(rows[0]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return String((e as Error).message).includes("username") ? "username-taken" : "email-taken";
    throw e;
  }
}

/** Sign in with either the email or the username. */
export async function findUserByLogin(login: string) {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<(UserRow & { password_hash: string })[]>`
    select ${sql.unsafe(USER_COLS)}, password_hash from app.users
    where email = ${login.toLowerCase()} or lower(username) = lower(${login}) limit 1`;
  const r = rows[0];
  return r ? { ...toUser(r), passwordHash: r.password_hash } : null;
}

export async function findUserById(id: number): Promise<User | null> {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<UserRow[]>`select ${sql.unsafe(USER_COLS)} from app.users where id = ${id}`;
  return rows[0] ? toUser(rows[0]) : null;
}

export async function touchLogin(id: number) {
  const { sql } = db();
  await sql`update app.users set last_login_at = now() where id = ${id}`;
}

/** Confirm the e-mail address, only if it is still the address the link was made for. */
export async function markEmailVerified(id: number, email: string): Promise<boolean> {
  const { sql, ready } = db();
  await ready;
  const rows = await sql`
    update app.users set email_verified_at = coalesce(email_verified_at, now())
    where id = ${id} and email = ${email} returning id`;
  return rows.length > 0;
}

export type TrialCode = { code: string; days: number; note: string | null; createdAt: string; redeemedBy: string | null; redeemedAt: string | null };

export async function createTrialCodes(createdBy: number, count: number, days: number, note: string | null, make: () => string): Promise<string[]> {
  const { sql, ready } = db();
  await ready;
  const codes = Array.from({ length: count }, make);
  await sql`insert into app.trial_codes ${sql(codes.map((code) => ({ code, days, note, created_by: createdBy })))}`;
  return codes;
}

export async function listTrialCodes(limit = 200): Promise<TrialCode[]> {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<{ code: string; days: number; note: string | null; created_at: Date; redeemed_at: Date | null; email: string | null }[]>`
    select c.code, c.days, c.note, c.created_at, c.redeemed_at, u.email
    from app.trial_codes c left join app.users u on u.id = c.redeemed_by
    order by c.created_at desc limit ${limit}`;
  return rows.map((r) => ({
    code: r.code,
    days: r.days,
    note: r.note,
    createdAt: new Date(r.created_at).toISOString(),
    redeemedBy: r.email,
    redeemedAt: r.redeemed_at ? new Date(r.redeemed_at).toISOString() : null,
  }));
}

/** Use a code once: Premium is extended by its days from today, or from the end of a running trial. */
export async function redeemTrialCode(userId: number, code: string): Promise<{ premiumUntil: string } | "unknown" | "used"> {
  const { sql, ready } = db();
  await ready;
  return sql.begin(async (tx) => {
    const c = await tx<{ days: number; redeemed_by: string | null }[]>`
      select days, redeemed_by from app.trial_codes where code = ${code} for update`;
    if (!c[0]) return "unknown" as const;
    if (c[0].redeemed_by !== null) return "used" as const;
    await tx`update app.trial_codes set redeemed_by = ${userId}, redeemed_at = now() where code = ${code}`;
    const u = await tx<{ premium_until: Date }[]>`
      update app.users
      set premium_until = greatest(coalesce(premium_until, now()), now()) + make_interval(days => ${c[0].days})
      where id = ${userId} returning premium_until`;
    return { premiumUntil: new Date(u[0].premium_until).toISOString() };
  });
}

/** Counts for the admin page. */
export async function adminStats() {
  const { sql, ready } = db();
  await ready;
  const [u] = await sql<{ users: string; verified: string; trial: string; week: string }[]>`
    select count(*) users, count(email_verified_at) verified,
           count(*) filter (where premium_until > now()) trial,
           count(*) filter (where created_at > now() - interval '7 days') week
    from app.users`;
  const events = await sql<{ kind: string; n: string }[]>`
    select kind, count(*) n from app.events where at > now() - interval '30 days' group by kind order by n desc`;
  const pages = await sql<{ path: string; n: string }[]>`
    select path, count(*) n from app.events where kind = 'page_view' and at > now() - interval '30 days' and path is not null
    group by path order by n desc limit 10`;
  return {
    users: Number(u.users),
    verified: Number(u.verified),
    onTrial: Number(u.trial),
    newThisWeek: Number(u.week),
    events30d: events.map((e) => ({ kind: e.kind, n: Number(e.n) })),
    topPages30d: pages.map((p) => ({ path: p.path, n: Number(p.n) })),
  };
}

export async function recordEvents(rows: { visitorId: string; userId: number | null; kind: string; path: string | null; detail: unknown }[]) {
  if (rows.length === 0) return;
  const { sql, ready } = db();
  await ready;
  await sql`insert into app.events ${sql(
    rows.map((r) => ({ visitor_id: r.visitorId, user_id: r.userId, kind: r.kind, path: r.path, detail: r.detail === null ? null : sql.json(r.detail as never) })),
  )}`;
}

/** Where the accounts database stands, as stage + Postgres error code only (no message, no secret). */
export async function accountsHealth(): Promise<{ configured: boolean; stage: "ok" | "url" | "connect" | "tables"; code: string | null; shape?: Record<string, boolean | number> }> {
  if (!accountsConfigured()) return { configured: false, stage: "connect", code: null };
  let sql: ReturnType<typeof postgres>;
  try {
    sql = db().sql;
  } catch (e) {
    return { configured: true, stage: "url", code: errCode(e), shape: urlShape(process.env.ACCOUNTS_DATABASE_URL ?? "") };
  }
  try {
    await sql`select 1`;
  } catch (e) {
    return { configured: true, stage: "connect", code: errCode(e) };
  }
  try {
    await db().ready;
    await sql`select count(*) from app.users`;
    return { configured: true, stage: "ok", code: null };
  } catch (e) {
    return { configured: true, stage: "tables", code: errCode(e) };
  }
}

function errCode(e: unknown): string {
  const c = (e as { code?: unknown }).code;
  return typeof c === "string" ? c.slice(0, 40) : "unknown";
}

/** Features of a login link that could not be read, never its content (no host, user or password). */
function urlShape(raw: string): Record<string, boolean | number> {
  return {
    length: raw.length,
    lines: raw.split(/\r?\n/).length,
    postgresScheme: /postgres(ql)?:\/\//.test(raw),
    psqlWord: /\bpsql\b/.test(raw),
    pgHostWord: /PGHOST|PGUSER|PGPASSWORD/.test(raw),
    atSign: raw.includes("@"),
    neonHost: raw.includes("neon.tech"),
    spaces: /\s/.test(raw.trim()),
    quotes: /['"]/.test(raw),
    angleOrBrackets: /[<>\[\]{}]/.test(raw),
  };
}

/** The accounts connection, tables ready, for modules that keep their own tables in schema "app". */
export async function accountsSql() {
  const { sql, ready } = db();
  await ready;
  return sql;
}
