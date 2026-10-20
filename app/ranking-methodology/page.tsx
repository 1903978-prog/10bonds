import Link from "next/link";
import type { Metadata } from "next";
import { METHOD_LANGS, methodLang } from "@/lib/methodology";
import { fill, RANKING_TEXT } from "@/lib/rankingMethod";
import { CURVE_RATINGS, V1_CURVE, type CurveConfig } from "@/lib/riskPremium/curve";
import { OUTLIER_SD } from "@/lib/outliers";
import { liveRiskConfig } from "@/lib/riskPremium/store";
import { notchOf, riskOfNotch } from "@/lib/ratings";

export const metadata: Metadata = { title: "Ranking methodology · 10BONDS", alternates: { canonical: "/ranking-methodology" } };
export const dynamic = "force-dynamic";

const LANG_NAME = { en: "English", it: "Italiano", fr: "Français", de: "Deutsch" } as const;

/** The active curve version (Version 1.0 when the accounts database is not reachable). */
async function activeCurve(): Promise<{ curve: CurveConfig; on: boolean; sd: number }> {
  try {
    const live = await liveRiskConfig();
    return { curve: live.curve ?? V1_CURVE, on: live.weight > 0 && !!live.curve, sd: live.outlierSd };
  } catch {
    return { curve: V1_CURVE, on: false, sd: OUTLIER_SD.default };
  }
}

export default async function RankingMethodology({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const lang = methodLang((await searchParams).lang);
  const t = RANKING_TEXT[lang];
  const { curve, on, sd } = await activeCurve();
  const p = curve.premiums;
  const v = { version: curve.version, min: curve.minMaturity, max: curve.maxMaturity, floor: curve.floor, exceptional: curve.exceptionalBp, a: p["AA-"], b: p["BBB+"], diff: p["BBB+"] - p["AA-"], sd: sd.toFixed(1) };
  const card = "overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)]";
  const head = "px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-mute";

  return (
    <article lang={lang} className="mx-auto max-w-6xl">
      <nav aria-label="Language" className="flex gap-3 text-xs text-mute">
        {METHOD_LANGS.map((l) => (
          <Link key={l} href={l === "en" ? "/ranking-methodology" : `/ranking-methodology?lang=${l}`} hrefLang={l} className={l === lang ? "text-ink" : "hover:text-ink"} aria-current={l === lang ? "page" : undefined}>
            {LANG_NAME[l]}
          </Link>
        ))}
      </nav>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t.title}</h1>
      <p className="mt-1 max-w-3xl text-[13px] leading-snug text-mute">{t.intro} <span className="text-ink">{on ? t.status.on : t.status.shadow}</span></p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.4fr_1fr]">
        <section className={card}>
          <h2 className={head}>{fill(t.tableHead, v)}</h2>
          <table className="mx-4 mb-3 w-[calc(100%-2rem)] text-[12px] tabular-nums">
            <thead><tr className="text-left text-[11px] text-mute">{t.cols.map((c, i) => <th key={c} className={i ? "text-right font-normal" : "font-normal"}>{c}</th>)}</tr></thead>
            <tbody>
              {CURVE_RATINGS.map((r, i) => (
                <tr key={r} className="border-t border-line/60">
                  <td className="py-[2px]">{r}</td>
                  <td className="text-right">{riskOfNotch(notchOf(r)) ?? "–"}</td>
                  <td className="text-right">{p[r]} bp</td>
                  <td className="text-right text-mute">{i ? `+${p[r] - p[CURVE_RATINGS[i - 1]]}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className={card}>
          <h2 className={head}>{t.stepsHead}</h2>
          <ol className="divide-y divide-line/60">
            {t.steps.map(([name, line], i) => (
              <li key={name} className="px-4 py-1.5">
                <p className="text-[13px] font-medium leading-tight">{i + 1}. {name}</p>
                <p className="text-[11px] leading-snug text-mute">{fill(line, v)}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className={card}>
          <h2 className={head}>{t.exampleHead}</h2>
          <div className="space-y-2 px-4 pb-3 text-[12px] leading-snug">
            {t.example.map((s) => <p key={s}>{fill(s, v)}</p>)}
          </div>
        </section>
      </div>

      <details className={`${card} mt-4`}>
        <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium">{t.fullHead}</summary>
        <dl className="grid gap-x-6 gap-y-2 px-4 pb-4 text-[12px] leading-snug md:grid-cols-2">
          {t.full.map(([k, d]) => (
            <div key={k}>
              <dt className="font-medium">{k}</dt>
              <dd className="text-mute">{fill(d, v)}</dd>
            </div>
          ))}
        </dl>
      </details>

      <p className="mt-3 text-center text-[11px] text-mute">{t.note}</p>
    </article>
  );
}
