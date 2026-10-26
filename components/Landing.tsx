"use client";

import { useEffect, useState } from "react";
import type { FinderLang } from "@/lib/finderText";
import { trackOnce } from "@/lib/track";
import LANDING_BONDS from "@/lib/landingBonds.json";
import ONE_BOND from "@/lib/landingOneBond.json";
import type { BenchmarkBond } from "@/lib/benchmarkPortfolio";
import { LANDING_SNAPSHOT } from "@/lib/landingSnapshot";
import { loadMe } from "@/lib/me";
import { LANDING_NUM, LANDING_TEXT, type LandingText } from "@/lib/landingText";
import YieldLossSlide from "@/components/YieldLossSlide";
import LandingCarousel, { actionTitle, ListScreen, MultiYearScreen, HeatMapScreen, OneBondScreen, ScreenSlide, SlideCard } from "@/components/LandingCarousel";

// The owner's landing design (23/10/2026): navy, emerald and a soft green-grey, on white cards.
const NAVY = "#112D3B";
// Darkened a touch from the spec's #168264 and #667F8B so small text passes the WCAG AA contrast check (4.5:1).
const GREEN = "#127052";
const MUTE = "#52666F";

// The comparison (the owner, 24/10/2026): the admin's provisional bond ETF benchmark (no provider named in public) against
// one 10bonds slider list, both stored in lib/landingSnapshot.ts (no request on load). Not equal risk or duration. No disclaimer text on the page (the owner, 24/10/2026):
// the caveats, fee wording and "illustrative" live in the Disclaimer page (lib/disclaimer.ts), linked from the footer.
type Bench = { ret: number; risk: number; duration: number; portfolio: { ytm: number; avgRisk: number; duration: number | null; bonds?: BenchmarkBond[] } | null };

/** First-visit landing page, kept minimal (the owner, 24/10/2026): the headline, a 2-portfolio comparison, the free test plus sign up / sign in. */
export default function Landing({ lang, heading = true, onClose }: { lang: FinderLang; heading?: boolean; onClose: () => void }) {
  const t = LANDING_TEXT[lang];
  const Title = heading ? "h1" : "h2";
  const num = (n: number, d = 2) => n.toLocaleString(LANDING_NUM[lang], { minimumFractionDigits: d, maximumFractionDigits: d });

  useEffect(() => trackOnce("landing_view", { variant: "a" }), []);
  // The unverified ETF comparison is hidden from customers; the admin still sees it, marked in yellow.
  const [admin, setAdmin] = useState(false);
  useEffect(() => { loadMe().then((m) => setAdmin(!!m?.isAdmin && !m.asUser)).catch(() => {}); }, []);
  const showBench = LANDING_SNAPSHOT.verified || admin;
  // The first slide comes from the stored snapshot, so it is there on the first paint and nothing is calculated or fetched
  // for it (the owner, 25/10/2026). Only the top 10 slide's bond names are fetched, once the page is idle.
  const [bonds, setBonds] = useState<BenchmarkBond[] | undefined>(undefined);
  const snap = LANDING_BONDS as { asOf: string | null; position: number; bonds: BenchmarkBond[] };
  const bench: Bench = { ret: LANDING_SNAPSHOT.ret, risk: LANDING_SNAPSHOT.risk, duration: LANDING_SNAPSHOT.duration, portfolio: LANDING_SNAPSHOT.portfolio };
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = (tries: number) =>
      fetch("/api/benchmark").then((r) => (r.ok ? r.json() : null)).then((b: Bench | null) => {
        if (stop || !b) return;
        if (b.portfolio?.bonds?.length) setBonds(b.portfolio.bonds);
        else if (tries < 10) timer = setTimeout(() => load(tries + 1), 3000);
      }).catch(() => {});
    timer = setTimeout(() => load(0), 2500);
    return () => { stop = true; clearTimeout(timer); };
  }, []);
  // Escape skips to the finder, as the old intro did.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Desktop (the owner's design, 26/10/2026): text left (40%), carousel card right (60%), objective strip under both.
  // Phones: headline, sentence, button, trust line, then the card.
  return (
    <div data-testid="intro" className="landing mx-auto max-w-[1240px] text-[#132D3B] lg:flex lg:min-h-[calc(100vh_/_var(--z)_-_220px)] lg:items-center">
      <section className="w-full pt-2">
        <div className="grid items-center gap-5 lg:grid-cols-[2fr_3fr] lg:gap-x-10">
          <div className="min-w-0 break-words">
            <Title className="text-[clamp(32px,9.5vw,42px)] font-bold leading-[1.04] tracking-[-0.035em] sm:text-[48px] lg:text-[52px]" style={{ color: NAVY }}>{t.h1}</Title>
            <p className="mt-3 text-[15px] leading-snug sm:text-[16px] lg:text-[17px]" style={{ color: MUTE }} data-testid="landing-tagline">{t.tagline}</p>
            {/* The free test is the only button: sign up and sign in are in the header (the owner, 24/10/2026). */}
            <button type="button" onClick={() => { trackOnce("cta_click", { variant: "a" }); onClose(); }} data-testid="intro-skip"
              className="mt-5 flex w-full items-center justify-between gap-6 whitespace-nowrap rounded-lg px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
              style={{ background: NAVY }}>
              {t.cta} <span aria-hidden>↗</span>
            </button>
            <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-medium" style={{ color: MUTE }} data-testid="landing-trust">
              {t.trust.map((x) => <li key={x} className="flex items-center gap-1.5"><span aria-hidden style={{ color: GREEN }}>✓</span>{x}</li>)}
            </ul>
          </div>
          <div className="min-w-0">
            {/* ETF vs AI first, then one bond's curve, the reason to sign up (the owner, 24/10/2026). */}
            <LandingCarousel t={t} slides={[
              { key: "loss", tab: t.tabs.loss, node: <YieldLossSlide t={t} /> },
              ...(showBench ? [{ key: "compare", tab: t.tabs.compare, node: LANDING_SNAPSHOT.verified ? <Comparison t={t} num={num} bench={bench} /> : (
                <div className="h-full ring-2 ring-yellow-300" data-testid="bench-admin-only">
                  <p className="bg-yellow-200 px-3 py-1 text-center text-[11px] font-medium text-ink">Admin only: hidden from customers until the benchmark is verified</p>
                  <Comparison t={t} num={num} bench={bench} />
                </div>
              ) }] : []),
              { key: "multi", tab: t.tabs.multi, node: <ScreenSlide title={actionTitle(t.carousel.multi.title)}><MultiYearScreen sub={t.carousel.multi.sub} subShort={t.carousel.multi.subShort} insightShort={t.carousel.multi.insightShort} yLabel={t.carousel.multi.y} xLabel={t.carousel.multi.x} insightK={t.carousel.multi.insightK} insight={t.carousel.multi.insight} /></ScreenSlide> },
              { key: "heat", tab: t.tabs.heat, node: <ScreenSlide title={actionTitle(t.carousel.heat.title)}><HeatMapScreen sub={t.carousel.heat.sub} subShort={t.carousel.heat.subShort} insightShort={t.carousel.heat.insightShort} insightK={t.carousel.multi.insightK} insight={t.carousel.heat.insight} retLabel={t.carousel.multi.y} yrs={t.carousel.yrs} /></ScreenSlide> },
              { key: "list", tab: t.tabs.list, node: <ScreenSlide title={actionTitle(t.carousel.act.list)}><ListScreen lang={lang} bonds={snap.bonds.length ? snap.bonds : bonds} mix={snap.position} asOf={snap.asOf ? new Date(snap.asOf.slice(0, 10) + "T12:00:00Z").toLocaleDateString(LANDING_NUM[lang], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : undefined} /></ScreenSlide> },
              { key: "one", tab: t.tabs.one, node: <ScreenSlide title={actionTitle(t.carousel.act.curve)}><OneBondScreen lang={lang} data={ONE_BOND} locale={LANDING_NUM[lang]} asOf={new Date(ONE_BOND.asOf.slice(0, 10) + "T12:00:00Z").toLocaleDateString(LANDING_NUM[lang], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} /></ScreenSlide> },
            ]} />
          </div>
        </div>
        {/* The objective strip and the quant paper (moved under the carousel, the owner, 26/10/2026). */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-[14px] border border-[#cfe6da] bg-[#EDF6F1] px-4 py-3 text-[13px] sm:text-[14px]">
          <p className="min-w-0" data-testid="landing-objective">{t.objective}</p>
          <button type="button" onClick={() => { trackOnce("cta_click", { variant: "a" }); onClose(); }} className="whitespace-nowrap font-semibold underline underline-offset-2" style={{ color: GREEN }}>{t.objectiveLink} →</button>
        </div>
        <div className="mt-3 text-center lg:text-right">
          <a href="/methodology/10bonds-quant-methodology.pdf" target="_blank" rel="noopener" data-testid="landing-paper"
            className="text-[13px] font-medium underline decoration-1 underline-offset-2 hover:opacity-80" style={{ color: GREEN }}>
            {t.paper} ↓
          </a>
        </div>
      </section>
    </div>
  );
}

type Num = (n: number, d?: number) => string;

function Comparison({ t, num, bench }: { t: LandingText; num: Num; bench: Bench | null }) {
  const p = bench?.portfolio ?? null;
  const dp = (d: number) => (Number.isInteger(Math.round(d * 100) / 10) ? 1 : 2);
  const yrs = (d: number | null | undefined) => (d == null ? ["–", "–"] : [t.years(num(d, dp(d))), `${num(d, dp(d))}y`]);
  const rows = (dark: boolean, duration: number | null | undefined, risk: string | null, word: string) => (
    <dl className={`mt-3 space-y-1.5 border-t pt-3 text-[11.5px] min-[380px]:text-[12px] lg:mt-3 lg:text-[12.5px] ${dark ? "border-white/15 text-white/70" : "border-[#e3ebe7]"}`} style={dark ? undefined : { color: MUTE }}>
      {/* Phones get the short words, so nothing is cut at 320 px. */}
      {[
        [t.duration, t.duration, ...yrs(duration)],
        [t.creditRisk, t.creditRiskShort, risk === null ? "–" : `${risk} ${word}`.trim(), risk ?? "–"],
      ].map(([k, ks, v, vs]) => (
        <div key={k} className="flex justify-between gap-2">
          <dt className="min-w-0 truncate"><span className="sm:hidden">{ks}</span><span className="hidden sm:inline">{k}</span></dt>
          <dd className={`shrink-0 font-semibold ${dark ? "text-white" : "text-[#132D3B]"}`}><span className="sm:hidden">{vs}</span><span className="hidden sm:inline">{v}</span></dd>
        </div>
      ))}
    </dl>
  );
  const big = (v: number | null | undefined, dark: boolean) => (
    <p className={`mt-3 text-[clamp(28px,9vw,40px)] font-bold leading-none tracking-tight lg:mt-4 lg:text-[40px] ${dark ? "text-white" : ""}`}>
      {v == null ? "–" : num(v)}<span className="text-[0.5em] font-semibold">%</span>
    </p>
  );
  return (
    <SlideCard title={actionTitle(t.carousel.act.compare)}>
      {/* Centred in the card, which now grows with the free height. */}
      <div className="flex flex-1 flex-col justify-center">
      <div className="mt-1 grid grid-cols-2 gap-2.5 lg:gap-3">
        <div className="rounded-[14px] border border-[#e3ebe7] bg-[#F7F9F8] p-2.5 min-[380px]:p-3 lg:p-4">
          <p className="text-[10px] font-semibold uppercase leading-[1.3] tracking-[0.08em] sm:line-clamp-2 sm:min-h-[2.6em]" style={{ color: MUTE }}><span className="sm:hidden">{t.benchShort}</span><span className="hidden sm:inline">{t.bench}</span></p>
          {big(bench?.ret, false)}
          <p className="mt-1.5 text-[12px]" style={{ color: MUTE }}>{t.grossYtm}</p>
          {rows(false, bench?.duration, bench ? `≈ ${num(bench.risk, 0)}` : null, t.notMatched)}
        </div>
        <div className="rounded-[14px] p-2.5 min-[380px]:p-3 shadow-[0_8px_24px_rgba(17,45,59,0.25)] lg:p-4" style={{ background: NAVY }}>
          <p className="text-[10px] font-semibold uppercase leading-[1.3] tracking-[0.08em] text-[#8fe0b8] sm:line-clamp-2 sm:min-h-[2.6em]"><span className="sm:hidden">{t.aiShort}</span><span className="hidden sm:inline">{t.ai}</span></p>
          {big(p?.ytm, true)}
          <p className="mt-1.5 text-[12px] text-white/70">{t.illGrossYtm}</p>
          {rows(true, p?.duration, p ? num(p.avgRisk, 1) : null, t.modelEstimated)}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 rounded-[14px] border border-[#cfe6da] bg-[#EDF6F1] px-4 py-3">
        <p className="shrink-0 text-[24px] font-bold tracking-tight lg:text-[30px]" style={{ color: p && bench && p.ytm < bench.ret ? MUTE : GREEN }}>{p && bench ? `${p.ytm >= bench.ret ? "+" : ""}${num(p.ytm - bench.ret)}` : "–"}<span className="text-[0.7em]"> pp</span></p>
      </div>
      </div>
    </SlideCard>
  );
}
