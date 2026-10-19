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

async function callOne<T>(method: string, key: string, params: Record<string, string | number>): Promise<T | null> {
  const q = Object.entries({ ...params, apikey: key }).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  const r = await fetch(`${API}/${method}?${q}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Bing ${method}: ${r.status}`);
  return ((await r.json()) as { d?: T }).d ?? null;
}

/** Links from other websites that Bing knows, as (linking page, page on the site) pairs. Own domains are left out. */
export async function bingInboundLinks(key: string, site = BING_SITE, maxPages = 50): Promise<{ sourceUrl: string; targetUrl: string }[]> {
  type Counts = { Links?: { Url: string; Count: number }[]; TotalPages?: number };
  type Details = { Details?: { Url: string; AnchorText?: string }[]; TotalPages?: number };
  const targets: { Url: string; Count: number }[] = [];
  for (let page = 0; page < 10; page++) {
    const c = await callOne<Counts>("GetLinkCounts", key, { siteUrl: site, page });
    targets.push(...(c?.Links ?? []));
    if (!c || page + 1 >= (c.TotalPages ?? 1)) break;
  }
  const own = (u: string) => { try { return /(^|\.)10bonds\.(com|fly\.dev)$/.test(new URL(u).hostname); } catch { return true; } };
  const out = new Map<string, { sourceUrl: string; targetUrl: string }>();
  for (const t of targets.filter((t) => t.Count > 0).sort((a, b) => b.Count - a.Count).slice(0, maxPages)) {
    for (let page = 0; page < 5; page++) {
      const d = await callOne<Details>("GetUrlLinks", key, { siteUrl: site, link: t.Url, page });
      for (const l of d?.Details ?? []) if (/^https?:\/\//.test(l.Url) && !own(l.Url)) out.set(`${l.Url} ${t.Url}`, { sourceUrl: l.Url, targetUrl: t.Url });
      if (!d || page + 1 >= (d.TotalPages ?? 1)) break;
    }
  }
  return [...out.values()];
}

export type SearchKpis = {
  days: number;
  clicks: number; impressions: number; ctr: number | null; position: number | null;
  prevClicks: number | null; prevImpressions: number | null;
  indexed: number | null; // pages in the index (Bing: latest crawl report)
};

type Day = { Date: string; Clicks: number; Impressions: number };
type QueryRow = { Query: string; Clicks: number; Impressions: number; AvgImpressionPosition: number; Date: string };
type CrawlRow = { Date: string; InIndex: number };

/** Headline Bing figures from the raw API rows: this period, the period before, and the latest indexed-page count. */
export function bingKpisFrom(traffic: Day[], queries: QueryRow[], crawl: CrawlRow[], days = 28, now = Date.now()): SearchKpis {
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const since = iso(now - days * 86_400_000);
  const before = iso(now - 2 * days * 86_400_000);
  const sum = (from: string, to: string | null) => traffic.reduce((s, d) => {
    const day = bingDate(d.Date) ?? "";
    return day >= from && (to === null || day < to) ? { clicks: s.clicks + (Number(d.Clicks) || 0), impressions: s.impressions + (Number(d.Impressions) || 0) } : s;
  }, { clicks: 0, impressions: 0 });
  const cur = sum(since, null);
  const oldest = traffic.map((d) => bingDate(d.Date) ?? "").filter(Boolean).sort()[0];
  const prev = oldest && oldest <= before ? sum(before, since) : null; // only when Bing has the whole earlier period
  let pos = 0, w = 0;
  for (const q of queries) {
    const imp = Number(q.Impressions) || 0;
    if ((bingDate(q.Date) ?? "") >= since && q.AvgImpressionPosition > 0) { pos += q.AvgImpressionPosition * imp; w += imp; }
  }
  const lastCrawl = [...crawl].sort((a, b) => (bingDate(b.Date) ?? "").localeCompare(bingDate(a.Date) ?? ""))[0];
  return {
    days,
    clicks: cur.clicks,
    impressions: cur.impressions,
    ctr: cur.impressions ? cur.clicks / cur.impressions : null,
    position: w ? Math.round((pos / w) * 10) / 10 : null,
    prevClicks: prev?.clicks ?? null,
    prevImpressions: prev?.impressions ?? null,
    indexed: lastCrawl ? Number(lastCrawl.InIndex) || 0 : null,
  };
}

/** Bing headline figures for the last `days` days. */
export async function bingKpis(key: string, site = BING_SITE, days = 28): Promise<SearchKpis> {
  const [traffic, queries, crawl] = await Promise.all([
    call<Day>("GetRankAndTrafficStats", key, site),
    call<QueryRow>("GetQueryStats", key, site),
    call<CrawlRow>("GetCrawlStats", key, site).catch(() => []),
  ]);
  return bingKpisFrom(traffic, queries, crawl, days);
}
