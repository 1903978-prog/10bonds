"use client";

import Link from "next/link";
import { diversification, topSlices, NOT_CLASSIFIED, type DivInput, type DivSlice } from "@/lib/diversification";
import type { FinderLang } from "@/lib/finderText";

// Under the 10-bond table (the owner, 26/10/2026): allocation by industry and by country, plus one diversification score.
// A fixed-size strip (4 bar slots per chart, "–" when empty), so nothing moves whatever the list holds.
const TEXT: Record<FinderLang, { score: string; line: string; industry: string; country: string; other: string; none: string; lock: string; signUp: string; hint: string }> = {
  en: { score: "Diversification", line: "0–100: how evenly the 10 bonds spread across industries and countries (100 = every bond different).", industry: "By industry", country: "By country", other: "Other", none: "Not classified", lock: "Upgrade to visualize", signUp: "Sign up for free to visualize", hint: "See how evenly the 10 bonds spread across industries and countries" },
  it: { score: "Diversificazione", line: "0–100: quanto le 10 obbligazioni sono distribuite tra settori e paesi (100 = tutte diverse).", industry: "Per settore", country: "Per paese", other: "Altri", none: "Non classificato", lock: "Passa al piano superiore per visualizzare", signUp: "Registrati gratis per visualizzare", hint: "Scopri quanto le 10 obbligazioni sono distribuite tra settori e paesi" },
  fr: { score: "Diversification", line: "0–100 : répartition des 10 obligations entre secteurs et pays (100 = toutes différentes).", industry: "Par secteur", country: "Par pays", other: "Autres", none: "Non classé", lock: "Passez à l'offre supérieure pour visualiser", signUp: "Inscrivez-vous gratuitement pour visualiser", hint: "Voyez comment les 10 obligations se répartissent entre secteurs et pays" },
  de: { score: "Diversifikation", line: "0–100: wie gleichmäßig sich die 10 Anleihen auf Branchen und Länder verteilen (100 = alle verschieden).", industry: "Nach Branche", country: "Nach Land", other: "Andere", none: "Nicht klassifiziert", lock: "Upgraden Sie zum Anzeigen", signUp: "Kostenlos registrieren zum Anzeigen", hint: "Sehen Sie, wie gleichmäßig sich die 10 Anleihen auf Branchen und Länder verteilen" },
};

const BARS = 4;

function Bars({ title, slices, other, none }: { title: string; slices: DivSlice[]; other: string; none: string }) {
  const rows = topSlices(slices, BARS, other);
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-mute">{title}</p>
      {Array.from({ length: BARS }).map((_, i) => {
        const r = rows[i];
        return (
          <div key={i} className="flex h-[14px] items-center gap-1.5 text-[10px] leading-none">
            <span className="w-[74px] shrink-0 truncate text-mute" title={r ? r.label : undefined}>{r ? (r.label === NOT_CLASSIFIED ? none : r.label) : "–"}</span>
            <span className="h-[7px] min-w-0 flex-1 rounded-full bg-black/[0.05]">
              {r && <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(3, Math.round(r.share * 100))}%` }} />}
            </span>
            <span className="w-7 shrink-0 text-right tabular-nums text-mute">{r ? `${Math.round(r.share * 100)}%` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

/** `locked`: free plans and visitors get made-up bars, blurred, and a button to the Plans page; no real data is drawn. */
export default function Diversification({ rows, lang, locked: notAllowed, signedIn }: { rows: DivInput[]; lang: FinderLang; locked: boolean; signedIn: boolean }) {
  const t = TEXT[lang];
  const locked = notAllowed && rows.length > 0; // no list yet: the same empty strip for everyone, so nothing shifts when it arrives
  const d = locked ? null : diversification(rows);
  const decoy: DivSlice[] = [{ label: "••••••", share: 0.4 }, { label: "••••••", share: 0.3 }, { label: "••••••", share: 0.2 }, { label: "••••••", share: 0.1 }];
  return (
    <div className="relative mt-2 hidden h-[86px] grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)] gap-4 overflow-hidden rounded-lg bg-black/[0.02] px-3 py-2 sm:grid" data-testid="diversification">
      <div className={`min-w-0 ${locked ? "blur-[6px]" : ""}`} aria-hidden={locked}>
        <p className="text-[10px] font-medium uppercase tracking-wide text-mute">{t.score}</p>
        <p className="text-[24px] font-semibold leading-none tabular-nums" data-testid="diversification-score">{locked ? "00" : d ? d.score : "–"}<span className="text-[11px] font-normal text-mute"> /100</span></p>
        <p className="mt-1 line-clamp-3 text-[9.5px] leading-tight text-mute">{t.line}</p>
      </div>
      <div className={locked ? "blur-[6px]" : ""} aria-hidden={locked}><Bars title={t.industry} slices={locked ? decoy : d?.industry ?? []} other={t.other} none={t.none} /></div>
      <div className={locked ? "blur-[6px]" : ""} aria-hidden={locked}><Bars title={t.country} slices={locked ? decoy : d?.country ?? []} other={t.other} none={t.none} /></div>
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center">
          <p className="text-[12px] font-semibold leading-none">{t.score}</p>
          <p className="max-w-[460px] text-[10.5px] leading-tight text-mute">{t.hint}</p>
          <Link href={signedIn ? "/pricing" : `/signup?next=${lang === "en" ? "/" : `/${lang}`}`} data-testid="diversification-lock" className="rounded-full bg-accent px-4 py-1 text-[13px] font-semibold text-white shadow-lg transition hover:opacity-90">{signedIn ? t.lock : t.signUp}</Link>
        </div>
      )}
    </div>
  );
}
