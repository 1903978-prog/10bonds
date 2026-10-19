import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, ComparisonBody, JsonLd, prose, RiskNote, ToolCta } from "@/components/seo/Seo";
import { accountsConfigured } from "@/lib/accounts";
import { currentUser } from "@/lib/currentUser";
import CurveSection from "@/components/seo/CurveSection";
import InsightsSection from "@/components/seo/InsightsSection";
import YieldCalculator from "@/components/seo/YieldCalculator";
import { CALCULATORS } from "@/lib/seo/calculators";
import { comparisonById, comparisonBySlug, type ComparisonDef } from "@/lib/seo/comparisons";
import { SITE_URL } from "@/lib/seo/crawl";
import { isLocale, LOCALE, pathOf, sectionOf, T, type Locale } from "@/lib/seo/locales";
import { calcLangs, CALCULATOR_EN, enGuideByGroup, enPath, withEnglish } from "@/lib/seo/knowledgeEn";
import { unlinkMissing } from "@/lib/seo/links";
import { landingFor, splitLead } from "@/lib/seo/landingLivio";
import { curveAlternates, curvePath, CURVE_TEXT } from "@/lib/seo/yieldCurves";
import { insightsAlternates, insightsPath, INSIGHTS_TEXT } from "@/lib/seo/insights";
import { faqFromHtml, sanitizeHtml } from "@/lib/seo/sanitize";
import { alternates, comparisonAlternates, comparisonPages, fmtDate, guideAlternates, indexable, shown } from "@/lib/seo/site";
import { guideBySlug, listGuides, listPeople, type Guide } from "@/lib/seo/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; section: string; slug: string }>; searchParams: Promise<{ preview?: string }> };

type Resolved = { l: Locale; kind: "guide"; guide: Guide } | { l: Locale; kind: "bonds"; def: ComparisonDef } | { l: Locale; kind: "tool" } | { l: Locale; kind: "curve" } | { l: Locale; kind: "insights" } | null;

/** A published guide (any guide for the admin with ?preview=1), or a comparison page. */
async function resolve(props: Props): Promise<Resolved> {
  const { lang, section, slug } = await props.params;
  if (!isLocale(lang) || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const s = sectionOf(lang, section);
  if (s === "bonds") {
    const def = comparisonBySlug(lang, slug);
    return def ? { l: lang, kind: "bonds", def } : null;
  }
  if (s === "tools") return CALCULATORS[lang].slug === slug ? { l: lang, kind: "tool" } : CURVE_TEXT[lang].slug === slug ? { l: lang, kind: "curve" } : INSIGHTS_TEXT[lang].slug === slug ? { l: lang, kind: "insights" } : null;
  if (s !== "guides" || !accountsConfigured()) return null;
  const g = await guideBySlug(lang, slug).catch(() => null);
  if (!g) return null;
  if (g.status === "published") return { l: lang, kind: "guide", guide: g };
  const preview = (await props.searchParams).preview === "1";
  return preview && (await currentUser())?.isAdmin ? { l: lang, kind: "guide", guide: g } : null;
}

/** Language versions of a guide, plus its English version on /knowledge when there is one. */
function guideWithEnglish(g: Guide, siblings: Guide[]): Metadata["alternates"] {
  const base = guideAlternates(g, siblings);
  const en = enGuideByGroup(g.translationGroup);
  if (!en || g.noindex) return base;
  return { ...base, languages: { ...(base?.languages ?? { [LOCALE[g.locale].hreflang]: pathOf(g.locale, "guides", g.slug) }), en: enPath(en.slug), "x-default": enPath(en.slug) } };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const r = await resolve(props);
  if (!r) return { robots: { index: false } };
  if (r.kind === "insights") {
    const c = INSIGHTS_TEXT[r.l];
    return { title: { absolute: c.title }, description: c.description, alternates: insightsAlternates(r.l), openGraph: { locale: LOCALE[r.l].ogLocale, title: c.title, description: c.description } };
  }
  if (r.kind === "curve") {
    const c = CURVE_TEXT[r.l];
    return { title: { absolute: c.title }, description: c.description, alternates: curveAlternates(r.l), openGraph: { locale: LOCALE[r.l].ogLocale, title: c.title, description: c.description } };
  }
  if (r.kind === "tool") {
    const c = CALCULATORS[r.l];
    const land = landingFor(pathOf(r.l, "tools", c.slug));
    return {
      title: { absolute: land?.seoTitle ?? c.title },
      description: land?.metaDescription ?? c.description,
      alternates: withEnglish(pathOf(r.l, "tools", c.slug), enPath(CALCULATOR_EN.slug), calcLangs()),
      openGraph: { locale: LOCALE[r.l].ogLocale, title: c.title, description: c.description },
    };
  }
  if (r.kind === "bonds") {
    const x = r.def.text[r.l];
    const land = landingFor(pathOf(r.l, "bonds", x.slug));
    const { pages, source } = await comparisonPages();
    const c = pages.find((p) => p.def.id === r.def.id);
    return {
      title: { absolute: land?.seoTitle ?? x.title },
      description: land?.metaDescription ?? x.description,
      alternates: comparisonAlternates(r.l, r.def),
      robots: c && indexable(c, source) ? undefined : { index: false, follow: true },
      openGraph: { locale: LOCALE[r.l].ogLocale, title: x.title, description: x.description },
    };
  }
  const g = r.guide;
  const siblings = g.translationGroup ? await listGuides(true).catch(() => []) : [];
  return {
    title: { absolute: g.seoTitle },
    description: g.metaDescription,
    keywords: [g.primaryKeyword, ...g.relatedKeywords],
    alternates: guideWithEnglish(g, siblings),
    robots: g.noindex || g.status !== "published" ? { index: false, follow: true } : undefined,
    openGraph: { type: "article", locale: LOCALE[r.l].ogLocale, title: g.seoTitle, description: g.metaDescription, publishedTime: g.publishedAt ?? undefined, modifiedTime: g.reviewedAt ?? g.updatedAt },
  };
}

export default async function Detail(props: Props) {
  const r = await resolve(props);
  if (!r) notFound();
  if (r.kind === "tool") return <ToolPage l={r.l} />;
  if (r.kind === "curve") return <CurvePage l={r.l} />;
  if (r.kind === "insights") return <InsightsPage l={r.l} />;
  return r.kind === "bonds" ? <ComparisonPage l={r.l} def={r.def} /> : <GuidePage l={r.l} g={r.guide} />;
}

function InsightsPage({ l }: { l: Locale }) {
  const t = T[l];
  const c = INSIGHTS_TEXT[l];
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs locale={l} siteUrl={SITE_URL} items={[{ name: t.home, href: `/${l}` }, { name: t.knowledge, href: pathOf(l, "knowledge") }, { name: c.h1, href: insightsPath(l) }]} />
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{c.h1}</h1>
      <InsightsSection locale={l} text={c} curveHref={curvePath(l)} methodHref={pathOf(l, "method")} />
      <ToolCta locale={l} />
      <RiskNote locale={l} />
    </div>
  );
}

function CurvePage({ l }: { l: Locale }) {
  const t = T[l];
  const c = CURVE_TEXT[l];
  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs locale={l} siteUrl={SITE_URL} items={[{ name: t.home, href: `/${l}` }, { name: t.knowledge, href: pathOf(l, "knowledge") }, { name: c.h1, href: curvePath(l) }]} />
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{c.h1}</h1>
      {c.intro.map((p) => <p key={p.slice(0, 30)} className="mt-3 text-[17px] text-mute">{p}</p>)}
      <CurveSection locale={l} text={c} />
      <ToolCta locale={l} />
      <RiskNote locale={l} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Dataset", name: c.h1, description: c.description, url: SITE_URL + curvePath(l), inLanguage: LOCALE[l].hreflang, creator: { "@type": "Organization", name: "10BONDS", url: SITE_URL } }} />
    </div>
  );
}

function ToolPage({ l }: { l: Locale }) {
  const t = T[l];
  const c = CALCULATORS[l];
  const url = SITE_URL + pathOf(l, "tools", c.slug);
  const land = landingFor(pathOf(l, "tools", c.slug));
  const [lead, rest] = land ? splitLead(land.bodyHtml) : ["", ""];
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs locale={l} siteUrl={SITE_URL} items={[{ name: t.home, href: `/${l}` }, { name: t.tools, href: pathOf(l, "tools") }, { name: c.h1, href: pathOf(l, "tools", c.slug) }]} />
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{land?.h1 ?? c.h1}</h1>
      {land ? <div className={`mt-4 ${prose}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(lead) }} /> : c.intro.map((p) => <p key={p.slice(0, 30)} className="mt-3 text-[17px] text-mute">{p}</p>)}
      <div id="calcolatore" className="scroll-mt-20"><YieldCalculator locale={l} text={c} /></div>
      {land && <section className={`mt-8 rounded-[28px] bg-white p-6 sm:p-10 ${prose}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(rest) }} />}
      <section className="mt-8 rounded-[28px] bg-white p-6 text-[16px] leading-[1.7] sm:p-10">
        <h2 id="metodo" className="text-[22px] font-semibold tracking-tight">{c.how.h2}</h2>
        {c.how.paras.map((p) => <p key={p.slice(0, 30)} className="mt-3">{p}</p>)}
        <p className="mt-3"><Link href={pathOf(l, "bonds")} className="text-accent">{t.bonds} ›</Link> · <Link href={pathOf(l, "guides")} className="text-accent">{t.guides} ›</Link></p>
      </section>
      <ToolCta locale={l} />
      <RiskNote locale={l} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebApplication", name: c.h1, url, inLanguage: LOCALE[l].hreflang, applicationCategory: "FinanceApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, description: c.description }} />
    </div>
  );
}

async function ComparisonPage({ l, def }: { l: Locale; def: ComparisonDef }) {
  const t = T[l];
  const x = def.text[l];
  const [{ pages, asOf, source }, guides] = await Promise.all([comparisonPages(), listGuides(true, l).catch(() => [])]);
  const c = pages.find((p) => p.def.id === def.id);
  if (!c || !shown(c, source)) notFound();
  const url = SITE_URL + pathOf(l, "bonds", x.slug);
  const land = landingFor(pathOf(l, "bonds", x.slug));
  const live = new Set(pages.filter((p) => shown(p, source)).map((p) => p.def.text[l].slug));
  const [lead, rest] = land ? splitLead(unlinkMissing(sanitizeHtml(land.bodyHtml), l, new Set(guides.map((g) => g.slug)), live)) : ["", ""];
  const related = def.related.map(comparisonById).map((d) => d && pages.find((p) => p.def.id === d.id)).filter((p) => p && shown(p, source));
  const relGuides = guides.filter((g) => g.translationGroup && (def.topics as string[]).includes(g.translationGroup));
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs locale={l} siteUrl={SITE_URL} items={[{ name: t.home, href: `/${l}` }, { name: t.bonds, href: pathOf(l, "bonds") }, { name: x.h1, href: pathOf(l, "bonds", x.slug) }]} />
      <h1 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">{land?.h1 ?? x.h1}</h1>
      {land ? <div className={`mt-4 ${prose}`} dangerouslySetInnerHTML={{ __html: lead }} /> : x.intro.map((p) => <p key={p.slice(0, 30)} className="mt-4 text-[16px] leading-[1.7]">{p}</p>)}
      <div id="tabella" className="mt-6 scroll-mt-20"><ComparisonBody locale={l} c={c} asOf={asOf} source={source} /></div>
      {land && <section className={`mt-8 rounded-[28px] bg-white p-6 sm:p-10 ${prose}`} dangerouslySetInnerHTML={{ __html: rest }} />}
      {relGuides.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t.guides}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {relGuides.slice(0, 4).map((g) => <li key={g.id}><Link href={pathOf(l, "guides", g.slug)} className="block rounded-2xl bg-white p-4 text-[15px] hover:text-accent">{g.title}</Link></li>)}
          </ul>
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t.compare}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((p) => <li key={p!.def.id}><Link href={pathOf(l, "bonds", p!.def.text[l].slug)} className="block rounded-2xl bg-white p-4 text-[15px] hover:text-accent">{p!.def.text[l].h1}</Link></li>)}
          </ul>
        </section>
      )}
      <p className="mt-6 text-sm text-mute"><Link href={pathOf(l, "method")} className="text-accent">{t.method}</Link></p>
      <ToolCta locale={l} />
      <RiskNote locale={l} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: x.h1,
          description: x.description,
          url,
          inLanguage: LOCALE[l].hreflang,
          dateModified: asOf ?? undefined,
          numberOfItems: c.def.kind === "bands" ? c.bands.reduce((s, b) => s + b.rows.length, 0) : c.rows.length,
          itemListElement: (c.def.kind === "bands" ? c.bands.flatMap((b) => b.rows) : c.rows).map((row, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.def.kind === "curve" ? `${row.issuer} ${row.maturityYear}` : row.issuer,
          })),
        }}
      />
    </div>
  );
}

async function GuidePage({ l, g }: { l: Locale; g: Guide }) {
  const t = T[l];
  const [people, all, { pages, source }] = await Promise.all([listPeople(true).catch(() => []), listGuides(true, l).catch(() => []), comparisonPages()]);
  const live = pages.filter((p) => shown(p, source));
  const body = unlinkMissing(sanitizeHtml(g.bodyHtml), l, new Set(all.map((x) => x.slug)), new Set(live.map((p) => p.def.text[l].slug)));
  const faq = faqFromHtml(body);
  const author = people.find((p) => p.id === g.authorId) ?? null;
  const reviewer = people.find((p) => p.id === g.reviewerId) ?? null;
  const related = g.relatedSlugs.map((s) => all.find((x) => x.slug === s)).filter((x): x is Guide => !!x && x.slug !== g.slug);
  const bondsBase = `href="/${l}/${LOCALE[l].seg.bonds}/`;
  const comps = [...new Set(g.bodyHtml.split(bondsBase).slice(1).map((s) => s.split('"')[0]))].map((s) => comparisonBySlug(l, s)).filter((d): d is ComparisonDef => !!d && live.some((p) => p.def.id === d.id)).slice(0, 4);
  const url = SITE_URL + pathOf(l, "guides", g.slug);
  const org = { "@type": "Organization", name: "10BONDS", url: SITE_URL };
  const team = pathOf(l, "team");
  return (
    <article className="mx-auto max-w-3xl">
      {g.status !== "published" && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t.preview} ({g.status}{g.machineTranslated ? ", machine translation" : ""})</p>}
      <Breadcrumbs locale={l} siteUrl={SITE_URL} items={[{ name: t.home, href: `/${l}` }, { name: t.guides, href: pathOf(l, "guides") }, { name: g.title, href: pathOf(l, "guides", g.slug) }]} />
      <div className="rounded-[28px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-10">
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">{g.title}</h1>
        <p className="mt-4 text-sm text-mute">
          {t.by} {author ? <Link href={`${team}#p${author.id}`} className="text-ink hover:underline">{author.name}</Link> : t.editorial}
          {reviewer && <> · {t.reviewedBy} <Link href={`${team}#p${reviewer.id}`} className="text-ink hover:underline">{reviewer.name}</Link></>}
        </p>
        <p className="mt-1 text-sm text-mute">
          {g.publishedAt && <>{t.published} <time dateTime={g.publishedAt}>{fmtDate(l, g.publishedAt)}</time></>}
          {g.reviewedAt && <> · {t.reviewed} <time dateTime={g.reviewedAt}>{fmtDate(l, g.reviewedAt)}</time></>}
        </p>
        <div className={`mt-6 ${prose}`} dangerouslySetInnerHTML={{ __html: body }} />
      </div>
      {comps.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t.liveData}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {comps.map((d) => <li key={d.id}><Link href={pathOf(l, "bonds", d.text[l].slug)} className="block rounded-2xl bg-white p-4 text-[15px] hover:text-accent">{d.text[l].h1}</Link></li>)}
          </ul>
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t.related}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((x) => <li key={x.id}><Link href={pathOf(l, "guides", x.slug)} className="block rounded-2xl bg-white p-4 text-[15px] hover:text-accent">{x.title}</Link></li>)}
          </ul>
        </section>
      )}
      <ToolCta locale={l} />
      <RiskNote locale={l} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.metaDescription,
          inLanguage: LOCALE[l].hreflang,
          mainEntityOfPage: url,
          url,
          datePublished: g.publishedAt ?? undefined,
          dateModified: g.reviewedAt ?? g.updatedAt,
          author: author ? { "@type": "Person", name: author.name, jobTitle: author.role, url: `${SITE_URL}${team}#p${author.id}` } : org,
          ...(reviewer ? { reviewedBy: { "@type": "Person", name: reviewer.name, jobTitle: reviewer.role } } : {}),
          publisher: org,
          keywords: [g.primaryKeyword, ...g.relatedKeywords].join(", "),
        }}
      />
      {faq.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />}
    </article>
  );
}
