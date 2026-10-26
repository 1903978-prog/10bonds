import { accountsSql } from "./accounts";
import { SEARCH_LIMITS, type SearchKind } from "./limits";

// The Free plan's weekly search numbers, edited by the admin in /admin/features and saved in app.plan_limits.
// Defaults come from SEARCH_LIMITS. Read at most once a minute per server; a save clears it at once on this server.

export type FreeLimits = Record<SearchKind, number>;
const KEYS: Record<SearchKind, string> = { single: "free_single", portfolio: "free_portfolio" };
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

const defaults = (): FreeLimits => ({ single: SEARCH_LIMITS.free.single, portfolio: SEARCH_LIMITS.free.portfolio });

export function cleanLimits(raw: unknown): FreeLimits {
  const out = defaults();
  const r = (raw ?? {}) as Record<string, unknown>;
  for (const k of ["single", "portfolio"] as const) {
    const n = Number(r[k]);
    if (Number.isInteger(n) && n >= 1 && n <= MAX) out[k] = n;
  }
  return out;
}

/** Free plan's weekly allowance in force. Falls back to the defaults if the accounts database cannot be reached. */
export async function loadFreeLimits(): Promise<FreeLimits> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.v;
  const v = defaults();
  try {
    const s = await sql();
    const rows = await s<{ key: string; value: number }[]>`select key, value from app.plan_limits`;
    for (const k of ["single", "portfolio"] as const) {
      const row = rows.find((r) => r.key === KEYS[k]);
      if (row && row.value >= 1) v[k] = row.value;
    }
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
  for (const k of ["single", "portfolio"] as const)
    await s`insert into app.plan_limits (key, value) values (${KEYS[k]}, ${v[k]}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  cache = { at: Date.now(), v };
  return v;
}
