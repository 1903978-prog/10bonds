import Link from "next/link";
import type { ComparisonData, ComparisonRow } from "@/lib/seo/comparisons";
import { pathOf, T, type Locale } from "@/lib/seo/locales";
import { fmtDate, fmtNum } from "@/lib/seo/site";
import { RiskBadge } from "@/components/RiskBadge";

// Building blocks for the public SEO pages (server components: everything is in the HTML search engines read).

export function JsonLd({ data }: { data: unknown }) {
  // "<" is escaped so the data can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export type Crumb = { name: string; href: string };

export function Breadcrumbs({ locale, items, siteUrl }: { locale: Locale; items: Crumb[]; siteUrl: string }) {
  return (
    <>
      <nav aria-label={T[locale].breadcrumb} className="mb-4 text-sm text-mute">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">›</span>}
              {i === items.length - 1 ? <span aria-current="page" className="text-ink">{c.name}</span> : <Link href={c.href} className="hover:text-ink">{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: siteUrl + c.href })),
        }}
      />
    </>
  );
}

export function ToolCta({ locale }: { locale: Locale }) {
  const t = T[locale];
  return (
    <aside className="mt-10 rounded-[24px] bg-ink p-6 text-white sm:p-8">
      <p className="text-xl font-semibold tracking-tight">{t.ctaTitle}</p>
      <p className="mt-2 text-[15px] text-white/75">{t.ctaText}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/${locale}`} className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-white hover:bg-[#0077ed]">{t.openTool}</Link>
        <Link href="/signup" className="rounded-full bg-white/10 px-5 py-2.5 text-[15px] font-medium text-white hover:bg-white/20">{t.freeAccount}</Link>
      </div>
    </aside>
  );
}

function Table({ locale, rows, curve }: { locale: Locale; rows: ComparisonRow[]; curve?: boolean }) {
  const t = T[locale];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-left text-[14px] sm:text-[15px]">
        <thead className="text-xs text-mute">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">{curve ? t.year : t.issuer}</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">{t.ytm}</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">{t.duration}</th>
            <th scope="col" className="py-2 pr-3 font-medium">{t.riskCol}</th>
            {!curve && <th scope="col" className="py-2 font-medium">{t.maturity}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank} className="border-t border-line">
              <td className="py-2.5 pr-3 font-medium">{curve ? r.maturityYear : r.issuer}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{fmtNum(locale, r.ytm)}%</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{fmtNum(locale, r.duration, 1)}</td>
              <td className="py-2.5 pr-3"><RiskBadge risk={r.risk} /></td>
              {!curve && <td className="py-2.5 tabular-nums">{r.maturityYear ?? "–"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataStamp({ locale, asOf, source }: { locale: Locale; asOf: string | null; source: "live" | "sample" | null }) {
  const t = T[locale];
  if (source === "sample") return <p className="text-xs font-medium text-amber-700">{t.sample}</p>;
  return asOf ? <p className="text-xs text-mute">{t.dataAsOf} <time dateTime={asOf}>{fmtDate(locale, asOf)}</time></p> : null;
}

/** The data part of a comparison page: table(s), figures and the data date. */
export function ComparisonBody({ locale, c, asOf, source }: { locale: Locale; c: ComparisonData; asOf: string | null; source: "live" | "sample" | null }) {
  const t = T[locale];
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-7">
      <DataStamp locale={locale} asOf={asOf} source={source} />
      {c.def.kind === "bands" ? (
        c.bands.map((b) => (
          <section key={b.duration} className="mt-5">
            <h2 className="text-lg font-semibold">{t.duration} ≈ {b.duration} {t.years}</h2>
            <Table locale={locale} rows={b.rows} />
          </section>
        ))
      ) : (
        <div className="mt-3">
          <Table locale={locale} rows={c.rows} curve={c.def.kind === "curve"} />
        </div>
      )}
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-mute">{t.bondsCount}</dt><dd className="font-semibold tabular-nums">{c.bonds}</dd></div>
        <div><dt className="text-xs text-mute">{t.issuersCount}</dt><dd className="font-semibold tabular-nums">{c.issuers}</dd></div>
        {c.ytm && <div><dt className="text-xs text-mute">{t.range}</dt><dd className="font-semibold tabular-nums">{fmtNum(locale, c.ytm.min)} / {fmtNum(locale, c.ytm.median)} / {fmtNum(locale, c.ytm.max)}%</dd></div>}
        {c.avgDuration !== null && <div><dt className="text-xs text-mute">{t.avgDuration}</dt><dd className="font-semibold tabular-nums">{fmtNum(locale, c.avgDuration, 1)} {t.years}</dd></div>}
      </dl>
      <p className="mt-4 text-sm text-mute">{t.moreRows} <Link href={`/${locale}`} className="text-accent">{t.openTool}</Link></p>
    </div>
  );
}

export const prose =
  "text-[16px] leading-[1.7] text-ink [&_a]:text-accent [&_a:hover]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-line [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-canvas [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[14px] [&_h2]:mt-9 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:mt-1.5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_table]:mt-4 [&_table]:block [&_table]:overflow-x-auto [&_table]:text-left [&_table]:text-[14px] [&_td]:border-t [&_td]:border-line [&_td]:py-2 [&_td]:pr-3 [&_th]:py-2 [&_th]:pr-3 [&_th]:font-medium [&_th]:text-mute [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_a.cta]:inline-block [&_a.cta]:rounded-full [&_a.cta]:bg-accent [&_a.cta]:px-5 [&_a.cta]:py-2.5 [&_a.cta]:font-medium [&_a.cta]:text-white [&_a.cta:hover]:no-underline [&_a.cta:hover]:bg-[#0077ed]";
