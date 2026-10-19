import type { MetadataRoute } from "next";
import { brokerSitemapEntries } from "@/lib/brokers/seo";
import { loadPublicData } from "@/lib/brokers/store";
import { COUNTRIES, type Country } from "@/lib/brokers/types";
import { countryView } from "@/lib/brokers/view";
import { CALCULATORS } from "@/lib/seo/calculators";
import { EN_GUIDES } from "@/lib/seo/guidesEn";
import { CALCULATOR_EN, enPath } from "@/lib/seo/knowledgeEn";
import { curvePath } from "@/lib/seo/yieldCurves";
import { SITE_URL } from "@/lib/seo/crawl";
import { LOCALE, LOCALES, pathOf, type Locale, type Section } from "@/lib/seo/locales";
import { comparisonPages, indexable, publishedGuides } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

const langs = (pathFor: (l: Locale) => string | null) =>
  Object.fromEntries(LOCALES.map((l) => [LOCALE[l].hreflang, pathFor(l)]).filter(([, p]) => p).map(([k, p]) => [k, SITE_URL + p]));

/** Every public, indexable page in every language, with its language versions. Private pages are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ pages, asOf, source }, guides, brokers] = await Promise.all([comparisonPages(), publishedGuides(), loadPublicData()]);
  const out: MetadataRoute.Sitemap = [
    { url: SITE_URL + "/", changeFrequency: "daily", priority: 1, alternates: { languages: { ...langs((l) => `/${l}`), "x-default": SITE_URL + "/" } } },
    ...["/pricing", "/disclaimer", "/terms", "/privacy", "/cookies"].map((p) => ({ url: SITE_URL + p, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
  // English Knowledge Center.
  out.push({ url: SITE_URL + enPath(), changeFrequency: "weekly", priority: 0.7, alternates: { languages: { ...langs((x) => pathOf(x, "knowledge")), en: SITE_URL + enPath() } } });
  out.push({ url: SITE_URL + enPath(CALCULATOR_EN.slug), changeFrequency: "monthly", priority: 0.8, alternates: { languages: { ...langs((x) => pathOf(x, "tools", CALCULATORS[x].slug)), en: SITE_URL + enPath(CALCULATOR_EN.slug) } } });
  out.push({ url: SITE_URL + curvePath("en"), changeFrequency: "daily", priority: 0.8, alternates: { languages: { ...langs((x) => curvePath(x)), en: SITE_URL + curvePath("en") } } });
  for (const l of LOCALES) out.push({ url: SITE_URL + curvePath(l), changeFrequency: "daily", priority: 0.8, alternates: { languages: { ...langs((x) => curvePath(x)), en: SITE_URL + curvePath("en") } } });
  for (const g of EN_GUIDES) out.push({ url: SITE_URL + enPath(g.slug), changeFrequency: "monthly", priority: 0.7 });
  for (const l of LOCALES) {
    out.push({ url: `${SITE_URL}/${l}`, changeFrequency: "daily", priority: 1, alternates: { languages: langs((x) => `/${x}`) } });
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
