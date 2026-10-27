import type { Metadata } from "next";
import { pickedLang } from "@/lib/pageLang";
import { methodLang } from "@/lib/methodology";
import { fill } from "@/lib/rankingMethod";
import { SELECTION_TEXT } from "@/lib/selectionMethod";
import { DURATION_WINDOW } from "@/lib/ranking";
import { LOSS_GIVEN_DEFAULT } from "@/lib/expectedLoss";
import { MC_PATHS, MC_RECOVERY } from "@/lib/monteCarlo";
import { OUTLIER_MIN_PEERS } from "@/lib/outliers";
import { currentOutlierSd } from "@/lib/bonds";
import { LANDING_TEXT } from "@/lib/landingText";

export const metadata: Metadata = {
  title: "Selection methodology · 10BONDS",
  description: "How 10BONDS picks a list of 10 bonds for a chosen duration and desired return: one bond per issuer, the lowest modelled probability of at least one issuer default, and how the list is built.",
  alternates: { canonical: "/selection-methodology" },
  openGraph: { title: "Selection methodology · 10BONDS", description: "How 10BONDS picks a list of 10 bonds for a chosen duration and desired return: one bond per issuer, the lowest modelled probability of at least one issuer default, and how the list is built.", url: "/selection-methodology" },
};
export const dynamic = "force-dynamic";

const SOURCES: Record<string, { head: string; text: string }> = {
  en: { head: "Data sources", text: "Prices, coupons and maturities come from market data on listed bonds and are refreshed every day. Ratings come from the published ratings of the major rating agencies. Default rates come from public historical default studies, combined in our own table." },
  it: { head: "Fonti dei dati", text: "Prezzi, cedole e scadenze provengono dai dati di mercato sulle obbligazioni quotate e sono aggiornati ogni giorno. I rating derivano dai rating pubblicati dalle principali agenzie. I tassi di insolvenza derivano da studi storici pubblici, riuniti in una nostra tabella." },
  fr: { head: "Sources des données", text: "Les prix, coupons et échéances proviennent des données de marché sur les obligations cotées et sont mis à jour chaque jour. Les notes viennent des notations publiées par les principales agences. Les taux de défaut viennent d'études historiques publiques, réunies dans notre propre tableau." },
  de: { head: "Datenquellen", text: "Kurse, Kupons und Fälligkeiten stammen aus Marktdaten zu börsennotierten Anleihen und werden täglich aktualisiert. Ratings stammen aus den veröffentlichten Ratings der großen Agenturen. Ausfallraten stammen aus öffentlichen historischen Studien, zusammengeführt in einer eigenen Tabelle." },
};

export default async function SelectionMethodology({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const lang = methodLang(await pickedLang((await searchParams).lang));
  const t = SELECTION_TEXT[lang];
  const sd = await currentOutlierSd();
  const num = (n: number) => new Intl.NumberFormat(lang).format(n);
  const v = { window: DURATION_WINDOW * 100, lgd: LOSS_GIVEN_DEFAULT * 100, recovery: MC_RECOVERY * 100, paths: num(MC_PATHS), peers: OUTLIER_MIN_PEERS, sd: num(sd) };
  const card = "overflow-hidden rounded-2xl bg-white";
  const head = "px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-mute";

  return (
    <article lang={lang} className="mx-auto max-w-6xl">
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.title}</h1>
        <a href="/methodology/10bonds-quant-methodology.pdf" target="_blank" rel="noopener" data-testid="quant-paper"
          className="whitespace-nowrap text-[13px] font-medium underline decoration-1 underline-offset-2 hover:opacity-80" style={{ color: "#127052" }}>
          {LANDING_TEXT[lang].paper} ↓
        </a>
      </div>
      <p className="mt-1 max-w-3xl text-[13px] leading-snug text-mute">
        {t.intro}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr_0.85fr]">
        <section className={card}>
          <h2 id="ranking" className={head}>{t.stepsHead}</h2>
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
          <h2 id="calculations" className={head}>{t.formulasHead}</h2>
          <ol className="divide-y divide-line/60">
            {t.formulas.map(([name, f], i) => (
              <li key={name} className="px-4 py-1.5">
                <p className="text-[12px] font-medium leading-tight">{i + 1}. {name}</p>
                <p className="font-mono text-[11px] leading-snug text-mute">{fill(f, v)}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className={card}>
          <h2 className={head}>{t.mcHead}</h2>
          <div className="space-y-2 px-4 pb-3 text-[12px] leading-snug">
            {t.mc.map((s) => <p key={s}>{fill(s, v)}</p>)}
          </div>
        </section>
      </div>

      <section className="mt-3 max-w-3xl">
        <h2 id="sources" className="text-[11px] font-semibold uppercase tracking-wide text-mute">{SOURCES[lang].head}</h2>
        <p className="text-[12px] leading-snug text-mute">{SOURCES[lang].text}</p>
      </section>

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

    </article>
  );
}
