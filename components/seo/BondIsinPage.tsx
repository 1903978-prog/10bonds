import Link from "next/link";
import { featuresFor } from "@/lib/planFeatures";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/Seo";
import { RiskBadge } from "@/components/RiskBadge";
import { loadAllShown } from "@/lib/bonds";
import { currentUser } from "@/lib/currentUser";
import { callableLabel, couponTypeLabel, FACT_TEXT, seniorityLabel } from "@/lib/bondFacts";
import { fmtMin } from "@/lib/fmtMin";
import { bondRisk } from "@/lib/ratings";
import { SITE_URL } from "@/lib/seo/crawl";
import { pathOf } from "@/lib/seo/locales";
import type { PublicBond } from "@/lib/types";
import {
  BOND_TEXT, bondDescription, bondLabel, bondPagePath, countryName, fmtCoupon, fmtDay, fmtPct, issuerOf, peerRank, relatedBonds, type BondLang,
} from "@/lib/seo/bondPages";

/** A bond the site shows, by ISIN; null for unknown, unrated or hidden bonds (those pages answer 404). */
export async function bondByIsin(isin: string): Promise<{ bond: PublicBond; all: PublicBond[]; asOf: string | null; live: boolean } | null> {
  const { bonds, asOf, source } = await loadAllShown();
  const bond = bonds.find((b) => b.isin === isin);
  return bond ? { bond, all: bonds, asOf, live: source === "live" } : null;
}

const home = (l: BondLang) => (l === "en" ? "/" : `/${l}`);
const method = (l: BondLang) => (l === "en" ? "/selection-methodology" : pathOf(l, "method"));
const bondsHub = (l: BondLang) => (l === "en" ? "/" : pathOf(l, "bonds"));

/** One bond's public page: ISIN in the title, heading and text; facts for everyone; yield and rank for Plus and up. */
export default async function BondIsinPage({ l, isin }: { l: BondLang; isin: string }) {
  const [hit, user] = await Promise.all([bondByIsin(isin), currentUser()]);
  if (!hit) notFound();
  const { bond: b, all, asOf } = hit;
  const t = BOND_TEXT[l];
  const f = FACT_TEXT[l];
  // Return and rank: plans ticked for "bond_page_full" in the admin's feature table (/admin/features).
  const paid = (await featuresFor(user)).includes("bond_page_full");
  const issuer = issuerOf(b);
  const label = bondLabel(l, b);
  const risk = bondRisk(b);
  const rank = paid ? peerRank(b, all) : null;
  const { sameIssuer, similar } = relatedBonds(b, all, 4);
  const url = SITE_URL + bondPagePath(l, b.isin);
  const crumbs = [
    { name: t.home, href: home(l) },
    { name: t.allBonds, href: bondsHub(l) },
    { name: label, href: bondPagePath(l, b.isin) },
  ];

  const facts: [string, React.ReactNode][] = [
    [t.issuer, issuer],
    [t.isin, <span key="i" className="font-mono">{b.isin}</span>],
    [t.country, countryName(l, b.country) ?? "–"],
    [t.currency, b.currency],
    [t.coupon, b.coupon === null ? "–" : `${fmtCoupon(l, b.coupon)}%`],
    [f.couponType, couponTypeLabel(l, b.couponType)],
    [f.seniority, seniorityLabel(l, b.seniority)],
    [t.maturity, b.maturity ? fmtDay(l, b.maturity) : "–"],
    [f.issueDate, b.issueDate ? fmtDay(l, b.issueDate) : "–"],
    [f.callable, callableLabel(l, b.callable)],
    [t.minimum, fmtMin(b.minInvestment, b.currency)],
    [t.risk, <RiskBadge key="r" risk={risk} sp={user?.isAdmin === true ? b.ratingSp?.trim() || null : undefined} />],
  ];

  const card = "rounded-lg border border-line bg-white p-4 sm:p-5";
  return (
    <article className="mx-auto max-w-5xl">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-mute">
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">›</span>}
              {i === crumbs.length - 1 ? <span aria-current="page" className="text-ink">{label}</span> : <Link href={c.href} className="hover:text-ink">{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
        {label} <span className="whitespace-nowrap text-mute">· {b.isin}</span>
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink/80">{t.intro.replace("{isin}", b.isin).replace("{issuer}", issuer)}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className={card}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[14px] sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-mute">{k}</dt>
                <dd className="mt-0.5 truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {asOf && <p className="mt-3 text-[11px] text-mute">{t.dataAsOf} <time dateTime={asOf}>{fmtDay(l, asOf)}</time></p>}
        </section>

        <div className="grid content-start gap-4">
          {paid ? (
            <section className={card}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
                <div><dt className="text-xs text-mute">{t.ytm}</dt><dd className="mt-0.5 font-medium tabular-nums">{b.grossYtm === null ? "–" : `${fmtPct(l, b.grossYtm)}%`}</dd></div>
                <div><dt className="text-xs text-mute">{t.duration}</dt><dd className="mt-0.5 font-medium tabular-nums">{b.modifiedDuration === null ? "–" : fmtPct(l, b.modifiedDuration, 1)}</dd></div>
                <div><dt className="text-xs text-mute">{t.adj}</dt><dd className="mt-0.5 font-medium tabular-nums">{rank ? `${fmtPct(l, rank.adj)}%` : "–"}</dd></div>
                <div><dt className="text-xs text-mute">{t.rank}</dt><dd className="mt-0.5 font-medium tabular-nums">{rank ? `${rank.rank} ${t.rankOf} ${rank.of}` : "–"}</dd></div>
              </dl>
            </section>
          ) : (
            <section className={card}>
              <p className="text-[15px] font-semibold">{t.locked}</p>
              <p className="mt-1 text-[13px] text-mute">{t.lockedText}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/pricing" className="rounded-full bg-accent px-4 py-1.5 text-[14px] font-medium text-white hover:bg-[#0077ed]">{t.upgrade}</Link>
                {!user && <Link href="/signup" className="rounded-full bg-line/60 px-4 py-1.5 text-[14px] font-medium hover:bg-line">{t.signup}</Link>}
              </div>
            </section>
          )}
          {(sameIssuer.length > 0 || similar.length > 0) && (
            <section className={`${card} text-[13px]`}>
              {sameIssuer.length > 0 && <BondLinks l={l} title={t.moreIssuer.replace("{issuer}", issuer)} bonds={sameIssuer} />}
              {similar.length > 0 && <div className={sameIssuer.length ? "mt-3" : ""}><BondLinks l={l} title={t.similar} bonds={similar.slice(0, sameIssuer.length ? 2 : 4)} /></div>}
            </section>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-snug text-mute">
        <Link href={method(l)} className="underline hover:text-ink">{t.riskLink}</Link> · <Link href={home(l)} className="underline hover:text-ink">{t.findTen}</Link>
      </p>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: SITE_URL + c.href })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FinancialProduct",
          name: `${label} ${t.bond}`,
          alternateName: b.isin,
          identifier: { "@type": "PropertyValue", propertyID: "ISIN", value: b.isin },
          category: t.bond,
          description: bondDescription(l, b),
          url,
          inLanguage: l === "en" ? "en" : l,
          provider: { "@type": "Organization", name: issuer },
          ...(b.coupon !== null ? { interestRate: { "@type": "QuantitativeValue", value: b.coupon, unitText: "PERCENT" } } : {}),
          ...(b.maturity ? { additionalProperty: [{ "@type": "PropertyValue", name: t.maturity, value: b.maturity }, { "@type": "PropertyValue", name: t.currency, value: b.currency }] } : {}),
        }}
      />
    </article>
  );
}

function BondLinks({ l, title, bonds }: { l: BondLang; title: string; bonds: PublicBond[] }) {
  return (
    <>
      <h2 className="text-xs font-semibold text-mute">{title}</h2>
      <ul className="mt-1.5 grid gap-1">
        {bonds.map((x) => (
          <li key={x.isin} className="truncate">
            <Link href={bondPagePath(l, x.isin)} className="hover:text-accent">{bondLabel(l, x)}</Link> <span className="font-mono text-[11px] text-mute">{x.isin}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
