import { NextResponse } from "next/server";
import { searchConsoleTotals, serviceAccount } from "@/lib/seo/google";
import { GSC_COUNTRY, notFound, seoAdmin, seoMarketOf } from "@/lib/seo/input";
import { contentScoreFor } from "@/lib/seo/contentScores";
import { rankings, syncKeywords } from "@/lib/seo/rankings";
import { gscProperty } from "@/lib/seo/engines";
import { keywordHistory, listKeywords } from "@/lib/seo/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Google rankings of one market's target keywords. Refreshes from Search Console at most once a day. */
export async function GET(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const market = seoMarketOf(new URL(req.url).searchParams.get("market"));
  const site = await gscProperty();
  const sa = serviceAccount();
  const state = !sa ? "not_connected" : !site ? "needs_setting" : "connected";
  let error: string | null = null;
  let site28: { clicks: number; impressions: number; position: number } | null = null;
  if (state === "connected") {
    const kws = await listKeywords(market);
    const last = kws.map((k) => k.metricsAt).filter(Boolean).sort().at(-1);
    const stale = !last || Date.now() - Date.parse(last) > 3 * 86_400_000; // Search Console data lags 2-3 days
    try {
      if (stale && kws.length) await syncKeywords(market, site!);
      site28 = GSC_COUNTRY[market] ? await searchConsoleTotals(site!, "/", 28, GSC_COUNTRY[market]) : await searchConsoleTotals(site!, `/${market}/`);
    } catch (e) {
      error = (e as Error).message;
    }
  }
  const [keywords, history] = await Promise.all([listKeywords(market), keywordHistory(market)]);
  const r = rankings(keywords, history);
  const rows = r.rows.map((x) => ({ ...x, content: contentScoreFor(market, x.keyword) }));
  return NextResponse.json({ market, state, site, serviceAccount: sa?.client_email ?? null, error, site28, ...r, rows }, { headers: { "Cache-Control": "no-store" } });
}
