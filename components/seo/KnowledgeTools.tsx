import Link from "next/link";
import YieldCurveChart from "@/components/seo/YieldCurveChart";
import { loadBonds } from "@/lib/bonds";
import { DEFAULT_RATES } from "@/lib/seo/defaultRates";
import { CURVE_TEXT, curvePath, DEFAULT_COUNTRIES, govCurves } from "@/lib/seo/yieldCurves";
import type { Locale } from "@/lib/seo/locales";

type L = Locale | "en";
const NUM: Record<L, string> = { it: "it-IT", fr: "fr-FR", de: "de-DE", en: "en-GB" };

const TXT: Record<L, { tools: string; curve: string; fullCurve: string; def: string; defNote: string; rating: string; risk: string; years: (n: number) => string; fullDef: string }> = {
  it: { tools: "Strumenti e dati", curve: "Rendimenti dei titoli di Stato per Paese", fullCurve: "Apri il grafico completo", def: "Probabilità storica di default per rating", defNote: "Tassi di default cumulati medi. Fonte: S&P.", rating: "Rating", risk: "Rischio 10BONDS", years: (n) => `${n} ${n === 1 ? "anno" : "anni"}`, fullDef: "Tabella completa e spiegazione" },
  fr: { tools: "Outils et données", curve: "Rendements des obligations d'État par pays", fullCurve: "Ouvrir le graphique complet", def: "Probabilité historique de défaut par notation", defNote: "Taux de défaut cumulés moyens. Source : S&P.", rating: "Notation", risk: "Risque 10BONDS", years: (n) => `${n} an${n === 1 ? "" : "s"}`, fullDef: "Tableau complet et explications" },
  de: { tools: "Tools und Daten", curve: "Renditen von Staatsanleihen nach Land", fullCurve: "Vollständigen Chart öffnen", def: "Historische Ausfallwahrscheinlichkeit nach Rating", defNote: "Durchschnittliche kumulierte Ausfallraten. Quelle: S&P.", rating: "Rating", risk: "Risiko 10BONDS", years: (n) => `${n} ${n === 1 ? "Jahr" : "Jahre"}`, fullDef: "Vollständige Tabelle und Erklärung" },
  en: { tools: "Tools and data", curve: "Government bond yields by country", fullCurve: "Open the full chart", def: "Historical default probability by rating", defNote: "Average cumulative default rates. Source: S&P.", rating: "Rating", risk: "10BONDS risk", years: (n) => `${n} year${n === 1 ? "" : "s"}`, fullDef: "Full table and explanation" },
};

export const FINDER: Record<L, string> = { it: "Trova le tue 10 obbligazioni", fr: "Trouvez vos 10 obligations", de: "Ihre 10 passenden Anleihen finden", en: "Bond finder: your 10 best-matching bonds" };

/** Ratings shown on the hub (the full 18 notches are on the default-probability page), and the horizons. */
const ROWS = ["AAA", "AA", "A", "BBB", "BBB−", "BB", "B", "CCC / C"];
const COLS = [1, 5, 10];
const IDX: Record<number, number> = { 1: 0, 3: 1, 5: 2, 7: 3, 10: 4, 15: 5 };

const card = "rounded-[24px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6";

/** Top of the Knowledge hubs: the country yield-curve chart, the default table and the other tools, in place. */
export default async function KnowledgeTools({ locale, defaultHref, tools }: { locale: L; defaultHref: string | null; tools: { title: string; href: string; note?: string }[] }) {
  const t = TXT[locale];
  const data = await loadBonds().catch(() => null);
  const curves = data ? govCurves(data.bonds) : [];
  const pct = (v: number) => `${v.toLocaleString(NUM[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  return (
    <section aria-label={t.tools} className="mt-6">
      <h2 className="sr-only">{t.tools}</h2>
      <div className="grid gap-6 lg:grid-cols-5 [&>*]:min-w-0">
        <div className="lg:col-span-3 [&>section:first-child]:mt-0">
          <YieldCurveChart locale={locale} text={{ ...CURVE_TEXT[locale], chartTitle: t.curve }} curves={curves} initial={DEFAULT_COUNTRIES} />
          <p className="mt-2 text-right text-sm"><Link href={curvePath(locale)} className="text-accent">{t.fullCurve} ›</Link></p>
        </div>
        <div className={`${card} lg:col-span-2 lg:self-start`}>
          <h3 className="text-[18px] font-semibold">{t.def}</h3>
          <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={t.def}>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-mute">
                  <th scope="col" className="py-1.5 pr-2 font-normal">{t.rating}</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-normal">{t.risk}</th>
                  {COLS.map((y) => <th key={y} scope="col" className="py-1.5 pl-2 text-right font-normal">{t.years(y)}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => {
                  const row = DEFAULT_RATES.find((x) => x[0] === r)!;
                  return (
                    <tr key={r} className="border-t border-line">
                      <td className="py-1.5 pr-2 font-medium">{r}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{row[1]}</td>
                      {COLS.map((y) => <td key={y} className="py-1.5 pl-2 text-right tabular-nums">{pct(row[2][IDX[y]])}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-mute">{t.defNote}</p>
          {defaultHref && <p className="mt-2 text-sm"><Link href={defaultHref} className="text-accent">{t.fullDef} ›</Link></p>}
        </div>
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="block h-full rounded-2xl bg-white px-4 py-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:text-accent">
              <span className="block text-[15px] font-semibold">{i.title}</span>
              {i.note && <span className="mt-0.5 block text-xs text-mute">{i.note}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
