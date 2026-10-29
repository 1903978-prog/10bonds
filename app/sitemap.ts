import type { MetadataRoute } from "next";
import { brokerSitemapEntries } from "@/lib/brokers/seo";
import { loadPublicData } from "@/lib/brokers/store";
import { COUNTRIES, type Country } from "@/lib/brokers/types";
import { countryView } from "@/lib/brokers/view";
import { CALCULATORS } from "@/lib/seo/calculators";
import { EN_GUIDES } from "@/lib/seo/guidesEn";
import { enBondsPath, enComparisons, enText } from "@/lib/seo/comparisonsEn";
import { CALCULATOR_EN, enPath } from "@/lib/seo/knowledgeEn";
import { curvePath } from "@/lib/seo/yieldCurves";
import { insightsPath } from "@/lib/seo/insights";
import { bondMapPath } from "@/lib/seo/bondMap";
import { bundCurvePath } from "@/lib/seo/bundCurve";
import { SITE_URL } from "@/lib/seo/crawl";
import { LOCALE, LOCALES, pathOf, type Locale, type Section } from "@/lib/seo/locales";
import { comparisonPages, indexable, publishedGuides } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

const langs = (pathFor: (l: Locale) => string | null) =>
  Object.fromEntries(LOCALES.map((l) => [LOCALE[l].hreflang, pathFor(l)]).filter(([, p]) => p).map(([k, p]) => [k, SITE_URL + p]));

// Google fetches this often and a slow or failing database read made it report "Couldn't fetch", so the built
// list is kept for ten minutes and, if a rebuild fails, the last good one is served.
const TTL_MS = 10 * 60 * 1000;
let cached: { at: number; entries: MetadataRoute.Sitemap } | null = null;

/** Every public, indexable page in every language, with its language versions. Private pages are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.entries;
  try {
    const entries = await build();
    cached = { at: Date.now(), entries };
    return entries;
  } catch (e) {
    if (cached) return cached.entries;
    throw e;
  }
}

async function build(): Promise<MetadataRoute.Sitemap> {
  const [{ pages, asOf, source }, guides, brokers] = await Promise.all([comparisonPages(), publishedGuides(), loadPublicData()]);
  const out: MetadataRoute.Sitemap = [
    { url: SITE_URL + "/", changeFrequency: "daily", priority: 1, alternates: { languages: { en: SITE_URL + "/", ...langs((l) => `/${l}`), "x-default": SITE_URL + "/" } } },
    ...["/pricing", "/widget", "/disclaimer", "/ranking-methodology", "/selection-methodology", "/terms", "/privacy", "/cookies", "/about"].map((p) => ({ url: SITE_URL + p, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
  // English Knowledge Center.
  out.push({ url: SITE_URL + enPath(), changeFrequency: "weekly", priority: 0.7, alternates: { languages: { ...langs((x) => pathOf(x, "knowledge")), en: SITE_URL + enPath() } } });
  out.push({ url: SITE_URL + enPath(CALCULATOR_EN.slug), changeFrequency: "monthly", priority: 0.8, alternates: { languages: { ...langs((x) => pathOf(x, "tools", CALCULATORS[x].slug)), en: SITE_URL + enPath(CALCULATOR_EN.slug) } } });
  out.push({ url: SITE_URL + curvePath("en"), changeFrequency: "daily", priority: 0.8, alternates: { languages: { ...langs((x) => curvePath(x)), en: SITE_URL + curvePath("en") } } });
  for (const l of LOCALES) out.push({ url: SITE_URL + curvePath(l), changeFrequency: "daily", priority: 0.8, alternates: { languages: { ...langs((x) => curvePath(x)), en: SITE_URL + curvePath("en") } } });
  for (const l of [...LOCALES, "en" as const]) out.push({ url: SITE_URL + insightsPath(l), lastModified: asOf ?? undefined, changeFrequency: "daily", priority: 0.8, alternates: { languages: { ...langs((x) => insightsPath(x)), en: SITE_URL + insightsPath("en") } } });
  for (const l of [...LOCALES, "en" as const]) out.push({ url: SITE_URL + bondMapPath(l), lastModified: asOf ?? undefined, changeFrequency: "daily", priority: 0.8, alternates: { languages: { ...langs((x) => bondMapPath(x)), en: SITE_URL + bondMapPath("en") } } });
  for (const l of [...LOCALES, "en" as const]) out.push({ url: SITE_URL + bundCurvePath(l), lastModified: asOf ?? undefined, changeFrequency: "weekly", priority: 0.8, alternates: { languages: { ...langs((x) => bundCurvePath(x)), en: SITE_URL + bundCurvePath("en") } } });
  // English bond comparison pages (US and UK readers): the hub, and every page with enough bonds behind it.
  out.push({ url: SITE_URL + enBondsPath(), lastModified: asOf ?? undefined, changeFrequency: "daily", priority: 0.7 });
  for (const d of enComparisons()) {
    const c = pages.find((p) => p.def.id === d.id);
    if (c && indexable(c, source)) out.push({ url: SITE_URL + enBondsPath(enText(d).slug), lastModified: asOf ?? undefined, changeFrequency: "daily", priority: 0.8 });
  }
  for (const g of EN_GUIDES) out.push({ url: SITE_URL + enPath(g.slug), changeFrequency: "monthly", priority: 0.7 });
  for (const l of LOCALES) {
    out.push({ url: `${SITE_URL}/${l}`, changeFrequency: "daily", priority: 1, alternates: { languages: { en: SITE_URL + "/", ...langs((x) => `/${x}`), "x-default": SITE_URL + "/" } } });
    for (const s of ["knowledge", "guides", "bonds", "tools", "method", "team"] as Section[]) {
      out.push({ url: SITE_URL + pathOf(l, s), changeFrequency: s === "bonds" ? "daily" : "weekly", priority: 0.7, alternates: { languages: langs((x) => pathOf(x, s)) } });
    }
    out.push({ url: SITE_URL + pathOf(l, "tools", CALCULATORS[l].slug), changeFrequency: "monthly", priority: 0.8, alternates: { languages: langs((x) => pathOf(x, "tools", CALCULATORS[x].slug)) } });
    for (const c of pages.filter((p) => indexable(p, source))) {
      out.push({ url: SITE_URL + pathOf(l, "bonds", c.def.text[l].slug), lastModified: asOf ?? undefined, changeFrequency: "daily", priority: 0.8, alternates: { languages: langs((x) => pathOf(x, "bonds", c.def.text[x].slug)) } });
    }
  }
  for (const g of guides.filter((x) => !x.noindex && !x.canonicalUrl)) {
    const sib = guides.filter((x) => g.translationGroup && x.translationGroup === g.translationGroup && !x.noindex);
    out.push({
      url: SITE_URL + pathOf(g.locale, "guides", g.slug),
      lastModified: g.reviewedAt ?? g.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
      ...(sib.length > 1 ? { alternates: { languages: Object.fromEntries(sib.map((x) => [LOCALE[x.locale].hreflang, SITE_URL + pathOf(x.locale, "guides", x.slug)])) } } : {}),
    });
  }
  // Broker fee pages (built and published per market from Admin -> Brokers).
  const today = new Date().toISOString().slice(0, 10);
  const published = Object.fromEntries(COUNTRIES.map((c) => [c, brokers.countries[c].published])) as Record<Country, boolean>;
  const listed = Object.fromEntries(COUNTRIES.map((c) => [c, countryView(brokers, c, today).rows.map((r) => r.profile.id)])) as Record<Country, string[]>;
  out.push(...brokerSitemapEntries(published, listed).map((e) => ({ ...e, changeFrequency: "weekly" as const })));
  return out;
}
