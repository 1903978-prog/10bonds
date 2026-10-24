"use client";

import { useEffect, useRef, useState } from "react";
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

/** First-visit landing page: the value in one line, an illustrative 2-portfolio comparison, the frontier, three steps. */
export default function Landing({ lang, heading = true, onClose }: { lang: FinderLang; heading?: boolean; onClose: () => void }) {
  const t = LANDING_TEXT[lang];
  const Title = heading ? "h1" : "h2";
  const num = (n: number, d = 2) => n.toLocaleString(LANDING_NUM[lang], { minimumFractionDigits: d, maximumFractionDigits: d });
  const sel = lang === "en" ? "/selection-methodology" : `/selection-methodology?lang=${lang}`;

  // The phone's sticky button only comes in once the in-page button has scrolled away above the screen,
  // so on the first screen it never covers the comparison card. It steps aside again when the footer comes into view.
  const [footer, setFooter] = useState(false);
  const [passed, setPassed] = useState(false);
  const phoneCta = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.querySelector("footer");
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.target === el) setFooter(e.isIntersecting);
      else setPassed(!e.isIntersecting && e.boundingClientRect.top < 0);
    }));
    if (el) io.observe(el);
    if (phoneCta.current) io.observe(phoneCta.current);
    return () => io.disconnect();
  }, []);
  const sticky = passed && !footer;

  // Escape skips to the finder, as the old intro did.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cta = `rounded-lg px-5 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:opacity-90`;
  return (
    <div data-testid="intro" className="landing mx-auto max-w-[1240px] pb-24 text-[#132D3B] lg:pb-0">
      <section className="grid items-center gap-4 pt-1 sm:gap-6 sm:pt-2 lg:grid-cols-[1.12fr_1fr] lg:gap-10 lg:pt-2">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold sm:text-[12px] uppercase tracking-[0.12em]" style={{ color: GREEN }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: GREEN }} aria-hidden />
            {t.kicker}
          </p>
          <Title className="mt-2 text-[clamp(28px,8vw,32px)] font-bold sm:mt-3 sm:text-[48px] leading-[1.02] tracking-[-0.035em] lg:text-[58px]">
            <span className="block" style={{ color: NAVY }}>{t.h1a}</span>
            <span className="block" style={{ color: GREEN }}>{t.h1b}</span>
          </Title>
          <div className="hidden sm:block">
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <button type="button" onClick={onClose} className={`${cta} flex items-center justify-between gap-6 py-3.5`} style={{ background: NAVY }} data-testid="intro-skip">
                {t.cta} <span aria-hidden>↗</span>
              </button>
              <a href={sel} className="hidden text-[15px] font-semibold underline decoration-[1.5px] underline-offset-4 sm:inline" style={{ color: NAVY }}>{t.how}</a>
            </div>
          </div>
        </div>
        <Comparison t={t} num={num} />
        {/* Phones: the button sits under the card, so headline, card and button all fit the first screen. */}
        <div ref={phoneCta} className="-mt-2 sm:hidden">
          <button type="button" onClick={onClose} className={`${cta} flex w-full items-center justify-between gap-6 py-3.5`} style={{ background: NAVY }}>
            {t.cta} <span aria-hidden>↗</span>
          </button>
        </div>
      </section>

      <Frontier t={t} num={num} />

      <section className="mt-6 grid gap-4 lg:mt-5 lg:grid-cols-4 short:hidden" aria-label={t.stepsTitle}>
        {/* Phones: one soft box with three rows. Desktop: the box melts away and each step is its own card. */}
        <div className="rounded-2xl bg-[#EDF3F0] p-5 lg:contents">
          <h2 className="text-[20px] font-semibold tracking-tight lg:hidden">{t.stepsTitle}</h2>
          {t.steps.map((s, i) => (
            <div key={s.k} className="border-t border-[#d6e2dc] py-3 first-of-type:border-0 lg:rounded-2xl lg:border lg:border-[#e3ebe7] lg:bg-white lg:px-5 lg:py-3.5 lg:shadow-[0_1px_3px_rgba(17,45,59,0.05)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: GREEN }}>
                <span className="lg:hidden">0{i + 1}</span><span className="hidden lg:inline">{s.k}</span>
              </p>
              <h3 className="mt-0.5 text-[16px] font-semibold lg:mt-1.5">{s.t}</h3>
              <p className="mt-1 text-[13px] leading-snug" style={{ color: MUTE }}>{s.s}</p>
            </div>
          ))}
        </div>
        <div className="hidden flex-col justify-center rounded-2xl px-5 py-3.5 text-center lg:flex" style={{ background: NAVY }}>
          <h2 className="text-[18px] font-semibold leading-tight tracking-tight text-white">{t.ctaTitle}</h2>
          <p className="mt-1.5 text-[12.5px] leading-snug text-white/70">{t.ctaSub}</p>
          <button type="button" onClick={onClose} className="mx-auto mt-3 rounded-lg bg-[#B9F0D3] px-4 py-2 text-[14px] font-semibold transition hover:bg-[#a6e8c5]" style={{ color: NAVY }}>
            {t.ctaBtn} <span aria-hidden>↗</span>
          </button>
        </div>
      </section>

      {/* Phones: the builder is always one tap away. Fixed, so it never moves anything; the page keeps room for it. */}
      <div className={`fixed inset-x-0 bottom-0 z-30 transition-opacity lg:hidden ${sticky ? "" : "pointer-events-none opacity-0"}`} inert={!sticky}>
        <div className="bg-gradient-to-t from-[#F7F9F8] via-[#F7F9F8]/90 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4">
          <button type="button" onClick={onClose} className={`${cta} w-full text-center`} style={{ background: NAVY }}>
            {t.sticky} <span aria-hidden>↗</span>
          </button>
        </div>
      </div>
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

// The illustrative frontier: an upward-bending curve, candidate portfolios below it, a manual portfolio under the curve.
const W = 480;
const H = 230;
const X0 = 30;
const X1 = 460;
const curveY = (x: number) => 205 - 180 * Math.sqrt(Math.max(0, x - X0) / (X1 - X0));
const curveX = (y: number) => X0 + (X1 - X0) * ((205 - y) / 180) ** 2;
const CURVE = Array.from({ length: 44 }, (_, i) => X0 + ((X1 - X0) * i) / 43).map((x) => `${x.toFixed(1)},${curveY(x).toFixed(1)}`).join(" ");
const DOTS: [number, number][] = [[70, 214], [105, 196], [150, 202], [175, 176], [212, 186], [300, 158], [330, 120], [365, 140], [395, 108], [420, 150], [440, 76], [205, 140], [280, 186], [350, 190]];
const MAN: [number, number] = [250, 150];

function Frontier({ t, num }: { t: LandingText; num: Num }) {
  const [mode, setMode] = useState<"max" | "min">("max");
  const opt: [number, number] = mode === "max" ? [MAN[0], curveY(MAN[0])] : [curveX(MAN[1]), MAN[1]];
  const tab = (m: "max" | "min", label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
      className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition ${mode === m ? "bg-white shadow-sm" : "hover:text-[#132D3B]"}`} style={mode === m ? { color: NAVY } : { color: MUTE }}>
      {label}
    </button>
  );
  const pill = (x: number, y: number, text: string, dark: boolean, w: number) => (
    <g className="motion-safe:transition-transform motion-safe:duration-500" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <rect x={0} y={-11} width={w} height={24} rx={5} fill={dark ? NAVY : "#EDF3F0"} />
      <text x={w / 2} y={4} textAnchor="middle" fontSize={12} fontWeight={700} fill={dark ? "#fff" : NAVY}>{text}</text>
    </g>
  );
  return (
    <section id="frontier" className="mt-8 grid gap-4 rounded-[18px] border border-[#e3ebe7] bg-white p-4 shadow-[0_1px_3px_rgba(17,45,59,0.05)] lg:mt-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-10 lg:px-8 lg:py-4 short:grid-cols-[0.9fr_1.1fr_0.8fr] short:gap-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: GREEN }}>{t.sciKicker}</p>
        <h2 className="mt-2 text-[26px] font-bold leading-[1.1] tracking-[-0.025em] lg:text-[28px]" style={{ color: NAVY }}>{t.sciTitle}</h2>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTE }}>{t.sciLead}</p>
        <div role="tablist" className="mt-3 inline-flex rounded-lg bg-[#EDF3F0] p-1">
          {tab("max", t.maxReturn)}
          {tab("min", t.minRisk)}
        </div>
        {/* Both notes share one cell (the other is invisible), so switching moves nothing. */}
        <p className="mt-3 grid text-[12px] leading-snug" style={{ color: MUTE }} aria-live="polite">
          <span className={`col-start-1 row-start-1 ${mode === "max" ? "" : "invisible"}`}>{t.maxNote}</span>
          <span className={`col-start-1 row-start-1 ${mode === "min" ? "" : "invisible"}`}>{t.minNote}</span>
        </p>
      </div>
      <figure className="m-0">
        <svg viewBox={`0 0 ${W} ${H + 30}`} className="h-auto w-full lg:max-h-[200px]" role="img" aria-label={`${t.chartLabel}. ${t.illustrative}.`}>
          {[50, 100, 150, 200].map((y) => <line key={y} x1={X0} x2={X1 + 10} y1={y} y2={y} stroke="#eef2f0" />)}
          {[130, 230, 330, 430].map((x) => <line key={x} x1={x} x2={x} y1={14} y2={H - 6} stroke="#eef2f0" />)}
          <line x1={X0} x2={X1 + 10} y1={H - 6} y2={H - 6} stroke="#dfe7e3" />
          <text x={X0} y={10} fontSize={11} fill={MUTE}>{t.yAxis} ↑</text>
          {/* Risk runs from AAA (safest, left) to BBB (right), as the owner asked (23/10/2026). */}
          <text x={X0} y={H + 12} fontSize={11} fontWeight={700} fill={NAVY}>AAA</text>
          <text x={(X0 + X1) / 2} y={H + 12} fontSize={11} fill={MUTE} textAnchor="middle">{t.xAxis} →</text>
          <text x={X1 + 10} y={H + 12} fontSize={11} fontWeight={700} fill={NAVY} textAnchor="end">BBB</text>
          <text x={X0} y={H + 26} fontSize={10} fill="#9fb0b8">{t.illustrative}</text>
          <polygon points={`${X0},${H - 6} ${CURVE} ${X1},${H - 6}`} fill={GREEN} opacity={0.06} />
          <polyline points={CURVE} fill="none" stroke={GREEN} strokeWidth={3} strokeLinecap="round" />
          {DOTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={Math.min(y, H - 12)} r={4} fill="#d4dcd8" />)}
          {/* The move: straight up at the same risk, or straight left at the same return. */}
          <line x1={MAN[0]} y1={MAN[1]} x2={opt[0]} y2={opt[1]} stroke={NAVY} strokeWidth={2} strokeDasharray="3 4" className="motion-safe:transition-all motion-safe:duration-500" />
          <circle cx={MAN[0]} cy={MAN[1]} r={7} fill="#fff" stroke="#9aa9b0" strokeWidth={2.5} />
          <circle cx={opt[0]} cy={opt[1]} r={7.5} fill={GREEN} stroke="#fff" strokeWidth={2.5} className="motion-safe:transition-all motion-safe:duration-500" />
          {pill(MAN[0] - 55, MAN[1] + 24, `${t.manualDot} ${num(MANUAL)}%`, false, 110)}
          {mode === "max"
            ? pill(opt[0] + 16, opt[1] - 2, `${t.optimizedDot} ${num(OPTIMIZED)}%`, true, 112)
            : pill(opt[0] - 40, opt[1] - 30, `${t.optimizedDot} ${num(MANUAL)}%`, true, 112)}
          {mode === "max" && <text x={MAN[0] - 10} y={(MAN[1] + opt[1]) / 2 + 4} fontSize={12} fontWeight={700} fill={GREEN} textAnchor="end">+{num(OPTIMIZED - MANUAL)} pp</text>}
        </svg>
      </figure>
      {/* Laptop-height screens: the three steps sit here instead of their own row, so the page fits without scrolling. */}
      <ol className="hidden rounded-[14px] bg-[#EDF3F0] px-4 py-3 short:block" aria-label={t.stepsTitle}>
        {t.steps.map((s, i) => (
          <li key={s.k} className="border-t border-[#d6e2dc] py-2 first:border-0">
            <p className="text-[14px] font-semibold"><span className="mr-2 text-[12px] font-bold" style={{ color: GREEN }}>0{i + 1}</span>{s.t}</p>
            <p className="mt-0.5 text-[12px] leading-snug" style={{ color: MUTE }}>{s.s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
