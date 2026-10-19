import YieldCurveChart from "@/components/seo/YieldCurveChart";
import { loadBonds } from "@/lib/bonds";
import { DEFAULT_COUNTRIES, govCurves, type CurveText } from "@/lib/seo/yieldCurves";

const NUM: Record<string, string> = { it: "it-IT", fr: "fr-FR", de: "de-DE", en: "en-GB" };

/** The interactive chart, plus the same numbers as a plain table for readers and crawlers without JavaScript. */
export default async function CurveSection({ locale, text }: { locale: string; text: CurveText }) {
  const data = await loadBonds().catch(() => null);
  const curves = data ? govCurves(data.bonds) : [];
  const cols = DEFAULT_COUNTRIES.filter((c) => curves.some((x) => x.country === c));
  const first = new Date().getFullYear();
  const years = [...new Set(curves.filter((c) => cols.includes(c.country)).flatMap((c) => c.points.map((p) => p.year)))].filter((y) => y <= first + 10).sort((a, b) => a - b);
  const dn = new Intl.DisplayNames([NUM[locale]], { type: "region" });
  const pct = (v: number) => `${v.toLocaleString(NUM[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const asOf = data?.asOf ? new Date(data.asOf).toLocaleDateString(NUM[locale], { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <>
      {asOf && <p className="mt-3 text-sm text-mute">{text.asOf} <time dateTime={data!.asOf!}>{asOf}</time>{data!.source === "sample" ? " (sample)" : ""}</p>}
      <YieldCurveChart locale={locale} text={text} curves={curves} initial={DEFAULT_COUNTRIES} />
      {years.length > 0 && (
        <section className="mt-8 overflow-x-auto rounded-[28px] bg-white p-5 sm:p-8">
          <h2 className="text-[18px] font-semibold">{text.tableTitle}</h2>
          <table className="mt-3 w-full text-[14px]">
            <thead><tr className="text-left text-mute"><th scope="col" className="py-2 pr-3 font-normal">{text.yearCol}</th>{cols.map((c) => <th key={c} scope="col" className="py-2 pr-3 text-right font-normal">{dn.of(c)}</th>)}</tr></thead>
            <tbody>
              {years.map((y) => (
                <tr key={y} className="border-t border-line">
                  <td className="py-2 pr-3">{y}</td>
                  {cols.map((c) => { const p = curves.find((x) => x.country === c)?.points.find((q) => q.year === y); return <td key={c} className="py-2 pr-3 text-right tabular-nums">{p ? pct(p.ytm) : "–"}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
