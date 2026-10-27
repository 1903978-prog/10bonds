import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparisonBody, JsonLd, ToolCta } from "@/components/seo/Seo";
import { comparisonById } from "@/lib/seo/comparisons";
import { comparisonEnBySlug, enBondsPath, enText, EN_BONDS_BASE, guidesFor } from "@/lib/seo/comparisonsEn";
import { SITE_URL } from "@/lib/seo/crawl";
import { enGuide, enPath } from "@/lib/seo/knowledgeEn";
import { comparisonPages, indexable, shown } from "@/lib/seo/site";

// English comparison pages (US and UK readers): the same live bond data as the Italian, French and German pages.

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const def = comparisonEnBySlug((await params).slug);
  if (!def) return { robots: { index: false } };
  const x = enText(def);
  const { pages, source } = await comparisonPages();
  const c = pages.find((p) => p.def.id === def.id);
  return {
    title: { absolute: `${x.title} · 10BONDS` },
    description: x.description,
    alternates: { canonical: enBondsPath(x.slug), languages: { en: enBondsPath(x.slug), "x-default": enBondsPath(x.slug) } },
    robots: c && indexable(c, source) ? undefined : { index: false, follow: true },
    openGraph: { locale: "en_GB", title: x.title, description: x.description },
  };
}

export default async function EnglishComparisonPage({ params }: Props) {
  const def = comparisonEnBySlug((await params).slug);
  if (!def) notFound();
  const x = enText(def);
  const { pages, asOf, source } = await comparisonPages();
  const c = pages.find((p) => p.def.id === def.id);
  if (!c || !shown(c, source)) notFound();
  const related = def.related.map(comparisonById).map((d) => d && pages.find((p) => p.def.id === d.id)).filter((p) => p && shown(p, source) && enText(p.def) && comparisonEnBySlug(enText(p.def).slug));
  const guides = guidesFor(def).map(enGuide).filter((g): g is NonNullable<typeof g> => !!g);
  const crumbs = [["Home", "/"], ["Knowledge", enPath()], ["Bond comparisons", EN_BONDS_BASE], [x.h1, enBondsPath(x.slug)]];
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-mute">
        {crumbs.map(([n, h], i) => (
          <span key={h}>{i > 0 && " › "}{i === crumbs.length - 1 ? <span className="text-ink">{n}</span> : <Link href={h} className="hover:text-ink">{n}</Link>}</span>
        ))}
        <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([n, h], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE_URL + h })) }} />
      </nav>
      <h1 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">{x.h1}</h1>
      {x.intro.map((p) => <p key={p.slice(0, 30)} className="mt-4 text-[16px] leading-[1.7]">{p}</p>)}
      <div id="table" className="mt-6 scroll-mt-20"><ComparisonBody locale="en" c={c} asOf={asOf} source={source} /></div>
      {guides.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Guides</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {guides.map((g) => <li key={g.slug}><Link href={enPath(g.slug)} className="block rounded-lg border border-line bg-white p-4 text-[15px] hover:text-accent">{g.title}</Link></li>)}
          </ul>
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Compare</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((p) => <li key={p!.def.id}><Link href={enBondsPath(enText(p!.def).slug)} className="block rounded-lg border border-line bg-white p-4 text-[15px] hover:text-accent">{enText(p!.def).h1}</Link></li>)}
          </ul>
        </section>
      )}
      <p className="mt-6 text-sm text-mute"><Link href="/methodology" className="text-accent">Methodology</Link> · <Link href={EN_BONDS_BASE} className="text-accent">All bond comparisons</Link></p>
      <ToolCta locale="en" />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: x.h1,
          description: x.description,
          url: SITE_URL + enBondsPath(x.slug),
          inLanguage: "en",
          dateModified: asOf ?? undefined,
          numberOfItems: c.def.kind === "bands" ? c.bands.reduce((s, b) => s + b.rows.length, 0) : c.rows.length,
          itemListElement: (c.def.kind === "bands" ? c.bands.flatMap((b) => b.rows) : c.rows).map((row, i) => ({ "@type": "ListItem", position: i + 1, name: c.def.kind === "curve" ? `${row.issuer} ${row.maturityYear}` : row.issuer })),
        }}
      />
    </div>
  );
}
