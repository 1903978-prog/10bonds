import { accountsConfigured, accountsSql } from "./accounts";
import type { CoherentFrontier } from "./coherentFrontier";

// The finished spread-rules lists are kept in the database, so a restart or a new release reads them back in a
// moment instead of solving for minutes again. A key names the data copy, filter, horizon and rules version, so a
// list is never read for other data; keys of older copies are cleared when a new list is saved.

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`
      create table if not exists app.frontier_cache (
        key text primary key,
        data jsonb not null,
        created_at timestamptz not null default now()
      )`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

export async function frontierTableReady(): Promise<void> {
  await sql();
}

const esc = (x: string) => x.replace(/[\\%_]/g, "\\$&");

/**
 * The saved lists for this key as a plain object, or null (also when the database is not connected or the read fails).
 * A key starts with a signature of the bond data, which moves a little with every price refresh; when no list is saved
 * for exactly this data, the newest list saved for the same filter, horizon and rules is returned with stale = true.
 */
export async function loadSavedFrontier(key: string): Promise<{ data: Omit<CoherentFrontier, "at">; stale: boolean } | null> {
  if (!accountsConfigured()) return null;
  try {
    const s = await sql();
    const exact = await s`select data from app.frontier_cache where key = ${key}`;
    if (exact[0]) return { data: exact[0].data as Omit<CoherentFrontier, "at">, stale: false };
    const rest = key.slice(key.indexOf("|"));
    const near = await s`select data from app.frontier_cache where key like ${"%" + esc(rest)} order by created_at desc limit 1`;
    return near[0] ? { data: near[0].data as Omit<CoherentFrontier, "at">, stale: true } : null;
  } catch (e) {
    console.error("[frontier-store] load failed:", (e as Error).message);
    return null;
  }
}

export async function saveFrontier(key: string, f: CoherentFrontier): Promise<void> {
  if (!accountsConfigured()) return;
  try {
    const s = await sql();
    const { at: _at, ...data } = f;
    // Older lists for the same filter, horizon and rules (other data signatures) are replaced by this one.
    const rest = key.slice(key.indexOf("|"));
    await s`delete from app.frontier_cache where key like ${"%" + esc(rest)} and key <> ${key}`;
    await s`insert into app.frontier_cache (key, data) values (${key}, ${s.json(data as never)})
            on conflict (key) do update set data = excluded.data, created_at = now()`;
  } catch (e) {
    console.error("[frontier-store] save failed:", (e as Error).message);
  }
}
