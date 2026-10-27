"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FinderLang } from "@/lib/finderText";

// First-visit tips on the finder: one small bubble at a time next to a control, with Next and Skip. Shown once per
// browser (functional localStorage flag, no tracking); `?tips=1` shows them again. The bubble floats (position fixed),
// so nothing on the page moves; it is portalled to <body> because the finder grid is transformed.

const KEY = "tb_tips";
// The 1 bond page has its own tour and its own flag, so seeing one never hides the other.
const KEY_SINGLE = "tb_tips_single";
type Step = { tip: string; title: string; body: string; /** Bubble sits over the target (big areas) instead of beside it. */ over?: boolean; /** Skipped when the target is not on screen. */ optional?: boolean; /** Last step: waits (nothing shown) until the target appears, e.g. once results are on screen. Bubble sits under the target. */ late?: boolean };

const TEXT: Record<FinderLang, { simple: Step[]; steps: Step[]; single: Step[]; next: string; done: string; skip: string }> = {
  en: {
    simple: [
      { tip: "horizon", title: "1. Choose the term", body: "Short, medium or long term." },
      { tip: "return", title: "2. Set risk versus return", body: "One slider: lower risk on the left, higher return potential on the right." },
      { tip: "views", title: "3. Switch the result view", body: "List shows your 10 bonds. Chart plots expected loss against return. Multi-year chart compares horizons of 2–10 years. Heat map colours expected loss by return and term.", late: true },
    ],
    steps: [
      { tip: "currency", title: "1. Select the currency", body: "Euro or US dollar bonds." },
      { tip: "size", title: "2. Choose the bond size", body: "The minimum order. 1k–10k keeps bonds you can buy with small amounts." },
      { tip: "horizon", title: "3. Set your horizon", body: "How many years you want to keep your money invested." },
      { tip: "return", title: "4. Set your desired return", body: "The return per year you are after, before costs." },
      { tip: "risk", title: "5. Choose the highest risk", body: "1 is the safest. Your top 10 appears on the right." },
      { tip: "views", title: "6. Switch the result view", body: "List shows your 10 bonds. Chart plots expected loss against return. Multi-year chart compares horizons of 2–10 years. Heat map colours expected loss by return and term.", late: true },
    ],
    single: [
      { tip: "horizon", title: "1. Choose the term", body: "How many years you want to stay invested." },
      { tip: "chart", title: "2. Tap a dot", body: "Each dot is the highest-return bond for that risk level. 1 is the safest. Grey dots pay no more than a safer bond.", over: true },
      { tip: "change", title: "3. Press Change", body: "See the next bond with the same risk." },
      { tip: "quota", title: "4. Your searches", body: "The counter shows how many searches you have left this week.", optional: true },
    ],
    next: "Next", done: "Got it", skip: "Skip",
  },
  it: {
    simple: [
      { tip: "horizon", title: "1. Scegli la durata", body: "Breve, medio o lungo termine." },
      { tip: "return", title: "2. Imposta rischio e rendimento", body: "Un solo cursore: rischio più basso a sinistra, rendimento potenziale più alto a destra." },
      { tip: "views", title: "3. Cambia la vista dei risultati", body: "Elenco mostra le tue 10 obbligazioni. Grafico confronta perdita attesa e rendimento. Grafico pluriennale confronta orizzonti da 2 a 10 anni. Mappa di calore colora la perdita attesa per rendimento e durata.", late: true },
    ],
    steps: [
      { tip: "currency", title: "1. Scegli la valuta", body: "Obbligazioni in euro o in dollari USA." },
      { tip: "size", title: "2. Scegli il taglio", body: "L'importo minimo. 1k–10k tiene le obbligazioni acquistabili con piccole somme." },
      { tip: "horizon", title: "3. Imposta l'orizzonte", body: "Per quanti anni vuoi tenere investiti i tuoi soldi." },
      { tip: "return", title: "4. Imposta il rendimento desiderato", body: "Il rendimento annuo che cerchi, prima di costi e tasse." },
      { tip: "risk", title: "5. Scegli il rischio massimo", body: "1 è il più sicuro. La tua top 10 appare a destra." },
      { tip: "views", title: "6. Cambia la vista dei risultati", body: "Elenco mostra le tue 10 obbligazioni. Grafico confronta perdita attesa e rendimento. Grafico pluriennale confronta orizzonti da 2 a 10 anni. Mappa di calore colora la perdita attesa per rendimento e durata.", late: true },
    ],
    single: [
      { tip: "horizon", title: "1. Scegli la durata", body: "Per quanti anni vuoi restare investito." },
      { tip: "chart", title: "2. Tocca un punto", body: "Ogni punto è l'obbligazione con il rendimento più alto per quel livello di rischio. 1 è il più sicuro. I punti grigi non rendono più di un'obbligazione più sicura.", over: true },
      { tip: "change", title: "3. Premi Cambia", body: "Vedi la prossima obbligazione con lo stesso rischio." },
      { tip: "quota", title: "4. Le tue ricerche", body: "Il contatore mostra quante ricerche ti restano questa settimana.", optional: true },
    ],
    next: "Avanti", done: "Ho capito", skip: "Salta",
  },
  fr: {
    simple: [
      { tip: "horizon", title: "1. Choisissez la durée", body: "Court, moyen ou long terme." },
      { tip: "return", title: "2. Réglez risque et rendement", body: "Un seul curseur : risque plus faible à gauche, rendement potentiel plus élevé à droite." },
      { tip: "views", title: "3. Changez la vue des résultats", body: "Liste montre vos 10 obligations. Graphique compare perte attendue et rendement. Graphique pluriannuel compare des horizons de 2 à 10 ans. Carte thermique colore la perte attendue selon rendement et durée.", late: true },
    ],
    steps: [
      { tip: "currency", title: "1. Choisissez la devise", body: "Obligations en euros ou en dollars US." },
      { tip: "size", title: "2. Choisissez la coupure", body: "Le montant minimum. 1k–10k garde les obligations accessibles avec de petites sommes." },
      { tip: "horizon", title: "3. Fixez votre horizon", body: "Combien d'années vous voulez garder votre argent investi." },
      { tip: "return", title: "4. Fixez le rendement souhaité", body: "Le rendement par an que vous visez, avant frais et impôts." },
      { tip: "risk", title: "5. Choisissez le risque maximal", body: "1 est le plus sûr. Votre top 10 apparaît à droite." },
      { tip: "views", title: "6. Changez la vue des résultats", body: "Liste montre vos 10 obligations. Graphique compare perte attendue et rendement. Graphique pluriannuel compare des horizons de 2 à 10 ans. Carte thermique colore la perte attendue selon rendement et durée.", late: true },
    ],
    single: [
      { tip: "horizon", title: "1. Choisissez la durée", body: "Combien d'années vous voulez rester investi." },
      { tip: "chart", title: "2. Touchez un point", body: "Chaque point est l'obligation au rendement le plus élevé pour ce niveau de risque. 1 est le plus sûr. Les points gris ne rapportent pas plus qu'une obligation plus sûre.", over: true },
      { tip: "change", title: "3. Appuyez sur Changer", body: "Voyez l'obligation suivante avec le même risque." },
      { tip: "quota", title: "4. Vos recherches", body: "Le compteur indique combien de recherches il vous reste cette semaine.", optional: true },
    ],
    next: "Suivant", done: "Compris", skip: "Passer",
  },
  de: {
    simple: [
      { tip: "horizon", title: "1. Laufzeit wählen", body: "Kurz-, mittel- oder langfristig." },
      { tip: "return", title: "2. Risiko und Rendite einstellen", body: "Ein Regler: geringeres Risiko links, höheres Renditepotenzial rechts." },
      { tip: "views", title: "3. Ergebnisansicht wechseln", body: "Liste zeigt Ihre 10 Anleihen. Diagramm stellt erwarteten Verlust und Rendite gegenüber. Mehrjahres-Diagramm vergleicht Horizonte von 2 bis 10 Jahren. Heatmap färbt den erwarteten Verlust nach Rendite und Laufzeit.", late: true },
    ],
    steps: [
      { tip: "currency", title: "1. Währung wählen", body: "Anleihen in Euro oder US-Dollar." },
      { tip: "size", title: "2. Stückelung wählen", body: "Die Mindestanlage. 1k–10k zeigt Anleihen, die mit kleinen Beträgen kaufbar sind." },
      { tip: "horizon", title: "3. Anlagehorizont festlegen", body: "Wie viele Jahre Ihr Geld angelegt bleiben soll." },
      { tip: "return", title: "4. Gewünschte Rendite festlegen", body: "Die Rendite pro Jahr, die Sie suchen, vor Kosten und Steuern." },
      { tip: "risk", title: "5. Höchstes Risiko wählen", body: "1 ist am sichersten. Ihre Top 10 erscheint rechts." },
      { tip: "views", title: "6. Ergebnisansicht wechseln", body: "Liste zeigt Ihre 10 Anleihen. Diagramm stellt erwarteten Verlust und Rendite gegenüber. Mehrjahres-Diagramm vergleicht Horizonte von 2 bis 10 Jahren. Heatmap färbt den erwarteten Verlust nach Rendite und Laufzeit.", late: true },
    ],
    single: [
      { tip: "horizon", title: "1. Laufzeit wählen", body: "Wie viele Jahre Sie investiert bleiben möchten." },
      { tip: "chart", title: "2. Punkt antippen", body: "Jeder Punkt ist die Anleihe mit der höchsten Rendite für diese Risikostufe. 1 ist am sichersten. Graue Punkte bringen nicht mehr als eine sicherere Anleihe.", over: true },
      { tip: "change", title: "3. Ändern drücken", body: "Sehen Sie die nächste Anleihe mit gleichem Risiko." },
      { tip: "quota", title: "4. Ihre Suchen", body: "Der Zähler zeigt, wie viele Suchen Ihnen diese Woche bleiben.", optional: true },
    ],
    next: "Weiter", done: "Verstanden", skip: "Überspringen",
  },
};

const WIDTH = 260;

/** `only` limits the tour to the controls on screen (1-bond mode hides return and risk); `simple` is the term + one-slider search. */
export default function GuideTips({ lang = "en", only, simple, page }: { lang?: FinderLang; only?: string[]; simple?: boolean; page?: "single" }) {
  const t = TEXT[lang];
  const key = page === "single" ? KEY_SINGLE : KEY;
  const all = page === "single" ? t.single : simple ? t.simple : t.steps;
  const steps = only ? all.filter((s) => only.includes(s.tip)) : all;
  const [i, setI] = useState<number | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; side: "right" | "below"; arrow?: number } | null>(null);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(key) === "1"; } catch {}
    if (new URLSearchParams(window.location.search).get("tips") === "1") seen = false;
    if (seen) return;
    // Wait for the cookie banner to be answered so the two never overlap.
    const id = window.setInterval(() => {
      if (document.querySelector("[data-cookie-banner]")) return;
      window.clearInterval(id);
      setI(0);
    }, 600);
    return () => window.clearInterval(id);
  }, [key]);

  const finish = useCallback(() => {
    try { localStorage.setItem(key, "1"); } catch {}
    setI(null);
  }, [key]);

  const step = i === null ? null : steps[Math.min(i, steps.length - 1)];

  useLayoutEffect(() => {
    if (!step) return;
    const place = () => {
      const el = document.querySelector<HTMLElement>(`[data-tip="${step.tip}"]`);
      if (!el || el.getBoundingClientRect().height === 0) {
        // A step whose target is not there (e.g. no quota counter) is skipped.
        if (step.optional) { if (i !== null && i < steps.length - 1) setI(i + 1); else finish(); return; }
        return setPos(null);
      }
      if (step.late) {
        // Under the tab switch, right-aligned so it stays on screen; the arrow points at the switch.
        const z2 = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
        const b = el.getBoundingClientRect();
        const vw2 = window.innerWidth / z2;
        const left = Math.max(16, Math.min(b.right / z2 - WIDTH, vw2 - WIDTH - 16));
        return setPos({ left, top: b.bottom / z2 + 10, side: "below", arrow: Math.max(16, Math.min(b.left / z2 + b.width / z2 / 2 - left - 6, WIDTH - 28)) });
      }
      // The page is zoomed on wider screens (html zoom): rects come in screen pixels, styles in zoomed CSS pixels.
      const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      const box = el.getBoundingClientRect();
      const r = { left: box.left / z, top: box.top / z, bottom: box.bottom / z, height: box.height / z, width: box.width / z };
      const vw = window.innerWidth / z;
      // Wide screens: to the right of the input panel, over the chart. Phones: just below the control.
      const panel = el.closest("section")?.getBoundingClientRect();
      if (step.over) setPos({ left: Math.max(16, Math.min(r.left + r.width / 2 - WIDTH / 2, vw - WIDTH - 16)), top: Math.min(r.top + 70, window.innerHeight / z - 190), side: "below" });
      else if (window.innerWidth >= 1024 && panel) setPos({ left: panel.right / z + 14, top: Math.max(8, r.top + r.height / 2 - 40), side: "right" });
      else setPos({ left: Math.max(16, Math.min(r.left, vw - WIDTH - 16)), top: r.bottom + 10, side: "below" });
    };
    place();
    const wait = step.late ? window.setInterval(place, 500) : 0;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.clearInterval(wait); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [step, i, steps.length, finish]);

  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, finish]);

  if (!step || !pos || i === null) return null;
  const last = i >= steps.length - 1;
  return createPortal(
    <div
      role="dialog"
      aria-label={step.title}
      data-testid="guide-tip"
      className="fixed z-40 rounded-2xl bg-ink p-3.5 text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
      style={{ left: pos.left, top: pos.top, width: WIDTH }}
    >
      <span
        aria-hidden
        className="absolute h-3 w-3 rotate-45 bg-ink"
        style={pos.side === "right" ? { left: -6, top: 34 } : { left: pos.arrow ?? 22, top: -6 }}
      />
      <div className="text-[14px] font-semibold leading-snug">{step.title}</div>
      <p className="mt-1 text-[12.5px] leading-snug text-white/80">{step.body}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] tabular-nums text-white/60">{i + 1} / {steps.length}</span>
        <div className="flex items-center gap-2">
          {!last && <button type="button" onClick={finish} className="rounded-full px-2.5 py-1 text-[12px] text-white/75 hover:text-white">{t.skip}</button>}
          <button type="button" onClick={() => (last ? finish() : setI(i + 1))} className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink">
            {last ? t.done : t.next}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
