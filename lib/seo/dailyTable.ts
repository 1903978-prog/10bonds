import { bingDate, bingSites } from "./bing";
import { gscProperty } from "./engines";
import { googleDailyRows } from "./google";
import { seoSql } from "./store";

// One row per calendar day of the real Google and Bing figures (not a rolling 28-day window), kept forever so the SEO page
// reads from the database only. Safe to run often: each run upserts the days Google and Bing still report.

export type DayRow = {
  day: string;
  gClicks: number | null; gImpressions: number | null; gCtr: number | null; gPosition: number | null; gPages: number | null;
  bClicks: number | null; bImpressions: number | null; bPages: number | null;
};

const BING_API = "https://ssl.bing.com/webmaster/api.svc/json";
async function bingRows<T>(method: string, key: string, site: string): Promise<T[]> {
  const r = await fetch(`${BING_API}/${method}?siteUrl=${encodeURIComponent(site)}&apikey=${encodeURIComponent(key)}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`Bing ${method}: ${r.status}`);
  return ((await r.json()) as { d?: T[] }).d ?? [];
}

let ready = false;
async function table() {
  const s = await seoSql();
  if (!ready) {
    await s`
      create table if not exists app.seo_daily (
        day date primary key,
        g_clicks integer, g_impressions integer, g_ctr numeric, g_position numeric, g_pages integer,
        b_clicks integer, b_impressions integer, b_pages integer,
        updated_at timestamptz not null default now()
      )`;
    ready = true;
  }
  return s;
}

/** Fetches Google (up to 16 months) and Bing daily figures and upserts them. Returns how many days were written. */
export async function refreshDailyTable(): Promise<number> {
  const s = await table();
  const days = new Map<string, Partial<DayRow>>();
  const row = (d: string) => days.get(d) ?? (days.set(d, {}), days.get(d)!);
  const site = await gscProperty().catch(() => null);
  if (site) {
    for (const g of await googleDailyRows(site).catch((e) => { console.error("Google daily failed:", (e as Error).message); return []; })) {
      Object.assign(row(g.day), { gClicks: g.clicks, gImpressions: g.impressions, gCtr: g.impressions ? g.ctr : null, gPosition: g.impressions ? Math.round(g.position * 10) / 10 : null, gPages: g.pages });
    }
  }
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (key) {
    try {
      for (const bs of await bingSites(key)) {
        const [traffic, crawl] = await Promise.all([
          bingRows<{ Date: string; Clicks: number; Impressions: number }>("GetRankAndTrafficStats", key, bs),
          bingRows<{ Date: string; InIndex: number }>("GetCrawlStats", key, bs).catch(() => []),
        ]);
        for (const t of traffic) {
          const d = bingDate(t.Date); if (!d) continue;
          const r = row(d);
          r.bClicks = (r.bClicks ?? 0) + (Number(t.Clicks) || 0);
          r.bImpressions = (r.bImpressions ?? 0) + (Number(t.Impressions) || 0);
        }
        for (const c of crawl) {
          const d = bingDate(c.Date); if (!d) continue;
          const r = row(d);
          r.bPages = (r.bPages ?? 0) + (Number(c.InIndex) || 0);
        }
      }
    } catch (e) { console.error("Bing daily failed:", (e as Error).message); }
  }
  let n = 0;
  for (const [day, r] of days) {
    // A source that gave nothing for a day keeps whatever was saved before (coalesce), never overwritten with a blank.
    await s`insert into app.seo_daily (day, g_clicks, g_impressions, g_ctr, g_position, g_pages, b_clicks, b_impressions, b_pages)
      values (${day}, ${r.gClicks ?? null}, ${r.gImpressions ?? null}, ${r.gCtr ?? null}, ${r.gPosition ?? null}, ${r.gPages ?? null}, ${r.bClicks ?? null}, ${r.bImpressions ?? null}, ${r.bPages ?? null})
      on conflict (day) do update set
        g_clicks = coalesce(excluded.g_clicks, app.seo_daily.g_clicks), g_impressions = coalesce(excluded.g_impressions, app.seo_daily.g_impressions),
        g_ctr = coalesce(excluded.g_ctr, app.seo_daily.g_ctr), g_position = coalesce(excluded.g_position, app.seo_daily.g_position),
        g_pages = coalesce(excluded.g_pages, app.seo_daily.g_pages), b_clicks = coalesce(excluded.b_clicks, app.seo_daily.b_clicks),
        b_impressions = coalesce(excluded.b_impressions, app.seo_daily.b_impressions), b_pages = coalesce(excluded.b_pages, app.seo_daily.b_pages), updated_at = now()`;
    n++;
  }
  return n;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** All saved days, newest first. Reads the database only. */
export async function dailyTable(): Promise<DayRow[]> {
  const s = await table();
  const rows = await s`select day::text as day, g_clicks, g_impressions, g_ctr, g_position, g_pages, b_clicks, b_impressions, b_pages from app.seo_daily order by day desc`;
  return rows.map((r) => ({
    day: r.day as string, gClicks: num(r.g_clicks), gImpressions: num(r.g_impressions), gCtr: num(r.g_ctr), gPosition: num(r.g_position), gPages: num(r.g_pages),
    bClicks: num(r.b_clicks), bImpressions: num(r.b_impressions), bPages: num(r.b_pages),
  }));
}
