import { NextResponse } from "next/server";
import robots from "@/app/robots";
import { isPublished } from "@/components/brokers/Pages";
import { bingLinks, bingStats, type BingStats } from "@/lib/seo/bing";
import { aiFunnel, aiVisibility, TEST_QUESTIONS, type CitationTest } from "@/lib/seo/geo";
import { EN_GUIDES } from "@/lib/seo/guidesEn";
import { isoWeek, MANUAL_ASSISTANTS, manualPrompt, parseManual, type ManualAssistant, type ParsedAnswers } from "@/lib/seo/citationManual";
import { notFound, seoAdmin } from "@/lib/seo/input";
import { comparisonPages, shown } from "@/lib/seo/site";
import { getSeoSetting, listBacklinks, listGuides, listPeople, setSeoSetting } from "@/lib/seo/store";

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
  const manual = await readManual();
  // This week's (or else last week's) pasted answers count like an automatic test.
  const weeks = Object.keys(manual).sort().reverse().slice(0, 2);
  const manualRows = MANUAL_ASSISTANTS.flatMap((a) => {
    const w = weeks.find((k) => manual[k]?.[a.id]);
    const r = w ? manual[w][a.id] : null;
    return r ? [{ id: `manual-${a.id}`, name: `${a.name} (pasted ${w})`, asked: r.answers.length, answered: r.answered, cited: r.cited, answers: r.answers, at: r.at }] : [];
  });
  if (manualRows.length) {
    const auto = citations?.assistants.filter((x) => x.answered > 0) ?? [];
    citations = { at: [citations?.at, ...manualRows.map((r) => r.at)].filter((x): x is string => !!x).sort().reverse()[0], assistants: [...auto, ...manualRows.map(({ at: _at, ...r }) => r)], competitors: citations?.competitors ?? [] };
  }
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
    citationTest: !!citations && citations.assistants.some((a) => a.answered > 0) && Date.now() - Date.parse(citations.at) < 8 * 86_400_000,
    bingConnected: !!bing || !!bingData,
  };
  return NextResponse.json({ ...aiVisibility(facts), funnel, questions: TEST_QUESTIONS, citations, manual: { prompt: manualPrompt(), week: isoWeek(), assistants: MANUAL_ASSISTANTS, saved: MANUAL_ASSISTANTS.filter((a) => manual[isoWeek()]?.[a.id]).map((a) => a.id) }, bing: { state: key ? (bingData ? "connected" : "error") : "not_connected", error: bingError, data: bingData, links: bingLinks() } }, { headers: { "Cache-Control": "no-store" } });
}

type Manual = Record<string, Partial<Record<ManualAssistant, ParsedAnswers & { at: string }>>>;
async function readManual(): Promise<Manual> {
  try { return JSON.parse((await getSeoSetting("citation_manual")) ?? "{}") as Manual; } catch { return {}; }
}

/** Save the answers Livio pasted from ChatGPT or Claude for this week. Keeps the last 12 weeks. */
export async function POST(req: Request) {
  if (!(await seoAdmin())) return notFound();
  const b = (await req.json().catch(() => ({}))) as { assistant?: string; text?: string };
  const a = MANUAL_ASSISTANTS.find((x) => x.id === b.assistant);
  if (!a || typeof b.text !== "string" || !b.text.trim()) return NextResponse.json({ error: "Paste the answers first." }, { status: 400 });
  const parsed = parseManual(b.text.slice(0, 400_000));
  if (!parsed.answered) return NextResponse.json({ error: 'No answers found. Each answer must start with its number, like "Q1:".' }, { status: 400 });
  const manual = await readManual();
  const week = isoWeek();
  manual[week] = { ...manual[week], [a.id]: { ...parsed, at: new Date().toISOString() } };
  for (const k of Object.keys(manual).sort().reverse().slice(12)) delete manual[k];
  await setSeoSetting("citation_manual", JSON.stringify(manual));
  return NextResponse.json({ ok: true, week, answered: parsed.answered, cited: parsed.cited });
}
