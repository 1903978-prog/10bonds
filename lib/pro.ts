import { accountsSql, type User } from "./accounts";

// Professional access (Bond Replacement Engine). Wealth managers ask for it once, declaring their firm and
// licence; the admin approves each request by hand. Requests live in their own table, next to app.users.

export type ProStatus = "none" | "pending" | "approved" | "rejected";
export type ProRequest = { firm: string; role: string; country: string; regulator: string; licence: string; website: string | null; registerUrl: string | null };
export type ProRow = ProRequest & { trialEndsAt: string | null; userId: number; email: string; username: string | null; status: ProStatus; requestedAt: string; decidedAt: string | null };

/** Version of the professional declaration the user ticks; stored with the request. */
export const PRO_DECLARATION_VERSION = "2026-10-26";

/** Verified professionals try the engine free for this many days, starting when we approve them. */
export const PRO_TRIAL_DAYS = 14;

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`
      create table if not exists app.pro_access (
        user_id bigint primary key references app.users(id) on delete cascade,
        firm text not null,
        role text not null,
        country text not null,
        regulator text not null,
        licence text not null,
        website text,
        declaration_version text not null,
        status text not null default 'pending' check (status in ('pending','approved','rejected')),
        requested_at timestamptz not null default now(),
        decided_at timestamptz
      )`;
    await s`alter table app.pro_access add column if not exists trial_ends_at timestamptz`;
    await s`alter table app.pro_access add column if not exists register_url text`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

/** The admin always has access (to test and demo the tool). */
export async function proStatus(user: User): Promise<ProStatus> {
  if (user.isAdmin) return "approved";
  const s = await sql();
  const rows = await s<{ status: ProStatus }[]>`select status from app.pro_access where user_id = ${user.id}`;
  return rows[0]?.status ?? "none";
}

const field = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function cleanProRequest(raw: unknown): ProRequest | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const firm = field(r.firm);
  const role = field(r.role);
  const country = field(r.country, 60);
  const regulator = field(r.regulator);
  const licence = field(r.licence, 60);
  if (!firm || !role || !country || !regulator || !licence || r.declaration !== true || r.b2bTerms !== true) return null;
  return { firm, role, country, regulator, licence, website: field(r.website, 200), registerUrl: field(r.registerUrl, 300) };
}

/** A new or repeated request goes back to "pending" (an approved one is left as it is). */
export async function requestPro(userId: number, req: ProRequest) {
  const s = await sql();
  await s`
    insert into app.pro_access (user_id, firm, role, country, regulator, licence, website, register_url, declaration_version)
    values (${userId}, ${req.firm}, ${req.role}, ${req.country}, ${req.regulator}, ${req.licence}, ${req.website}, ${req.registerUrl}, ${PRO_DECLARATION_VERSION})
    on conflict (user_id) do update set
      firm = excluded.firm, role = excluded.role, country = excluded.country, regulator = excluded.regulator,
      licence = excluded.licence, website = excluded.website, register_url = excluded.register_url, declaration_version = excluded.declaration_version,
      status = case when app.pro_access.status = 'approved' then 'approved' else 'pending' end,
      requested_at = now(), decided_at = case when app.pro_access.status = 'approved' then app.pro_access.decided_at else null end`;
}

export async function listProRequests(): Promise<ProRow[]> {
  const s = await sql();
  const rows = await s<
    { user_id: string; email: string; username: string | null; firm: string; role: string; country: string; regulator: string; licence: string; website: string | null; register_url: string | null; trial_ends_at: Date | null; status: ProStatus; requested_at: Date; decided_at: Date | null }[]
  >`
    select p.*, u.email, u.username from app.pro_access p join app.users u on u.id = p.user_id
    order by (p.status = 'pending') desc, p.requested_at desc limit 500`;
  return rows.map((r) => ({
    userId: Number(r.user_id),
    email: r.email,
    username: r.username,
    firm: r.firm,
    role: r.role,
    country: r.country,
    regulator: r.regulator,
    licence: r.licence,
    website: r.website,
    registerUrl: r.register_url,
    trialEndsAt: r.trial_ends_at ? new Date(r.trial_ends_at).toISOString() : null,
    status: r.status,
    requestedAt: new Date(r.requested_at).toISOString(),
    decidedAt: r.decided_at ? new Date(r.decided_at).toISOString() : null,
  }));
}

export async function decidePro(userId: number, status: "approved" | "rejected" | "pending"): Promise<boolean> {
  const s = await sql();
  const rows = await s`
    update app.pro_access set status = ${status}, decided_at = case when ${status}::text = 'pending' then null else now() end,
      -- the 14-day trial starts once, the first time a request is approved
      trial_ends_at = case when ${status}::text = 'approved' then coalesce(trial_ends_at, now() + make_interval(days => ${PRO_TRIAL_DAYS})) else trial_ends_at end
    where user_id = ${userId} returning user_id`;
  return rows.length > 0;
}

/** Approved professionals use the tool during their 14-day trial or with a paid Pro plan; the admin always can. */
export type ProAccess = "active" | "needs-plan" | ProStatus;
export type ProInfo = { access: ProAccess; trialEndsAt: string | null; trialDaysLeft: number | null; onPlan: boolean };

/** Whole days left in a trial (rounded up), or null when there is none or it has ended. */
export function trialDaysLeft(endsAt: string | Date | null, now = Date.now()): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now;
  return ms > 0 ? Math.ceil(ms / 86_400_000) : null;
}

export async function proInfo(user: User): Promise<ProInfo> {
  if (user.isAdmin) return { access: "active", trialEndsAt: null, trialDaysLeft: null, onPlan: true };
  const s = await sql();
  const rows = await s<{ status: ProStatus; trial_ends_at: Date | null }[]>`select status, trial_ends_at from app.pro_access where user_id = ${user.id}`;
  const status = rows[0]?.status ?? "none";
  const trialEndsAt = rows[0]?.trial_ends_at ? new Date(rows[0].trial_ends_at).toISOString() : null;
  if (status !== "approved") return { access: status, trialEndsAt, trialDaysLeft: null, onPlan: false };
  const onPlan = user.storedPlan === "pro";
  const left = trialDaysLeft(trialEndsAt);
  return { access: onPlan || left !== null ? "active" : "needs-plan", trialEndsAt, trialDaysLeft: onPlan ? null : left, onPlan };
}

export async function proAccess(user: User): Promise<ProAccess> {
  return (await proInfo(user)).access;
}

/** Creates the table if needed (used by the schema check in lib/schema.db.test.ts). */
export const proTableReady = () => sql().then(() => undefined);
