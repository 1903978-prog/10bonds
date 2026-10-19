import { accountsSql, type User } from "./accounts";

// Professional access (Bond Replacement Engine). Wealth managers ask for it once, declaring their firm and
// licence; the admin approves each request by hand. Requests live in their own table, next to app.users.

export type ProStatus = "none" | "pending" | "approved" | "rejected";
export type ProRequest = { firm: string; role: string; country: string; regulator: string; licence: string; website: string | null };
export type ProRow = ProRequest & { userId: number; email: string; username: string | null; status: ProStatus; requestedAt: string; decidedAt: string | null };

/** Version of the professional declaration the user ticks; stored with the request. */
export const PRO_DECLARATION_VERSION = "2026-10-18";

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
  if (!firm || !role || !country || !regulator || !licence || r.declaration !== true) return null;
  return { firm, role, country, regulator, licence, website: field(r.website, 200) };
}

/** A new or repeated request goes back to "pending" (an approved one is left as it is). */
export async function requestPro(userId: number, req: ProRequest) {
  const s = await sql();
  await s`
    insert into app.pro_access (user_id, firm, role, country, regulator, licence, website, declaration_version)
    values (${userId}, ${req.firm}, ${req.role}, ${req.country}, ${req.regulator}, ${req.licence}, ${req.website}, ${PRO_DECLARATION_VERSION})
    on conflict (user_id) do update set
      firm = excluded.firm, role = excluded.role, country = excluded.country, regulator = excluded.regulator,
      licence = excluded.licence, website = excluded.website, declaration_version = excluded.declaration_version,
      status = case when app.pro_access.status = 'approved' then 'approved' else 'pending' end,
      requested_at = now(), decided_at = case when app.pro_access.status = 'approved' then app.pro_access.decided_at else null end`;
}

export async function listProRequests(): Promise<ProRow[]> {
  const s = await sql();
  const rows = await s<
    { user_id: string; email: string; username: string | null; firm: string; role: string; country: string; regulator: string; licence: string; website: string | null; status: ProStatus; requested_at: Date; decided_at: Date | null }[]
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
    status: r.status,
    requestedAt: new Date(r.requested_at).toISOString(),
    decidedAt: r.decided_at ? new Date(r.decided_at).toISOString() : null,
  }));
}

export async function decidePro(userId: number, status: "approved" | "rejected" | "pending"): Promise<boolean> {
  const s = await sql();
  const rows = await s`
    update app.pro_access set status = ${status}, decided_at = case when ${status}::text = 'pending' then null else now() end
    where user_id = ${userId} returning user_id`;
  return rows.length > 0;
}

/** Approved professionals use the tool with a paid Pro plan; the admin always can. */
export type ProAccess = "active" | "needs-plan" | ProStatus;
export async function proAccess(user: User): Promise<ProAccess> {
  if (user.isAdmin) return "active";
  const status = await proStatus(user);
  if (status !== "approved") return status;
  return user.storedPlan === "pro" ? "active" : "needs-plan";
}
