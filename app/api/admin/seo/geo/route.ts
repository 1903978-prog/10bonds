import { NextResponse } from "next/server";
import robots from "@/app/robots";
import { isPublished } from "@/components/brokers/Pages";
import { bingLinks, bingStats, type BingStats } from "@/lib/seo/bing";
import { aiFunnel, aiVisibility, TEST_QUESTIONS, type CitationTest } from "@/lib/seo/geo";
import { EN_GUIDES } from "@/lib/seo/guidesEn";
import { notFound, seoAdmin } from "@/lib/seo/input";
import { comparisonPages, shown } from "@/lib/seo/site";
import { getSeoSetting, listBacklinks, listGuides, listPeople } from "@/lib/seo/store";

export const dynamic = "force-dynamic";

/** AI Visibility: the GEO score out of 100, its checks, and visitors arriving from AI assistants. Admin only. */
export async function GET() {
  if (!(await seoAdmin())) return notFound();
  const [{ pages, asOf, source }, guides, people, backlinks, brokers, funnel, bing] = await Promise.all([
    comparisonPages(),
    listGuides(true).catch(() => []),
    listPeople(true).catch(() => []),
    listBacklinks().catch(() => []),
    Promise.all((["it", "fr", "de"] as const).map((c) => isPublished(c).catch(() => false))),
    aiFunnel(28).catch(() => null),
    getSeoSetting("bing_ai_performance").catch(() => null),
  ]);
  const citationRaw = await getSeoSetting("citation_test").catch(() => null);
  let citations: CitationTest | null = null;
  try { citations = citationRaw ? (JSON.parse(citationRaw) as CitationTest) : null; } catch { citations = null; }
  const key = process.env.BING_WEBMASTER_API_KEY;
  let bingData: BingStats | null = null;
  let bingError: string | null = null;
  if (key) {
    try { bingData = await bingStats(key); } catch (e) { bingError = (e as Error).message; }
  }
  const live = pages.filter((p) => shown(p, source)).length;
  const domains = new Set(backlinks.filter((b) => b.status === "active").map((b) => b.sourceDomain)).size;
  const facts = {
    robots: robots(),
    sitemap: true,
    livePages: source === "live" ? live : 0,
    calculators: 3,
    curvePage: true,
    defaultTable: guides.some((g) => g.slug === "probabilita-default-rating"),
    brokerMarkets: brokers.filter(Boolean).length,
    guides: guides.filter((g) => !g.noindex),
    englishGroups: EN_GUIDES.map((g) => g.group),
    publicAuthors: people.length,
    referringDomains: domains,
    dataAgeDays: asOf ? Math.floor((Date.now() - Date.parse(asOf)) / 86_400_000) : null,
    methodology: true,
    aiReferralTracking: funnel !== null,
    // A test counts as running when one finished in the last 8 days.
    citationTest: !!citations && Date.now() - Date.parse(citations.at) < 8 * 86_400_000,
    bingConnected: !!bing || !!bingData,
  };
  return NextResponse.json({ ...aiVisibility(facts), funnel, questions: TEST_QUESTIONS, citations, bing: { state: key ? (bingData ? "connected" : "error") : "not_connected", error: bingError, data: bingData, links: bingLinks() } }, { headers: { "Cache-Control": "no-store" } });
}
