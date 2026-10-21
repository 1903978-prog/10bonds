"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FinderLang } from "@/lib/finderText";

// First-visit tips on the finder: one small bubble at a time next to a control, with Next and Skip. Shown once per
// browser (functional localStorage flag, no tracking); `?tips=1` shows them again. The bubble floats (position fixed),
// so nothing on the page moves; it is portalled to <body> because the finder grid is transformed.

const KEY = "tb_tips";
type Step = { tip: string; title: string; body: string };

const TEXT: Record<FinderLang, { steps: Step[]; next: string; done: string; skip: string }> = {
  en: {
    steps: [
      { tip: "currency", title: "1. Select the currency", body: "Euro or US dollar bonds." },
      { tip: "size", title: "2. Choose the bond size", body: "The minimum order. 1k–10k keeps bonds you can buy with small amounts." },
      { tip: "horizon", title: "3. Set your horizon", body: "How many years you want to keep your money invested." },
      { tip: "return", title: "4. Set your desired return", body: "The return per year you are after, before costs and taxes." },
      { tip: "risk", title: "5. Choose the highest risk", body: "1 is the safest. Your top 10 appears on the right." },
    ],
    next: "Next", done: "Got it", skip: "Skip",
  },
  it: {
    steps: [
      { tip: "currency", title: "1. Scegli la valuta", body: "Obbligazioni in euro o in dollari USA." },
      { tip: "size", title: "2. Scegli il taglio", body: "L'importo minimo. 1k–10k tiene le obbligazioni acquistabili con piccole somme." },
      { tip: "horizon", title: "3. Imposta l'orizzonte", body: "Per quanti anni vuoi tenere investiti i tuoi soldi." },
      { tip: "return", title: "4. Imposta il rendimento desiderato", body: "Il rendimento annuo che cerchi, prima di costi e tasse." },
      { tip: "risk", title: "5. Scegli il rischio massimo", body: "1 è il più sicuro. La tua top 10 appare a destra." },
    ],
    next: "Avanti", done: "Ho capito", skip: "Salta",
  },
  fr: {
    steps: [
      { tip: "currency", title: "1. Choisissez la devise", body: "Obligations en euros ou en dollars US." },
      { tip: "size", title: "2. Choisissez la coupure", body: "Le montant minimum. 1k–10k garde les obligations accessibles avec de petites sommes." },
      { tip: "horizon", title: "3. Fixez votre horizon", body: "Combien d'années vous voulez garder votre argent investi." },
      { tip: "return", title: "4. Fixez le rendement souhaité", body: "Le rendement par an que vous visez, avant frais et impôts." },
      { tip: "risk", title: "5. Choisissez le risque maximal", body: "1 est le plus sûr. Votre top 10 apparaît à droite." },
    ],
    next: "Suivant", done: "Compris", skip: "Passer",
  },
  de: {
    steps: [
      { tip: "currency", title: "1. Währung wählen", body: "Anleihen in Euro oder US-Dollar." },
      { tip: "size", title: "2. Stückelung wählen", body: "Die Mindestanlage. 1k–10k zeigt Anleihen, die mit kleinen Beträgen kaufbar sind." },
      { tip: "horizon", title: "3. Anlagehorizont festlegen", body: "Wie viele Jahre Ihr Geld angelegt bleiben soll." },
      { tip: "return", title: "4. Gewünschte Rendite festlegen", body: "Die Rendite pro Jahr, die Sie suchen, vor Kosten und Steuern." },
      { tip: "risk", title: "5. Höchstes Risiko wählen", body: "1 ist am sichersten. Ihre Top 10 erscheint rechts." },
    ],
    next: "Weiter", done: "Verstanden", skip: "Überspringen",
  },
};

const WIDTH = 260;

/** `only` limits the tour to the controls on screen (1-bond mode hides return and risk). */
export default function GuideTips({ lang = "en", only }: { lang?: FinderLang; only?: string[] }) {
  const t = TEXT[lang];
  const steps = only ? t.steps.filter((s) => only.includes(s.tip)) : t.steps;
  const [i, setI] = useState<number | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; side: "right" | "below" } | null>(null);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch {}
    if (new URLSearchParams(window.location.search).get("tips") === "1") seen = false;
    if (seen) return;
    // Wait for the cookie banner to be answered so the two never overlap.
    const id = window.setInterval(() => {
      if (document.querySelector("[data-cookie-banner]")) return;
      window.clearInterval(id);
      setI(0);
    }, 600);
    return () => window.clearInterval(id);
  }, []);

  const finish = useCallback(() => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setI(null);
  }, []);

  const step = i === null ? null : steps[Math.min(i, steps.length - 1)];

  useLayoutEffect(() => {
    if (!step) return;
    const place = () => {
      const el = document.querySelector<HTMLElement>(`[data-tip="${step.tip}"]`);
      if (!el) return setPos(null);
      // The page is zoomed on wider screens (html zoom): rects come in screen pixels, styles in zoomed CSS pixels.
      const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      const box = el.getBoundingClientRect();
      const r = { left: box.left / z, top: box.top / z, bottom: box.bottom / z, height: box.height / z };
      const vw = window.innerWidth / z;
      // Wide screens: to the right of the input panel, over the chart. Phones: just below the control.
      const panel = el.closest("section")?.getBoundingClientRect();
      if (window.innerWidth >= 1024 && panel) setPos({ left: panel.right / z + 14, top: Math.max(8, r.top + r.height / 2 - 40), side: "right" });
      else setPos({ left: Math.max(16, Math.min(r.left, vw - WIDTH - 16)), top: r.bottom + 10, side: "below" });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [step]);

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
        style={pos.side === "right" ? { left: -6, top: 34 } : { left: 22, top: -6 }}
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
