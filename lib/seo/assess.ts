import { loadBonds } from "../bonds";
import { crawlSite, SITE_URL } from "./crawl";
import { evaluate } from "./evaluate";
import { pageSpeed, type PsiResult } from "./google";
import { EN_GUIDES } from "./guidesEn";
import { enPath } from "./knowledgeEn";
import { isEuMarket, SEO_MARKETS, type SeoMarket } from "./input";
import { mergeManual, overallScore, round2, type CriterionResult } from "./rubric";
import { recordRefresh } from "./summary";
import {
  ANALYST_NAME, clearStale, getSeoSetting, guideLogCounts, latestManual, listBacklinks, listGuides, listKeywords, listOpportunities, listPeople, saveAssessment, setSeoSetting,
} from "./store";

const PSI_MAX_AGE_DAYS = 7;

/** The US and UK share the English pages, so they share one PageSpeed run (stored as "en"). */
const psiKey = (m: SeoMarket) => (isEuMarket(m) ? m : "en");
const psiPath = (m: SeoMarket) => (isEuMarket(m) ? `/${m}` : enPath());

/** PageSpeed results per language home page. */
export async function storedPsi(market: SeoMarket): Promise<{ psi: PsiResult | null; error: string | null }> {
  const raw = await getSeoSetting(`psi_${psiKey(market)}`);
  const err = await getSeoSetting(`psi_error_${psiKey(market)}`);
  try {
    return { psi: raw ? (JSON.parse(raw) as PsiResult) : null, error: err };
  } catch {
    return { psi: null, error: err };
  }
}

/** Run PageSpeed Insights (mobile) on a language home page and keep the result (20-60 seconds each). */
export async function refreshPsi(market: SeoMarket): Promise<{ psi: PsiResult | null; error: string | null }> {
  try {
    const psi = await pageSpeed(SITE_URL + psiPath(market));
    await setSeoSetting(`psi_${psiKey(market)}`, JSON.stringify(psi));
    await setSeoSetting(`psi_error_${psiKey(market)}`, null);
    return { psi, error: null };
  } catch (e) {
    const error = (e as Error).message.slice(0, 200);
    await setSeoSetting(`psi_error_${psiKey(market)}`, `${new Date().toISOString().slice(0, 10)}: ${error}`);
    return { ...(await storedPsi(market)), error };
  }
}

/**
 * One full assessment for every market: crawl the site once, read the database, use the last PageSpeed runs
 * (refreshed when older than a week or when asked), apply manual assessments, then store each criterion and the
 * market score as a new row. Nothing is overwritten.
 */
export async function runAssessment(by: string, trigger: string, opts: { psi?: boolean } = {}) {
  const psiByMarket = {} as Record<SeoMarket, { psi: PsiResult | null; error: string | null }>;
  // One run per page: the UK reuses the US (English) result.
  await Promise.all(
    SEO_MARKETS.filter((m) => m !== "uk").map(async (m) => {
      let r = await storedPsi(m);
      const old = !r.psi || Date.now() - Date.parse(r.psi.at) > PSI_MAX_AGE_DAYS * 86_400_000;
      if (opts.psi || (old && process.env.NODE_ENV === "production" && trigger === "manual")) r = await refreshPsi(m);
      psiByMarket[m] = r;
    }),
  );
  psiByMarket.uk = psiByMarket.us;
  const [crawl, guides, logs, people, backlinks, opportunities, checked, keywords, data] = await Promise.all([
    crawlSite(),
    listGuides(true),
    guideLogCounts(),
    listPeople(),
    listBacklinks(),
    listOpportunities(),
    getSeoSetting("backlinks_checked_at"),
    listKeywords(),
    loadBonds().catch(() => null),
  ]);
  const analyst = people.find((p) => p.name === ANALYST_NAME && p.isPublic);
  const markets = [];
  for (const m of SEO_MARKETS) {
    const auto = evaluate({
      market: m,
      now: new Date(),
      keywords: keywords.filter((k) => k.market === m),
      crawl,
      guides: isEuMarket(m)
        ? guides.filter((g) => g.locale === m).map((g) => ({ ...g, logCount: logs[g.id] ?? 0 }))
        : EN_GUIDES.map((g) => ({ slug: g.slug, seoTitle: g.seoTitle, metaDescription: g.metaDescription, primaryKeyword: g.primaryKeyword, relatedKeywords: g.relatedKeywords ?? [], reviewerId: analyst?.id ?? null, reviewedAt: analyst ? (g.updated ?? g.published ?? null) : null, logCount: g.revisions?.length ?? 0 })),
      people,
      dataSource: data?.source ?? null,
      backlinks,
      backlinksChecked: checked !== null,
      opportunities,
      psi: psiByMarket[m].psi,
      psiError: psiByMarket[m].error,
    });
    const results: CriterionResult[] = mergeManual(auto, await latestManual(m));
    const score = overallScore(results);
    const id = await saveAssessment({
      market: m,
      by,
      trigger,
      overall: score.total,
      assessed: score.assessed,
      criteria: score.criteria,
      dimensions: Object.fromEntries(score.dimensions.map((d) => [d.id, d.rating])),
      results,
    });
    markets.push({ market: m, id, overall: score.total });
  }
  await clearStale();
  const global = round2(markets.reduce((s, x) => s + x.overall, 0) / markets.length);
  await recordRefresh(crawl, global).catch(() => {});
  return { markets, global, crawl: { pages: crawl.pages.length, error: crawl.error } };
}
