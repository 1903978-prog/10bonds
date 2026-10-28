import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, DataStamp, JsonLd, ToolCta } from "@/components/seo/Seo";
import { SITE_URL } from "@/lib/seo/crawl";
import { isLocale, LOCALE, pathOf, sectionOf, T, type Locale, type Section } from "@/lib/seo/locales";
import { CALCULATORS, TOOLS_HUB } from "@/lib/seo/calculators";
import { BONDS_HUB, GUIDES_HUB, METHOD, TEAM } from "@/lib/seo/pagesText";
import { isPublished as brokersPublished } from "@/components/brokers/Pages";
import { methodologyPath, sectionPath } from "@/lib/brokers/content";
import { FIRST_WAVE } from "@/lib/seo/knowledge";
import { curvePath, CURVE_TEXT } from "@/lib/seo/yieldCurves";
import { insightsPath, INSIGHTS_TEXT } from "@/lib/seo/insights";
import { bondMapPath, BOND_MAP_TEXT } from "@/lib/seo/bondMap";
import { bundCurvePath, BUND_CURVE_TEXT } from "@/lib/seo/bundCurve";
import { enPath, hubLangs, withEnglish } from "@/lib/seo/knowledgeEn";
import KnowledgeTools, { FINDER } from "@/components/seo/KnowledgeTools";
import { comparisonSection, guideSection, KC_ORDER, KC_TEXT, type HubItem } from "@/lib/seo/knowledgeHub";
import { comparisonPages, fmtDate, publicPeople, publishedGuides, sectionAlternates, shown } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; section: string }> };

async function resolve(params: Props["params"]): Promise<{ l: Locale; s: Section } | null> {
  const { lang, section } = await params;
  if (!isLocale(lang)) return null;
  const s = sectionOf(lang, section);
  return s ? { l: lang, s } : null;
}

const TEXT = { knowledge: KC_TEXT, guides: GUIDES_HUB, bonds: BONDS_HUB, tools: TOOLS_HUB, method: METHOD, team: TEAM };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return {};
  const x = TEXT[r.s][r.l];
  const alt = r.s === "knowledge" ? withEnglish(pathOf(r.l, "knowledge"), enPath(), hubLangs()) : sectionAlternates(r.l, r.s);
  return { title: { absolute: x.title }, description: x.description, alternates: alt, openGraph: { locale: LOCALE[r.l].ogLocale, title: x.title, description: x.description } };
}

export default async function SectionPage({ params }: Props) {
  const r = await resolve(params);
  if (!r) notFound();
  const { l, s } = r;
  const t = T[l];
  const x = TEXT[s][l];
  const crumbs = [{ name: t.home, href: `/${l}` }, { name: t[s], href: pathOf(l, s) }];
  let body: React.ReactNode = null;
  let ld: unknown = null;

  if (s === "knowledge") {
    const k = KC_TEXT[l];
    const [guides, { pages, source }, brokersLive] = await Promise.all([publishedGuides(l), comparisonPages(), brokersPublished(l)]);
    const live = pages.filter((p) => shown(p, source));
    const items = Object.fromEntries(KC_ORDER.map((sec) => [sec, [] as HubItem[]])) as Record<(typeof KC_ORDER)[number], HubItem[]>;
    for (const p of live) {
      const sec = comparisonSection(p.def.id);
      if (sec) items[sec].push({ title: p.def.text[l].h1, href: pathOf(l, "bonds", p.def.text[l].slug), note: `${p.issuers} ${t.issuersCount}` });
    }
    const c = CALCULATORS[l];
    items.calculators.push({ title: c.h1, href: pathOf(l, "tools", c.slug) });
    items.government.unshift({ title: CURVE_TEXT[l].h1, href: curvePath(l) }, { title: BUND_CURVE_TEXT[l].h1, href: bundCurvePath(l) });
    items.best.unshift({ title: INSIGHTS_TEXT[l].h1, href: insightsPath(l) }, { title: BOND_MAP_TEXT[l].h1, href: bondMapPath(l) });
    const brokerPage = FIRST_WAVE.find((p) => p.market === l && p.kind === "broker");
    if (brokersLive && brokerPage) {
      items.brokers.push({ title: brokerPage.title, href: sectionPath(l) });
      items.brokers.push({ title: `${brokerPage.title} · ${t.method}`, href: methodologyPath(l) });
    }
    for (const g of guides) items[guideSection(g)].push({ title: g.title, href: pathOf(l, "guides", g.slug) });
    items.academy.push({ title: t.method, href: pathOf(l, "method") });
    // First-wave pages that are not public yet (guide in review, broker page unpublished, too few bonds today).
    const linked = new Set(Object.values(items).flat().map((i) => i.href));
    for (const p of FIRST_WAVE.filter((x) => x.market === l && x.path && !linked.has(x.path))) items[p.section].push({ title: p.title, href: null, note: k.soon });
    const defaultGuide = guides.find((g) => g.translationGroup === "default-rates");
    body = (
      <>
      <KnowledgeTools
        locale={l}
        defaultHref={defaultGuide ? pathOf(l, "guides", defaultGuide.slug) : enPath("bond-default-rates-by-rating")}
        tools={[
          { title: FINDER[l], href: `/${l}` },
          { title: c.h1, href: pathOf(l, "tools", c.slug) },
          { title: INSIGHTS_TEXT[l].h1, href: insightsPath(l) },
          { title: CURVE_TEXT[l].h1, href: curvePath(l) },
        ]}
      />
      <div className="mt-8 space-y-6">
        {KC_ORDER.map((sec) => (
          <section key={sec} id={sec} className="rounded-lg border border-line bg-white p-5 sm:p-6">
            <h2 className="text-[22px] font-semibold tracking-tight">{k.sections[sec].name}</h2>
            <p className="mt-1 text-[15px] text-mute">{k.sections[sec].intro}</p>
            {items[sec].length === 0 ? <p className="mt-3 text-sm text-mute">{k.empty}</p> : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items[sec].map((i) => (
                  <li key={i.title + (i.href ?? "")}>
                    {i.href ? (
                      <Link href={i.href} className="block h-full rounded-lg bg-canvas px-4 py-3 hover:text-accent">
                        <span className="block text-[15px] font-medium">{i.title}</span>
                        {i.note && <span className="mt-0.5 block text-xs text-mute">{i.note}</span>}
                      </Link>
                    ) : (
                      <span className="block h-full rounded-lg border border-dashed border-line px-4 py-3 text-mute">
                        <span className="block text-[15px]">{i.title}</span>
                        <span className="mt-0.5 block text-xs">{i.note}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      </>
    );
    ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: k.h1, inLanguage: LOCALE[l].hreflang, url: SITE_URL + pathOf(l, s), hasPart: Object.values(items).flat().filter((i) => i.href).map((i) => ({ "@type": "WebPage", name: i.title, url: SITE_URL + i.href })) };
  } else if (s === "guides") {
    const guides = await publishedGuides(l);
    body = guides.length === 0 ? (
      <p className="mt-8 rounded-lg border border-line bg-white p-6 text-mute">{t.noGuides} <Link href={pathOf(l, "bonds")} className="text-accent">{t.bonds} ›</Link></p>
    ) : (
      <ul className="mt-8 space-y-3">
        {guides.map((g) => (
          <li key={g.id}>
            <Link href={pathOf(l, "guides", g.slug)} className="block rounded-lg border border-line bg-white p-5 hover:shadow-[0_2px_24px_rgba(0,0,0,0.08)]">
              <h2 className="text-lg font-semibold tracking-tight">{g.title}</h2>
              <p className="mt-1 text-[15px] text-mute">{g.metaDescription}</p>
              {g.reviewedAt && <p className="mt-2 text-xs text-mute">{t.reviewed}: {fmtDate(l, g.reviewedAt)}</p>}
            </Link>
          </li>
        ))}
      </ul>
    );
    ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: x.h1, inLanguage: LOCALE[l].hreflang, url: SITE_URL + pathOf(l, s), hasPart: guides.map((g) => ({ "@type": "Article", headline: g.title, url: SITE_URL + pathOf(l, "guides", g.slug) })) };
  } else if (s === "bonds") {
    const { pages, asOf, source } = await comparisonPages();
    const live = pages.filter((p) => shown(p, source));
    const groups: [string, string[]][] = [
      ["gov", live.filter((p) => p.def.id.startsWith("gov-") || p.def.id.startsWith("issuers-")).map((p) => p.def.id)],
      ["type", live.filter((p) => ["best", "corporate", "high-yield", "investment-grade"].includes(p.def.id) || p.def.id.startsWith("yield-")).map((p) => p.def.id)],
      ["duration", live.filter((p) => p.def.id.startsWith("duration-")).map((p) => p.def.id)],
      ["maturity", live.filter((p) => p.def.id.startsWith("maturity-")).map((p) => p.def.id)],
    ];
    body = (
      <>
        <div className="mt-4"><DataStamp locale={l} asOf={asOf} source={source} /></div>
        {live.length === 0 && <p className="mt-8 rounded-lg border border-line bg-white p-6 text-mute">{t.notEnough}</p>}
        {groups.filter(([, ids]) => ids.length).map(([key, ids]) => (
          <ul key={key} className="mt-6 grid gap-3 sm:grid-cols-2">
            {ids.map((id) => {
              const p = live.find((x) => x.def.id === id)!;
              return (
                <li key={id}>
                  <Link href={pathOf(l, "bonds", p.def.text[l].slug)} className="block h-full rounded-lg border border-line bg-white p-4 hover:text-accent">
                    <span className="block text-[15px] font-medium">{p.def.text[l].h1}</span>
                    <span className="mt-1 block text-xs text-mute">{p.issuers} {t.issuersCount} · {p.bonds} {t.bondsCount}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </>
    );
    ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: x.h1, inLanguage: LOCALE[l].hreflang, url: SITE_URL + pathOf(l, s) };
  } else if (s === "tools") {
    const c = CALCULATORS[l];
    body = (
      <ul className="mt-8 space-y-3">
        <li>
          <Link href={pathOf(l, "tools", c.slug)} className="block rounded-lg border border-line bg-white p-5 hover:shadow-[0_2px_24px_rgba(0,0,0,0.08)]">
            <h2 className="text-lg font-semibold tracking-tight">{c.h1}</h2>
            <p className="mt-1 text-[15px] text-mute">{c.description}</p>
          </Link>
        </li>
      </ul>
    );
    ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: x.h1, inLanguage: LOCALE[l].hreflang, url: SITE_URL + pathOf(l, s) };
  } else if (s === "method") {
    const m = METHOD[l];
    body = (
      <div className="mt-6 rounded-lg border border-line bg-white p-6 text-[16px] leading-[1.7] sm:p-10">
        {m.sections.map((sec) => (
          <section key={sec.id}>
            <h2 id={sec.id} className="mt-6 text-[22px] font-semibold tracking-tight first:mt-0">{sec.h2}</h2>
            {sec.paras.map((p) => <p key={p.slice(0, 40)} className="mt-3">{p}</p>)}
          </section>
        ))}
      </div>
    );
    ld = { "@context": "https://schema.org", "@type": "WebPage", name: m.h1, inLanguage: LOCALE[l].hreflang, url: SITE_URL + pathOf(l, s), description: m.description };
  } else {
    const people = await publicPeople();
    const tx = TEAM[l];
    body = people.length === 0 ? <p className="mt-8 rounded-lg border border-line bg-white p-6 text-mute">{tx.empty}</p> : (
      <ul className="mt-8 space-y-3">
        {people.map((p) => (
          <li key={p.id} id={`p${p.id}`} className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="text-sm text-mute">{p.role}</p>
            {p.bio && <p className="mt-2 text-[15px]">{p.bio}</p>}
            {p.credentials && <p className="mt-2 text-sm"><span className="text-mute">{tx.credentials}:</span> {p.credentials}{p.credentialsVerified && <span className="ml-2 text-xs text-green-700">✓ {tx.verified}</span>}</p>}
          </li>
        ))}
      </ul>
    );
    ld = { "@context": "https://schema.org", "@type": "AboutPage", name: tx.h1, inLanguage: LOCALE[l].hreflang, url: SITE_URL + pathOf(l, s) };
  }

  return (
    <div className={s === "knowledge" ? "" : "mx-auto max-w-3xl"}>
      <Breadcrumbs locale={l} siteUrl={SITE_URL} items={crumbs} />
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{x.h1}</h1>
      <p className="mt-3 text-[17px] text-mute">{x.lead}</p>
      {body}
      {s !== "guides" && s !== "bonds" ? null : (
        <p className="mt-8 text-[15px]">
          {s === "guides" ? <Link href={pathOf(l, "bonds")} className="text-accent">{t.bonds} ›</Link> : <Link href={pathOf(l, "guides")} className="text-accent">{t.guides} ›</Link>}
        </p>
      )}
      <ToolCta locale={l} />
      <JsonLd data={ld} />
    </div>
  );
}
