"use client";

import { useEffect } from "react";
import type { FinderLang } from "@/lib/finderText";
import { LANDING_NUM, LANDING_TEXT, type LandingText } from "@/lib/landingText";

// The owner's landing design (23/10/2026): navy, emerald and a soft green-grey, on white cards.
const NAVY = "#112D3B";
// Darkened a touch from the spec's #168264 and #667F8B so small text passes the WCAG AA contrast check (4.5:1).
const GREEN = "#127052";
const MUTE = "#52666F";

// The comparison is an illustration (the owner's spec): not measured, not a live quote. Labelled on screen.
const MANUAL = 3.8;
const OPTIMIZED = 4.8;
const DURATION = 5;

/** First-visit landing page, kept minimal (the owner, 24/10/2026): the headline, an illustrative 2-portfolio comparison, one button. */
export default function Landing({ lang, heading = true, onClose }: { lang: FinderLang; heading?: boolean; onClose: () => void }) {
  const t = LANDING_TEXT[lang];
  const Title = heading ? "h1" : "h2";
  const num = (n: number, d = 2) => n.toLocaleString(LANDING_NUM[lang], { minimumFractionDigits: d, maximumFractionDigits: d });

  // Escape skips to the finder, as the old intro did.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Phones: headline, card, button, one under the other. Desktop: headline and button on the left, card on the right.
  return (
    <div data-testid="intro" className="landing mx-auto max-w-[1240px] text-[#132D3B] lg:flex lg:min-h-[calc(100vh_/_var(--z)_-_220px)] lg:items-center">
      <section className="grid items-center gap-5 pt-2 lg:grid-cols-[1.12fr_1fr] lg:gap-x-10 lg:w-full lg:gap-y-8">
        <Title className="text-[clamp(30px,9vw,40px)] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[48px] lg:col-start-1 lg:row-start-1 lg:self-end lg:text-[58px]">
          <span className="block" style={{ color: NAVY }}>{t.h1a}</span>
          <span className="block" style={{ color: GREEN }}>{t.h1b}</span>
        </Title>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Comparison t={t} num={num} />
        </div>
        <button type="button" onClick={onClose} data-testid="intro-skip"
          className="flex w-full items-center justify-between gap-6 rounded-lg px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto sm:justify-self-start lg:col-start-1 lg:row-start-2 lg:self-start"
          style={{ background: NAVY }}>
          {t.cta} <span aria-hidden>↗</span>
        </button>
      </section>
    </div>
  );
}

type Num = (n: number, d?: number) => string;

function Comparison({ t, num }: { t: LandingText; num: Num }) {
  const rows = (dark: boolean) => (
    <dl className={`mt-3 space-y-1.5 border-t pt-3 text-[11.5px] min-[380px]:text-[12px] lg:mt-3 lg:text-[12.5px] ${dark ? "border-white/15 text-white/70" : "border-[#e3ebe7]"}`} style={dark ? undefined : { color: MUTE }}>
      {/* Phones get the short words (5.0y, Modeled risk), so nothing is cut at 320 px. */}
      {[
        [t.duration, t.duration, t.years(num(DURATION, 1)), `${num(DURATION, 1)}y`],
        [t.lossRisk, t.lossRiskShort, t.matched, t.matched],
        [t.issuers, t.issuers, "10", "10"],
      ].map(([k, ks, v, vs]) => (
        <div key={k} className="flex justify-between gap-2">
          <dt className="min-w-0 truncate"><span className="sm:hidden">{ks}</span><span className="hidden sm:inline">{k}</span></dt>
          <dd className={`shrink-0 font-semibold ${dark ? "text-white" : "text-[#132D3B]"}`}><span className="sm:hidden">{vs}</span><span className="hidden sm:inline">{v}</span></dd>
        </div>
      ))}
    </dl>
  );
  const big = (v: number, dark: boolean) => (
    <p className={`mt-3 text-[clamp(28px,9vw,40px)] font-bold leading-none tracking-tight lg:mt-4 lg:text-[40px] ${dark ? "text-white" : ""}`}>
      {num(v)}<span className="text-[0.5em] font-semibold">%</span>
    </p>
  );
  return (
    <div className="rounded-[18px] border border-[#e3ebe7] bg-white p-4 shadow-[0_8px_30px_rgba(17,45,59,0.07)] lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight lg:text-[14px]"><span className="sm:hidden">{t.cardTitleShort}</span><span className="hidden sm:inline">{t.cardTitle}</span></h2>
        <span className="shrink-0 rounded-md bg-[#EDF3F0] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: MUTE }}><span className="sm:hidden">{t.illustrativeShort}</span><span className="hidden sm:inline">{t.illustrative}</span></span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:gap-3">
        <div className="rounded-[14px] border border-[#e3ebe7] bg-[#F7F9F8] p-2.5 min-[380px]:p-3 lg:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: MUTE }}>{t.manual}</p>
          {big(MANUAL, false)}
          <p className="mt-1.5 text-[12px]" style={{ color: MUTE }}>{t.perYear}</p>
          {rows(false)}
        </div>
        <div className="rounded-[14px] p-2.5 min-[380px]:p-3 shadow-[0_8px_24px_rgba(17,45,59,0.25)] lg:p-4" style={{ background: NAVY }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8fe0b8]">+ {t.optimized}</p>
          {big(OPTIMIZED, true)}
          <p className="mt-1.5 text-[12px] text-white/70">{t.perYear}</p>
          {rows(true)}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 rounded-[14px] border border-[#cfe6da] bg-[#EDF6F1] px-4 py-3">
        <p className="shrink-0 text-[24px] font-bold tracking-tight lg:text-[30px]" style={{ color: GREEN }}>+{num(OPTIMIZED - MANUAL)}<span className="text-[0.7em]"> pp</span></p>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug">{t.extraTitle}</p>
          <p className="text-[12px] leading-snug" style={{ color: MUTE }}><span className="sm:hidden">{t.extraShort}</span><span className="hidden sm:inline">{t.extraSub}</span></p>
        </div>
      </div>
    </div>
  );
}
