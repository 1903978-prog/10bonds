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

/** The saved lists as a plain object, or null (also when the database is not connected or the read fails). */
export async function loadSavedFrontier(key: string): Promise<Omit<CoherentFrontier, "at"> | null> {
  if (!accountsConfigured()) return null;
  try {
    const s = await sql();
    const r = await s`select data from app.frontier_cache where key = ${key}`;
    return (r[0]?.data as Omit<CoherentFrontier, "at">) ?? null;
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
    // Keys start with the data copy's signature; lists of other copies and older rules are no longer reachable.
    const prefix = key.split("|")[0];
    await s`delete from app.frontier_cache where key not like ${prefix.replace(/[\\%_]/g, "\\$&") + "|%"}`;
    await s`insert into app.frontier_cache (key, data) values (${key}, ${s.json(data as never)})
            on conflict (key) do update set data = excluded.data, created_at = now()`;
  } catch (e) {
    console.error("[frontier-store] save failed:", (e as Error).message);
  }
}
