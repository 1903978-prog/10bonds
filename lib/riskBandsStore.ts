import { accountsConfigured, accountsSql } from "./accounts";
import { cleanConfig, defaultConfig, type BandConfig } from "./riskBands";
import type { StoredBands } from "./riskBandsBuild";

// The band table (editable at /admin/risk-bands) and the stored portfolios (owner, 27/10/2026). Config is read at most once a minute per
// server. Stored portfolios live in app.frontier_cache under "bands:" keys, so the same clean-up and backup apply; the newest set for the
// same filter, horizon and band table is served when the data moved a little (a release or a price refresh never leaves the finder empty).

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`create table if not exists app.risk_band_config (key text primary key, data jsonb not null, updated_at timestamptz not null default now())`;
    await s`create table if not exists app.frontier_cache (key text primary key, data jsonb not null, created_at timestamptz not null default now())`;
  })().catch((e) => { ready = null; throw e; });
  await ready;
  return s;
}

const CACHE_MS = 60_000;
let cache: { at: number; v: BandConfig } | null = null;

export async function loadBandConfig(): Promise<BandConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.v;
  let v = defaultConfig();
  if (accountsConfigured()) {
    try {
      const s = await sql();
      const rows = await s`select data from app.risk_band_config where key = 'bands'`;
      const c = rows[0] ? cleanConfig(rows[0].data) : null;
      if (c) v = c;
    } catch (e) {
      console.error("[risk-bands] config load failed:", (e as Error).message);
      return v;
    }
  }
  cache = { at: Date.now(), v };
  return v;
}

/** Saves the band table; returns the clean config or null when the input is out of range. */
export async function saveBandConfig(raw: unknown): Promise<BandConfig | null> {
  const c = cleanConfig(raw);
  if (!c) return null;
  const s = await sql();
  await s`insert into app.risk_band_config (key, data) values ('bands', ${s.json(c as never)}) on conflict (key) do update set data = excluded.data, updated_at = now()`;
  cache = { at: Date.now(), v: c };
  return c;
}

const esc = (x: string) => x.replace(/[\\%_]/g, "\\$&");
const keyOf = (key: string) => `bands:${key}`;

/** Stored bands for this key, or the newest set for the same filter, horizon and band table (stale = true). */
export async function loadStoredBands(key: string): Promise<{ data: StoredBands; stale: boolean } | null> {
  if (!accountsConfigured()) return null;
  try {
    const s = await sql();
    const k = keyOf(key);
    const exact = await s`select data from app.frontier_cache where key = ${k}`;
    if (exact[0]) return { data: exact[0].data as StoredBands, stale: false };
    const rest = k.slice(k.indexOf("|"));
    const near = await s`select data from app.frontier_cache where key like ${"bands:%" + esc(rest)} order by created_at desc limit 1`;
    return near[0] ? { data: near[0].data as StoredBands, stale: true } : null;
  } catch (e) {
    console.error("[risk-bands] load failed:", (e as Error).message);
    return null;
  }
}

export async function saveStoredBands(key: string, data: StoredBands): Promise<void> {
  if (!accountsConfigured()) return;
  try {
    const s = await sql();
    const k = keyOf(key);
    const rest = k.slice(k.indexOf("|"));
    await s`delete from app.frontier_cache where key like ${"bands:%" + esc(rest)} and key <> ${k}`;
    await s`insert into app.frontier_cache (key, data) values (${k}, ${s.json(data as never)}) on conflict (key) do update set data = excluded.data, created_at = now()`;
  } catch (e) {
    console.error("[risk-bands] save failed:", (e as Error).message);
  }
}
