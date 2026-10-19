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
  // Paid plans (Stripe). The plan column follows the subscription; these keep the link to Stripe.
  await sql`alter table app.users add column if not exists stripe_customer_id text`;
  await sql`alter table app.users add column if not exists stripe_subscription_id text`;
  await sql`alter table app.users add column if not exists subscription_status text`;
  await sql`alter table app.users add column if not exists subscription_renews_at timestamptz`;
  await sql`alter table app.users add column if not exists subscription_cancel_at_end boolean`;
  await sql`alter table app.users add column if not exists subscription_interval text`;
  // Two-factor login (authenticator app), used by the admin account.
  await sql`alter table app.users add column if not exists totp_secret text`;
  await sql`alter table app.users add column if not exists totp_pending_secret text`;
  await sql`alter table app.users add column if not exists totp_backup text`;
  await sql`alter table app.users add column if not exists totp_last_step bigint`;
  await sql`alter table app.users add column if not exists totp_enabled_at timestamptz`;
  // Plan 4 (Pro, for approved professionals). Widen the allowed values; existing rows are untouched.
  await sql`alter table app.users drop constraint if exists users_plan_check`;
  await sql`alter table app.users add constraint users_plan_check check (plan in ('free','plus','premium','pro'))`.catch(() => {});
  // Small settings the app makes for itself (for example the Stripe webhook signing key).
  await sql`create table if not exists app.settings (key text primary key, value text not null, updated_at timestamptz not null default now())`;
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
  // Best bonds by duration step and rating step, rebuilt from public_bonds each time a new copy arrives (lib/bestTable.ts).
  await sql`
    create table if not exists app.best_bonds (
      duration numeric not null,
      level integer not null,
      rank integer not null,
      isin text not null,
      bond jsonb not null,
      primary key (duration, level, rank)
    )`;
  await sql`create index if not exists events_kind_at_idx on app.events (kind, at)`;
  // Lookups by account (data export, account deletion) and by Stripe customer (payment webhooks).
  await sql`create index if not exists events_user_idx on app.events (user_id) where user_id is not null`;
  await sql`create index if not exists users_stripe_customer_idx on app.users (stripe_customer_id) where stripe_customer_id is not null`;
  // Weekly search allowance (lib/searchQuota.ts): one row per counted search. Kept 30 days.
  await sql`
    create table if not exists app.search_usage (
      id bigserial primary key,
      user_id bigint not null references app.users(id) on delete cascade,
      kind text not null check (kind in ('single','portfolio')),
      at timestamptz not null default now()
    )`;
  await sql`create index if not exists search_usage_user_idx on app.search_usage (user_id, kind, at)`;
  await sql`delete from app.search_usage where at < now() - interval '30 days'`;
  // "Refresh prices" requests from the admin page. The main app (which owns the bond prices) reads this table,
  // runs its own refresh and copy, then marks the row done. The public site never calls the main app.
  await sql`
    create table if not exists app.refresh_requests (
      id bigserial primary key,
      requested_at timestamptz not null default now(),
      requested_by text,
      status text not null default 'pending' check (status in ('pending','running','done','failed')),
      picked_up_at timestamptz,
      finished_at timestamptz,
      note text
    )`;
  // The main app's export login must be able to read and update this one table (nothing else in schema app).
  await sql`grant usage on schema app to public`.catch(() => {});
  await sql`grant select, update on app.refresh_requests to public`.catch(() => {});
  // Keep 13 months of usage history.
  await sql`delete from app.events where at < now() - interval '13 months'`;
  // The admin account made before confirmation e-mails existed holds its address already: count it as confirmed,
  // so turning e-mails on never locks the owner out of the admin pages.
  if (ADMIN_EMAILS.length) {
    await sql`update app.users set email_verified_at = created_at
      where email in ${sql(ADMIN_EMAILS)} and email_verified_at is null and created_at < '2026-10-20T00:00:00Z'`;
    // The owner's own browsing never counts in the site stats or search counters.
    await sql`delete from app.events where visitor_id in (
      select distinct e.visitor_id from app.events e join app.users u on u.id = e.user_id where u.email in ${sql(ADMIN_EMAILS)})`;
    await sql`delete from app.search_usage where user_id in (select id from app.users where email in ${sql(ADMIN_EMAILS)})`;
  }
}

type Plan = Exclude<Tier, "visitor">;
/** What the account pays for. Pro gives everything Premium gives in the bond search, plus the professional tool. */
export type StoredPlan = Plan | "pro";
/** `plan` is what the user gets now: Premium while a trial runs, otherwise the plan they hold. */
export type User = {
  id: number;
  email: string;
  username: string | null;
  plan: Plan;
  storedPlan: StoredPlan;
  premiumUntil: string | null;
  emailVerified: boolean;
  /** Signed up more than CONFIRM_GRACE_MS ago and the address is still not confirmed: no access until it is. */
  confirmBlocked: boolean;
  isAdmin: boolean;
  /** Admin pages: only with two-factor login done ("ok"). "setup" = not set up yet, "needed" = code not entered this browser. */
  adminState?: "ok" | "setup" | "needed";
  twoFactorOn: boolean;
  stripeCustomerId: string | null;
  subscription: { status: string; renewsAt: string | null; cancelAtEnd: boolean; interval: "month" | "year" | null } | null;
};

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "1903978@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type UserRow = {
  id: string; email: string; username: string | null; plan: StoredPlan; premium_until: Date | null; email_verified_at: Date | null;
  created_at?: Date | null;
  totp_enabled_at?: Date | null;
  stripe_customer_id?: string | null; subscription_status?: string | null; subscription_renews_at?: Date | null; subscription_cancel_at_end?: boolean | null; subscription_interval?: string | null;
};
function isAdminRow(r: UserRow): boolean {
  return ADMIN_EMAILS.includes(r.email.trim().toLowerCase()) && (r.email_verified_at !== null || !emailConfigured());
}

/** Forgets the usage events of one browser (used for the owner's devices, so their visits never count). */
export async function forgetVisitor(visitorId: string): Promise<void> {
  const sql = await accountsSql();
  await sql`delete from app.events where visitor_id = ${visitorId}`;
}

/** Cookie set on every device that opens the admin page: events from that browser are never recorded, even signed out. */
export const OWNER_COOKIE = "tb_owner";

/** How long a new account may be used before its e-mail address must be confirmed. */
export const CONFIRM_GRACE_MS = 3 * 3600_000;

const USER_COLS = "id, email, username, plan, premium_until, email_verified_at, created_at, totp_enabled_at, stripe_customer_id, subscription_status, subscription_renews_at, subscription_cancel_at_end, subscription_interval";

export function toUser(r: UserRow, now = Date.now()): User {
  const admin = isAdminRow(r);
  const trial = r.premium_until !== null && new Date(r.premium_until).getTime() > now;
  const emailVerified = r.email_verified_at !== null;
  return {
    id: Number(r.id),
    email: r.email,
    username: r.username,
    // The admin has every plan's features and is never charged.
    plan: admin || trial || r.plan === "pro" ? "premium" : r.plan,
    storedPlan: r.plan,
    premiumUntil: r.premium_until ? new Date(r.premium_until).toISOString() : null,
    emailVerified,
    confirmBlocked: !emailVerified && emailConfigured() && !!r.created_at && now - new Date(r.created_at).getTime() > CONFIRM_GRACE_MS,
    // Admin needs the address to be confirmed once confirmation e-mails are switched on. Until then the one
    // account holding the admin address is admin (an address can be used by one account only).
    isAdmin: admin,
    twoFactorOn: Boolean(r.totp_enabled_at),
    stripeCustomerId: r.stripe_customer_id ?? null,
    subscription: r.subscription_status
      ? { status: r.subscription_status, renewsAt: r.subscription_renews_at ? new Date(r.subscription_renews_at).toISOString() : null, cancelAtEnd: r.subscription_cancel_at_end === true, interval: r.subscription_interval === "year" ? "year" : r.subscription_interval === "month" ? "month" : null }
      : null,
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
      insert into app.users (email, username, password_hash, terms_version, terms_accepted_at)
      values (${email}, ${username}, ${passwordHash}, ${termsVersion}, now())
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

/** Sets a new password only if the stored one is still the one the reset link was made for (so a link works once). */
export async function replacePassword(userId: number, oldTag: (hash: string) => boolean, newHash: string): Promise<boolean> {
  const sql = await accountsSql();
  const rows = await sql<{ password_hash: string }[]>`select password_hash from app.users where id = ${userId} limit 1`;
  const cur = rows[0]?.password_hash;
  if (!cur || !oldTag(cur)) return false;
  const r = await sql`update app.users set password_hash = ${newHash}, email_verified_at = coalesce(email_verified_at, now())
    where id = ${userId} and password_hash = ${cur}`;
  return r.count === 1;
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

/** True when this account signed up with (or later redeemed) a 10BONDS promo code. */
export async function usedPromoCode(userId: number): Promise<boolean> {
  const { sql, ready } = db();
  await ready;
  const rows = await sql`select 1 from app.trial_codes where redeemed_by = ${userId} limit 1`;
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

/** Whether a code can still be used, checked before an account is created so a typo is caught first. */
export async function trialCodeStatus(code: string): Promise<"ok" | "unknown" | "used"> {
  const { sql, ready } = db();
  await ready;
  const c = await sql<{ redeemed_by: string | null }[]>`select redeemed_by from app.trial_codes where code = ${code}`;
  if (!c[0]) return "unknown";
  return c[0].redeemed_by === null ? "ok" : "used";
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
  // Any browser the owner ever used while signed in is left out, signed-out visits from it included.
  const notOwner = sql`visitor_id not in (
    select distinct e.visitor_id from app.events e join app.users u on u.id = e.user_id where lower(u.email) in ${sql(ADMIN_EMAILS.length ? ADMIN_EMAILS : [""])})`;
  const events = await sql<{ kind: string; n: string }[]>`
    select kind, count(*) n from app.events where at > now() - interval '30 days' and ${notOwner} group by kind order by n desc`;
  const pages = await sql<{ path: string; n: string }[]>`
    select path, count(*) n from app.events where kind = 'page_view' and at > now() - interval '30 days' and path is not null and ${notOwner}
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

export type AdminUserRow = {
  id: number; email: string; username: string | null; plan: string; premiumUntil: string | null; promoCode: string | null;
  createdAt: string; emailConfirmed: boolean; lastLoginAt: string | null; lastSeenAt: string | null;
  /** From usage statistics, so only for people who allowed them; null when nothing was recorded. */
  secondsOnSite: number | null; searches: number | null; isAdmin: boolean;
};

/** Every account for the admin page. Time on site and searches come only from consented usage statistics. */
export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<{
    id: string; email: string; username: string | null; plan: string; premium_until: Date | null; promo: string | null; created_at: Date;
    email_verified_at: Date | null; last_login_at: Date | null; last_seen: Date | null; secs: string | null; searches: string | null; has_stats: boolean;
  }[]>`
    with owner as (
      -- a browser counts for an account once that account was signed in on it
      select visitor_id, min(user_id) user_id from app.events where user_id is not null group by visitor_id
    ), ev as (
      select o.user_id, e.visitor_id, e.kind, e.at, e.at - lag(e.at) over (partition by e.visitor_id order by e.at) gap
      from app.events e join owner o on o.visitor_id = e.visitor_id
    ), per as (
      -- time on site: gaps between a visitor's events, ignoring pauses over 30 minutes (a new visit)
      select user_id, max(at) last_seen,
             coalesce(sum(extract(epoch from gap)) filter (where gap < interval '30 minutes'), 0) secs,
             count(*) filter (where kind = 'search') searches
      from ev group by user_id
    )
    select u.id, u.email, u.username, u.plan, u.premium_until, u.created_at, u.email_verified_at, u.last_login_at,
           (select string_agg(c.code, ', ' order by c.redeemed_at) from app.trial_codes c where c.redeemed_by = u.id) promo,
           p.last_seen, p.secs, p.searches, p.user_id is not null has_stats
    from app.users u left join per p on p.user_id = u.id
    order by u.created_at desc`;
  return rows.map((r) => {
    const last = [r.last_login_at, r.last_seen].filter((x): x is Date => x !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return {
      id: Number(r.id),
      email: r.email,
      username: r.username,
      plan: r.plan,
      premiumUntil: r.premium_until && r.premium_until.getTime() > Date.now() ? r.premium_until.toISOString() : null,
      promoCode: r.promo,
      createdAt: r.created_at.toISOString(),
      emailConfirmed: r.email_verified_at !== null,
      lastLoginAt: r.last_login_at?.toISOString() ?? null,
      lastSeenAt: last?.toISOString() ?? null,
      secondsOnSite: r.has_stats ? Math.round(Number(r.secs)) : null,
      searches: r.has_stats ? Number(r.searches) : null,
      isAdmin: ADMIN_EMAILS.includes(r.email.trim().toLowerCase()),
    };
  });
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
/** Runs the table setup once more on the open connection (schema check: setup must be repeatable). */
export async function setupAgainForTest() {
  await setup(db().sql);
}

export async function accountsSql() {
  const { sql, ready } = db();
  await ready;
  return sql;
}

export async function getSetting(key: string): Promise<string | null> {
  const { sql, ready } = db();
  await ready;
  const r = await sql<{ value: string }[]>`select value from app.settings where key = ${key}`;
  return r[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const { sql, ready } = db();
  await ready;
  await sql`insert into app.settings (key, value) values (${key}, ${value})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

export async function setStripeCustomer(userId: number, customerId: string) {
  const { sql, ready } = db();
  await ready;
  await sql`update app.users set stripe_customer_id = ${customerId} where id = ${userId} and stripe_customer_id is null`;
}

/** Apply a Stripe subscription to the account it belongs to. Returns the user id, or null when none matches. */
export async function applySubscription(s: {
  customerId: string; userId: number | null; subscriptionId: string; status: string; plan: StoredPlan; interval?: string | null; renewsAt: Date | null; cancelAtEnd: boolean;
}): Promise<number | null> {
  const { sql, ready } = db();
  await ready;
  const rows = await sql<{ id: string }[]>`
    update app.users set
      stripe_customer_id = ${s.customerId},
      stripe_subscription_id = ${s.subscriptionId},
      subscription_status = ${s.status},
      subscription_renews_at = ${s.renewsAt},
      subscription_cancel_at_end = ${s.cancelAtEnd},
      subscription_interval = ${s.interval ?? null},
      plan = ${s.plan}
    where (stripe_customer_id = ${s.customerId} or (${s.userId}::bigint is not null and id = ${s.userId}::bigint and stripe_customer_id is null))
      -- an old subscription ending must not cancel a newer one that is live (events can arrive out of order)
      and (${s.plan} <> 'free' or stripe_subscription_id is null or stripe_subscription_id = ${s.subscriptionId})
    returning id`;
  return rows[0] ? Number(rows[0].id) : null;
}

export type RefreshRequest = { id: number; requestedAt: string; requestedBy: string | null; status: string; pickedUpAt: string | null; finishedAt: string | null; note: string | null };
const toReq = (r: Record<string, unknown>): RefreshRequest => ({
  id: Number(r.id),
  requestedAt: new Date(r.requested_at as string).toISOString(),
  requestedBy: (r.requested_by as string) ?? null,
  status: r.status as string,
  pickedUpAt: r.picked_up_at ? new Date(r.picked_up_at as string).toISOString() : null,
  finishedAt: r.finished_at ? new Date(r.finished_at as string).toISOString() : null,
  note: (r.note as string) ?? null,
});

export async function listRefreshRequests(limit = 5): Promise<RefreshRequest[]> {
  const sql = await accountsSql();
  const rows = await sql`select * from app.refresh_requests order by id desc limit ${limit}`;
  return rows.map(toReq);
}

/** One open request at a time: a second click while one is pending or running returns the open one. */
export async function requestRefresh(by: string): Promise<{ request: RefreshRequest; created: boolean }> {
  const sql = await accountsSql();
  const [open] = await sql`select * from app.refresh_requests where status in ('pending','running') order by id desc limit 1`;
  if (open) return { request: toReq(open), created: false };
  const [row] = await sql`insert into app.refresh_requests (requested_by) values (${by}) returning *`;
  return { request: toReq(row), created: true };
}

/** Everything the site holds about one account (GDPR access and portability). */
export async function exportUserData(userId: number) {
  const { sql, ready } = db();
  await ready;
  const [user] = await sql`select id, email, username, plan, created_at, last_login_at, terms_version, terms_accepted_at, email_verified_at, premium_until,
    stripe_customer_id, subscription_status, subscription_interval, subscription_renews_at, subscription_cancel_at_end from app.users where id = ${userId}`;
  const searches = await sql`select kind, at from app.search_usage where user_id = ${userId} order by at`;
  const events = await sql`select at, kind, path, detail from app.events where user_id = ${userId} order by at`;
  const codes = await sql`select code, days, redeemed_at from app.trial_codes where redeemed_by = ${userId}`;
  const pro = await sql`select firm, role, country, regulator, licence, website, status, requested_at, decided_at from app.pro_access where user_id = ${userId}`.catch(() => []);
  return { exportedAt: new Date().toISOString(), account: user ?? null, searchCounts: searches, usageStats: events, codesUsed: codes, professionalAccess: pro };
}

/** Erase usage history (stats events and weekly search counts). The account itself stays. */
export async function eraseActivity(userId: number): Promise<{ events: number; searches: number }> {
  const { sql, ready } = db();
  await ready;
  const e = await sql`delete from app.events where user_id = ${userId}`;
  const q = await sql`delete from app.search_usage where user_id = ${userId}`;
  return { events: e.count, searches: q.count };
}

/** Delete the account and every row about it. Usage stats, search counts and the professional request go with it;
 *  a used code stays used but no longer points at anyone. Invoices are kept by Stripe, not here. */
export async function deleteUser(userId: number): Promise<boolean> {
  const { sql, ready } = db();
  await ready;
  return sql.begin(async (tx) => {
    await tx`delete from app.events where user_id = ${userId}`;
    await tx`delete from app.search_usage where user_id = ${userId}`;
    await tx`update app.trial_codes set redeemed_by = null where redeemed_by = ${userId}`;
    await tx`update app.trial_codes set created_by = null where created_by = ${userId}`;
    const r = await tx`delete from app.users where id = ${userId}`;
    return r.count === 1;
  });
}

export async function subscriptionIdOf(userId: number): Promise<string | null> {
  const { sql, ready } = db();
  await ready;
  const r = await sql<{ s: string | null }[]>`select stripe_subscription_id s from app.users where id = ${userId}`;
  return r[0]?.s ?? null;
}
