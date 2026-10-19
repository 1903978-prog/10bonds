import { ORGANIZATION } from "@/lib/seo/org";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Finder from "@/components/Finder";
import { ComparisonBody, JsonLd, RiskNote } from "@/components/seo/Seo";
import { COMPARISONS } from "@/lib/seo/comparisons";
import { SITE_URL } from "@/lib/seo/crawl";
import { CALCULATORS } from "@/lib/seo/calculators";
import { isLocale, LOCALE, pathOf, T, type Locale } from "@/lib/seo/locales";
import { HOME } from "@/lib/seo/pagesText";
import { alternates, comparisonPages, publishedGuides, shown } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const h = HOME[lang];
  return {
    title: { absolute: h.title },
    description: h.description,
    alternates: alternates(lang, (l) => `/${l}`, "/"),
    openGraph: { locale: LOCALE[lang].ogLocale, title: h.title, description: h.description, type: "website", siteName: "10BONDS" },
  };
}

export default async function LocaleHome({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const l: Locale = lang;
  const h = HOME[l];
  const t = T[l];
  const [{ pages, asOf, source }, guides] = await Promise.all([comparisonPages(), publishedGuides(l)]);
  const gov = pages.find((p) => p.def.id === h.govId);
  const featured = COMPARISONS.filter((d) => d.home?.includes(l) && d.id !== h.govId)
    .concat(COMPARISONS.filter((d) => d.id.startsWith("gov-") && d.id !== h.govId))
    .map((d) => pages.find((p) => p.def.id === d.id))
    .filter((p) => p && shown(p, source));
  return (
    <div className="space-y-10">
      {/* The finder comes first so it fits on one screen; the page title and intro stay on the page, below it. */}
      <Finder lang={l} heading={false} />
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight sm:text-[44px]">{h.h1}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[17px] text-mute">{h.lead}</p>
        <ul className="mx-auto mt-5 flex max-w-2xl flex-col gap-1.5 text-[15px] text-ink sm:items-center">
          {h.points.map((p) => <li key={p}>✓ {p}</li>)}
        </ul>
      </section>
      {gov && shown(gov, source) && (
        <section className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[22px] font-semibold tracking-tight">{h.govTitle}</h2>
            <Link href={pathOf(l, "bonds", gov.def.text[l].slug)} className="text-sm text-accent">{t.compare} ›</Link>
          </div>
          <ComparisonBody locale={l} c={gov} asOf={asOf} source={source} />
        </section>
      )}
      <section className="mx-auto max-w-3xl">
        <h2 className="text-[22px] font-semibold tracking-tight">{h.compareTitle}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {featured.map((p) => (
            <li key={p!.def.id}><Link href={pathOf(l, "bonds", p!.def.text[l].slug)} className="block rounded-2xl bg-white p-4 text-[15px] hover:text-accent">{p!.def.text[l].h1}</Link></li>
          ))}
          <li><Link href={pathOf(l, "bonds")} className="block rounded-2xl bg-white p-4 text-[15px] text-accent">{t.bonds} ›</Link></li>
        </ul>
      </section>
      <section className="mx-auto max-w-3xl">
        <h2 className="text-[22px] font-semibold tracking-tight">{h.guidesTitle}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {guides.slice(0, 6).map((g) => (
            <li key={g.id}><Link href={pathOf(l, "guides", g.slug)} className="block rounded-2xl bg-white p-4 text-[15px] hover:text-accent">{g.title}</Link></li>
          ))}
          <li><Link href={pathOf(l, "tools", CALCULATORS[l].slug)} className="block rounded-2xl bg-white p-4 text-[15px] hover:text-accent">{CALCULATORS[l].h1}</Link></li>
          <li><Link href={pathOf(l, "guides")} className="block rounded-2xl bg-white p-4 text-[15px] text-accent">{t.guides} ›</Link></li>
        </ul>
      </section>
      <section className="mx-auto max-w-3xl">
        <h2 className="text-[22px] font-semibold tracking-tight">{h.plansTitle}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {h.plans.map((p) => (
            <div key={p.name} className="rounded-2xl bg-white p-5">
              <p className="font-semibold">{p.name}</p>
              <p className="mt-1 font-semibold">{p.price}</p>
              <p className="mt-2 text-sm text-mute">{p.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm"><Link href="/pricing" className="text-accent">{h.plansLink} ›</Link> · <Link href={pathOf(l, "method")} className="text-accent">{t.method}</Link> · <Link href={pathOf(l, "team")} className="text-accent">{t.team}</Link></p>
      </section>
      <div className="mx-auto max-w-3xl"><RiskNote locale={l} /></div>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: "10BONDS", url: `${SITE_URL}/${l}`, inLanguage: LOCALE[l].hreflang, description: h.description, publisher: ORGANIZATION }} />
      <JsonLd data={{ "@context": "https://schema.org", ...ORGANIZATION }} />
    </div>
  );
}
