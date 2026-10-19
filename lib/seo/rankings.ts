import { searchConsoleQueries } from "./google";
import type { Locale } from "./locales";
import { listKeywords, setKeywordMetrics, type Keyword } from "./store";

// Google rankings of the target keywords, from Search Console. Position is Google's average position over the last
// 28 days for that exact search, on this market's pages; page 1 = position 10 or better. Nothing is estimated: a
// keyword without impressions is "not ranking yet".

/** Search Console figures for each keyword of a market: exact query match, summed over the market's pages. */
export async function syncKeywords(market: Locale, site: string) {
  const { end, rows } = await searchConsoleQueries(site);
  const mine = rows.filter((r) => {
    try {
      const p = new URL(r.page).pathname;
      return p === `/${market}` || p.startsWith(`/${market}/`);
    } catch {
      return false;
    }
  });
  const keywords = await listKeywords(market);
  for (const k of keywords) {
    const hits = mine.filter((r) => r.query.toLowerCase() === k.keyword.toLowerCase());
    const impressions = hits.reduce((s, r) => s + r.impressions, 0);
    const clicks = hits.reduce((s, r) => s + r.clicks, 0);
    const position = impressions ? hits.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : null;
    await setKeywordMetrics(k.id, { position: position === null ? null : Math.round(position * 10) / 10, clicks, impressions, at: end });
  }
  return { updated: keywords.length, end };
}

export type Bucket = "top3" | "page1" | "page2" | "beyond" | "none";
export const bucketOf = (position: number | null, impressions: number | null): Bucket =>
  !impressions || position === null ? "none" : position <= 3 ? "top3" : position <= 10 ? "page1" : position <= 20 ? "page2" : "beyond";

export type RankingRow = {
  id: number; keyword: string; landingPath: string | null; volume: number | null;
  position: number | null; previous: number | null; bucket: Bucket; clicks: number | null; impressions: number | null; ctr: number | null;
};

/** Per-keyword ranking rows and the headline KPIs. `history` is newest first. */
export function rankings(keywords: Keyword[], history: { keywordId: number; at: string; position: number | null }[]) {
  const rows: RankingRow[] = keywords.map((k) => {
    const past = history.filter((h) => h.keywordId === k.id && h.at !== k.metricsAt);
    return {
      id: k.id, keyword: k.keyword, landingPath: k.landingPath, volume: k.volume,
      position: k.impressions ? k.position : null, previous: past[0]?.position ?? null,
      bucket: bucketOf(k.position, k.impressions), clicks: k.clicks, impressions: k.impressions,
      ctr: k.impressions ? (k.clicks ?? 0) / k.impressions : null,
    };
  });
  const synced = keywords.some((k) => k.metricsAt);
  const count = (b: Bucket[]) => rows.filter((r) => b.includes(r.bucket)).length;
  const page1 = count(["top3", "page1"]);
  return {
    rows: rows.sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || (b.volume ?? 0) - (a.volume ?? 0)),
    kpi: synced ? {
      tracked: rows.length, ranking: rows.length - count(["none"]), top3: count(["top3"]), page1,
      page1Share: rows.length ? page1 / rows.length : 0, page2: count(["page2"]),
      clicks: rows.reduce((s, r) => s + (r.clicks ?? 0), 0), impressions: rows.reduce((s, r) => s + (r.impressions ?? 0), 0),
      at: keywords.map((k) => k.metricsAt).filter(Boolean).sort().at(-1) ?? null,
    } : null,
  };
}
