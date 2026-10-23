import { bing, google, type Engine } from "./engines";
import { listKeywords, seoSql } from "./store";

// One snapshot a day of the headline search numbers, kept so the SEO page can chart progress. Safe to run many times a day:
// there is one row per day and source, and a source that answers nothing never overwrites a figure already saved.

export type DailyRow = {
  day: string; source: "google" | "bing" | "keywords" | "users";
  clicks: number | null; impressions: number | null; ctr: number | null; position: number | null; indexed: number | null; tracked: number | null; top10: number | null;
  signups?: number | null; paying?: number | null; // "users" rows only
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function save(r: DailyRow) {
  const s = await seoSql();
  const empty = r.clicks === null && r.impressions === null && r.tracked === null;
  if (empty) {
    await s`insert into app.seo_daily_stats (day, source) values (${r.day}, ${r.source}) on conflict (day, source) do nothing`;
    return;
  }
  await s`insert into app.seo_daily_stats (day, source, clicks, impressions, ctr, position, indexed, tracked, top10)
    values (${r.day}, ${r.source}, ${r.clicks}, ${r.impressions}, ${r.ctr}, ${r.position}, ${r.indexed}, ${r.tracked}, ${r.top10})
    on conflict (day, source) do update set clicks = excluded.clicks, impressions = excluded.impressions, ctr = excluded.ctr, position = excluded.position,
      indexed = excluded.indexed, tracked = excluded.tracked, top10 = excluded.top10`;
}

const fromEngine = (day: string, source: "google" | "bing", e: Engine): DailyRow => ({
  day, source, clicks: e.data?.clicks ?? null, impressions: e.data?.impressions ?? null, ctr: e.data?.ctr ?? null, position: e.data?.position ?? null,
  indexed: e.data?.indexed ?? null, tracked: null, top10: null,
});

/** Takes today's snapshot unless a complete one exists already (or `force`). Returns whether anything was fetched. */
export async function takeSnapshot(force = false): Promise<boolean> {
  const day = today();
  const s = await seoSql();
  if (!force) {
    const have = await s`select clicks, tracked from app.seo_daily_stats where day = ${day}`;
    if (have.length >= 3 && have.every((r) => r.clicks !== null || r.tracked !== null)) return false;
  }
  const [g, b, kws] = await Promise.all([google(), bing(), listKeywords().catch(() => [])]);
  await save(fromEngine(day, "google", g));
  await save(fromEngine(day, "bing", b));
  const ranked = kws.filter((k) => k.position !== null);
  await save({
    day, source: "keywords", clicks: null, impressions: null, ctr: null, indexed: null,
    position: ranked.length ? Math.round((ranked.reduce((a, k) => a + (k.position ?? 0), 0) / ranked.length) * 10) / 10 : null,
    tracked: kws.length ? ranked.length : null,
    top10: kws.length ? ranked.filter((k) => (k.position ?? 99) <= 10).length : null,
  });
  return true;
}

/** The saved history, oldest first. */
export async function dailyHistory(days = 365): Promise<DailyRow[]> {
  const s = await seoSql();
  const rows = await s`select * from app.seo_daily_stats where day > current_date - ${days}::int order by day`;
  const out: DailyRow[] = rows.map((r) => ({
    day: new Date(r.day as string).toISOString().slice(0, 10), source: r.source as DailyRow["source"],
    clicks: n(r.clicks), impressions: n(r.impressions), ctr: n(r.ctr), position: n(r.position), indexed: n(r.indexed), tracked: n(r.tracked), top10: n(r.top10),
  }));
  // New accounts and new paying accounts per day (UTC), counted straight from the accounts, for the same days.
  const counts = await s`
    select d::text as day, sum(signups)::int as signups, sum(paying)::int as paying from (
      select (created_at at time zone 'UTC')::date as d, 1 as signups, 0 as paying from app.users where created_at > current_date - ${days}::int
      union all
      select (first_paid_at at time zone 'UTC')::date, 0, 1 from app.users where first_paid_at > current_date - ${days}::int
    ) x group by d`;
  const byDay = new Map(counts.map((c) => [c.day as string, c]));
  for (const day of [...new Set(out.map((r) => r.day))]) {
    const c = byDay.get(day);
    out.push({ day, source: "users", clicks: null, impressions: null, ctr: null, position: null, indexed: null, tracked: null, top10: null, signups: c ? Number(c.signups) : 0, paying: c ? Number(c.paying) : 0 });
  }
  return out;
}
