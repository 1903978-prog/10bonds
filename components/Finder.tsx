"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { downloadXlsx } from "@/lib/xlsx";
import { LimitReached, QuotaNote, type Quota } from "./SearchQuota";
import { DURATION_STEPS, LIMITS, TERMS, isOpenEnded, termOf } from "@/lib/limits";
import { RiskBadge } from "./RiskBadge";
import type { ResultRow, ResultsPayload } from "@/lib/tiers";
import type { AltRow } from "@/lib/alternatives";
import { averageRisk } from "@/lib/ratings";
import { listLifeLoss, listLossChance, LOSS_GIVEN_DEFAULT } from "@/lib/expectedLoss";
import LossChart, { slopeAt } from "@/components/LossChart";
import AllCurvesChart from "@/components/AllCurvesChart";
import { nearestLoss } from "@/lib/lossCurve";
import type { CurvePoint } from "@/lib/lossCurve";
import { FINDER_TEXT, FinderLangContext, useFinderText, type FinderLang } from "@/lib/finderText";
import { track } from "@/lib/track";
import SingleBond from "./SingleBond";
import Frontier from "./Frontier";
import { fmtMin, minForExcel } from "@/lib/fmtMin";
import type { BondFilter } from "@/lib/bondFilter";
import { ageDays, isStale } from "@/lib/dataHealth";
import { MC_PATHS } from "@/lib/monteCarlo";
import { loadMe } from "@/lib/me";
import WhyTable from "./WhyTable";
import GuideTips from "./GuideTips";
import type { WhyRow } from "@/lib/whyList";
import { createPortal } from "react-dom";
import { mixTarget } from "@/lib/mixSteps";
import { SLIDER_POSITIONS, SLIDER_START, ceilingOf, levelOf, moodOf, type SliderPosition } from "@/lib/sliderPortfolios";
import AdminTuner, { TUNER_START, type TunerState } from "./AdminTuner";
import type { FeatureKey } from "@/lib/features";

type Response = ResultsPayload & {
  quota?: Quota | null;
  source: "live" | "sample";
  scanned?: number;
  found?: number[];
  monteCarlo?: { paths: number; expYield: number | null; p5: number | null; samples: number[][] };
  asOf: string | null;
  durationBand: number;
  inputs: { duration: number; ytm: number; risk: number };
  alternatives?: AltRow[]; // With "swap": bonds left out, to swap in
  features?: FeatureKey[]; // What this plan includes (the admin's feature table)
  excluded?: boolean; // The customer's excluded bonds and issuers were left out of this search
  outliers?: { sd: number; liveSd: number; count: number; liveCount: number };
  engine?: { method: string; version: string | null; weight: number; liveWeight: number; preview?: boolean; premiums?: Record<string, number> };
};

const pct = (n: number | null | undefined, d = 2) => (n === null || n === undefined ? "—" : `${n.toFixed(d)}%`);
const yrs = (n: number | null | undefined, unit = "yrs") => (n === null || n === undefined ? "—" : `${n.toFixed(1)} ${unit}`);

/** The bond finder. `lang` only changes the words; `heading` false renders the title as h2 where the page has its own h1. */
export default function Finder({ lang = "en", heading = true }: { lang?: FinderLang; heading?: boolean }) {
  const t = FINDER_TEXT[lang];
  const errText = t.error;
  const Title = heading ? "h1" : "h2";
  // Everyone starts on "Mid term" (3-5 years).
  const [duration, setDuration] = useState<number>(TERMS[1].duration);
  const [ytm, setYtm] = useState<number>(LIMITS.ytm.initial);
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const preview = useRef<string | null>(null);
  const [risk, setRisk] = useState<number>(LIMITS.risk.initial);
  // Admin only: the risk premium tuning panel (yellow). Everyone else never sees or sends it.
  const [isAdmin, setIsAdmin] = useState(false);
  const [tuner, setTuner] = useState<TunerState>(TUNER_START);
  const [tunerSaved, setTunerSaved] = useState(0);
  // Bumped when the customer excludes a bond or issuer, so the list is searched again without it.
  const [excludedAt, setExcludedAt] = useState(0);
  useEffect(() => { loadMe().then((me) => setIsAdmin(!!me?.isAdmin)); }, []);
  const [mode, setMode] = useState<"portfolio" | "single">("portfolio");
  const [caps, setCaps] = useState<Record<string, Record<string, number | null>> | null>(null);
  const [currency, setCurrency] = useState<BondFilter["currency"]>("EUR");
  const [size, setSize] = useState<BondFilter["size"]>("100k");
  const [minKnown, setMinKnown] = useState<boolean | null>(null);
  const sizeTouched = useRef(false);
  // Until the visitor moves a control, the results box shows the efficient-frontier chart (the owner, 19/10/2026).
  const [touched, setTouched] = useState(false);
  // The owner watches the show 3x faster.
  const show = useScanShow(data, touched, isAdmin ? 1000 / 3 : 1000);

  // The portfolio results box's height, given to the 1-bond box too, so switching mode never resizes the page.
  const resultsBox = useRef<HTMLElement>(null);
  const [resultsH, setResultsH] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (mode === "portfolio" && resultsBox.current) setResultsH(resultsBox.current.offsetHeight);
  });
  // The highest yield available at each horizon and risk level, loaded once, so the yield slider follows both at once.
  const capFor = (d: number, r: number) => caps?.[String(r)]?.[String(Math.round(d * 100) / 100)] ?? LIMITS.ytm.max;
  const ytmMax = capFor(duration, risk);
  // With the chart open, a click on a dot sets the target to that point and shows its 10 bonds below the chart.
  const [picked, setPicked] = useState(false);
  const pickYtm = (y: number) => {
    setYtm(Math.min(ytmMax, Math.max(LIMITS.ytm.min, Math.round(y * 100) / 100)));
    setPicked(true);
  };
  // The highest risk level that has bonds at each horizon: the risk slider stops there (no risk-7 bonds = 6 to 1).
  const [maxRisk, setMaxRisk] = useState<Record<string, number | null> | null>(null);
  const riskTopFor = (d: number, m = maxRisk) => Math.max(LIMITS.risk.min + 1, m?.[String(Math.round(d * 100) / 100)] ?? LIMITS.risk.max);
  const riskTop = riskTopFor(duration);

  useEffect(() => {
    fetch(`/api/bonds/caps?${new URLSearchParams({ currency, size })}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (!b?.caps) return;
        setCaps(b.caps);
        if (b.maxRisk) {
          setMaxRisk(b.maxRisk);
          setRisk((r) => Math.min(r, riskTopFor(duration, b.maxRisk)));
        }
        setMinKnown(Boolean(b.minKnown));
        if (!b.minKnown) setSize("100k");
        const cap = b.caps[String(risk)]?.[String(Math.round(duration * 100) / 100)];
        if (typeof cap === "number") setYtm((y) => Math.min(y, cap));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, size]);

  // A target at the maximum stays at the maximum when the horizon or risk changes, so more risk shows more yield.
  const followCap = (cap: number) => setYtm((y) => (y > cap || y >= ytmMax - 1e-9 ? cap : y));
  const changeDuration = (d: number) => {
    setTouched(true);
    setDuration(d);
    const r = Math.min(risk, riskTopFor(d));
    if (r !== risk) setRisk(r);
    followCap(capFor(d, r));
  };
  const changeRisk = (r: number) => {
    setTouched(true);
    setRisk(r);
    followCap(capFor(duration, r));
  };

  // Simple search (everyone): a term and one "Return & risk" slider of 30 positions, 10 risk ceilings × low/medium/high
  // return, worked out on the server (lib/sliderPortfolios.ts). The admin can switch to the original sliders (Advanced, yellow).
  const [adv, setAdv] = useState(false);
  const simple = !isAdmin || !adv;
  const [mix, setMix] = useState(SLIDER_START);
  const [positions, setPositions] = useState<SliderPosition[] | null>(null);
  const [diagOpen, setDiagOpen] = useState(false);
  const firstOpen = positions?.find((p) => !p.unavailable)?.position ?? 1;
  const applyMix = (pos: number) => {
    const p = positions?.[pos - 1];
    if (p?.query) {
      setRisk(p.query.risk);
      setYtm(p.query.ytm);
    } else if (!positions) {
      // Until the positions are ready: the quick estimate from the slider maximums.
      const m = mixTarget(pos - 1, (r) => capFor(duration, r), riskTop);
      setRisk(m.risk);
      setYtm(m.ytm);
    }
  };
  const changeMix = (pos: number) => {
    setTouched(true);
    const to = Math.max(pos, firstOpen);
    setMix(to);
    applyMix(to);
  };
  useEffect(() => {
    if (!simple || !TERMS.some((x) => x.duration === duration)) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPositions(null);
    const load = (tries: number) =>
      fetch(`/api/bonds/slider?${new URLSearchParams({ duration: String(duration), currency, size })}`)
        .then(async (r) => {
          if (stop) return;
          if (r.status === 202 && tries < 20) timer = setTimeout(() => load(tries + 1), 3000);
          else if (r.ok) setPositions((await r.json()).positions);
        })
        .catch(() => {});
    load(0);
    return () => { stop = true; clearTimeout(timer); };
  }, [simple, duration, currency, size]);
  // In Simple search the position decides risk and return, so they follow the term, the filters and the data.
  useEffect(() => {
    if (!simple) return;
    if (!TERMS.some((x) => x.duration === duration)) {
      setDuration(TERMS.find((x) => x.key === termOf(duration))?.duration ?? TERMS[1].duration);
      return;
    }
    if (positions || caps) applyMix(Math.max(mix, positions ? firstOpen : 1));
    if (positions && mix < firstOpen) setMix(firstOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simple, caps, maxRisk, duration, positions]);

  useEffect(() => {
    preview.current = new URLSearchParams(window.location.search).get("preview");
  }, []);

  useEffect(() => {
    // Only the portfolio list is searched here (the 1-bond mode asks for its own data), so it never uses a portfolio search.
    if (mode !== "portfolio") return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ duration: String(duration), ytm: String(ytm), risk: String(risk), currency, size });
        if (preview.current) qs.set("preview", preview.current);
        if (isAdmin && tuner.weight !== null) {
          qs.set("rw", String(tuner.weight));
          qs.set("rp", tuner.shifts.join(","));
        }
        if (isAdmin && tuner.sd !== null) qs.set("os", String(tuner.sd));
        const res = await fetch(`/api/bonds?${qs}`, { signal: ctrl.signal });
        const body = await res.json();
        if (res.status === 402 && body.limitReached) {
          setLimit(body.limitReached);
          setError(null);
          return;
        }
        if (!res.ok) throw new Error(body.error ?? errText);
        setData(body);
        setLimit(null);
        setError(null);
        track("search", { duration, ytm, risk, tier: body.tier, results: body.rows.length + body.lockedCount });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [duration, ytm, risk, mode, currency, size, tuner, isAdmin, tunerSaved, excludedAt]);

  // Plus and up can swap bonds in and out of the list; this is their edited list (null = the list as ranked).
  const [list, setList] = useState<ResultRow[] | null>(null);
  useEffect(() => setList(null), [data]);
  const tier = data?.tier ?? "visitor";
  // What this plan includes comes with each answer (the admin's feature table, /admin/features).
  const features = new Set<FeatureKey>(data?.features ?? []);
  const paid = features.has("portfolio_sim");
  // The expected-loss chart above the list (paid plans, portfolio mode): a button switches the table for the chart in the same box.
  const [chartOn, setChartOn] = useState(false);
  useEffect(() => { if (!chartOn) setPicked(false); }, [chartOn]);
  const [curve, setCurve] = useState<{ points: CurvePoint[]; max: number } | null>(null);
  // Admin only: every horizon from 2 to 10 years on one chart, in place of the single curve.
  const [showAll, setShowAll] = useState(false);
  const [allCurves, setAllCurves] = useState<{ duration: number; points: CurvePoint[]; max: number }[] | null>(null);
  const chartable = (features.has("loss_chart") || isAdmin) && mode === "portfolio" && !!data && data.rows.length > 0 && (!data.lockedCount || isAdmin);
  useEffect(() => {
    if (!chartOn || !chartable) return;
    const ctrl = new AbortController();
    fetch(`/api/bonds/loss-curve?${new URLSearchParams({ duration: String(duration), risk: String(risk), currency, size })}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setCurve(j))
      .catch(() => {});
    return () => ctrl.abort();
  }, [chartOn, chartable, duration, risk, currency, size]);
  useEffect(() => {
    if (!chartOn || !chartable || !showAll || !isAdmin) return;
    const ctrl = new AbortController();
    fetch(`/api/bonds/loss-curve?${new URLSearchParams({ all: "1", risk: String(risk), currency, size })}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.curves && setAllCurves(j.curves))
      .catch(() => {});
    return () => ctrl.abort();
  }, [chartOn, chartable, showAll, isAdmin, risk, currency, size]);
  const summary = list ? listSummary(list) : data?.summary;
  // The two boxes under the slider: 0 to 1 while the analysis is drawn, 1 once it is done (they then show the figures).
  const reveal = useResultReveal(data, touched && mode === "portfolio", loading, show);
  const signedIn = tier !== "visitor";
  // The same search for the "why in or out" table (it reproduces the list on screen, including the admin's tuning).
  const why = new URLSearchParams({ duration: String(duration), ytm: String(ytm), risk: String(risk), currency, size });
  if (isAdmin && tuner.weight !== null) {
    why.set("rw", String(tuner.weight));
    why.set("rp", tuner.shifts.join(","));
  }
  if (isAdmin && tuner.sd !== null) why.set("os", String(tuner.sd));
  if (preview.current) why.set("preview", preview.current);
  const whyQuery = why.toString();
  // Visitors are asked to open a free account first; upgrade prompts come only after that.
  const lockTo = signedIn ? { href: "/pricing", label: t.avgPlus } : { href: "/signup", label: t.avgSignUp };

  return (
    <FinderLangContext.Provider value={lang}>
    <div className="finder-wide grid grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-5">
      {/* Inputs */}
      {/* On phones the mode tabs sit on top so they never move; in 1-bond mode the title and the two portfolio
          sliders give way so slider, options, curve and bond name fit on one screen. */}
      <section className="flex flex-col rounded-[28px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] max-sm:py-4 sm:p-6">
        <div className={mode === "single" ? "max-lg:hidden" : "max-lg:mt-3"}>
        <Title className="text-[24px] font-semibold leading-[1.1] tracking-tight sm:text-[26px]">
          {t.h1}
        </Title>
        <p className="mt-1.5 text-[13px] leading-snug text-mute">
          {t.intro}
        </p>
        </div>

        <div role="tablist" aria-label={t.mode} className="mt-3 grid grid-cols-2 rounded-full bg-canvas p-1 text-sm font-medium max-lg:order-first max-lg:mt-0">
          {([["single", t.single], ["portfolio", t.portfolio]] as const).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setTouched(true); setMode(m); }}
              className={`rounded-full px-4 py-1.5 transition ${mode === m ? "bg-white shadow-sm" : "text-mute"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {isAdmin && (
          <div role="radiogroup" aria-label="Search" data-testid="admin-search-mode" className="mt-3 grid grid-cols-2 rounded-full border border-amber-300 bg-amber-50 p-0.5 text-[12px] font-medium text-amber-900">
            {([[false, "Simple"], [true, "Advanced"]] as const).map(([v, label]) => (
              <button key={label} type="button" role="radio" aria-checked={adv === v} onClick={() => setAdv(v)} className={`rounded-full px-2 py-0.5 ${adv === v ? "bg-white shadow-sm" : ""}`}>
                {label}
              </button>
            ))}
          </div>
        )}
        {simple ? (
          <>
            <TermPicker value={termOf(duration)} onChange={changeDuration} />
            {/* In 1-bond mode the slider stays in place, hidden, so nothing above or beside it moves. */}
            <div className={mode === "portfolio" ? "" : "invisible max-lg:hidden"} aria-hidden={mode !== "portfolio"}>
              <Slider
                tip="return"
                label={t.mixLabel}
                hint={t.mixLabel}
                value={mix}
                display={
                  isAdmin ? (
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-amber-900">
                      #{mix} · <RiskBadge risk={ceilingOf(mix)} /> · {["low", "medium", "high"][levelOf(mix) - 1]}
                    </span>
                  ) : (
                    <span className="text-[14px] font-medium text-mute" data-testid="mix-mood">{t.mood[moodOf(mix)]}</span>
                  )
                }
                min={1}
                max={SLIDER_POSITIONS}
                step={1}
                minLabel={t.lowReturn}
                maxLabel={t.highReturn}
                onChange={changeMix}
              />
              {isAdmin && (
                <button type="button" data-testid="slider-check-open" onClick={() => setDiagOpen(true)} className="mt-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                  30-position table{positions ? "" : " (preparing…)"}
                </button>
              )}
              <ResultBoxes
                frac={reveal}
                paths={data?.monteCarlo?.paths || MC_PATHS}
                lang={lang}
                ret={!paid && data ? null : reveal === 1 ? pct(summary?.avgYtm) : "—"}
                loss={!paid && data ? null : reveal === 1 && summary?.lifeLoss != null ? `${summary.lifeLoss.toFixed(2)}%` : "—"}
                lock={lockTo}
              />
            </div>
            <MoreFilters label={t.moreFilters} summary={`${currency} · ${size === "1k" ? t.small : t.allSizes}`}>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Toggle label={t.currency} value={currency} options={[["EUR", "EUR"], ["USD", "USD"]]} onChange={(v) => { setTouched(true); setCurrency(v as BondFilter["currency"]); }} testId="toggle-currency" tip="currency" />
                <Toggle
                  label={t.minOrder}
                  value={size}
                  options={[["1k", t.small], ["100k", t.allSizes]]}
                  onChange={(v) => { setTouched(true); sizeTouched.current = true; setSize(v as BondFilter["size"]); }}
                  testId="toggle-size"
                  tip="size"
                  disabled={minKnown === false ? ["1k"] : []}
                  disabledTitle={t.minNoData}
                />
              </div>

            </MoreFilters>
          </>
        ) : (
          // Advanced search (admin only, yellow): the original horizon, return and risk sliders and the filters.
          <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 pb-2" data-testid="admin-advanced">
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Toggle label={t.currency} value={currency} options={[["EUR", "EUR"], ["USD", "USD"]]} onChange={(v) => { setTouched(true); setCurrency(v as BondFilter["currency"]); }} testId="toggle-currency" tip="currency" />
            <Toggle
              label={t.minOrder}
              value={size}
              options={[["1k", t.small], ["100k", t.allSizes]]}
              onChange={(v) => { setTouched(true); sizeTouched.current = true; setSize(v as BondFilter["size"]); }}
              testId="toggle-size"
              tip="size"
              disabled={minKnown === false ? ["1k"] : []}
              disabledTitle={t.minNoData}
            />
          </div>

          <Slider
            tip="horizon"
            label={t.horizon}
            hint={t.horizonHint}
            value={DURATION_STEPS.indexOf(duration)}
            display={isOpenEnded(duration) ? t.years30 : `${duration} ${t.years}`}
            min={0}
            max={DURATION_STEPS.length - 1}
            step={1}
            minLabel={t.year1}
            maxLabel={t.years30}
            onChange={(i) => changeDuration(DURATION_STEPS[i])}
          />
            <div className={mode === "portfolio" ? "" : "invisible max-lg:hidden"} aria-hidden={mode !== "portfolio"}>
            <Slider
              tip="return"
              label={t.yieldLabel}
              hint={t.yieldHint}
              value={ytm}
              display={`${ytm.toFixed(2)}%`}
              min={LIMITS.ytm.min}
              max={ytmMax}
              step={LIMITS.ytm.step}
              minLabel="1.0%"
              maxLabel={`${ytmMax.toFixed(2)}% ${t.maxNote}`}
              onChange={(v) => { setTouched(true); setYtm(v); }}
            />
            {/* Risk 1 (lowest) always on the right: the slider position is riskTop + 1 - risk. */}
            <Slider
              tip="risk"
              label={t.ratingLabel}
              hint={t.ratingHint}
              value={riskTop + LIMITS.risk.min - risk}
              display={<RiskBadge risk={risk} />}
              min={LIMITS.risk.min}
              max={riskTop}
              step={LIMITS.risk.step}
              minLabel={t.highRiskLabel.replace(/^\d+/, String(riskTop))}
              maxLabel={t.lowRiskLabel}
              onChange={(pos) => changeRisk(riskTop + LIMITS.risk.min - pos)}
            />
            </div>
          </div>
        )}
        {diagOpen && positions && createPortal(<SliderCheck positions={positions} onClose={() => setDiagOpen(false)} />, document.body)}
        <GuideTips lang={lang} simple={simple} only={simple ? (mode === "portfolio" ? ["horizon", "return"] : ["horizon"]) : mode === "portfolio" ? undefined : ["currency", "size", "horizon"]} />
        {isAdmin && mode === "portfolio" && <AdminTuner state={tuner} onChange={setTuner} engine={data?.engine} outliers={data?.outliers} onSaved={() => setTunerSaved((n) => n + 1)} />}
        {/* Shows the list for the choices above (in place of the frontier chart) and brings it into view on phones.
            In 1-bond mode it stays in place, hidden, so nothing moves. */}
        <div className={`mt-auto pt-4 ${mode === "portfolio" ? "" : "invisible max-lg:hidden"}`} aria-hidden={mode !== "portfolio"}>
          <button
            type="button"
            data-testid="find-portfolio"
            tabIndex={mode === "portfolio" ? 0 : -1}
            onClick={() => {
              setTouched(true);
              if (window.matchMedia("(max-width: 1023px)").matches) resultsBox.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="w-full rounded-full bg-accent px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90"
          >
            {t.findPortfolio}
          </button>
        </div>

      </section>

      {/* Results */}
      {mode === "single" ? (
        <section
          className="flex flex-col rounded-[28px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] max-sm:pt-3 sm:p-5 lg:min-h-[var(--results-h)]"
          style={resultsH ? { ["--results-h" as string]: `${resultsH}px` } : undefined}
        >
          <SingleBond duration={duration} preview={preview.current} currency={currency} size={size} />
          <p className="mt-auto pt-2 text-[11px] leading-snug text-mute" data-testid="ranking-note">{t.howSingle}</p>
        </section>
      ) : (
      <section ref={resultsBox} className="relative flex flex-col rounded-[28px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-5">
        {/* Laid over the results, which load underneath, so the box keeps its exact size when the chart gives way. */}
        {!touched && (
          <div className="absolute inset-0 z-10 rounded-[28px] bg-white p-4 sm:p-5">
            <Frontier currency={currency} />
          </div>
        )}
        {/* Every box, row and line below keeps its size and place whatever the results are: 10 row slots always, fixed-height boxes, messages drawn over the rows. */}
        {chartOn && chartable ? (
          // With the chart on, the same row shows the chart's three numbers: the target, the expected loss and the extra loss per +1 point.
          <div className="grid grid-cols-3 gap-2">
            <Stat value={pct(ytm)} label={t.chartX} />
            <Stat value={curve ? pct(data?.summary?.lifeLoss ?? nearestLoss(curve.points, ytm)) : "—"} label={t.chartY} />
            <Stat value={curve ? slopeAt(curve.points, ytm).toFixed(2) : "—"} label={t.chartSlope} />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat value={data ? String(Math.min(10, data.rows.length + data.lockedCount)) : "—"} label={t.found} />
          <Stat value={!data ? "—" : paid ? pct(summary?.avgYtm) : null} label={t.avgYield} lock={lockTo} />
          <Stat value={!data ? "—" : paid ? (summary?.lifeLoss != null ? `${summary.lifeLoss.toFixed(2)}%` : "—") : null} label={t.lifeLoss} lock={lockTo} />
          <Stat value={!data ? "—" : paid ? yrs(summary?.avgDuration, t.yrs) : null} label={t.avgDuration} lock={lockTo} />
          <ScanBox data={data} show={show} lang={lang} currency={currency} />
        </div>
        )}
        <div className="mt-1.5 h-4">
          {data && !paid && (
            <Link href={lockTo.href} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline" data-testid="avg-unlock">
              <Lock /> {lockTo.label}
            </Link>
          )}
        </div>

        <div className={`relative mt-2 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
          {/* Fixed-height row above the list: the chart button is always here, drawn only when a chart can be shown. */}
          <div className="mb-1 flex h-7 justify-end">
            {chartable && (
              <div className="flex justify-end gap-2">
                {chartOn && isAdmin && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} data-testid="all-curves-toggle" className="w-28 rounded-full px-3 py-1 text-right text-[12px] text-accent hover:underline">
                    {showAll ? "One curve" : "See all curves"}
                  </button>
                )}
                <button type="button" onClick={() => setChartOn((v) => !v)} data-testid="loss-chart-toggle" className="w-28 rounded-full px-3 py-1 text-right text-[12px] text-accent hover:underline">
                  {chartOn ? t.chartOff : t.chartOn}
                </button>
              </div>
            )}
          </div>
          <div className="relative">
          {chartOn && chartable && (
            <div className="relative h-[200px] bg-white" data-testid="loss-chart">
              {showAll && isAdmin && allCurves ? (
                <AllCurvesChart curves={allCurves} xLabel={t.chartX} yLabel={t.chartY} yearsLabel="yrs" />
              ) : curve && !(showAll && isAdmin) ? (
                <LossChart compact points={curve.points} max={curve.max} current={ytm} loss={data?.summary?.lifeLoss ?? nearestLoss(curve.points, ytm)} xLabel={t.chartX} yLabel={t.chartY} slopeLabel={t.chartSlope} hoverText={t.chartHover} onPick={pickYtm} />
              ) : null}
            </div>
          )}
          <div className={chartOn && chartable && !picked ? "invisible" : undefined}>
          <Results
            dense={chartOn && chartable}
            show={show}
            lang={lang}
            data={data}
            list={list}
            setList={setList}
            features={features}
            onExcluded={() => setExcludedAt(Date.now())}
            signedIn={signedIn}
            whyQuery={whyQuery}
            currency={currency}
            message={
              limit ? <LimitReached quota={limit} />
              : error ? <p className="text-sm text-mute">{error}</p>
              : data && data.rows.length === 0 ? <p className="text-sm text-mute">{t.none}</p>
              : null
            }
          />
          </div>
          {chartOn && chartable && !picked && (
            <p className="pointer-events-none absolute inset-x-0 bottom-0 top-[200px] flex items-center justify-center text-sm text-mute" data-testid="chart-pick-hint">{t.chartPick}</p>
          )}
          </div>
          <div className="mt-1 h-4">{!limit && <QuotaNote quota={data?.quota} className="" />}</div>
        </div>

        <div className="mt-auto pt-2">
          {data?.source === "live" && isStale(data.asOf) ? (
            <p className="truncate text-[11px] leading-snug text-amber-800" role="status" data-testid="yields-stale">
              {t.stale(ageDays(data.asOf) ?? 0)}
            </p>
          ) : data?.source === "sample" ? (
            <p className="truncate text-[11px] leading-snug text-amber-800" role="status" data-testid="yields-date">{t.sample}</p>
          ) : (
            <p className="text-[11px] leading-snug text-mute" data-testid="yields-date">
              {/* Same text before and after the data arrives: only the date fills in, the line never wraps differently. */}
              {t.asOf} {data?.asOf ? plainDate(data.asOf, lang) : "—"}.
            </p>
          )}
          <p className="mt-1 text-[11px] leading-snug text-mute" data-testid="ranking-note">{t.howPortfolio}</p>
          <MonteCarloNote data={data} lang={lang} edited={list !== null} />
          {isAdmin && data && <AdminLossCalc rows={(list ?? data.rows).slice(0, 10)} />}
        </div>
      </section>
      )}
    </div>
    </FinderLangContext.Provider>
  );
}

/** Admin only (Livio): the expected loss on your money worked out bond by bond, in the yellow admin style. */
function AdminLossCalc({ rows }: { rows: ResultRow[] }) {
  if (!rows.length || rows.some((r) => r.pd == null)) return null;
  const share = (r: ResultRow) => (r.pd! * LOSS_GIVEN_DEFAULT) / rows.length;
  const pct = (x: number, d = 2) => `${x.toFixed(d)}%`;
  return (
    <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900" data-testid="admin-loss-calc">
      <p className="font-medium">Expected loss on your money = Σ default chance to maturity × {LOSS_GIVEN_DEFAULT * 100}% ÷ {rows.length} bonds</p>
      <table className="mt-1 w-full tabular-nums">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.isin ?? i}>
              <td className="pr-2">{i + 1}. {r.issuer}</td>
              <td className="pr-2 text-right">risk {r.risk ?? "–"}</td>
              <td className="pr-2 text-right">{r.life != null ? `${r.life.toFixed(1)} yrs` : "–"}</td>
              <td className="pr-2 text-right">default {pct(r.pd!)}</td>
              <td className="pr-2 text-right">× {LOSS_GIVEN_DEFAULT * 100}% = {pct(r.pd! * LOSS_GIVEN_DEFAULT)}</td>
              <td className="text-right">÷ {rows.length} = {pct(share(r), 3)}</td>
            </tr>
          ))}
          <tr className="border-t border-amber-300 font-medium">
            <td colSpan={5} className="pr-2">Expected loss on your money (sum) · chance of any default {pct(listLossChance(rows.map((r) => r.pd!)), 1)}</td>
            <td className="text-right">{pct(listLifeLoss(rows.map((r) => r.pd!)), 3)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Slider(props: {
  tip?: string;
  label: string;
  hint: string;
  value: number;
  display: ReactNode;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  onChange: (n: number) => void;
}) {
  const fill = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <div className="mt-3 sm:mt-4" data-tip={props.tip}>
      <div className="flex items-baseline justify-between">
        <label className="text-[14px] font-semibold">{props.label}</label>
        <span className="text-[16px] font-semibold tabular-nums">{props.display}</span>
      </div>
      <input
        type="range"
        aria-label={props.label}
        className="slider mt-2"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        style={{ ["--fill" as string]: `${fill}%` }}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <div className="mt-1 flex justify-between text-[11px] text-mute">
        <span>{props.minLabel}</span>
        <span>{props.maxLabel}</span>
      </div>
    </div>
  );
}

/** Currency and minimum order, folded under "More filters": a small button opening a panel over the page, so nothing moves. */
function MoreFilters({ label, summary, children }: { label: string; summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={box} className="relative mt-3">
      <button type="button" aria-expanded={open} data-testid="more-filters" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-[12px] font-medium text-mute hover:text-ink">
        {label} <span className="text-mute/70">· {summary}</span> <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-2xl border border-line/70 bg-white p-3 shadow-lg [&>div]:mt-0">
          {children}
        </div>
      )}
    </div>
  );
}

/** Admin only: the 30 slider positions with their targets, achieved figures and bonds (yellow). */
function SliderCheck({ positions, onClose }: { positions: SliderPosition[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-[1100px] overflow-auto rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[11px] text-amber-900" onClick={(e) => e.stopPropagation()} data-testid="slider-check">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-semibold">30 slider positions (same ranking as every search)</div>
          <button type="button" onClick={onClose} className="rounded-full border border-amber-300 px-2">Close</button>
        </div>
        <table className="w-full tabular-nums">
          <thead>
            <tr className="text-left">
              {["Position", "Risk ceiling", "Return level", "Target", "Actual", "Avg risk", "Worst risk", "Expected loss", "Same as", "ISINs"].map((h) => <th key={h} className="pr-2">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.position} className={`border-t border-amber-200 align-top ${p.sameAs ? "text-amber-900/60" : ""}`}>
                <td className="pr-2">{p.position}</td>
                <td className="pr-2">{p.ceiling}</td>
                <td className="pr-2">{["low", "medium", "high"][p.level - 1]}</td>
                <td className="pr-2">{p.target === null ? "–" : `${p.target.toFixed(2)}%`}</td>
                <td className="pr-2">{p.ytm === null ? "–" : `${p.ytm.toFixed(2)}%`}</td>
                <td className="pr-2">{p.avgRisk ?? "–"}</td>
                <td className="pr-2">{p.worstRisk ?? "–"}</td>
                <td className="pr-2">{p.expectedLoss === null ? "–" : `${p.expectedLoss.toFixed(2)}%`}</td>
                <td className="pr-2">{p.unavailable ? "unavailable" : p.sameAs ? `#${p.sameAs}` : ""}</td>
                <td className="break-all font-mono text-[10px]">{p.sameAs ? "" : p.isins.join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Investment horizon as three choices: short, mid and long term, each with its years under it. */
function TermPicker({ value, onChange }: { value: string | null; onChange: (duration: number) => void }) {
  const t = useFinderText();
  const names = { short: t.termShort, mid: t.termMid, long: t.termLong };
  return (
    <div className="mt-3 sm:mt-4" data-tip="horizon">
      <div className="text-[14px] font-semibold">{t.horizon}</div>
      <div role="radiogroup" aria-label={t.horizon} data-testid="term-picker" className="mt-2 grid grid-cols-3 rounded-2xl bg-canvas p-1">
        {TERMS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="radio"
            aria-checked={value === x.key}
            onClick={() => onChange(x.duration)}
            className={`rounded-xl px-1 py-1.5 text-center leading-tight transition ${value === x.key ? "bg-white shadow-sm" : "text-mute"}`}
          >
            <span className="block truncate text-[13px] font-semibold">{names[x.key]}</span>
            <span className="block truncate text-[11px] text-mute">{t.termYears(x.from, x.to)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, options, onChange, testId, tip, disabled = [], disabledTitle }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; testId: string; tip?: string; disabled?: string[]; disabledTitle?: string }) {
  return (
    <div data-tip={tip}>
      <div className="text-xs font-medium text-mute">{label}</div>
      <div role="radiogroup" aria-label={label} data-testid={testId} className="mt-1 grid grid-cols-2 rounded-full bg-canvas p-0.5 text-[13px] font-medium">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            disabled={disabled.includes(v)}
            title={disabled.includes(v) ? disabledTitle : undefined}
            onClick={() => onChange(v)}
            className={`rounded-full px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${value === v ? "bg-white shadow-sm" : "text-mute"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label, lock, h = "h-[60px]" }: { value: ReactNode | null; label: string; lock?: { href: string; label: string }; h?: string }) {
  return (
    <div className={`flex ${h} flex-col items-center justify-center rounded-xl border border-line/70 px-3 py-2 text-center`}>
      {value === null ? (
        // Locked: a grey lock and a dash; the one sign-up link sits under the row.
        <div className="flex items-center gap-1.5 text-xl font-semibold leading-tight text-mute/60" aria-label={lock?.label}>
          <Lock /> —
        </div>
      ) : (
        <div className="text-xl font-semibold leading-tight tabular-nums tracking-tight">{value}</div>
      )}
      <div className="text-[11px] leading-tight text-mute">{label}</div>
    </div>
  );
}

/**
 * Under the slider (the owner, 24/10/2026): the list's return and expected loss, shown once the analysis is done, and the
 * Monte Carlo counter running up to the real number of simulated paths. Fixed sizes, "—" until the figures are ready.
 */
function ResultBoxes({ frac, paths, lang, ret, loss, lock }: { frac: number; paths: number; lang: FinderLang; ret: ReactNode | null; loss: ReactNode | null; lock: { href: string; label: string } }) {
  const t = useFinderText();
  const fmt = new Intl.NumberFormat(lang);
  return (
    <div className="mt-3" data-testid="result-boxes">
      <div className="grid grid-cols-2 gap-2">
        <Stat value={ret} label={t.retYear} lock={lock} h="h-[64px]" />
        <Stat value={loss} label={t.lifeLoss} lock={lock} h="h-[64px]" />
      </div>
      <div className="mt-1.5 flex h-4 items-center gap-2 text-[11px] text-mute" data-testid="mc-counter">
        <span className="shrink-0">{t.scanSimsLabel}</span>
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-accent" style={{ width: `${frac * 100}%` }} />
        </div>
        <span className="w-[64px] shrink-0 text-right tabular-nums">{fmt.format(Math.round(frac * paths))}</span>
      </div>
    </div>
  );
}

/**
 * How far the analysis under the slider has run (0 to 1). It follows the search show when one runs; otherwise it counts
 * on its own, 2.5 seconds the first time and 1 second after, so the work behind each new list is visible. Instant for
 * reduced motion. 0 before the first search and while a new one loads.
 */
function useResultReveal(data: Response | null, active: boolean, loading: boolean, show: Show | null): number {
  const [own, setOwn] = useState<number | null>(null);
  const [done, setDone] = useState<Response | null>(null);
  const runs = useRef(0);
  const showFor = useRef<Response | null>(null);
  useEffect(() => {
    if (show) showFor.current = data;
  }, [show, data]);
  useEffect(() => {
    if (!active || !data || show || done === data) return;
    if (showFor.current === data || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDone(data);
      return;
    }
    const ms = runs.current++ ? 1000 : 2500;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const f = Math.min(1, (now - start) / ms);
      if (f < 1) {
        setOwn(f);
        raf = requestAnimationFrame(tick);
      } else {
        setOwn(null);
        setDone(data);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setOwn(null);
    };
  }, [active, data, show, done]);
  if (!active || !data || loading) return 0;
  if (show) return show.sim;
  if (own !== null) return own;
  return done === data ? 1 : 0;
}

type Show = { row: number; count: number; sim: number };

/** Fifth box of the row: the bond counter while the search show runs (pick number → its A–Z place), else how many bonds were searched. Same size always. */
function ScanBox({ data, show, lang, currency }: { data: Response | null; show: Show | null; lang: FinderLang; currency: string }) {
  const t = useFinderText();
  const fmt = new Intl.NumberFormat(lang);
  const n = data?.scanned ?? 0;
  const bar = show ? show.count / Math.max(n, 1) : n ? 1 : 0;
  return (
    <div className="col-span-2 flex h-[60px] flex-col items-center justify-center rounded-xl border border-line/70 px-3 py-1.5 text-center sm:col-span-1" data-testid="scan-box">
      <div className="text-xl font-semibold leading-none tabular-nums tracking-tight">
        {show ? <><span className="text-[12px] font-normal text-mute">#{show.row + 1} → </span>{fmt.format(show.count)}</> : n ? fmt.format(n) : "—"}
      </div>
      <div className="my-1.5 h-1 w-full max-w-[140px] overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-accent" style={{ width: `${bar * 100}%` }} />
      </div>
      <div className="w-full truncate text-[11px] leading-none text-mute">{show ? `${t.scanOf} ${fmt.format(n)} · A→Z` : t.scanBox(currency)}</div>
    </div>
  );
}

/**
 * The search, staged for the visitor. Every bond searched has a number 1..N in alphabetical order (from the server).
 * Before each of the 10 picks appears, a counter runs up to that bond's number and stops there; the row then appears
 * and the counter starts again for the next one, while the real Monte Carlo run of the list is drawn. Only for searches
 * the visitor starts; a search that answers mid-show takes it over (the show is not restarted); about 1 second per pick;
 * skipped for reduced motion. Rows keep their places throughout (hidden rows are invisible, not removed).
 */
function useScanShow(data: Response | null, active: boolean, perMs = 1000): Show | null {
  const per = useRef(perMs);
  per.current = perMs;
  const [show, setShow] = useState<Show | null>(null);
  const run = useRef<{ raf: number; start: number } | null>(null);
  const latest = useRef(data);
  latest.current = data;
  const shown = useRef(data);
  useEffect(() => {
    if (!active) shown.current = data;
  }, [active, data]);
  useEffect(() => {
    if (!active || !data?.found?.length || data === shown.current || run.current) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const now0 = performance.now();
    const r = { raf: 0, start: now0 };
    run.current = r;
    const tick = (now: number) => {
      const found = latest.current?.found ?? [];
      // ms per pick (the owner: the 10 picks in about 10 seconds): counting up, then a hold on the number
      const t = (now - r.start) / per.current;
      const row = Math.floor(t);
      if (row >= found.length) {
        run.current = null;
        setShow(null);
        return;
      }
      const f = Math.min(1, (t - row) / 0.8);
      const count = Math.max(1, Math.round((1 - (1 - f) * (1 - f)) * found[row]));
      setShow({ row, count, sim: Math.min(1, t / found.length) });
      r.raf = requestAnimationFrame(tick);
    };
    r.raf = requestAnimationFrame(tick);
  }, [active, data]);
  useEffect(
    () => () => {
      if (run.current) cancelAnimationFrame(run.current.raf);
      run.current = null;
    },
    [],
  );
  return show;
}

/** The Monte Carlo drawing, laid over the slots of the picks not shown yet (the bond counter is the fifth box above). */
function ScanPanel({ data, show, lang }: { data: Response; show: Show; lang: FinderLang }) {
  const t = useFinderText();
  const fmt = new Intl.NumberFormat(lang);
  const mc = data.monteCarlo;
  const sims = mc?.paths ?? 0;
  const samples = mc?.samples ?? [];
  const W = 280, H = 70;
  const all = samples.flat();
  const vMin = Math.min(...all), vMax = Math.max(...all);
  const yOf = (v: number) => H - 2 - ((v - vMin) / Math.max(vMax - vMin, 0.1)) * (H - 4);
  const steps = samples[0]?.length ?? 0;
  const left = SLOTS - show.row; // slots still hidden, the space this panel has
  return (
    <div
      aria-hidden="true"
      data-testid="scan-bar"
      className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-canvas text-center top-[var(--m)] sm:top-[var(--d)]"
      style={{ ["--m" as string]: `${show.row * (CARD_H + 8)}px`, ["--d" as string]: `${HEAD_H + show.row * ROW_H}px` }}
    >
      {sims > 0 && left >= 3 && (
        <div className="w-[280px] max-w-[85%]">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-[70px] w-full" preserveAspectRatio="none">
            <defs>
              <clipPath id="mc-reveal"><rect x={0} y={0} width={W * show.sim} height={H} /></clipPath>
            </defs>
            {/* Real simulated paths of this list: each line is one scenario, the drops are defaults. */}
            <g clipPath="url(#mc-reveal)">
              {samples.map((s, k) => {
                const fell = s.some((v, j) => j > 0 && v < s[j - 1]);
                return (
                  <polyline
                    key={k}
                    points={s.map((v, j) => `${(j / (steps - 1)) * W},${yOf(v)}`).join(" ")}
                    fill="none"
                    className={fell ? "stroke-amber-500" : "stroke-accent"}
                    strokeWidth={fell ? 1.2 : 1.5}
                    strokeOpacity={fell ? 0.8 : 0.25}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </g>
          </svg>
          <p className="mt-1 text-[10px] text-mute">{t.scanCaption}</p>
        </div>
      )}
      {sims > 0 && (
        <p className="mt-1 text-[12px] tabular-nums text-mute">
          {t.scanSimsLabel} <span className="font-medium text-ink">{fmt.format(Math.round(show.sim * sims))}</span> / {fmt.format(sims)}
        </p>
      )}
    </div>
  );
}

/** The real Monte Carlo run behind this list: its size for everyone, its results for paid plans. */
function MonteCarloNote({ data, lang, edited }: { data: Response | null; lang: FinderLang; edited: boolean }) {
  const t = useFinderText();
  const mc = data?.monteCarlo;
  const n = new Intl.NumberFormat(lang).format(mc?.paths || MC_PATHS);
  return (
    <p className="mt-1 grid text-[11px] leading-snug text-mute" data-testid="monte-carlo">
      {/* Both texts share one cell, so the line keeps its height when a paid user's edit hides the figures. */}
      {mc?.expYield != null && mc.p5 != null ? (
        <>
          <span className={`col-start-1 row-start-1${edited ? " invisible" : ""}`}>{t.mc(n, pct(mc.expYield), pct(mc.p5))}</span>
          <span className={`col-start-1 row-start-1${edited ? "" : " invisible"}`} aria-hidden={!edited}>{t.mcRun(n)}</span>
        </>
      ) : (
        t.mcRun(n)
      )}
    </p>
  );
}

// Fixed sizes of the result table: a header and always 10 row slots, so nothing under it moves when the results change.
const SLOTS = 10;
const HEAD_H = 30;
const ROW_H = 34;
const DENSE_HEAD_H = 24;
const DENSE_ROW_H = 22;
const CARD_H = 64;

function Results({ data, list, setList, features, onExcluded, signedIn, currency, message, show, lang, whyQuery, dense = false }: { data: Response | null; list: ResultRow[] | null; setList: (l: ResultRow[] | null) => void; features: Set<FeatureKey>; onExcluded: () => void; signedIn: boolean; currency: string; message: ReactNode | null; show: Show | null; lang: FinderLang; whyQuery: string; dense?: boolean }) {
  // Dense: shorter rows, used under the chart so the chart and the 10 bonds fit one screen.
  const rowH = dense ? DENSE_ROW_H : ROW_H;
  const headH = dense ? DENSE_HEAD_H : HEAD_H;
  const t = useFinderText();
  const rows = message ? [] : (list ?? data?.rows ?? []).slice(0, SLOTS);
  // Each tool shows only when the plan has it (lib/features.ts).
  const paid = features.has("isin");
  const canSwap = features.has("swap");
  const canExclude = features.has("blacklist");
  // The swap panel for one slot, drawn over the rows so nothing moves.
  const [panel, setPanel] = useState<{ kind: "swap"; slot: number } | null>(null);
  useEffect(() => setPanel(null), [data]);
  const swapIn = (slot: number, b: ResultRow) => {
    setList(rows.map((r, i) => (i === slot ? { ...b, rank: r.rank } : r)));
    setPanel(null);
  };
  const canEdit = (canSwap || canExclude) && !show && !message && rows.length > 0;
  // Premium: a bond from the "why in or out" table comes in, in place of the same issuer's bond, else the weakest one.
  const addFromWhy = (w: WhyRow) => {
    if (!data || rows.some((r) => r.isin === w.isin)) return;
    const full = [...data.rows, ...(data.alternatives ?? []).map((a) => ({ ...a, rank: 0, lossAdj: a.adjYtm }))].find((b) => b.isin === w.isin);
    const same = rows.findIndex((r) => r.issuer === w.issuer);
    swapIn(same >= 0 ? same : weakestSlot(rows), full ?? { rank: 0, issuer: w.issuer, name: w.name, isin: w.isin, ytm: w.ytm, duration: w.duration, risk: w.risk });
  };
  const locked = message ? 0 : Math.min(data?.lockedCount ?? 0, SLOTS - rows.length);
  const empty = SLOTS - rows.length - locked;
  // While the search show runs, picks from this slot on are kept in place but not shown yet.
  const hide = (i: number) => (show && !message && i >= show.row ? " invisible" : "");
  return (
    <div>
      <div className="relative">
      {/* Desktop table */}
      {/* Fixed layout: column widths never change when the results do. */}
      <table className="hidden w-full table-fixed text-sm sm:table">
        <colgroup>
          <col className="w-9" />
          <col className="w-[24%]" />
          <col />
          <col className="w-[6.5rem]" />
          <col className="w-[6.5rem]" />
          <col className="w-[9rem]" />
          <col className="w-[5rem]" />
          <col className="w-8" />
        </colgroup>
        <thead>
          <tr className="border-b border-line text-left text-xs text-mute" style={{ height: headH }}>
            <th className="py-0 pl-2 font-medium">#</th>
            <th className="truncate py-0 pr-3 font-medium">{t.issuer}</th>
            <th className="truncate py-0 pr-3 font-medium">{t.bond}</th>
            <th className="truncate px-3 py-0 text-center font-medium">{t.yield}</th>
            <th className="truncate px-3 py-0 text-center font-medium">{t.duration}</th>
            <th className="truncate px-3 py-0 text-center font-medium">{t.minInvest}</th>
            <th className="truncate px-3 py-0 text-center font-medium" title={t.riskNote}>{t.risk}</th>
            <th aria-label={t.swap} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.rank} className={`border-b border-line/60${hide(i)}`} style={{ height: rowH }}>
              <td className="py-0 pl-2 text-mute tabular-nums">{r.rank}</td>
              <td className="truncate py-0 pr-3 font-medium" title={r.issuer}>{r.issuer}</td>
              <td className="overflow-hidden py-0 pr-3">
                {paid ? (
                  <div className="truncate" title={`${r.name} · ${r.isin}`}>{r.name} <span className="ml-1 text-[11px] text-mute">{r.isin}</span></div>
                ) : signedIn ? (
                  <Link href="/pricing" className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-accent"><Lock /> {t.isinPlus}</Link>
                ) : (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-mute"><Lock /> {t.freeAccount}</span>
                )}
              </td>
              <td className="px-3 py-0 text-center font-semibold tabular-nums" title={r.why ? t.riskWhy(r.why) : undefined}>{pct(r.ytm)}</td>
              <td className="px-3 py-0 text-center tabular-nums">{signedIn ? r.duration?.toFixed(1) : <Dim />}</td>
              <td className="px-3 py-0 text-center tabular-nums">{signedIn ? fmtMin(r.minInvestment, currency) : <Dim />}</td>
              <td className="px-3 py-0 text-center">{signedIn ? <RiskBadge risk={r.risk} title={t.riskNote} /> : <Dim />}</td>
              <td className="py-0 text-center">{canEdit && <SwapButton onClick={() => setPanel({ kind: "swap", slot: i })} label={`${t.swap}: ${r.issuer}`} />}</td>
            </tr>
          ))}
          {Array.from({ length: locked }).map((_, i) => (
            <tr key={`l${i}`} aria-hidden className={`select-none border-b border-line/60 blur-[5px]${hide(rows.length + i)}`} style={{ height: rowH }}>
              <td className="pl-2"><span className="inline-block h-3 w-4 rounded bg-line align-middle" /></td>
              <td colSpan={5} className="pr-3"><span className="block h-3 rounded bg-line" /></td>
              <td className="px-3"><span className="block h-3 rounded bg-line" /></td>
              <td />
            </tr>
          ))}
          {Array.from({ length: empty }).map((_, i) => (
            <tr key={`e${i}`} aria-hidden style={{ height: rowH }}><td colSpan={8} /></tr>
          ))}
        </tbody>
      </table>

      {/* Phone cards */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((r, i) => (
          <li key={r.rank} className={`flex items-center gap-3 overflow-hidden rounded-2xl border border-line/70 px-4${hide(i)}`} style={{ height: CARD_H }}>
            <span className="w-5 text-sm text-mute tabular-nums">{r.rank}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.issuer}</div>
              <div className="truncate text-xs leading-relaxed text-mute">
                {paid
                  ? <>{r.isin} · {r.duration?.toFixed(1)} {t.yrs} · {t.risk} <RiskBadge risk={r.risk} />{r.minInvestment != null && <> · min {fmtMin(r.minInvestment, currency)}</>}</>
                  : signedIn
                    ? <>{r.duration?.toFixed(1)} {t.yrs} · {t.risk} <RiskBadge risk={r.risk} /> · {t.isinPlus}</>
                    : t.detailsFree}
              </div>
            </div>
            <span className="font-semibold tabular-nums" title={r.why ? t.riskWhy(r.why) : undefined}>{pct(r.ytm)}</span>
            <span className="-mr-2 w-7 shrink-0 text-center">{canEdit && <SwapButton onClick={() => setPanel({ kind: "swap", slot: i })} label={`${t.swap}: ${r.issuer}`} />}</span>
          </li>
        ))}
        {Array.from({ length: locked }).map((_, i) => (
          <li key={`l${i}`} aria-hidden className={`flex select-none items-center gap-3 rounded-2xl border border-line/70 px-4 blur-[5px]${hide(rows.length + i)}`} style={{ height: CARD_H }}>
            <span className="h-3 w-4 rounded bg-line" />
            <span className="h-3 flex-1 rounded bg-line" />
            <span className="h-3 w-12 rounded bg-line" />
          </li>
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <li key={`e${i}`} aria-hidden style={{ height: CARD_H }} />
        ))}
      </ul>

      {locked > 0 && !show && <LockedOverlay count={locked} top={rows.length} />}
      {show && data && !message && <ScanPanel data={data} show={show} lang={lang} />}
      {panel && data && canEdit && (
        <SwapPanel
          row={rows[panel.slot]}
          options={canSwap ? swapOptions(rows[panel.slot], available(data, rows)) : null}
          onPick={(b) => swapIn(panel.slot, b)}
          onExclude={canExclude ? async (kind) => { if (await excludeRow(rows[panel.slot], kind)) { setPanel(null); onExcluded(); } } : undefined}
          onClose={() => setPanel(null)}
        />
      )}
      {message && (
        <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center rounded-2xl bg-canvas p-6 text-center sm:top-[30px]">
          {message}
        </div>
      )}
      </div>

      {/* One fixed-height line under the table: the Excel button, or the upgrade link, or nothing. */}
      <div className="mt-2 flex h-7 items-center gap-2 overflow-hidden whitespace-nowrap">
        {features.has("excel") && rows.length > 0 ? (
          <>
          <button
            type="button"
            data-testid="excel-download"
            onClick={() =>
              downloadXlsx(
                [["#", t.issuer, t.bond, "ISIN", `${t.yield} %`, t.duration, t.minInvest], ...rows.map((r) => [r.rank, r.issuer, r.name, r.isin, r.ytm, r.duration, minForExcel(r.minInvestment)])],
                "10bonds-top10.xlsx",
                "Top 10",
              )
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-canvas"
          >
            ⬇ {t.excel}
          </button>
          {list && (
            <button type="button" data-testid="list-reset" onClick={() => setList(null)} className="truncate text-xs text-accent hover:underline">
              ↺ {t.resetList}
            </button>
          )}
          </>
        ) : signedIn && !features.has("excel") && rows.length > 0 ? (
          <Link href="/pricing" className="flex min-w-0 items-center gap-3 text-xs">
            <span className="truncate text-mute">{t.plusPitch}</span>
            <span className="shrink-0 font-medium text-accent">{t.seePlans}</span>
          </Link>
        ) : null}
        {rows.length > 0 && <WhyTable query={whyQuery} lang={lang} inList={rows.map((r) => r.isin!)} onAdd={features.has("add_left_out") && !show && !message ? addFromWhy : undefined} />}
      </div>
    </div>
  );
}

/** Drawn over the blurred row slots after the visible rows: the sign-up offer. */
function LockedOverlay({ count, top }: { count: number; top: number }) {
  const t = useFinderText();
  // Desktop rows are ROW_H tall under a HEAD_H header; phone cards are CARD_H tall with 8px gaps.
  const style = {
    ["--top-d" as string]: `${HEAD_H + top * ROW_H}px`,
    ["--top-m" as string]: `${top * (CARD_H + 8)}px`,
  };
  return (
    <div style={style} className="absolute inset-x-0 bottom-0 top-[var(--top-m)] flex flex-col items-center justify-center gap-3 text-center sm:top-[var(--top-d)]">
      <p className="text-[17px] font-semibold">{t.more(count)}</p>
      <p className="-mt-1 text-sm text-mute">{t.noCard}</p>
      <Link
        href="/signup"
        className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white shadow-sm transition hover:bg-[#0077ed]"
      >
        {t.seeAll}
      </Link>
    </div>
  );
}



function Dim() {
  return <span className="inline-block h-3 w-8 rounded bg-line align-middle" />;
}

function Lock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}


/** "19 Oct 2026, 06:16" in the page's language, instead of the raw ISO time. */
function plainDate(iso: string, lang: FinderLang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const loc = { en: "en-GB", it: "it-IT", fr: "fr-FR", de: "de-DE" }[lang] ?? "en-GB";
  return d.toLocaleString(loc, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}


/** The averages of a list the user edited (swapped bonds), worked out in the browser from what the rows show. */
function listSummary(list: ResultRow[]): ResultsPayload["summary"] {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    count: list.length,
    avgYtm: avg(list.map((r) => r.ytm)),
    avgDuration: avg(list.flatMap((r) => (r.duration == null ? [] : [r.duration]))),
    avgRisk: averageRisk(list.map((r) => r.risk ?? null)),
    lifeLoss: list.length && list.every((r) => r.pd != null) ? listLifeLoss(list.map((r) => r.pd!)) : null,
  };
}

type OutRow = ResultRow;

/** Bonds that can come into the list now: those left out plus any the user swapped out, never an issuer already in it. */
function available(data: Response, rows: ResultRow[]): OutRow[] {
  const isins = new Set(rows.map((r) => r.isin));
  const issuers = new Set(rows.map((r) => r.issuer));
  const all: OutRow[] = [
    ...data.rows,
    ...(data.alternatives ?? []).map((a) => ({ ...a, rank: 0, lossAdj: a.adjYtm })),
  ];
  const seen = new Set<string>();
  return all.filter((b) => {
    if (!b.isin || seen.has(b.isin) || isins.has(b.isin) || issuers.has(b.issuer)) return false;
    seen.add(b.isin);
    return true;
  });
}

/** The 5 bonds closest to `row` in risk and duration (a year of duration weighs like a risk step); higher yield breaks ties. */
function swapOptions(row: ResultRow, pool: OutRow[]): OutRow[] {
  const dist = (b: ResultRow) => Math.abs((b.risk ?? 10) - (row.risk ?? 10)) + Math.abs((b.duration ?? 0) - (row.duration ?? 0));
  return [...pool].sort((a, b) => dist(a) - dist(b) || b.ytm - a.ytm).slice(0, 5);
}

/** The slot an added bond takes: the bond with the lowest yield after losses. */
function weakestSlot(rows: ResultRow[]): number {
  let k = 0;
  rows.forEach((r, i) => {
    if ((r.lossAdj ?? r.ytm) < (rows[k].lossAdj ?? rows[k].ytm)) k = i;
  });
  return k;
}

function SwapButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} data-testid="swap-open" className="inline-flex h-6 w-6 items-center justify-center rounded-full text-mute hover:bg-canvas hover:text-accent">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 4 3 8l4 4" /><path d="M3 8h14" /><path d="m17 20 4-4-4-4" /><path d="M21 16H7" />
      </svg>
    </button>
  );
}

function PanelShell({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const t = useFinderText();
  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-2xl border border-line bg-white p-3" role="dialog" aria-label={typeof title === "string" ? title : undefined}>
      <div className="flex h-7 shrink-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-semibold">{title}</div>
        <button type="button" onClick={onClose} aria-label={t.close} className="h-7 w-7 shrink-0 rounded-full text-mute hover:bg-canvas">✕</button>
      </div>
      {children}
    </div>
  );
}

/** Saves one exclusion of the customer (the bond, or its issuer). true when saved. */
async function excludeRow(r: ResultRow, kind: "bond" | "issuer"): Promise<boolean> {
  const body = kind === "bond" ? { kind, value: r.isin, label: `${r.issuer} · ${r.isin}` } : { kind, value: r.issuer, label: r.issuer };
  const res = await fetch("/api/account/blacklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return !!res?.ok;
}

/** One row's panel: similar bonds to swap in (with "swap"), and "never show" this bond or issuer (with "blacklist"). */
function SwapPanel({ row, options, onPick, onExclude, onClose }: { row: ResultRow; options: OutRow[] | null; onPick: (b: ResultRow) => void; onExclude?: (kind: "bond" | "issuer") => void; onClose: () => void }) {
  const t = useFinderText();
  return (
    <PanelShell title={options ? t.swapTitle(row.issuer) : row.issuer} onClose={onClose}>
      {onExclude && (
        <div className="mb-1 flex h-7 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap text-xs" data-testid="exclude-line">
          <span className="text-mute">{t.neverShow}</span>
          {row.isin && <button type="button" onClick={() => onExclude("bond")} data-testid="exclude-bond" className="rounded-full border border-line px-2.5 py-0.5 font-medium hover:bg-canvas">{t.thisBond}</button>}
          <button type="button" onClick={() => onExclude("issuer")} data-testid="exclude-issuer" className="rounded-full border border-line px-2.5 py-0.5 font-medium hover:bg-canvas">{t.thisIssuer}</button>
          <Link href="/account#excluded" className="ml-auto truncate text-accent hover:underline">{t.myExclusions}</Link>
        </div>
      )}
      {options === null ? null : (
      <>
      <p className="mb-2 truncate text-xs text-mute">{t.swapHint}</p>
      {options.length === 0 ? (
        <p className="text-sm text-mute">{t.swapNone}</p>
      ) : (
        <ul className="divide-y divide-line/60" data-testid="swap-options">
          {options.map((b) => (
            <li key={b.isin} className="flex items-center gap-3 text-sm" style={{ height: ROW_H + 4 }}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{b.issuer}</div>
                <div className="truncate text-[11px] text-mute">{b.name} · {b.isin}</div>
              </div>
              <span className="w-14 text-right font-semibold tabular-nums">{pct(b.ytm)}</span>
              <span className="hidden w-12 text-right tabular-nums sm:inline">{b.duration?.toFixed(1)}</span>
              <span className="w-8 text-center"><RiskBadge risk={b.risk} /></span>
              <button type="button" onClick={() => onPick(b)} className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90">{t.swapPick}</button>
            </li>
          ))}
        </ul>
      )}
      </>
      )}
    </PanelShell>
  );
}
