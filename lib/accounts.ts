import postgres from "postgres";
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
  sql ??= postgres(url, { ssl: url.includes("localhost") ? false : "require", max: 3, idle_timeout: 20, prepare: false });
  ready ??= sql`
    create table if not exists app.users (
      id bigserial primary key,
      email text not null unique,
      password_hash text not null,
      plan text not null default 'free' check (plan in ('free','plus','premium')),
      created_at timestamptz not null default now(),
      last_login_at timestamptz
    )`.then(() => undefined).catch((e) => { ready = null; throw e; });
  return { sql, ready };
}

export type User = { id: number; email: string; plan: Exclude<Tier, "visitor"> };

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export async function createUser(email: string, passwordHash: string): Promise<User | "exists"> {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<{ id: string; email: string; plan: User["plan"] }[]>`
    insert into app.users (email, password_hash) values (${email}, ${passwordHash})
    on conflict (email) do nothing
    returning id, email, plan`;
  if (rows.length === 0) return "exists";
  return { id: Number(rows[0].id), email: rows[0].email, plan: rows[0].plan };
}

export async function findUserByEmail(email: string) {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<{ id: string; email: string; plan: User["plan"]; password_hash: string }[]>`
    select id, email, plan, password_hash from app.users where email = ${email}`;
  return rows[0] ? { id: Number(rows[0].id), email: rows[0].email, plan: rows[0].plan, passwordHash: rows[0].password_hash } : null;
}

export async function findUserById(id: number): Promise<User | null> {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<{ id: string; email: string; plan: User["plan"] }[]>`
    select id, email, plan from app.users where id = ${id}`;
  return rows[0] ? { id: Number(rows[0].id), email: rows[0].email, plan: rows[0].plan } : null;
}

export async function touchLogin(id: number) {
  const { sql } = db();
  await sql`update app.users set last_login_at = now() where id = ${id}`;
}
