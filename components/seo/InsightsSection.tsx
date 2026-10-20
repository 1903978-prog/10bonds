import Link from "next/link";
import { loadBonds } from "@/lib/bonds";
import { marketInsights, type InsightsText } from "@/lib/seo/insights";
import { countryName } from "@/lib/seo/yieldCurves";

const NUM: Record<string, string> = { it: "it-IT", fr: "fr-FR", de: "de-DE", en: "en-GB" };
const GOV_NAME: Record<string, string> = { IT: "BTP", FR: "OAT", ES: "Bonos" };
const box = "mt-6 rounded-[28px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-8";

/** The bond market today, computed from the bond copy each time the page is read. */
export default async function InsightsSection({ locale, text, curveHref, methodHref }: { locale: string; text: InsightsText; curveHref: string; methodHref: string }) {
  const data = await loadBonds().catch(() => null);
  if (!data || !data.bonds.length) return <p className={box}>{text.empty}</p>;
  const i = marketInsights(data.bonds);
  const loc = NUM[locale];
  const pct = (v: number) => `${v.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const n = (v: number) => v.toLocaleString(loc);
  const asOf = data.asOf ? new Date(data.asOf).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <>
      {asOf && <p className="mt-3 text-sm text-mute">{text.asOf} <time dateTime={data.asOf!}>{asOf}</time></p>}
      <p className="mt-4 text-[18px] leading-[1.6]">{text.summary(i, pct, n)}</p>
      <section className={box}>
        <h2 className="text-[20px] font-semibold">{text.hDuration}</h2>
        <table className="mt-3 w-full text-[15px]">
          <thead><tr className="text-left text-mute">{text.durationCols.map((c, k) => <th key={c} scope="col" className={`py-2 pr-3 font-normal ${k ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
          <tbody>
            {i.byDuration.map((d) => (
              <tr key={d.label} className="border-t border-line"><td className="py-2 pr-3">{text.durationLabel(d.label)}</td><td className="py-2 pr-3 text-right tabular-nums">{n(d.bonds)}</td><td className="py-2 pr-3 text-right tabular-nums">{d.median === null ? "–" : pct(d.median)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className={box}>
        <h2 className="text-[20px] font-semibold">{text.hRisk}</h2>
        <ul className="mt-3 space-y-1 text-[15px]">
          <li>{text.ig}: <strong>{i.ig.median === null ? "–" : pct(i.ig.median)}</strong> <span className="text-mute">({n(i.ig.bonds)})</span></li>
          <li>{text.hy}: <strong>{i.hy.median === null ? "–" : pct(i.hy.median)}</strong> <span className="text-mute">({n(i.hy.bonds)})</span></li>
        </ul>
      </section>
      {(i.spreads.length > 0 || i.topGov10.length > 0) && (
        <section className={box}>
          <h2 className="text-[20px] font-semibold">{text.hGov}</h2>
          {i.spreads.map((s) => <p key={s.vs} className="mt-2 text-[15px]">{text.spread(GOV_NAME[s.vs] ?? s.vs, s.year, s.spread)}</p>)}
          {i.topGov10.length > 0 && <p className="mt-3 text-[15px]">{text.topGov} {i.topGov10.map((g) => `${countryName(g.country, loc)} ${pct(g.ytm)} (${g.year})`).join(" · ")}</p>}
          <p className="mt-3"><Link href={curveHref} className="text-accent">{text.curveLink} ›</Link></p>
        </section>
      )}
      <section className={box}>
        <h2 className="text-[20px] font-semibold">{text.hMethod}</h2>
        <p className="mt-2 text-[15px] leading-[1.7]">{text.method}</p>
        <p className="mt-2"><Link href={methodHref} className="text-accent">{text.methodLink} ›</Link></p>
      </section>
    </>
  );
}
