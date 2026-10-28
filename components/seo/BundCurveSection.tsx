import Link from "next/link";
import { JsonLd } from "@/components/seo/Seo";
import BundCurveChart from "@/components/seo/BundCurveChart";
import { getBundCurve } from "@/lib/bundCurve/store";
import { SITE_URL } from "@/lib/seo/crawl";
import { bundCurvePath, type BundCurveText } from "@/lib/seo/bundCurve";

const NUM: Record<string, string> = { it: "it-IT", fr: "fr-FR", de: "de-DE", en: "en-GB" };

/** The chart plus the same numbers as a compact table (readers and crawlers without JavaScript). Official Bundesbank curve, read from the database. */
export default async function BundCurveSection({ locale, text }: { locale: string; text: BundCurveText }) {
  const loc = NUM[locale];
  const curve = await getBundCurve("ZAR").catch(() => null);
  if (!curve) return <p className="mt-6 rounded-lg border border-line bg-white p-6 text-mute">{text.empty}</p>;
  const d = new Date(curve.asOf).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const at = (y: number) => `${curve.points.find((p) => p.years === y)!.yield.toLocaleString(loc, { minimumFractionDigits: 2 })}%`;
  const home = locale === "en" ? "/" : `/${locale}`;
  const bp = (v: number | null) => (v === null ? "–" : `${v > 0 ? "+" : ""}${v.toLocaleString(loc, { maximumFractionDigits: 1 })} bp`);
  return (
    <>
      <p className="mt-2 text-sm text-mute">{text.asOf}: <time dateTime={curve.asOf}>{d}</time> · EUR · {text.source}</p>
      <BundCurveChart locale={locale} text={text} points={curve.points.map((p) => ({ years: p.years, yield: p.yield }))} />
      <p className="mt-3 text-[15px]">{text.key(d, at(2), at(5), at(10), at(30))}</p>
      <p className="mt-2 text-xs text-mute">{text.note}</p>
      <p className="mt-3 text-[15px]"><Link href={home} className="text-accent hover:underline">{text.cta} ›</Link></p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-mute">{text.yearCol} · {text.yieldCol} · {text.wk}</summary>
        <table className="mt-2 w-full max-w-md text-[13px]">
          <thead><tr className="text-left text-mute"><th scope="col" className="py-1 font-normal">{text.yearCol}</th><th scope="col" className="py-1 text-right font-normal">{text.yieldCol}</th><th scope="col" className="py-1 text-right font-normal">{text.changeCol}</th></tr></thead>
          <tbody>
            {curve.points.map((r) => (
              <tr key={r.years} className="border-t border-line">
                <td className="py-1">{r.years} {text.years}</td>
                <td className="py-1 text-right tabular-nums">{r.yield.toLocaleString(loc, { minimumFractionDigits: 2 })}%</td>
                <td className="py-1 text-right tabular-nums text-mute">{bp(r.changeBp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <section className="mt-6">
        <h2 className="text-[16px] font-semibold">{text.faqTitle}</h2>
        {text.faq.map(([q, a]) => <div key={q} className="mt-3"><h3 className="text-[14px] font-semibold">{q}</h3><p className="text-[14px] text-mute">{a}</p></div>)}
      </section>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Dataset", name: text.h1, description: text.description, url: SITE_URL + bundCurvePath(locale as "en"), inLanguage: locale, dateModified: curve.asOf, temporalCoverage: curve.asOf, variableMeasured: text.yieldCol, creator: { "@type": "Organization", name: "10BONDS" } }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: text.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }} />
    </>
  );
}
