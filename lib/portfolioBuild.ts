import { accountsConfigured, accountsSql } from "./accounts";

// The nightly build record (app.portfolio_builds): one row per run of scripts/portfolio-build.ts, which solves every stored list one horizon at a time
// on a runner (never in the website process). Read by /admin/nightly-build. Cost: the repository is public, so the runner minutes are free (0 USD).

let ready: Promise<void> | null = null;
export function buildTablesReady(): Promise<void> {
  ready ??= (async () => {
    const s = await accountsSql();
    await s`create table if not exists app.portfolio_builds (
      id bigserial primary key, trigger text not null, status text not null check (status in ('running','done','partial','failed')),
      started_at timestamptz not null default now(), finished_at timestamptz, runtime_ms integer, peak_rss_mb integer, paused_ms integer not null default 0,
      keys_total integer not null default 0, keys_built integer not null default 0, keys_skipped integer not null default 0, keys_failed integer not null default 0,
      price_batch text, spec_version text, note text, detail jsonb)`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

export type BuildRow = {
  id: number; trigger: string; status: string; started_at: string; finished_at: string | null; runtime_ms: number | null; peak_rss_mb: number | null; paused_ms: number;
  keys_total: number; keys_built: number; keys_skipped: number; keys_failed: number; price_batch: string | null; spec_version: string | null; note: string | null; detail: unknown;
};

export async function recentBuilds(limit = 14): Promise<BuildRow[]> {
  if (!accountsConfigured()) return [];
  await buildTablesReady();
  const s = await accountsSql();
  return (await s`select * from app.portfolio_builds order by id desc limit ${limit}`) as unknown as BuildRow[];
}

/** Website requests (page events) in the last minute: the build waits while visitors are busy. */
export async function recentTraffic(): Promise<number> {
  const s = await accountsSql();
  const [r] = await s`select count(*)::int as n from app.events where at > now() - interval '60 seconds'`;
  return Number(r?.n ?? 0);
}
/** More than 2 requests per second on average is "busy". */
export const BUSY_PER_MINUTE = 120;
