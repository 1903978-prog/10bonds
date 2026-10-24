import { SEARCH_LIMITS, SEARCH_SESSION_MINUTES, type SearchKind } from "./limits";
import type { User } from "./accounts";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type Quota = { kind: SearchKind; limit: number | null; used: number; resetsAt: string | null };
export type Decision = Quota & { allowed: boolean; record: boolean };

/**
 * Pure rule. `past` = times of this user's counted searches of this kind (any order).
 * Unlimited: allowed, nothing recorded. Within a session of the last counted search: allowed, not counted again.
 * Otherwise counted if fewer than `limit` in the last 7 days, else refused until the oldest one is 7 days old.
 */
export function decideSearch(past: Date[], now: Date, limit: number | null, kind: SearchKind, sessionMin = SEARCH_SESSION_MINUTES): Decision {
  const week = past.filter((t) => now.getTime() - t.getTime() < WEEK_MS).sort((a, b) => a.getTime() - b.getTime());
  if (limit === null) return { kind, limit, used: week.length, resetsAt: null, allowed: true, record: false };
  const resetsAt = (list: Date[]) => (list.length ? new Date(list[0].getTime() + WEEK_MS).toISOString() : null);
  const last = week[week.length - 1];
  if (last && now.getTime() - last.getTime() < sessionMin * 60_000) {
    return { kind, limit, used: week.length, resetsAt: resetsAt(week), allowed: true, record: false };
  }
  if (week.length >= limit) return { kind, limit, used: week.length, resetsAt: resetsAt(week), allowed: false, record: false };
  const after = [...week, now];
  return { kind, limit, used: after.length, resetsAt: resetsAt(after), allowed: true, record: true };
}

/** `unlimited`: what the admin's feature table says for this plan ("unlimited_single" / "unlimited_portfolio"); a plan
 * without it gets the free allowance. Left out: the plan's own allowance in SEARCH_LIMITS. */
export function limitFor(user: Pick<User, "plan" | "isAdmin">, kind: SearchKind, unlimited?: boolean): number | null {
  if (user.isAdmin) return null;
  if (unlimited !== undefined) return unlimited ? null : SEARCH_LIMITS.free[kind];
  return SEARCH_LIMITS[user.plan][kind];
}

/** Checks and, when a new search starts, records it. Fails open (allowed) if the accounts database is unreachable. */
export async function consumeSearch(user: Pick<User, "id" | "plan" | "isAdmin">, kind: SearchKind, unlimited?: boolean): Promise<Decision> {
  const limit = limitFor(user, kind, unlimited);
  const { accountsSql } = await import("./accounts");
  try {
    const sql = await accountsSql();
    const rows = await sql<{ at: Date }[]>`
      select at from app.search_usage where user_id = ${user.id} and kind = ${kind} and at > now() - interval '7 days'`;
    const d = decideSearch(rows.map((r) => new Date(r.at)), new Date(), limit, kind);
    if (d.record && !user.isAdmin) await sql`insert into app.search_usage (user_id, kind) values (${user.id}, ${kind})`;
    return d;
  } catch (e) {
    console.error("[searchQuota]", (e as Error).message);
    return { kind, limit, used: 0, resetsAt: null, allowed: true, record: false };
  }
}

export function publicQuota(d: Decision): Quota {
  return { kind: d.kind, limit: d.limit, used: d.used, resetsAt: d.resetsAt };
}
