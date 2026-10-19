// Bing Webmaster Tools API (key in BING_WEBMASTER_API_KEY). Read-only: clicks and impressions by day and the top
// searches for the site. Bing's AI Performance report (Copilot citations) has no API, so it is linked, not read.

export const BING_SITE = "https://www.10bonds.com/"; // the site as registered in Bing Webmaster Tools
const API = "https://ssl.bing.com/webmaster/api.svc/json";

export const bingLinks = (site = BING_SITE) => {
  const q = `siteUrl=${encodeURIComponent(site)}`;
  return {
    overview: `https://www.bing.com/webmasters/home?${q}`,
    performance: `https://www.bing.com/webmasters/searchperf?${q}`,
    ai: `https://www.bing.com/webmasters/aiperformance?${q}`,
  };
};

/** Bing dates come as "/Date(1700000000000-0800)/". */
export function bingDate(v: unknown): string | null {
  const m = String(v ?? "").match(/Date\((-?\d+)/);
  return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : null;
}

async function call<T>(method: string, key: string, site: string): Promise<T[]> {
  const r = await fetch(`${API}/${method}?siteUrl=${encodeURIComponent(site)}&apikey=${encodeURIComponent(key)}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Bing ${method}: ${r.status}`);
  const j = (await r.json()) as { d?: T[] };
  return j.d ?? [];
}

export type BingStats = {
  days: number; clicks: number; impressions: number;
  daily: { date: string; clicks: number; impressions: number }[];
  queries: { query: string; clicks: number; impressions: number; position: number | null }[];
};

/** Last 28 days of Bing traffic and the 25 searches with the most impressions. */
export async function bingStats(key: string, site = BING_SITE, days = 28): Promise<BingStats> {
  type Day = { Date: string; Clicks: number; Impressions: number };
  type Query = { Query: string; Clicks: number; Impressions: number; AvgImpressionPosition: number; Date: string };
  const [traffic, queries] = await Promise.all([call<Day>("GetRankAndTrafficStats", key, site), call<Query>("GetQueryStats", key, site)]);
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const daily = traffic.map((d) => ({ date: bingDate(d.Date) ?? "", clicks: Number(d.Clicks) || 0, impressions: Number(d.Impressions) || 0 })).filter((d) => d.date >= since).sort((a, b) => a.date.localeCompare(b.date));
  const byQuery = new Map<string, { clicks: number; impressions: number; pos: number; w: number }>();
  for (const q of queries) {
    if ((bingDate(q.Date) ?? "") < since) continue;
    const x = byQuery.get(q.Query) ?? { clicks: 0, impressions: 0, pos: 0, w: 0 };
    const imp = Number(q.Impressions) || 0;
    x.clicks += Number(q.Clicks) || 0;
    x.impressions += imp;
    if (q.AvgImpressionPosition > 0) { x.pos += q.AvgImpressionPosition * imp; x.w += imp; }
    byQuery.set(q.Query, x);
  }
  return {
    days,
    clicks: daily.reduce((s, d) => s + d.clicks, 0),
    impressions: daily.reduce((s, d) => s + d.impressions, 0),
    daily,
    queries: [...byQuery.entries()].map(([query, x]) => ({ query, clicks: x.clicks, impressions: x.impressions, position: x.w ? Math.round((x.pos / x.w) * 10) / 10 : null }))
      .sort((a, b) => b.impressions - a.impressions).slice(0, 25),
  };
}
