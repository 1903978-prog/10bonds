import { SEARCH_LIMITS, SEARCH_SESSION_MINUTES, type SearchKind } from "./limits";
import type { User } from "./accounts";
import { loadFreeLimits } from "./searchLimits";

export type Quota = { kind: SearchKind; limit: number | null; used: number; resetsAt: string | null };
export type Decision = Quota & { allowed: boolean; record: boolean };

/** Start of the current day in Rome (the allowance resets at midnight there). Off by an hour on the two clock-change days. */
export function romeDayStart(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(now);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(now.getTime() - ((n("hour") * 60 + n("minute")) * 60 + n("second")) * 1000 - now.getMilliseconds());
}
const nextRomeMidnight = (now: Date) => romeDayStart(new Date(romeDayStart(now).getTime() + 25 * 3600_000));

/**
 * Pure rule. One counter for both kinds of search: `today` = times of this user's counted searches since Rome midnight
 * (any kind, any order); `sameKind` = the ones of this kind (default: all), used for the session rule.
 * Unlimited: allowed, nothing recorded. Within a session of the last counted search of this kind: allowed, not counted
 * again. Otherwise counted if fewer than `limit` today, else refused until Rome midnight.
 */
export function decideSearch(today: Date[], now: Date, limit: number | null, kind: SearchKind, sessionMin = SEARCH_SESSION_MINUTES, sameKind: Date[] = today): Decision {
  const start = romeDayStart(now).getTime();
  const day = today.filter((t) => t.getTime() >= start);
  const resetsAt = nextRomeMidnight(now).toISOString();
  if (limit === null) return { kind, limit, used: day.length, resetsAt: null, allowed: true, record: false };
  const last = sameKind.filter((t) => t.getTime() >= start).reduce<Date | null>((a, t) => (!a || t > a ? t : a), null);
  if (last && now.getTime() - last.getTime() < sessionMin * 60_000) {
    return { kind, limit, used: day.length, resetsAt, allowed: true, record: false };
  }
  if (day.length >= limit) return { kind, limit, used: day.length, resetsAt, allowed: false, record: false };
  return { kind, limit, used: day.length + 1, resetsAt, allowed: true, record: true };
}

/** `unlimited`: what the admin's feature table says for this plan ("unlimited_single" / "unlimited_portfolio"); a plan
 * without it gets the free daily allowance. Left out: the plan's own allowance in SEARCH_LIMITS. */
export function limitFor(user: Pick<User, "plan" | "isAdmin">, kind: SearchKind, unlimited?: boolean, free: number = SEARCH_LIMITS.free.daily): number | null {
  if (user.isAdmin) return null;
  if (unlimited !== undefined) return unlimited ? null : free;
  return SEARCH_LIMITS[user.plan].daily;
}

async function todays(userId: string | number) {
  const { accountsSql } = await import("./accounts");
  const sql = await accountsSql();
  const since = romeDayStart(new Date());
  const rows = await sql<{ at: Date; kind: SearchKind }[]>`select at, kind from app.search_usage where user_id = ${userId} and at >= ${since}`;
  return { sql, rows: rows.map((r) => ({ at: new Date(r.at), kind: r.kind })) };
}

/** Checks and, when a new search starts, records it. Fails open (allowed) if the accounts database is unreachable. */
export async function consumeSearch(user: Pick<User, "id" | "plan" | "isAdmin">, kind: SearchKind, unlimited?: boolean): Promise<Decision> {
  const limit = limitFor(user, kind, unlimited, (await loadFreeLimits()).daily);
  try {
    const { sql, rows } = await todays(user.id);
    const d = decideSearch(rows.map((r) => r.at), new Date(), limit, kind, undefined, rows.filter((r) => r.kind === kind).map((r) => r.at));
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

/** Where the user stands now, without counting a search (the counter shown before and between searches). */
export async function peekSearch(user: Pick<User, "id" | "plan" | "isAdmin">, kind: SearchKind, unlimited?: boolean): Promise<Quota> {
  const limit = limitFor(user, kind, unlimited, (await loadFreeLimits()).daily);
  if (limit === null) return { kind, limit, used: 0, resetsAt: null };
  try {
    const { rows } = await todays(user.id);
    return { kind, limit, used: rows.length, resetsAt: nextRomeMidnight(new Date()).toISOString() };
  } catch {
    return { kind, limit, used: 0, resetsAt: null };
  }
}
