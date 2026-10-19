import type { Metadata } from "next";
import Link from "next/link";
import { isPublished as brokersPublished } from "@/components/brokers/Pages";
import KnowledgeTools, { FINDER } from "@/components/seo/KnowledgeTools";
import { JsonLd } from "@/components/seo/Seo";
import { sectionPath } from "@/lib/brokers/content";
import { SITE_URL } from "@/lib/seo/crawl";
import { EN_GUIDES } from "@/lib/seo/guidesEn";
import { KC_ORDER } from "@/lib/seo/knowledgeHub";
import { curvePath, CURVE_TEXT } from "@/lib/seo/yieldCurves";
import { insightsPath, INSIGHTS_TEXT } from "@/lib/seo/insights";
import { CALCULATOR_EN, enPath, hubLangs, KC_TEXT_EN, withEnglish } from "@/lib/seo/knowledgeEn";
import { LOCALES } from "@/lib/seo/locales";
import type { KcSection } from "@/lib/seo/knowledge";

// The English Knowledge Center. Same six sections as /it/sapere, /fr/savoir and /de/wissen, all in English.

export const dynamic = "force-dynamic";

const k = KC_TEXT_EN;

export const metadata: Metadata = {
  title: { absolute: k.title },
  description: k.description,
  alternates: withEnglish(enPath(), enPath(), hubLangs()),
  openGraph: { locale: "en_GB", title: k.title, description: k.description },
};

type Item = { title: string; href: string };

export default async function KnowledgePage() {
  const items = Object.fromEntries(KC_ORDER.map((s) => [s, [] as Item[]])) as Record<KcSection, Item[]>;
  for (const g of EN_GUIDES) items[g.section].push({ title: g.title, href: enPath(g.slug) });
  items.best.push({ title: k.finder, href: "/" });
  items.calculators.push({ title: CALCULATOR_EN.h1, href: enPath(CALCULATOR_EN.slug) });
  items.government.unshift({ title: CURVE_TEXT.en.h1, href: curvePath("en") });
  items.best.unshift({ title: INSIGHTS_TEXT.en.h1, href: insightsPath("en") });
  const published = await Promise.all(LOCALES.map((l) => brokersPublished(l).catch(() => false)));
  LOCALES.forEach((l, i) => published[i] && items.brokers.push({ title: k.brokersIn[l], href: sectionPath(l) }));
  return (
    <div>
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{k.h1}</h1>
      <p className="mt-3 max-w-3xl text-[17px] text-mute">{k.lead}</p>
      <KnowledgeTools
        locale="en"
        defaultHref={enPath("bond-default-rates-by-rating")}
        tools={[
          { title: FINDER.en, href: "/" },
          { title: CALCULATOR_EN.h1, href: enPath(CALCULATOR_EN.slug) },
          { title: INSIGHTS_TEXT.en.h1, href: insightsPath("en") },
          { title: CURVE_TEXT.en.h1, href: curvePath("en") },
        ]}
      />
      <div className="mt-8 space-y-6">
        {KC_ORDER.map((sec) => (
          <section key={sec} id={sec} className="rounded-[24px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
            <h2 className="text-[22px] font-semibold tracking-tight">{k.sections[sec].name}</h2>
            <p className="mt-1 text-[15px] text-mute">{k.sections[sec].intro}</p>
            {items[sec].length === 0 ? <p className="mt-3 text-sm text-mute">{k.empty}</p> : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items[sec].map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} className="block h-full rounded-2xl bg-canvas px-4 py-3 text-[15px] font-medium hover:text-accent">{i.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-mute">Information and education only, not investment advice or an offer to buy or sell. Yields are gross and indicative and can change. Bonds can lose value and issuers can default.</p>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: k.h1, inLanguage: "en", url: SITE_URL + enPath(), hasPart: Object.values(items).flat().map((i) => ({ "@type": "WebPage", name: i.title, url: SITE_URL + i.href })) }} />
    </div>
  );
}
