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

  // Phones: headline, card, buttons, one under the other. Desktop: headline and button on the left, card on the right.
  return (
    <div data-testid="intro" className="landing mx-auto max-w-[1240px] text-[#132D3B] lg:flex lg:min-h-[calc(100vh_/_var(--z)_-_220px)] lg:items-center">
      <section className="grid items-center gap-5 pt-2 lg:grid-cols-[0.68fr_1.32fr] lg:gap-x-10 lg:w-full lg:gap-y-8">
        <div className="min-w-0 break-words lg:col-start-1 lg:row-start-1 lg:self-end">
        <div className="mb-1 flex items-baseline justify-end gap-2 sm:hidden">
          {/* Phones: the paper link sits on the eyebrow line, so the page keeps its one-screen height. */}
          <a href="/methodology/10bonds-quant-methodology.pdf" target="_blank" rel="noopener" className="whitespace-nowrap text-[10.5px] font-semibold leading-none underline underline-offset-2 sm:hidden" style={{ color: GREEN }}>{t.paperShort} ↓</a>
        </div>
        <Title className="text-[clamp(30px,9vw,40px)] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[48px] lg:text-[52px]">
          <span className="block" style={{ color: NAVY }}>{t.h1a}</span>
          <span className="block" style={{ color: GREEN }}>{t.h1b}</span>
        </Title>
        <p className="mt-2 text-[14px] leading-snug sm:text-[16px] lg:mt-3 lg:text-[17px]" style={{ color: MUTE }} data-testid="landing-tagline">{t.tagline}</p>
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {/* ETF vs AI first, then one bond's curve, the reason to sign up (the owner, 24/10/2026). */}
          <LandingCarousel t={t} slides={[
            ...(showBench ? [{ key: "compare", node: LANDING_SNAPSHOT.verified ? <Comparison t={t} num={num} bench={bench} /> : (
              <div className="rounded-3xl ring-2 ring-yellow-300" data-testid="bench-admin-only">
                <p className="rounded-t-3xl bg-yellow-200 px-3 py-1 text-center text-[11px] font-medium text-ink">Admin only: hidden from customers until the benchmark is verified</p>
                <Comparison t={t} num={num} bench={bench} />
              </div>
            ) }] : []),
            { key: "multi", node: <ScreenSlide title={actionTitle(t.carousel.multi.title)}><MultiYearScreen sub={t.carousel.multi.sub} subShort={t.carousel.multi.subShort} insightShort={t.carousel.multi.insightShort} yLabel={t.carousel.multi.y} xLabel={t.carousel.multi.x} insightK={t.carousel.multi.insightK} insight={t.carousel.multi.insight} /></ScreenSlide> },
            { key: "heat", node: <ScreenSlide title={actionTitle(t.carousel.heat.title)}><HeatMapScreen sub={t.carousel.heat.sub} subShort={t.carousel.heat.subShort} insightShort={t.carousel.heat.insightShort} insightK={t.carousel.multi.insightK} insight={t.carousel.heat.insight} retLabel={t.carousel.multi.y} yrs={t.carousel.yrs} /></ScreenSlide> },
            { key: "list", node: <ScreenSlide title={actionTitle(t.carousel.act.list)}><ListScreen lang={lang} bonds={snap.bonds.length ? snap.bonds : bonds} mix={snap.position} asOf={snap.asOf ? new Date(snap.asOf.slice(0, 10) + "T12:00:00Z").toLocaleDateString(LANDING_NUM[lang], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : undefined} /></ScreenSlide> },
            { key: "one", node: <ScreenSlide title={actionTitle(t.carousel.act.curve)}><OneBondScreen lang={lang} data={ONE_BOND} locale={LANDING_NUM[lang]} asOf={new Date(ONE_BOND.asOf.slice(0, 10) + "T12:00:00Z").toLocaleDateString(LANDING_NUM[lang], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} /></ScreenSlide> },
          ]} />
        </div>
        {/* The free test is the only button: sign up and sign in are in the header (the owner, 24/10/2026). */}
        <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => { trackOnce("cta_click", { variant: "a" }); onClose(); }} data-testid="intro-skip"
            className="flex flex-1 items-center min-w-0 justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-3.5 text-[13px] min-[360px]:px-4 min-[360px]:text-[14px] min-[400px]:text-[15px] sm:flex-none sm:gap-6 sm:px-5 font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: NAVY }}>
            {t.cta} <span aria-hidden className="hidden min-[400px]:inline">↗</span>
          </button>
        </div>
        {/* The quant methodology paper, for everyone (the owner, 24/10/2026). One small line, so the page still fits one screen. */}
        <a href="/methodology/10bonds-quant-methodology.pdf" target="_blank" rel="noopener" data-testid="landing-paper"
          className="mt-3 hidden text-[13px] font-medium underline decoration-1 underline-offset-2 hover:opacity-80 sm:inline-block" style={{ color: GREEN }}>
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
