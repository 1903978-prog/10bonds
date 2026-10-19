import { loadBonds } from "../bonds";
import { crawlSite, SITE_URL } from "./crawl";
import { evaluate } from "./evaluate";
import { pageSpeed, type PsiResult } from "./google";
import { LOCALES, type Locale } from "./locales";
import { mergeManual, overallScore, round2, type CriterionResult } from "./rubric";
import { recordRefresh } from "./summary";
import {
  clearStale, getSeoSetting, guideLogCounts, latestManual, listBacklinks, listGuides, listKeywords, listOpportunities, listPeople, saveAssessment, setSeoSetting,
} from "./store";

const PSI_MAX_AGE_DAYS = 7;

/** PageSpeed results per language home page. */
export async function storedPsi(market: Locale): Promise<{ psi: PsiResult | null; error: string | null }> {
  const raw = await getSeoSetting(`psi_${market}`);
  const err = await getSeoSetting(`psi_error_${market}`);
  try {
    return { psi: raw ? (JSON.parse(raw) as PsiResult) : null, error: err };
  } catch {
    return { psi: null, error: err };
  }
}

/** Run PageSpeed Insights (mobile) on a language home page and keep the result (20-60 seconds each). */
export async function refreshPsi(market: Locale): Promise<{ psi: PsiResult | null; error: string | null }> {
  try {
    const psi = await pageSpeed(`${SITE_URL}/${market}`);
    await setSeoSetting(`psi_${market}`, JSON.stringify(psi));
    await setSeoSetting(`psi_error_${market}`, null);
    return { psi, error: null };
  } catch (e) {
    const error = (e as Error).message.slice(0, 200);
    await setSeoSetting(`psi_error_${market}`, `${new Date().toISOString().slice(0, 10)}: ${error}`);
    return { ...(await storedPsi(market)), error };
  }
}

/**
 * One full assessment for every market: crawl the site once, read the database, use the last PageSpeed runs
 * (refreshed when older than a week or when asked), apply manual assessments, then store each criterion and the
 * market score as a new row. Nothing is overwritten.
 */
export async function runAssessment(by: string, trigger: string, opts: { psi?: boolean } = {}) {
  const psiByMarket = {} as Record<Locale, { psi: PsiResult | null; error: string | null }>;
  await Promise.all(
    LOCALES.map(async (m) => {
      let r = await storedPsi(m);
      const old = !r.psi || Date.now() - Date.parse(r.psi.at) > PSI_MAX_AGE_DAYS * 86_400_000;
      if (opts.psi || (old && process.env.NODE_ENV === "production" && trigger === "manual")) r = await refreshPsi(m);
      psiByMarket[m] = r;
    }),
  );
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
  const markets = [];
  for (const m of LOCALES) {
    const auto = evaluate({
      market: m,
      now: new Date(),
      keywords: keywords.filter((k) => k.market === m),
      crawl,
      guides: guides.filter((g) => g.locale === m).map((g) => ({ ...g, logCount: logs[g.id] ?? 0 })),
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
