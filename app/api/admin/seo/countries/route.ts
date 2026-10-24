import { NextResponse } from "next/server";
import { firstPartyFunnel } from "@/lib/seo/funnel";
import { searchConsole, serviceAccount } from "@/lib/seo/google";
import { notFound, seoAdmin } from "@/lib/seo/input";
import { LOCALE, LOCALES, type Locale } from "@/lib/seo/locales";
import { round2 } from "@/lib/seo/rubric";
import { comparisonPages, indexable } from "@/lib/seo/site";
import { getSeoSetting, latestAssessments, listGuides, listKeywords } from "@/lib/seo/store";
import { gscProperty } from "@/lib/seo/engines";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Countries & Languages: one row per market with content, keywords, search and business numbers and its SEO score,
 * plus the translation status of every guide. Search and business figures stay null when their source is missing.
 */
export async function GET() {
  if (!(await seoAdmin())) return notFound();
  const [guides, keywords, { pages, source }, gscSite] = await Promise.all([listGuides(), listKeywords(), comparisonPages(), gscProperty()]);
  const gsc = serviceAccount() && gscSite ? await searchConsole(gscSite).catch(() => null) : null;
  const inMarket = (url: string, m: Locale) => {
    try {
      const p = new URL(url).pathname;
      return p === `/${m}` || p.startsWith(`/${m}/`);
    } catch {
      return false;
    }
  };
  const markets = await Promise.all(
    LOCALES.map(async (m) => {
      const [last] = await latestAssessments(m, 1);
      const funnel = await firstPartyFunnel(28, m).catch(() => null);
      const g = guides.filter((x) => x.locale === m);
      const gp = gsc?.pages.filter((p) => inMarket(p.key, m)) ?? null;
      return {
        market: m,
        name: LOCALE[m].marketName,
        language: LOCALE[m].name,
        publishedGuides: g.filter((x) => x.status === "published").length,
        guidesInReview: g.filter((x) => x.status === "review").length,
        draftGuides: g.filter((x) => x.status === "draft").length,
        indexableComparisons: pages.filter((p) => indexable(p, source)).length,
        keywords: keywords.filter((k) => k.market === m).length,
        // Search Console's top 25 pages only, so these are lower bounds until the full export is used.
        impressions: gp ? gp.reduce((s, p) => s + p.impressions, 0) : null,
        clicks: gp ? gp.reduce((s, p) => s + p.clicks, 0) : null,
        registrations: funnel?.organicSignups ?? null,
        paidConversions: funnel?.organicPaid ?? null,
        score: last?.row.overall ?? null,
        scoredAt: last?.row.at ?? null,
      };
    }),
  );
  const scored = markets.filter((m) => m.score !== null);
  // Translation status per guide group: which languages have it, and whether a version is missing, outdated or unverified.
  const groups = [...new Set(guides.map((g) => g.translationGroup ?? `#${g.id}`))].map((group) => {
    const members = guides.filter((g) => (g.translationGroup ?? `#${g.id}`) === group);
    const newest = Math.max(...members.map((g) => Date.parse(g.updatedAt)));
    return {
      group,
      versions: Object.fromEntries(
        LOCALES.map((l) => {
          const g = members.find((x) => x.locale === l);
          return [l, g ? {
            id: g.id, slug: g.slug, title: g.title, status: g.status,
            unverified: g.machineTranslated,
            // Another language was edited more than a day after this one: it may need the same change.
            outdated: members.length > 1 && newest - Date.parse(g.updatedAt) > 86_400_000,
          } : null];
        }),
      ),
    };
  });
  return NextResponse.json(
    {
      markets,
      // Equal-weighted average of the three market scores: an internal metric, not something Google measures.
      global: scored.length === LOCALES.length ? round2(scored.reduce((s, m) => s + (m.score ?? 0), 0) / scored.length) : null,
      gscConnected: gsc !== null,
      translations: groups,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
