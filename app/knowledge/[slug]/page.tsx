import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd, prose } from "@/components/seo/Seo";
import YieldCalculator from "@/components/seo/YieldCalculator";
import { SITE_URL } from "@/lib/seo/crawl";
import { EN_GUIDES } from "@/lib/seo/guidesEn";
import { calcLangs, CALCULATOR_EN, enGuide, enPath, KC_TEXT_EN, withEnglish } from "@/lib/seo/knowledgeEn";
import { pathOf, type Locale } from "@/lib/seo/locales";
import { faqFromHtml, sanitizeHtml } from "@/lib/seo/sanitize";
import { listGuides } from "@/lib/seo/store";

// English Knowledge Center pages: the guides and the yield calculator.

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** The Italian/French/German versions of an English guide that are published. */
async function languageVersions(group: string): Promise<Partial<Record<Locale, string>>> {
  const all = await listGuides(true).catch(() => []);
  return Object.fromEntries(all.filter((g) => g.translationGroup === group && !g.noindex).map((g) => [g.locale, pathOf(g.locale, "guides", g.slug)]));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === CALCULATOR_EN.slug) {
    const c = CALCULATOR_EN;
    return { title: { absolute: c.title }, description: c.description, alternates: withEnglish(enPath(c.slug), enPath(c.slug), calcLangs()), openGraph: { locale: "en_GB", title: c.title, description: c.description } };
  }
  const g = enGuide(slug);
  if (!g) return { robots: { index: false } };
  return {
    title: { absolute: g.seoTitle },
    description: g.metaDescription,
    keywords: [g.primaryKeyword],
    alternates: withEnglish(enPath(g.slug), enPath(g.slug), await languageVersions(g.group)),
    openGraph: { type: "article", locale: "en_GB", title: g.seoTitle, description: g.metaDescription },
  };
}

const crumbs = (name: string, href: string) => (
  <nav aria-label="Breadcrumb" className="mb-4 text-sm text-mute">
    <Link href="/" className="hover:text-ink">Home</Link> › <Link href={enPath()} className="hover:text-ink">Knowledge</Link> › <span className="text-ink">{name}</span>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], ["Knowledge", enPath()], [name, href]].map(([n, h], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE_URL + h })) }} />
  </nav>
);

const risk = <p className="mt-8 text-xs leading-relaxed text-mute">Information and education only, not investment advice or an offer to buy or sell. Yields are gross and indicative and can change. Bonds can lose value and issuers can default. <Link href="/disclaimer" className="underline">Disclaimer</Link></p>;

export default async function EnglishKnowledgePage({ params }: Props) {
  const { slug } = await params;
  if (slug === CALCULATOR_EN.slug) {
    const c = CALCULATOR_EN;
    return (
      <div className="mx-auto max-w-3xl">
        {crumbs(c.h1, enPath(c.slug))}
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{c.h1}</h1>
        {c.intro.map((p) => <p key={p} className="mt-3 text-[17px] text-mute">{p}</p>)}
        <YieldCalculator locale="en" text={c} />
        <section className="mt-8 rounded-[24px] bg-white p-6 text-[16px] leading-[1.7]">
          <h2 className="text-[22px] font-semibold tracking-tight">{c.how.h2}</h2>
          {c.how.paras.map((p) => <p key={p} className="mt-3">{p}</p>)}
          <p className="mt-3 text-sm text-mute">{c.taxNote}</p>
        </section>
        {risk}
        <JsonLd data={{ "@context": "https://schema.org", "@type": "WebApplication", name: c.h1, url: SITE_URL + enPath(c.slug), inLanguage: "en", applicationCategory: "FinanceApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, description: c.description }} />
      </div>
    );
  }
  const g = enGuide(slug);
  if (!g) notFound();
  const body = sanitizeHtml(g.bodyHtml);
  const faq = faqFromHtml(body);
  const related = EN_GUIDES.filter((x) => x.section === g.section && x.slug !== g.slug).slice(0, 4);
  const url = SITE_URL + enPath(g.slug);
  return (
    <article className="mx-auto max-w-3xl">
      {crumbs(g.title, enPath(g.slug))}
      <div className="rounded-[28px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-10">
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">{g.title}</h1>
        <p className="mt-4 text-sm text-mute">By the 10BONDS editorial team</p>
        <div className={`mt-6 ${prose}`} dangerouslySetInnerHTML={{ __html: body }} />
      </div>
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Related guides</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((x) => <li key={x.slug}><Link href={enPath(x.slug)} className="block rounded-2xl bg-white p-4 text-[15px] hover:text-accent">{x.title}</Link></li>)}
          </ul>
        </section>
      )}
      <p className="mt-6 text-sm"><Link href={enPath()} className="text-accent">{KC_TEXT_EN.h1} ›</Link></p>
      {risk}
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.metaDescription, inLanguage: "en", mainEntityOfPage: url, url, author: { "@type": "Organization", name: "10BONDS", url: SITE_URL }, publisher: { "@type": "Organization", name: "10BONDS", url: SITE_URL }, keywords: g.primaryKeyword }} />
      {faq.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />}
    </article>
  );
}
