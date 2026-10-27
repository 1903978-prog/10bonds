import { accountsSql } from "./accounts";
import { SEARCH_LIMITS } from "./limits";

// The Free plan's daily search number (one shared counter), edited by the admin in /admin/features and saved in app.plan_limits.
// Defaults come from SEARCH_LIMITS. Read at most once a minute per server; a save clears it at once on this server.

export type FreeLimits = { daily: number };
const KEY = "free_daily";
const MAX = 1000;
const CACHE_MS = 60_000;
let cache: { at: number; v: FreeLimits } | null = null;
let ready: Promise<void> | null = null;

async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`create table if not exists app.plan_limits (key text primary key, value integer not null, updated_at timestamptz not null default now())`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

const defaults = (): FreeLimits => ({ daily: SEARCH_LIMITS.free.daily });

export function cleanLimits(raw: unknown): FreeLimits {
  const out = defaults();
  const r = (raw ?? {}) as Record<string, unknown>;
  const n = Number(r.daily);
  if (Number.isInteger(n) && n >= 1 && n <= MAX) out.daily = n;
  return out;
}

/** Free plan's daily allowance in force. Falls back to the defaults if the accounts database cannot be reached. */
export async function loadFreeLimits(): Promise<FreeLimits> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.v;
  const v = defaults();
  try {
    const s = await sql();
    const rows = await s<{ key: string; value: number }[]>`select key, value from app.plan_limits`;
    const row = rows.find((r) => r.key === KEY);
    if (row && row.value >= 1) v.daily = row.value;
  } catch (e) {
    console.error("[searchLimits]", (e as Error).message);
    return v;
  }
  cache = { at: Date.now(), v };
  return v;
}

export async function saveFreeLimits(raw: unknown): Promise<FreeLimits> {
  const v = cleanLimits(raw);
  const s = await sql();
  await s`insert into app.plan_limits (key, value) values (${KEY}, ${v.daily}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  cache = { at: Date.now(), v };
  return v;
}
