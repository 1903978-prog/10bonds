import { lastTradingDay, tradingDaysBetween } from "./tradingCalendar";

export type Cur = "EUR" | "USD";
/** One group of the scan: bonds of one currency whose quote has the same UTC day, status and reason. */
export type FreshRow = { cur: Cur; day: string | null; status: string | null; reason: string | null; n: number };
export type ReasonGroup = { reason: string; count: number };
export type CurFresh = {
  currency: Cur; total: number; last24h: number; within1: number; within3: number; within5: number; noDate: number;
  newestQuote: string | null; lastPush: string | null; pushIsReal: boolean; refCalendarDay: string; notRefreshed: ReasonGroup[];
};
export type Banner = { red: boolean; reasons: string[] };

export const NO_REASON = "No reason sent by data feed";
export const PUSH_MAX_HOURS = 26;
export const MIN_SHARE_3D = 0.99;

/** Plain words for a reason code sent by the LM op model ("no_quote" -> "No quote from data feed"). */
export function plainReason(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return NO_REASON;
  const known: Record<string, string> = {
    no_quote: "No quote from data feed", no_price: "No quote from data feed", not_in_feed: "Bond not in data feed", stale_source: "Data feed price is old",
    timeout: "Data feed did not answer", api_error: "Data feed returned an error", rate_limited: "Data feed limit reached", illiquid: "Bond rarely trades",
  };
  const k = s.toLowerCase().replace(/[\s-]+/g, "_");
  if (known[k]) return known[k];
  const words = s.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Share and counts per currency from the grouped scan. `now` decides the reference trading day; `pushes` are the latest push time per currency (null when the copy has no push column). */
export function summarise(rows: FreshRow[], newest: Record<Cur, string | null>, pushes: Record<Cur, string | null>, now: Date, h24: Record<Cur, number>): { rows: CurFresh[]; banner: Banner } {
  const out: CurFresh[] = (["EUR", "USD"] as Cur[]).map((cur) => {
    const ref = lastTradingDay(cur, now.toISOString().slice(0, 10));
    let total = 0, w1 = 0, w3 = 0, w5 = 0, noDate = 0;
    const groups = new Map<string, number>();
    for (const r of rows) {
      if (r.cur !== cur) continue;
      total += r.n;
      if (!r.day) { noDate += r.n; groups.set(plainReason(r.reason), (groups.get(plainReason(r.reason)) ?? 0) + r.n); continue; }
      const age = tradingDaysBetween(cur, r.day, ref);
      if (age <= 1) w1 += r.n;
      if (age <= 3) w3 += r.n;
      if (age <= 5) w5 += r.n;
      if (age > 3) { const g = plainReason(r.reason); groups.set(g, (groups.get(g) ?? 0) + r.n); }
    }
    const notRefreshed = [...groups].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
    const pushIsReal = !!pushes[cur];
    return { currency: cur, total, last24h: h24[cur], within1: w1, within3: w3, within5: w5, noDate, newestQuote: newest[cur], lastPush: pushes[cur] ?? newest[cur], pushIsReal, refCalendarDay: ref, notRefreshed };
  });
  const reasons: string[] = [];
  for (const c of out) if (c.total && c.within3 / c.total < MIN_SHARE_3D) reasons.push(`${c.currency}: only ${(100 * c.within3 / c.total).toFixed(1)}% of bonds have a price within 3 trading days (target 99%)`);
  for (const c of out) {
    if (!c.pushIsReal) continue;
    const hours = c.lastPush ? (now.getTime() - Date.parse(c.lastPush)) / 3_600_000 : Infinity;
    if (hours > PUSH_MAX_HOURS) reasons.push(`${c.currency}: last push from the data feed is ${Number.isFinite(hours) ? Math.round(hours) + " h" : "unknown"} old (limit ${PUSH_MAX_HOURS} h)`);
  }
  return { rows: out, banner: { red: reasons.length > 0, reasons } };
}

const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
export type NotRefreshedBond = { isin: string; name: string | null; issuer: string | null; currency: string; priceDate: string | null; ageTradingDays: number | null; status: string | null; reason: string; lastAttempt: string | null };
export const bondsCsv = (bonds: NotRefreshedBond[]): string =>
  ["ISIN,Name,Issuer,Currency,Price date,Age (trading days),Refresh status,Reason,Last refresh attempt"]
    .concat(bonds.map((b) => [b.isin, q(b.name ?? ""), q(b.issuer ?? ""), b.currency, b.priceDate ?? "", b.ageTradingDays ?? "", b.status ?? "", q(b.reason), b.lastAttempt ?? ""].join(","))).join("\n");
