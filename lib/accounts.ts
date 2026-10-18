import postgres from "postgres";
import { cleanPgUrl } from "./pgUrl";
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
  sql ??= postgres(cleanPgUrl(url), { ssl: url.includes("localhost") ? false : "require", max: 3, idle_timeout: 20, prepare: false, onnotice: () => {} });
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

export type User = { id: number; email: string; username: string | null; plan: Exclude<Tier, "visitor"> };

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
    const rows = await sql<{ id: string; email: string; username: string; plan: User["plan"] }[]>`
      insert into app.users (email, username, password_hash, terms_version, terms_accepted_at)
      values (${email}, ${username}, ${passwordHash}, ${termsVersion}, now())
      returning id, email, username, plan`;
    return { id: Number(rows[0].id), email: rows[0].email, username: rows[0].username, plan: rows[0].plan };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return String((e as Error).message).includes("username") ? "username-taken" : "email-taken";
    throw e;
  }
}

/** Sign in with either the email or the username. */
export async function findUserByLogin(login: string) {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<{ id: string; email: string; username: string | null; plan: User["plan"]; password_hash: string }[]>`
    select id, email, username, plan, password_hash from app.users
    where email = ${login.toLowerCase()} or lower(username) = lower(${login}) limit 1`;
  const r = rows[0];
  return r ? { id: Number(r.id), email: r.email, username: r.username, plan: r.plan, passwordHash: r.password_hash } : null;
}

export async function findUserById(id: number): Promise<User | null> {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<{ id: string; email: string; username: string | null; plan: User["plan"] }[]>`
    select id, email, username, plan from app.users where id = ${id}`;
  return rows[0] ? { id: Number(rows[0].id), email: rows[0].email, username: rows[0].username, plan: rows[0].plan } : null;
}

export async function touchLogin(id: number) {
  const { sql } = db();
  await sql`update app.users set last_login_at = now() where id = ${id}`;
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
