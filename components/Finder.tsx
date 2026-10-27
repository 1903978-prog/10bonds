"use client";

import Link from "next/link";
import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { downloadXlsx } from "@/lib/xlsx";
import { LimitReached, QuotaNote, type Quota } from "./SearchQuota";
import { DURATION_STEPS, LIMITS, TERMS, isOpenEnded, termOf } from "@/lib/limits";
import { RiskBadge } from "./RiskBadge";
import type { ResultRow, ResultsPayload } from "@/lib/tiers";
import type { AltRow } from "@/lib/alternatives";
import { averageRisk } from "@/lib/ratings";
import { listLifeLoss, listLossChance, LOSS_GIVEN_DEFAULT } from "@/lib/expectedLoss";
import { RANK_LABEL } from "@/lib/seniority";
import LossChart, { slopeAt } from "@/components/LossChart";
import LockedChart from "@/components/LockedChart";
import Diversification from "@/components/Diversification";
import OptimalPanel, { OptimalButton, useOptimal } from "@/components/OptimalPanel";
import AllCurvesChart from "@/components/AllCurvesChart";
import HeatMapChart from "@/components/HeatMapChart";
import { useShortlistDots } from "@/lib/shortlistStore";
import type { HeatMap, HeatMethod } from "@/lib/heatMapGrid";
import SliderCurveChart from "@/components/SliderCurveChart";
import { nearestLoss } from "@/lib/lossCurve";
import type { CurvePoint } from "@/lib/lossCurve";
import { FINDER_TEXT, FinderLangContext, useFinderText, type FinderLang } from "@/lib/finderText";
import { track, trackOnce } from "@/lib/track";
import SingleBond from "./SingleBond";
import Frontier from "./Frontier";
import { fmtMin, minForExcel } from "@/lib/fmtMin";
import type { BondFilter } from "@/lib/bondFilter";
import { ageDays, isStale } from "@/lib/dataHealth";
import { MC_PATHS } from "@/lib/monteCarlo";
import { loadMe } from "@/lib/me";
import ConsentGate from "./ConsentGate";
import WhyTable from "./WhyTable";
import GuideTips from "./GuideTips";
import type { WhyRow } from "@/lib/whyList";
import { createPortal } from "react-dom";
import { mixTarget } from "@/lib/mixSteps";
import { SLIDER_POSITIONS, SLIDER_START, type SliderPosition } from "@/lib/sliderPortfolios";
import AdminTuner, { TUNER_START, type TunerState } from "./AdminTuner";
import type { FeatureKey } from "@/lib/features";
import { FOOTER_NOTE } from "@/lib/footerNote";
import { clearResume, readResume, writeResume } from "@/lib/finderResume";
import { BondNoteFoot } from "@/components/BondNoteFoot";
import { isinText, parseGptRatings } from "@/lib/gptRatings";
import { saveGptRatings, useGptRatings } from "@/lib/gptStore";
import { GptRate, BR_HEAD, IR_HEAD } from "./GptRate";
import { GptCalcAll } from "./GptCalcAll";
import { Spread, SPREAD_HEAD, SPREAD_NOTE, RiskPayCell, RISKPAY_HEAD, RISKPAY_NOTE } from "./Spread";
import { couponTypeLabel } from "@/lib/bondFacts";
import { profileParts, type CoherenceView } from "@/lib/creditProfileText";

type Response = ResultsPayload & {
  quota?: Quota | null;
  source: "live" | "sample";
  scanned?: number;
  issuers?: number; // Different issuers among the bonds searched
  found?: number[];
  monteCarlo?: { paths: number; expYield: number | null; p5: number | null; samples: number[][] };
  asOf: string | null;
  durationBand: number;
  inputs: { duration: number; ytm: number; risk: number };
  alternatives?: AltRow[]; // With "swap": bonds left out, to swap in
  features?: FeatureKey[]; // What this plan includes (the admin's feature table)
  excluded?: boolean; // The customer's excluded bonds and issuers were left out of this search
  outliers?: { sd: number; liveSd: number; count: number; liveCount: number };
  coherence?: CoherenceView; // Admin, spread rules: the rating profile and rule checks of this list
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
  // Searches left this week, read before the first search and kept in step with every answer (nothing is counted by reading).
  const [peek, setPeek] = useState<{ single: Quota | null; portfolio: Quota | null }>({ single: null, portfolio: null });
  useEffect(() => { fetch("/api/search-quota", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => j && setPeek(j)).catch(() => {}); }, []);
  const quotaOf = (kind: "single" | "portfolio") => (data?.quota?.kind === kind ? data.quota : peek[kind]);
  const [loading, setLoading] = useState(true);
  const preview = useRef<string | null>(null);
  const searchSeq = useRef(0);
  const appliedSeq = useRef(0);
  const hasData = useRef(false);
  hasData.current = data !== null;
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
  // The list replaces the chart only when the main button is pressed (the owner, 26/10/2026); until then the chart follows the horizon.
  const [listOn, setListOn] = useState(false);
  // iPhone (the owner, 24/10/2026): "Show AI Efficient Portfolio" opens the results as their own full-screen page, no scrolling.
  const [sheet, setSheet] = useState(false);
  // Each press of "Show AI Efficient Portfolio" runs the search again, so the press always shows the search and a fresh list.
  const [rerun, setRerun] = useState(0);
  // Sign-up funnel steps (consent-only usage stats; no choices or figures are sent).
  useEffect(() => { if (touched) trackOnce("finder_started"); }, [touched]);
  // The owner watches the show 3x faster.
  const show = useScanShow(data, touched && listOn, isAdmin ? 1000 / 3 : 1000);

  // The portfolio results box's height, given to the 1-bond box too, so switching mode never resizes the page.
  const resultsBox = useRef<HTMLElement>(null);
  const [resultsH, setResultsH] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (mode === "portfolio" && resultsBox.current) setResultsH(resultsBox.current.offsetHeight);
  });
  // The highest yield available at each horizon and risk level, loaded once, so the yield slider follows both at once.
  const capFor = (d: number, r: number) => caps?.[String(r)]?.[String(Math.round(d * 100) / 100)] ?? LIMITS.ytm.max;
  const ytmMax = capFor(duration, risk);
  // With the chart open (Advanced), a click on the curve sets the target to that point; its 10 bonds show beside the chart.
  const pickYtm = (y: number) => {
    setTouched(true);
    setYtm(Math.min(ytmMax, Math.max(LIMITS.ytm.min, Math.round(y * 100) / 100)));
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

  // Simple search (everyone): a term and one "Return & risk" slider of up to 30 positions along the efficient frontier,
  // worked out on the server (lib/sliderPortfolios.ts). The admin can switch to the original sliders (Advanced, yellow).
  const [adv, setAdv] = useState(false);
  // Admin only (yellow): the Methodology with spread rules (what everyone gets) or Methodology 1 (lib/stepGap.ts).
  const [spread, setSpread] = useState(true);
  const method = isAdmin && !spread ? "m1" : "spread";
  // Admin only: the risk heat map in chart mode, its methodology, and the cell clicked on it (that return and horizon);
  // while a cell is picked the list on the right is that cell's 10 bonds. Moving any control lets go of it.
  const [showHeat, setShowHeat] = useState(false);
  const [heatMethod, setHeatMethod] = useState<HeatMethod>("m1");
  const [heatPick, setHeatPick] = useState<{ ytm: number; duration: number } | null>(null);
  const [heatBl, setHeatBl] = useState(false);
  // Admin Multi-year chart: "Find Optimal Portfolio" (lib/optimalBuild.ts). A picked maturity row shows its 10 bonds on the right through heatPick.
  const [showAll, setShowAll] = useState(false);
  const [optAsked, setOptAsked] = useState(false);
  const [optShown, setOptShown] = useState(false);
  const [optSel, setOptSel] = useState<number | null>(null);
  const features = new Set<FeatureKey>(data?.features ?? []);
  const canHeat = isAdmin || features.has("heat_map");
  const canMulti = isAdmin || features.has("multi_chart");
  const heatOn = ((canHeat && showHeat) || (isAdmin && showAll && optShown)) && heatPick !== null;
  const shortlistDots = useShortlistDots(isAdmin && (showHeat || showAll));
  const simple = !isAdmin || !adv;
  const [mix, setMix] = useState(SLIDER_START);
  const [positions, setPositions] = useState<SliderPosition[] | null>(null);
  const [diagOpen, setDiagOpen] = useState(false);
  const firstOpen = positions?.find((p) => !p.unavailable)?.position ?? 1;
  // As many positions as distinct frontier lists (30 until they are ready); the search then uses the frontier's guard.
  const mixMax = positions?.length || SLIDER_POSITIONS;
  // Advanced (admin): a frontier dot picked on the chart sets the sliders to its query, and then searches like it too.
  const advAt = simple ? 0 : positions?.find((p) => p.query && p.query.ytm === ytm && p.query.risk === risk)?.position ?? 0;
  const guard = !!positions?.length && (simple || advAt > 0);
  const applyMix = (pos: number) => {
    const p = positions?.[Math.min(pos, positions.length) - 1];
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
    const to = Math.min(mixMax, Math.max(pos, firstOpen));
    setMix(to);
    applyMix(to);
  };
  // Previous / next portfolio arrows above the list (the owner, 24/10/2026): one step to the neighbouring slider position
  // that shows a different list (positions that repeat an earlier list or have none are skipped). Null at the ends.
  const stepFrom = (dir: -1 | 1): number | null => {
    if (!positions) {
      const p = mix + dir;
      return p >= 1 && p <= SLIDER_POSITIONS ? p : null;
    }
    const here = positions[mix - 1]?.sameAs ?? mix;
    for (let p = mix + dir; p >= firstOpen && p <= SLIDER_POSITIONS; p += dir) {
      const x = positions[p - 1];
      if (x && !x.unavailable && x.sameAs == null && p !== here) return p;
    }
    return null;
  };
  const arrows = simple ? <PfArrows prev={stepFrom(-1)} next={stepFrom(1)} onStep={changeMix} busy={loading} /> : null;
  // On the iPhone results page the arrows sit either side of the title, so the page gains no height.
  const phoneTitle = (title: string) => {
    const span = <span className="truncate text-[16px] font-semibold">{title}</span>;
    return simple ? <PfArrows prev={stepFrom(-1)} next={stepFrom(1)} onStep={changeMix} busy={loading}>{span}</PfArrows> : span;
  };
  useEffect(() => {
    // Loaded in Advanced too (admin), for the frontier dots on its chart.
    if (!TERMS.some((x) => x.duration === duration)) { setPositions(null); return; }
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPositions(null);
    const load = (tries: number) =>
      fetch(`/api/bonds/slider?${new URLSearchParams({ duration: String(duration), currency, size, ...(method === "m1" ? { m: method } : {}) })}`)
        .then(async (r) => {
          if (stop) return;
          if (r.status === 202 && tries < 20) timer = setTimeout(() => load(tries + 1), tries < 5 ? 1000 : 3000);
          else if (r.ok) setPositions((await r.json()).positions);
        })
        .catch(() => {});
    load(0);
    return () => { stop = true; clearTimeout(timer); };
  }, [duration, currency, size, method]);
  // In Simple search the position decides risk and return, so they follow the term, the filters and the data.
  useEffect(() => {
    if (!simple) return;
    if (!TERMS.some((x) => x.duration === duration)) {
      setDuration(TERMS.find((x) => x.key === termOf(duration))?.duration ?? TERMS[1].duration);
      return;
    }
    // Ready positions: the middle one until the visitor moves the slider, else the same one (within the 1..k there are).
    const at = positions?.length
      ? touched ? Math.min(positions.length, Math.max(mix, firstOpen)) : Math.max(firstOpen, Math.ceil(positions.length / 2))
      : Math.max(mix, 1);
    if (positions || caps) applyMix(at);
    if (positions?.length && at !== mix) setMix(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simple, caps, maxRisk, duration, positions]);

  useEffect(() => {
    preview.current = new URLSearchParams(window.location.search).get("preview");
  }, []);
  // Sign-up from a result (the owner, 24/10/2026): the choices on screen are kept in this browser for an hour, and once
  // the account is open the finder comes back on the same result. Only the slider choices are kept, nothing personal.
  const [resumed, setResumed] = useState(0);
  useEffect(() => {
    const save = (e: MouseEvent) => {
      const href = (e.target as HTMLElement | null)?.closest?.("a[href]")?.getAttribute("href") ?? "";
      if (!touched || !/^\/(signup|login)(?:[?#]|$)/.test(href)) return;
      writeResume({ duration, mix, currency, size, mode, sheet });
    };
    document.addEventListener("click", save, true);
    return () => document.removeEventListener("click", save, true);
  }, [touched, duration, mix, currency, size, mode, sheet]);
  useEffect(() => {
    const r = readResume();
    if (!r) return;
    loadMe().then((me) => {
      if (!me) return;
      clearResume();
      setDuration(r.duration);
      setMix(r.mix);
      setCurrency(r.currency);
      setSize(r.size);
      setMode(r.mode);
      setTouched(true);
      setListOn(true);
      if (r.sheet && r.mode === "portfolio" && window.matchMedia("(max-width: 639px)").matches) setSheet(true);
      setResumed((n) => n + 1);
    });
  }, []);
  useEffect(() => {
    if (resumed && simple) applyMix(Math.max(mix, positions ? firstOpen : 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumed]);


  useEffect(() => {
    // Only the portfolio list is searched here (the 1-bond mode asks for its own data), so it never uses a portfolio search.
    if (mode !== "portfolio") return;
    const ctrl = new AbortController();
    const seq = ++searchSeq.current;
    // The spinner shows from the moment a search is asked for (slider, arrows, button), not only once it is sent.
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ duration: String(duration), ytm: String(ytm), risk: String(risk), currency, size });
        if (guard) qs.set("guard", "1");
        if (method === "m1") qs.set("m", method);
        if (heatOn) {
          // The heat map cell's list: the same exact frontier the map is built from, with the map's methodology.
          qs.set("duration", String(heatPick.duration));
          qs.set("ytm", String(heatPick.ytm));
          qs.set("guard", "1");
          if (showHeat && heatMethod === "m1") qs.set("m", "m1");
          else qs.delete("m");
          qs.set("bl", showHeat && heatBl ? "1" : "0");
        }
        if (preview.current) qs.set("preview", preview.current);
        if (isAdmin && tuner.weight !== null) {
          qs.set("rw", String(tuner.weight));
          qs.set("rp", tuner.shifts.join(","));
        }
        if (isAdmin && tuner.sd !== null) qs.set("os", String(tuner.sd));
        // A busy or waking server can answer with an error page instead of the list: try again a few times before saying so.
        let res: globalThis.Response | null = null;
        let body = null;
        // The spread-rules lists are built in the background (202 until ready): keep asking, up to a few minutes.
        for (let i = 0; i < 4 || (res?.status === 202 && i < 90); i++) {
          if (i) await new Promise((done) => setTimeout(done, res?.status === 202 ? 3000 : 1500));
          res = await fetch(`/api/bonds?${qs}`, { signal: ctrl.signal });
          body = await res.json().catch(() => null);
          if (body && res.status < 500 && res.status !== 202) break;
        }
        if (!res || !body) throw new Error(errText);
        if (res.status === 202) throw new Error("The spread-rules lists are still being calculated. Try again in a minute.");
        // A slower, older search never replaces a newer answer already on screen.
        if (seq < appliedSeq.current) return;
        appliedSeq.current = seq;
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
        // Only the newest search ends the spinner: an older one finishing never hides it while the next one runs.
        if (seq === searchSeq.current) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      // While nothing is on screen yet the search already sent keeps going, so the first list shows as soon as possible.
      if (hasData.current) ctrl.abort();
    };
  }, [duration, ytm, risk, guard, mode, currency, size, tuner, isAdmin, tunerSaved, excludedAt, rerun, method, heatOn, heatPick, heatMethod, heatBl]);
  useEffect(() => setHeatPick(null), [duration, ytm, risk, mix, adv, spread, showHeat, showAll]);

  // Plus and up can swap bonds in and out of the list; this is their edited list (null = the list as ranked).
  const [list, setList] = useState<ResultRow[] | null>(null);
  useEffect(() => setList(null), [data]);
  // Funnel: the first list shown after the visitor moved a control or pressed the button; a visitor sees the 3-bond preview.
  useEffect(() => {
    if (!touched || !data || mode !== "portfolio") return;
    trackOnce("portfolio_generated", { tier: data.tier });
    if (data.tier === "visitor") trackOnce("preview_view");
  }, [touched, data, mode]);
  const tier = data?.tier ?? "visitor";
  // What this plan includes comes with each answer (the admin's feature table, /admin/features).
  // Visitors get the two averages too (the owner, 24/10/2026); only the bond names wait for a free account.
  const paid = features.has("portfolio_sim") || tier === "visitor";
  // The expected-loss chart above the list (paid plans, portfolio mode): a button switches the table for the chart in the same box.
  const [chartOn, setChartOn] = useState(false);
  const [curve, setCurve] = useState<{ points: CurvePoint[]; max: number } | null>(null);
  // Admin only: every horizon from 2 to 10 years on one chart, in place of the single curve.
  const [allCurves, setAllCurves] = useState<{ duration: number; points: CurvePoint[]; max: number }[] | null>(null);
  const chartable = (features.has("loss_chart") || isAdmin) && mode === "portfolio" && !!data && data.rows.length > 0 && (!data.lockedCount || isAdmin);
  // Chart mode (Livio 24/10): the chart takes the place of the controls on the left, the 10 bonds sit on the right.
  // It stays on while a new list loads, so nothing jumps between searches.
  // Free plans and visitors get the same tabs with a blurred decoy chart and a button to the Plans page (components/LockedChart.tsx):
  // the real curves are never fetched for them.
  const chartLocked = !(features.has("loss_chart") || isAdmin) && mode === "portfolio" && !!data && data.rows.length > 0;
  const curveMode = chartOn && ((features.has("loss_chart") || isAdmin) || chartLocked) && mode === "portfolio" && !!data;
  // View tabs above the results (Livio 25/10): List | Chart | Multi-year chart | Heat map. The last two are admin only (yellow).
  const view = !chartOn ? "list" : showHeat ? "heat" : showAll ? "multi" : "chart";
  // Each view is real for the admin and for plans that have it (/admin/features); everyone else gets the blurred decoy.
  const viewLocked = view === "heat" ? !canHeat : view === "multi" ? !canMulti : chartLocked;
  const opt = useOptimal(isAdmin && optAsked && chartOn && chartable, currency, size);
  const optReady = opt !== null && opt !== "pending" && opt !== "failed";
  const pickOpt = (years: number) => {
    const m = optReady ? opt.maturities.find((x) => x.years === years) : null;
    setOptSel(years);
    if (m?.optimum) { setTouched(true); setHeatPick({ ytm: m.optimum.target, duration: years }); }
  };
  const pickView = (v: string) => {
    setChartOn(v !== "list");
    setShowHeat(v === "heat");
    setShowAll(v === "multi");
  };
  const viewTabs = (
    <div className="flex h-7 items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5" role="tablist" data-testid="view-tabs">
      {([["list", t.chartOff], ["chart", t.chartOn], ["multi", isAdmin ? "Multi-year chart" : t.chartMulti], ["heat", isAdmin ? "Heat map" : t.chartHeat]] as [string, string][]).map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={view === k}
          data-testid={`view-tab-${k}`}
          onClick={() => pickView(k)}
          className={`whitespace-nowrap rounded-full px-3 py-0.5 text-[12px] ${view === k ? (isAdmin && (k === "multi" || k === "heat") ? "bg-amber-100 font-medium text-amber-900 shadow-sm" : "bg-white font-medium text-ink shadow-sm") : isAdmin && (k === "multi" || k === "heat") ? "text-amber-800" : "text-mute"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
  // The height of the page with the controls showing: chart mode keeps it, so the page never grows or scrolls.
  const pageBox = useRef<HTMLDivElement>(null);
  const [pageH, setPageH] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!curveMode && pageBox.current) setPageH(pageBox.current.offsetHeight);
  });
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
    if (!chartOn || !chartable || !showAll || !canMulti) return;
    const ctrl = new AbortController();
    fetch(`/api/bonds/loss-curve?${new URLSearchParams({ all: "1", risk: String(risk), currency, size })}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.curves && setAllCurves(j.curves))
      .catch(() => {});
    return () => ctrl.abort();
  }, [chartOn, chartable, showAll, canMulti, risk, currency, size]);
  // Admin only: the risk heat map (expected loss per target return and horizon), in place of the curves. Asked for as
  // soon as the admin's page opens, so the server builds it in the background and it shows at once when switched on.
  const [heatMap, setHeatMap] = useState<HeatMap | "unavailable" | null>(null);
  useEffect(() => {
    if (!canHeat) return;
    setHeatMap(null);
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = () =>
      fetch(`/api/bonds/heat-map?${new URLSearchParams({ currency, size, method: heatMethod, ...(heatBl ? { bl: "1" } : {}) })}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (stop || !j) return;
          if (j.cells) setHeatMap(j);
          else if (j.unavailable) setHeatMap("unavailable");
          else if (j.pending) timer = setTimeout(ask, 1500);
        })
        .catch(() => {});
    ask();
    return () => { stop = true; clearTimeout(timer); };
  }, [canHeat, currency, size, heatMethod, heatBl]);
  const summary = list ? listSummary(list) : data?.summary;
  // The two boxes under the slider: 0 to 1 while the analysis is drawn, 1 once it is done (they then show the figures).
  const waited = useWaitClock(touched && listOn && mode === "portfolio" && loading && !show);
  const reveal = useResultReveal(data, touched && listOn && mode === "portfolio", loading, show, waited);
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
  const lockTo = signedIn ? { href: "/pricing", label: t.avgPlus } : { href: signupHref(lang), label: t.namesSignUp };

  return (
    <FinderLangContext.Provider value={lang}>
    <div ref={pageBox} className={`finder-wide grid grid-cols-[minmax(0,1fr)] gap-3 sm:gap-4 lg:gap-5 ${curveMode ? "" : "lg:grid-cols-[340px_minmax(0,1fr)]"}`}>
      {/* Inputs */}
      {/* On phones the mode tabs sit on top so they never move; in 1-bond mode the title and the two portfolio
          sliders give way so slider, options, curve and bond name fit on one screen. */}
      <section className={`flex flex-col rounded-[28px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] max-sm:py-4 sm:p-6 ${curveMode ? "lg:hidden" : ""}`}>
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
                display={null}
                min={1}
                max={mixMax}
                step={1}
                minLabel={t.highReturn}
                maxLabel={t.lowReturn}
                reversed
                onChange={changeMix}
              />
              {/* Admin only (yellow): the technical slider position and risk ceiling. Customers see no descriptor. */}
              {isAdmin && (
                <div className="mt-1 flex items-center gap-1.5">
                  {/* Two-option switch, fixed width: the active methodology is the filled side. */}
                  <div role="radiogroup" aria-label="Methodology (admin only)" data-testid="admin-method" title="Spread rules = what everyone gets (minimum extra return per rating step); Method 1 = old method, for comparing (admin only)" className="flex w-[8.5rem] shrink-0 rounded-full border border-amber-400 bg-amber-50 p-px text-[10px] font-medium leading-4">
                    {([["m1", "Method 1"], ["spread", "Spread rules"]] as const).map(([k, label]) => (
                      <button key={k} type="button" role="radio" aria-checked={method === k} data-testid={`admin-method-${k}`} onClick={() => setSpread(k === "spread")} className={`flex-1 whitespace-nowrap rounded-full px-1 ${method === k ? "bg-amber-500 text-white" : "text-amber-900"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button type="button" data-testid="slider-check-open" title="Position table" onClick={() => setDiagOpen(true)} className="shrink-0 whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                    {positions ? `Table ${positions.length}` : "Table…"}
                  </button>
                  <span data-testid="mix-admin-tag" title={`${positions?.[mix - 1]?.belowHurdle ?? "–"} bonds pay less than the spread rules ask over a safer bond not in the list`} className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-px text-[11px] tabular-nums font-medium text-amber-900">
                    #{mix}/{mixMax} · worst <RiskBadge risk={positions?.[mix - 1]?.worstRisk ?? risk} /> · target {ytm.toFixed(2)}% · {positions?.[mix - 1]?.belowHurdle ?? "–"} &lt; hurdle
                  </span>
                </div>
              )}
              <ResultBoxes
                frac={reveal}
                paths={data?.monteCarlo?.paths || MC_PATHS}
                lang={lang}
                ret={!data ? "—" : paid ? pct(summary?.avgYtm) : null}
                loss={!data ? "—" : paid && summary?.lifeLoss != null ? `${summary.lifeLoss.toFixed(2)}%` : paid ? "—" : null}
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
        {mode === "single"
          ? <GuideTips key="single" page="single" lang={lang} />
          : <GuideTips key="portfolio" lang={lang} simple={simple} only={simple ? ["horizon", "return"] : undefined} />}
        {isAdmin && mode === "portfolio" && (
          <details className="mt-2" data-testid="admin-tuner-box">
            <summary className="cursor-pointer text-xs font-medium text-amber-900">Admin: tuning</summary>
            <AdminTuner state={tuner} onChange={setTuner} engine={data?.engine} outliers={data?.outliers} onSaved={() => setTunerSaved((n) => n + 1)} />
          </details>
        )}
        {/* Shows the list for the choices above (in place of the frontier chart) and brings it into view on phones.
            In 1-bond mode it stays in place, hidden, so nothing moves. */}
        <div className={`mt-auto pt-4 ${mode === "portfolio" ? "" : "invisible max-lg:hidden"}`} aria-hidden={mode !== "portfolio"}>
          <button
            type="button"
            data-testid="find-portfolio"
            tabIndex={mode === "portfolio" ? 0 : -1}
            onClick={() => {
              setTouched(true);
              setListOn(true);
              // A desired return above the slider's maximum is brought back to it, so the figure shown is the one searched.
              if (caps && ytm > ytmMax) setYtm(ytmMax);
              setRerun((n) => n + 1);
              if (window.matchMedia("(max-width: 639px)").matches) setSheet(true);
              else if (window.matchMedia("(max-width: 1023px)").matches) resultsBox.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>
            {t.findPortfolio}
          </button>
        </div>

      </section>

      {/* Results */}
      {mode === "single" ? (
        <section
          className="flex flex-col sm:rounded-[28px] sm:bg-white sm:p-5 sm:shadow-[0_2px_20px_rgba(0,0,0,0.04)] lg:min-h-[var(--results-h)]"
          style={resultsH ? { ["--results-h" as string]: `${resultsH}px` } : undefined}
        >
          <SingleBond duration={duration} preview={preview.current} currency={currency} size={size} />
          <p className="mt-auto px-2 pt-3 text-[11px] leading-snug text-mute sm:px-0 sm:pt-2" data-testid="ranking-note">{t.howSingle}</p>
        </section>
      ) : (
      // On phones this box gives way to the full-screen results page (PhoneResults), so the slider page never scrolls down to it.
      <section
        ref={resultsBox}
        className={`relative hidden flex-col rounded-[28px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:flex sm:p-5 ${curveMode ? "lg:min-h-[var(--page-h)]" : ""}`}
        style={pageH ? { ["--page-h" as string]: `${pageH}px` } : undefined}
      >
        {/* Laid over the results, which load underneath, so the box keeps its exact size when the chart gives way. */}
        {!listOn && (
          <div className="absolute inset-0 z-10 rounded-[28px] bg-white p-4 sm:p-5">
            <Frontier currency={currency} band={TERMS.find((x) => x.key === termOf(duration)) ?? { from: Math.max(0, duration - 1), to: duration + 1 }} />
          </div>
        )}
        {/* Every box, row and line below keeps its size and place whatever the results are: 10 row slots always, fixed-height boxes, messages drawn over the rows. */}
        {curveMode ? (
          // Chart mode: the chart on the left, filling its half of the page; the three numbers and the 10 bonds on the right.
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-5" data-testid="curve-mode">
            <div className="flex min-h-[340px] min-w-0 flex-col">
              <div className="mb-1 flex h-7 justify-end">
                {isAdmin && showAll && chartable && (
                  <OptimalButton
                    state={opt}
                    shown={optShown}
                    onClick={() => {
                      if (optReady) { if (optShown) setHeatPick(null); setOptShown(!optShown); return; }
                      setOptAsked(true);
                      setOptShown(true);
                    }}
                  />
                )}
                {(chartable || chartLocked) && viewTabs}
              </div>
              <div className="relative min-h-0 flex-1" data-testid="loss-chart">
                {viewLocked ? (
                  <LockedChart kind={view === "heat" ? "heat" : view === "multi" ? "multi" : "chart"} label={signedIn ? t.chartLock : t.chartSignUp} href={signedIn ? "/pricing" : signupHref(lang)} />
                ) : showHeat && canHeat ? (
                  <HeatMapChart plain={!isAdmin} shortlists={shortlistDots} map={heatMap} method={heatMethod} onMethod={setHeatMethod} blacklist={heatBl} onBlacklist={setHeatBl} retLabel={t.chartX} yearsLabel="yrs" picked={heatPick} onPick={(c) => { setTouched(true); setHeatPick(c); }} />
                ) : showAll && canMulti ? (
                  allCurves && <AllCurvesChart shortlists={shortlistDots} curves={allCurves} retLabel={t.chartX} lossLabel={t.chartY} yearsLabel="yrs" optimal={optShown && optReady ? opt : null} selected={optShown ? optSel : null} onSelect={pickOpt} />
                ) : simple ? (
                  positions?.some((p) => p.ytm != null) && (
                    <SliderCurveChart positions={positions} current={mix} onPick={changeMix} retLabel={t.chartX} lossLabel={t.chartY} dotText={t.chartDot} sameText={t.chartSame} noneText={t.chartNone} />
                  )
                ) : positions?.some((p) => p.ytm != null) ? (
                  // Advanced (admin): the same frontier dots; a click sets the sliders to that position's list.
                  <SliderCurveChart positions={positions} current={advAt} onPick={(pos) => { const q = positions[pos - 1]?.query; if (q) { setTouched(true); setRisk(q.risk); setYtm(q.ytm); } }} retLabel={t.chartX} lossLabel={t.chartY} dotText={t.chartDot} sameText={t.chartSame} noneText={t.chartNone} />
                ) : (
                  curve && <LossChart points={curve.points} max={curve.max} current={ytm} loss={data?.summary?.lifeLoss ?? nearestLoss(curve.points, ytm)} xLabel={t.chartX} yLabel={t.chartY} slopeLabel={t.chartSlope} hoverText={t.chartHover} onPick={pickYtm} />
                )}
              </div>
              {isAdmin && showAll && optShown && opt && (
                <div className="mt-2 shrink-0">
                  <OptimalPanel res={opt} selected={optSel} onSelect={pickOpt} onView={() => pickOpt(optSel ?? (optReady ? opt.winner : null) ?? 0)} />
                </div>
              )}
            </div>
            <div className={`flex min-w-0 flex-col transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
              <div className="mb-1 flex h-7 items-center">
                {heatOn ? (
                  // Admin (yellow): the list below is the heat map cell picked on the left.
                  <span data-testid="heat-pick-tag" className="whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-px text-[11px] tabular-nums font-medium text-amber-900">
                    {showHeat
                      ? <>Heat map: {heatPick.ytm.toFixed(1)}% · {heatPick.duration >= 30 ? "30+" : heatPick.duration} yrs · {heatMethod === "spread" ? "Spread rules" : "Method 1"}{heatBl ? " · blacklist on" : ""}</>
                      : <>Optimal portfolio: {heatPick.duration} yrs · {heatPick.ytm.toFixed(2)}%</>}
                  </span>
                ) : arrows}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat value={pct(summary?.avgYtm ?? ytm)} label={t.chartX} />
                <Stat value={summary?.lifeLoss != null ? `${summary.lifeLoss.toFixed(2)}%` : curve && !heatOn ? pct(nearestLoss(curve.points, ytm)) : "—"} label={t.chartY} />
                <Stat value={heatOn ? "—" : simple ? positionSlope(positions, mix) : curve ? slopeAt(curve.points, ytm).toFixed(2) : "—"} label={t.chartSlope} />
              </div>
              <div className="relative mt-3">
                {loading && !simple && <Spinner />}
                <Results
                  narrow
                dense
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
              <div className="mt-1 h-4">{!limit && <QuotaNote quota={quotaOf("single")} className="" />}</div>
            </div>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {/* The ETF benchmark shows on the landing page only (the owner, 24/10/2026). */}
          <Stat value={data ? String(Math.min(10, data.rows.length + data.lockedCount)) : "—"} label={t.found} />
          <Stat value={!data ? "—" : paid ? pct(summary?.avgYtm) : null} label={t.avgYield} lock={lockTo} />
          <Stat value={!data ? "—" : paid ? (summary?.lifeLoss != null ? `${summary.lifeLoss.toFixed(2)}%` : "—") : null} label={t.lifeLoss} lock={lockTo} />
          <Stat value={!data ? "—" : paid ? yrs(summary?.avgDuration, t.yrs) : null} label={t.avgDuration} lock={lockTo} />
          <ScanBox data={data} show={show} lang={lang} currency={currency} />
        </div>
        <div className="mt-1.5 h-4">
          {isAdmin && data?.coherence && <CreditProfileLine c={data.coherence} />}
          {data && (!paid || !signedIn) && (
            <Link href={lockTo.href} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline" data-testid="avg-unlock">
              <Lock /> {lockTo.label}
            </Link>
          )}
        </div>

        <div className={`relative mt-2 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
          {/* Fixed-height row above the list: the chart button is always here, drawn only when a chart can be shown. */}
          <div className="mb-1 flex h-7 items-center justify-between">
            <div>{arrows}</div>
            {(chartable || chartLocked) && viewTabs}
          </div>
          <Results
            dense={false}
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
          <div className="mt-1 h-4">{!limit && <QuotaNote quota={quotaOf("portfolio")} className="" />}</div>
          {loading && !simple && <Spinner />}
        </div>
        </>
        )}

        <div className="mt-auto pt-2">
          {data?.source === "live" && isStale(data.asOf) ? (
            <p className="truncate text-[11px] leading-snug text-amber-800" role="status" data-testid="yields-stale">
              {t.stale(ageDays(data.asOf) ?? 0)}
            </p>
          ) : data?.source === "sample" ? (
            <p className="truncate text-[11px] leading-snug text-amber-800" role="status" data-testid="yields-date">{t.sample}</p>
          ) : (
            <p className="truncate text-[11px] leading-snug text-mute" data-testid="yields-date">
              {/* Same text before and after the data arrives: only the date fills in, the line never wraps differently. */}
              {t.asOf} {data?.asOf ? plainDate(data.asOf, lang) : "—"}.{dataFacts(data, lang, currency)}
              {isAdmin && <span className="text-amber-800" data-testid="admin-method-footer"> Method: {method === "spread" ? "Spread rules" : "Method 1"}.</span>}
            </p>
          )}
          <p className="mt-1 text-[11px] leading-snug text-mute" data-testid="ranking-note">{t.howPortfolio}</p>
          <MonteCarloNote data={data} lang={lang} edited={list !== null} />
          {isAdmin && data && (
            <details className="mt-2" data-testid="admin-calc-box">
              <summary className="cursor-pointer text-xs font-medium text-amber-900">Admin: calculation per bond</summary>
              <AdminLossCalc rows={(list ?? data.rows).slice(0, 10)} />
            </details>
          )}
        </div>
      </section>
      )}
      <ConsentGate active={listOn && mode === "portfolio"} lang={lang} isAdmin={isAdmin} />
      {sheet && mode === "portfolio" && createPortal(
        <FinderLangContext.Provider value={lang}>
          <PhoneResults
            currency={currency}
            arrows={simple}
            title={phoneTitle}
            onClose={() => setSheet(false)}
            data={data}
            list={list}
            setList={setList}
            features={features}
            signedIn={signedIn}
            loading={loading}
            lang={lang}
            ret={!data ? "—" : paid ? pct(summary?.avgYtm) : null}
            loss={!data ? "—" : paid && summary?.lifeLoss != null ? `${summary.lifeLoss.toFixed(2)}%` : paid ? "—" : null}
            lock={lockTo}
            onExcluded={() => setExcludedAt(Date.now())}
            message={
              limit ? <LimitReached quota={limit} />
              : error ? <p className="text-sm text-mute">{error}</p>
              : data && data.rows.length === 0 ? <p className="text-sm text-mute">{t.none}</p>
              : null
            }
          />
        </FinderLangContext.Provider>,
        document.body,
      )}
    </div>
    </FinderLangContext.Provider>
  );
}

/** Extra expected loss per +1 point of return around this slider position (between its neighbouring portfolios). */
function positionSlope(positions: SliderPosition[] | null, at: number): string {
  const pts = (positions ?? []).filter((p) => !p.unavailable && !p.sameAs && p.ytm != null && p.expectedLoss != null);
  if (pts.length < 2) return "—";
  const here = positions?.[at - 1];
  const root = here?.sameAs ?? at;
  const i = Math.max(0, pts.findIndex((p) => p.position === root));
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  return b.ytm === a.ytm ? "—" : ((b.expectedLoss! - a.expectedLoss!) / (b.ytm! - a.ytm!)).toFixed(2);
}

/** Admin only, spread rules: the actual credit profile of the ten bonds, one small line in the fixed row under the KPIs. */
function CreditProfileLine({ c }: { c: CoherenceView }) {
  const p = profileParts(c);
  const failed = c.checks.filter((k) => !k.ok);
  const cert = c.cert.certified ? `exact: ${c.cert.optimal} solves optimal, gap ≤ ${c.cert.absGap}` : `UNCERTIFIED: ${c.cert.uncertified} solves hit the time limit`;
  const title = `${c.checks.map((k) => `${k.rule}: ${k.ok ? "pass" : "FAIL"} (${k.detail})`).join("\n")}\nRules ${c.policy}\n${cert}`;
  return (
    <p data-testid="credit-profile" title={title} className="truncate whitespace-nowrap text-[11px] leading-4 tabular-nums text-amber-900">
      Max permitted risk {p.permitted} · Actual range {p.range} · Core {p.core} · Highest {p.worst}
      {c.unclassified > 0 && <> · {c.unclassified} sector unclassified</>}
      {failed.length > 0 && <span className="font-semibold text-red-700"> · FAILS {failed.map((k) => k.rule).join(", ")}</span>}
      {!c.cert.certified && <span className="font-semibold text-red-700"> · uncertified</span>}
    </p>
  );
}

/** Admin only (Livio): the expected loss on your money worked out bond by bond, in the yellow admin style. */
const lgdOfRow = (r: ResultRow) => r.lgd ?? LOSS_GIVEN_DEFAULT;
function AdminLossCalc({ rows }: { rows: ResultRow[] }) {
  if (!rows.length || rows.some((r) => r.pd == null)) return null;
  const share = (r: ResultRow) => (r.pd! * lgdOfRow(r)) / rows.length;
  const pct = (x: number, d = 2) => `${x.toFixed(d)}%`;
  return (
    <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900" data-testid="admin-loss-calc">
      <p className="font-medium">Expected loss on your money = Σ default chance to maturity × loss given default (by debt rank) ÷ {rows.length} bonds</p>
      <table className="mt-1 w-full tabular-nums">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.isin ?? i}>
              <td className="pr-2">{i + 1}. {r.issuer}</td>
              <td className="pr-2 text-right">risk {r.risk ?? "–"}{r.sp !== undefined && <> · S&amp;P {r.sp ?? "–"}</>}</td>
              <td className="pr-2 text-right">IR <GptRate isin={r.isin} kind="ir" /> BR <GptRate isin={r.isin} /></td>
              <td className="pr-2 text-right">Spread <Spread ytm={r.ytm} years={r.duration} /> Risk Pay <RiskPayCell isin={r.isin} ytm={r.ytm} years={r.duration} pd={r.pd} life={r.life} lgd={r.lgd} /></td>
              <td className="pr-2 text-right">{r.life != null ? `${r.life.toFixed(1)} yrs` : "–"}</td>
              <td className="pr-2 text-right">default {pct(r.pd!)}</td>
              <td className="pr-2 text-right">{r.debtRank ? RANK_LABEL[r.debtRank] : "Senior preferred"} · LGD {Math.round(lgdOfRow(r) * 100)}% → {pct(r.pd! * lgdOfRow(r))}</td>
              <td className="text-right">÷ {rows.length} = {pct(share(r), 3)}</td>
            </tr>
          ))}
          <tr className="border-t border-amber-300 font-medium">
            <td colSpan={6} className="pr-2">Expected loss on your money (sum) · modelled probability of at least one issuer default {pct(listLossChance(rows.map((r) => r.pd!)), 1)}</td>
            <td className="text-right">{pct(listLifeLoss(rows.map((r) => r.pd!), rows.map(lgdOfRow)), 3)}</td>
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
  reversed?: boolean;
  onChange: (n: number) => void;
}) {
  // reversed: left end = max value (shown as high return); the stored value is unchanged.
  const flip = (n: number) => (props.reversed ? props.max + props.min - n : n);
  const fill = ((flip(props.value) - props.min) / (props.max - props.min)) * 100;
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
        value={flip(props.value)}
        style={{ ["--fill" as string]: `${fill}%` }}
        onChange={(e) => props.onChange(flip(Number(e.target.value)))}
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

/** Admin only: the slider positions (frontier points) with their targets, achieved figures and bonds (yellow). */
function SliderCheck({ positions, onClose }: { positions: SliderPosition[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-[1100px] overflow-auto rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[11px] text-amber-900" onClick={(e) => e.stopPropagation()} data-testid="slider-check">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-semibold">{positions.length} slider positions along the frontier (same ranking as every search, max 2 bonds at B+ or below)</div>
          <button type="button" onClick={onClose} className="rounded-full border border-amber-300 px-2">Close</button>
        </div>
        <table className="w-full tabular-nums">
          <thead>
            <tr className="text-left">
              {["Position", "Target", "Actual", "Gap", "Avg risk", "Worst risk", "Expected loss", "< hurdle", "ISINs"].map((h) => <th key={h} className="pr-2">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {positions.map((p, i) => (
              <tr key={p.position} className="border-t border-amber-200 align-top">
                <td className="pr-2">{p.position}</td>
                <td className="pr-2">{p.target === null ? "–" : `${p.target.toFixed(2)}%`}</td>
                <td className="pr-2">{p.ytm === null ? "–" : `${p.ytm.toFixed(2)}%`}</td>
                <td className="pr-2">{i && p.ytm !== null && positions[i - 1].ytm !== null ? `+${(p.ytm - positions[i - 1].ytm!).toFixed(2)}` : "–"}</td>
                <td className="pr-2">{p.avgRisk ?? "–"}</td>
                <td className="pr-2">{p.worstRisk ?? "–"}</td>
                <td className="pr-2">{p.expectedLoss === null ? "–" : `${p.expectedLoss.toFixed(2)}%`}</td>
                <td className="pr-2">{p.belowHurdle ?? "–"}</td>
                <td className="break-all font-mono text-[10px]">{p.isins.join(" ")}</td>
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

/** Previous / next portfolio: two small grey round arrows, always drawn (greyed at the ends) so nothing moves. */
/**
 * A small grey-blue rotating arrow while the best portfolio is being found (the owner, 24/10/2026): beside the portfolio
 * arrows (PC and iPhone), or over the middle of the list where there are no arrows (Advanced). Laid outside the layout, so
 * nothing moves; gone as soon as the list arrives (the search show, if any, then takes over).
 */
function Spinner({ small }: { small?: boolean }) {
  const t = useFinderText();
  // Small: just right of the next-portfolio arrow, outside the row's own width.
  const place = small ? "absolute left-full top-1/2 ml-1.5 -translate-y-1/2" : "absolute inset-0 z-10 flex items-center justify-center";
  return (
    <div className={`pointer-events-none ${place}`} role="status" aria-label={t.finding} data-testid="finder-spinner">
      <svg className={`${small ? "h-4 w-4" : "h-7 w-7"} animate-spin text-accent/80 motion-reduce:animate-[spin_3s_linear_infinite]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v4h-4" />
      </svg>
    </div>
  );
}

function PfArrows({ prev, next, onStep, busy, children }: { prev: number | null; next: number | null; onStep: (pos: number) => void; busy?: boolean; children?: ReactNode }) {
  const t = useFinderText();
  const btn = "flex h-7 w-7 items-center justify-center rounded-full border border-line/70 text-mute transition-colors hover:border-mute/40 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:border-line/70 disabled:hover:text-mute";
  const arrow = (d: string) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
  return (
    <div className="relative flex min-w-0 items-center gap-1.5" data-testid="pf-arrows">
      <button type="button" className={btn} aria-label={t.prevPf} title={t.prevPf} disabled={prev === null} onClick={() => prev !== null && onStep(prev)} data-testid="pf-prev">
        {arrow("M10 3 5 8l5 5")}
      </button>
      {children}
      <button type="button" className={btn} aria-label={t.nextPf} title={t.nextPf} disabled={next === null} onClick={() => next !== null && onStep(next)} data-testid="pf-next">
        {arrow("M6 3l5 5-5 5")}
      </button>
      {busy && <Spinner small />}
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
 * Under the slider (the owner, 24/10/2026): the list's return and expected loss, shown as soon as the list arrives, and the
 * Monte Carlo counter running up to the real number of simulated paths beside them. Fixed sizes, "—" before the first list.
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
function useResultReveal(data: Response | null, active: boolean, loading: boolean, show: Show | null, waited: number | null = null): number {
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
  // While the search runs, the counter climbs on its own towards (never reaching) the full number.
  if (active && waited !== null) return 0.95 * (1 - Math.exp(-waited / 5000));
  if (!active || !data || loading) return 0;
  if (show) return show.sim;
  if (own !== null) return own;
  return done === data ? 1 : 0;
}

/** Milliseconds a search has been running (null when none is): drives the live counter and the rows filling in while waiting. */
function useWaitClock(active: boolean): number | null {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!active) {
      setMs(null);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setMs(now - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return ms;
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
      <div className="text-[13px] leading-none tabular-nums text-mute">
        {show ? <><span className="text-[11px]">#{show.row + 1} → </span>{fmt.format(show.count)}</> : n ? fmt.format(n) : "—"}
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

function Results({ data, list, setList, features, onExcluded, signedIn, currency, message, show, lang, whyQuery, dense = false, narrow = false }: { data: Response | null; list: ResultRow[] | null; setList: (l: ResultRow[] | null) => void; features: Set<FeatureKey>; onExcluded: () => void; signedIn: boolean; currency: string; message: ReactNode | null; show: Show | null; lang: FinderLang; whyQuery: string; dense?: boolean; narrow?: boolean }) {
  // Dense: shorter rows, used beside the chart so the chart and the 10 bonds fit one screen. Narrow: half-width list
  // beside the chart, without the bond name and minimum columns (the issuer, return, duration and risk stay).
  const rowH = dense ? DENSE_ROW_H : ROW_H;
  const headH = dense ? DENSE_HEAD_H : HEAD_H;
  const t = useFinderText();
  const rows = message ? [] : (list ?? data?.rows ?? []).slice(0, SLOTS);
  // Each tool shows only when the plan has it (lib/features.ts).
  const paid = features.has("isin");
  const canSwap = features.has("swap");
  const canExclude = features.has("blacklist");
  // The swap panel for one slot, drawn over the rows so nothing moves.
  const [panel, setPanel] = useState<{ kind: "swap"; slot: number } | { kind: "gpt" } | null>(null);
  useEffect(() => setPanel(null), [data]);
  // Admin only (the owner, 24/10/2026): a details line under each bond, copy the ISINs for GPT and show GPT's ratings.
  const [admin, setAdmin] = useState(false);
  useEffect(() => { loadMe().then((me) => setAdmin(!!me?.isAdmin)); }, []);
  const gpt = useGptRatings(admin);
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
  const hide = (i: number) => (show && !message && i > show.row ? " invisible" : "");
  return (
    <div>
      <div className="relative">
      {/* Desktop table */}
      {/* Fixed layout: column widths never change when the results do. */}
      <table className="hidden w-full table-fixed text-sm sm:table">
        <colgroup>
          <col className="w-9" />
          {narrow ? <col /> : <col className="w-[17%]" />}
          {!narrow && <col />}
          {!narrow && <col className="w-[8.25rem]" />}
          <col className={narrow ? "w-[4.75rem]" : "w-[6.5rem]"} />
          <col className={narrow ? "w-[3.5rem]" : "w-[6.5rem]"} />
          {!narrow && <col className="w-[7rem]" />}
          <col className="w-[5rem]" />
          {admin && <><col className="w-[3.75rem]" /><col className="w-[3.75rem]" /><col className="w-[4.5rem]" /><col className="w-[4.5rem]" /></>}
          <col className="w-8" />
          <col className="w-8" />
        </colgroup>
        <thead>
          <tr className="border-b border-line text-left text-xs text-mute" style={{ height: headH }}>
            <th className="py-0 pl-2 font-medium">#</th>
            <th className="truncate py-0 pr-3 font-medium">{t.issuer}</th>
            {!narrow && <th className="truncate py-0 pr-3 font-medium">{t.bond}</th>}
            {!narrow && <th className="truncate py-0 pr-2 font-medium">ISIN</th>}
            <th className={`truncate ${narrow ? "px-1" : "px-3"} py-0 text-center font-medium`}>{t.yield}</th>
            <th className={`truncate ${narrow ? "px-1" : "px-3"} py-0 text-center font-medium`}>{t.duration}</th>
            {!narrow && <th className="truncate px-3 py-0 text-center font-medium">{t.minInvest}</th>}
            <th className="truncate px-3 py-0 text-center font-medium" title={t.riskNote}>{t.risk}</th>
            {admin && <><th className="truncate px-1 py-0 text-center font-medium text-amber-800">{IR_HEAD}</th><th className="truncate px-1 py-0 text-center font-medium text-amber-800">{BR_HEAD}</th><th className="truncate px-1 py-0 text-center font-medium text-amber-800" title={SPREAD_NOTE}>{SPREAD_HEAD}</th><th className="truncate px-1 py-0 text-center font-medium text-amber-800" title={RISKPAY_NOTE}>{RISKPAY_HEAD}</th></>}
            <th aria-label={t.swap} />
            <th aria-label={t.exclude} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.rank} className={`border-b border-line/60${hide(i)}`} style={{ height: rowH }}>
              <td className="py-0 pl-2 text-mute tabular-nums">{r.rank}</td>
              <td className="truncate py-0 pr-3 font-medium" title={admin && narrow ? `${r.issuer} · ${r.isin} · ${adminFacts(r)}` : r.issuer}>
                {r.hidden ? <HiddenName rank={r.rank} /> : r.issuer}
              </td>
              {!narrow && <td className="overflow-hidden py-0 pr-3">
                {admin && !dense ? (
                  <div className="leading-tight" data-testid="admin-facts">
                    <div className="truncate" title={r.name}>{r.name}</div>
                    <div className="truncate text-[10px] text-amber-800">{adminFacts(r)}</div>
                  </div>
                ) : paid ? (
                  <div className="truncate" title={r.name}>{r.name}</div>
                ) : <Dim />}
              </td>}
              {!narrow && <td className="py-0 pr-2">
                {paid || admin ? <CopyIsin isin={r.isin} admin={admin} /> : signedIn ? (
                  <Link href="/pricing" className="flex items-center gap-1 truncate whitespace-nowrap text-xs text-accent"><Lock /> {t.isinPlus}</Link>
                ) : (
                  <span className="flex items-center gap-1 truncate whitespace-nowrap text-xs text-mute"><Lock /> {t.freeAccount}</span>
                )}
              </td>}
              <td className={`${narrow ? "px-1" : "px-3"} py-0 text-center font-semibold tabular-nums`} title={r.why ? t.riskWhy(r.why) : undefined}>{pct(r.ytm)}</td>
              <td className={`${narrow ? "px-1" : "px-3"} py-0 text-center tabular-nums`}>{r.duration != null ? r.duration.toFixed(1) : <Dim />}</td>
              {!narrow && <td className="px-3 py-0 text-center tabular-nums">{signedIn ? fmtMin(r.minInvestment, currency) : <Dim />}</td>}
              <td className="px-1 py-0 text-center">{r.risk !== undefined ? <RiskBadge risk={r.risk} title={t.riskNote} sp={r.sp} /> : <Dim />}</td>
              {admin && <><td className="px-1 py-0 text-center"><GptRate isin={r.isin} kind="ir" /></td><td className="px-1 py-0 text-center"><GptRate isin={r.isin} /></td><td className="px-1 py-0 text-center"><Spread ytm={r.ytm} years={r.duration} /></td><td className="px-1 py-0 text-center"><RiskPayCell isin={r.isin} ytm={r.ytm} years={r.duration} pd={r.pd} life={r.life} lgd={r.lgd} /></td></>}
              <td className="py-0 text-center">{canEdit && canSwap && <SwapButton onClick={() => setPanel({ kind: "swap", slot: i })} label={`${t.swap}: ${r.issuer}`} />}</td>
              <td className="py-0 text-center">{!show && <ExcludeButton tip={i === 0} row={r} allowed={canExclude} signedIn={signedIn} onExcluded={onExcluded} />}</td>
            </tr>
          ))}
          {Array.from({ length: locked }).map((_, i) => (
            <tr key={`l${i}`} aria-hidden className={`select-none border-b border-line/60 blur-[5px]${hide(rows.length + i)}`} style={{ height: rowH }}>
              <td className="pl-2"><span className="inline-block h-3 w-4 rounded bg-line align-middle" /></td>
              <td colSpan={narrow ? 3 : 6} className="pr-3"><span className="block h-3 rounded bg-line" /></td>
              <td className="px-3"><span className="block h-3 rounded bg-line" /></td>
              {admin && <><td /><td /><td /><td /></>}
              <td />
              <td />
            </tr>
          ))}
          {Array.from({ length: empty }).map((_, i) => (
            <tr key={`e${i}`} aria-hidden style={{ height: rowH }}>
              <td colSpan={(narrow ? 7 : 10) + (admin ? 4 : 0)} />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone cards */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((r, i) => (
          <li key={r.rank} className={`flex items-center gap-3 overflow-hidden rounded-2xl border border-line/70 px-4${hide(i)}`} style={{ height: CARD_H }}>
            <span className="w-5 text-sm text-mute tabular-nums">{r.rank}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.hidden ? <HiddenName rank={r.rank} /> : r.issuer}</div>
              <div className="truncate text-xs leading-relaxed text-mute">
                {paid
                  ? <>{r.isin} · {r.duration?.toFixed(1)} {t.yrs} · {t.risk} <RiskBadge risk={r.risk} sp={r.sp} />{r.minInvestment != null && <> · min {fmtMin(r.minInvestment, currency)}</>}</>
                  : signedIn
                    ? <>{r.duration?.toFixed(1)} {t.yrs} · {t.risk} <RiskBadge risk={r.risk} sp={r.sp} /> · {t.isinPlus}</>
                    : r.duration != null
                      ? <>{r.duration.toFixed(1)} {t.yrs} · {t.risk} <RiskBadge risk={r.risk} /> · {t.freeAccount}</>
                      : t.detailsFree}
              </div>
            </div>
            <span className="font-semibold tabular-nums" title={r.why ? t.riskWhy(r.why) : undefined}>{pct(r.ytm)}</span>
            <span className="-mr-2 flex shrink-0 items-center">
              <span className="w-7 text-center">{canEdit && canSwap && <SwapButton onClick={() => setPanel({ kind: "swap", slot: i })} label={`${t.swap}: ${r.issuer}`} />}</span>
              <span className="w-9 text-center">{!show && <ExcludeButton tip={i === 0} row={r} allowed={canExclude} signedIn={signedIn} onExcluded={onExcluded} big />}</span>
            </span>
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
      {panel?.kind === "swap" && data && canEdit && (
        <SwapPanel
          row={rows[panel.slot]}
          options={canSwap ? swapOptions(rows[panel.slot], available(data, rows)) : null}
          onPick={(b) => swapIn(panel.slot, b)}
          onExclude={canExclude ? async (kind) => { if (await excludeRow(rows[panel.slot], kind)) { setPanel(null); onExcluded(); } } : undefined}
          onClose={() => setPanel(null)}
        />
      )}
      {panel?.kind === "gpt" && admin && <GptPastePanel onSaved={() => setPanel(null)} onClose={() => setPanel(null)} />}
      {message && (
        <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center rounded-2xl bg-canvas p-6 text-center sm:top-[30px]">
          {message}
        </div>
      )}
      </div>

      {/* Allocation by industry and country plus the diversification score: a fixed strip under the full-width table (not beside the chart). */}
      {!dense && !narrow && (
        <Diversification rows={show || message ? [] : rows} lang={lang} signedIn={signedIn} locked={!(features.has("loss_chart") || admin)} />
      )}

      {/* One fixed-height line under the table: the Excel button, or the upgrade link, or nothing. */}
      <div className="mt-2 flex h-7 items-center gap-2 overflow-hidden whitespace-nowrap">
        {features.has("excel") && rows.length > 0 ? (
          <>
          <button
            type="button"
            data-testid="excel-download"
            onClick={() => downloadTop10(rows, t)}
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
        {admin && rows.length > 0 && !show && !message && <BondNoteFoot isins={rows.map((r) => r.isin)} />}
        {admin && rows.length > 0 && !show && !message && (
          <span className="ml-auto flex shrink-0 items-center gap-1" data-testid="admin-isin-tools">
            <GptCalcAll isins={rows.map((r) => r.isin).filter((i): i is string => !!i)} />
            <CopyChip text={isinText(rows.map((r) => r.isin))} label="Copy ISINs" testId="copy-isins" />
            <CopyChip text={isinText(rows.map((r) => r.isin), true)} label="+ prompt" testId="copy-isins-prompt" />
            <button type="button" onClick={() => setPanel({ kind: "gpt" })} data-testid="paste-gpt" className="w-[5.5rem] rounded-full border border-amber-300 bg-amber-50 py-0.5 text-center text-[11px] font-medium text-amber-900 hover:bg-amber-100">
              Paste GPT{Object.keys(gpt).length ? " ✓" : ""}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function downloadTop10(rows: ResultRow[], t: ReturnType<typeof useFinderText>) {
  downloadXlsx(
    [["#", t.issuer, t.bond, "ISIN", `${t.yield} %`, t.duration, t.minInvest], ...rows.map((r) => [r.rank, r.issuer, r.name, r.isin, r.ytm, r.duration, minForExcel(r.minInvestment)])],
    "10bonds-top10.xlsx",
    "Top 10",
  );
}

/**
 * iPhone only (the owner, 24/10/2026): the results as their own full-screen page, opened by "Show AI Efficient Portfolio".
 * Top to bottom: return and expected loss, the 10 bonds with a few large columns, and one small grey Monte Carlo line
 * over the site's one disclaimer. It fills exactly the screen (10 equal row slots share the height), never scrolls,
 * and shows the list on screen at once (no staged show). "Back" returns to the slider.
 */
function PhoneResults({ arrows, title, onClose, data, list, setList, features, signedIn, loading, lang, ret, loss, lock, message, onExcluded, currency }: { arrows: boolean; title: (text: string) => ReactNode; currency: string; onClose: () => void; data: Response | null; list: ResultRow[] | null; setList: (l: ResultRow[] | null) => void; features: Set<FeatureKey>; signedIn: boolean; loading: boolean; lang: FinderLang; ret: ReactNode | null; loss: ReactNode | null; lock: { href: string; label: string }; message: ReactNode | null; onExcluded: () => void }) {
  const t = useFinderText();
  // The page under it stays still while this one is open.
  useEffect(() => {
    const el = document.documentElement;
    const before = el.style.overflow;
    el.style.overflow = "hidden";
    return () => { el.style.overflow = before; };
  }, []);
  const rows = message ? [] : (list ?? data?.rows ?? []).slice(0, SLOTS);
  const locked = message ? 0 : Math.min(data?.lockedCount ?? 0, SLOTS - rows.length);
  const paid = features.has("isin");
  const canSwap = features.has("swap");
  const canExclude = features.has("blacklist");
  const canEdit = (canSwap || canExclude) && !message && rows.length > 0;
  const [panel, setPanel] = useState<number | null>(null);
  useEffect(() => setPanel(null), [data]);
  const swapIn = (slot: number, b: ResultRow) => {
    setList(rows.map((r, i) => (i === slot ? { ...b, rank: r.rank } : r)));
    setPanel(null);
  };
  const mc = data?.monteCarlo;
  const n = new Intl.NumberFormat(lang).format(mc?.paths || MC_PATHS);
  // The admin's risk column also holds the S&P slot (fixed width either way, so nothing moves when results arrive).
  const [admin, setAdmin] = useState(false);
  useEffect(() => { loadMe().then((me) => setAdmin(!!me?.isAdmin)); }, []);
  const cols = `grid ${admin ? "grid-cols-[1rem_minmax(0,1fr)_2.25rem_4.25rem_3.75rem_1.5rem_2.25rem]" : "grid-cols-[1rem_minmax(0,1fr)_2.25rem_1.75rem_3.75rem_1.5rem_2.25rem]"} items-center gap-x-1.5`;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.sheetTitle}
      data-testid="phone-results"
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden overscroll-none bg-white px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-[max(env(safe-area-inset-top),6px)]"
    >
      <div className="flex h-11 shrink-0 items-center justify-between">
        <button type="button" onClick={onClose} data-testid="phone-results-back" className="-ml-1 flex h-9 w-20 items-center gap-0.5 text-[16px] text-accent">
          <svg width="11" height="18" viewBox="0 0 11 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 2 2 9l7 7" /></svg>
          {t.back}
        </button>
        {title(t.sheetTitle)}
        <span className="flex w-20 justify-end">
          {features.has("excel") && rows.length > 0 && (
            <button type="button" onClick={() => downloadTop10(rows, t)} aria-label={t.excel} title={t.excel} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium">⬇ Excel</button>
          )}
        </span>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <Stat value={ret} label={t.retYear} lock={lock} h="h-[62px]" />
        <Stat value={loss} label={t.lifeLoss} lock={lock} h="h-[62px]" />
      </div>
      <div className="flex h-5 shrink-0 items-center">
        {data && (ret === null || !signedIn) && (
          <Link href={lock.href} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent" data-testid="phone-unlock"><Lock /> {lock.label}</Link>
        )}
      </div>
      <div className={`relative flex min-h-0 flex-1 flex-col transition-opacity ${loading ? "opacity-60" : ""}`}>
        {loading && !arrows && <Spinner />}
        <div className={`${cols} h-6 shrink-0 border-b border-line text-[11px] text-mute`}>
          <span>#</span>
          <span>{t.issuer}</span>
          <span className="text-right">{t.yrs}</span>
          <span className="text-center">{t.risk}</span>
                    <span className="text-right">{t.yield}</span>
          <span />
          <span />
        </div>
        <ul className="grid min-h-0 flex-1 grid-rows-10" data-testid="phone-rows">
          {rows.map((r, i) => (
            <li key={r.rank} className={`${cols} min-h-0 border-b border-line/60`}>
              <span className="text-[12px] tabular-nums text-mute">{r.rank}</span>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium leading-tight">{r.hidden ? <HiddenName rank={r.rank} /> : r.issuer}</div>
                {admin ? (
                  <>
                    <CopyIsin isin={r.isin} admin phone title={adminFacts(r)} />
                    <div className="flex flex-wrap items-center gap-1 leading-none" data-testid="admin-phone-ratings"><GptRate isin={r.isin} kind="ir" /><GptRate isin={r.isin} /><Spread ytm={r.ytm} years={r.duration} /><RiskPayCell isin={r.isin} ytm={r.ytm} years={r.duration} pd={r.pd} life={r.life} lgd={r.lgd} /></div>
                  </>
                ) : paid ? (
                  <CopyIsin isin={r.isin} phone />
                ) : (
                  <div className="truncate text-[11px] leading-tight text-mute">{signedIn ? t.isinPlus : t.freeAccount}</div>
                )}
              </div>
              <span className="text-right text-[13px] tabular-nums">{r.duration != null ? r.duration.toFixed(1) : <Dim />}</span>
              <span className="text-center">{r.risk !== undefined ? <RiskBadge risk={r.risk} title={t.riskNote} sp={r.sp} /> : <Dim />}</span>
                            <span className="text-right text-[15px] font-semibold tabular-nums">{pct(r.ytm)}</span>
              <span className="text-center">{canEdit && canSwap && <SwapButton onClick={() => setPanel(i)} label={`${t.swap}: ${r.issuer}`} />}</span>
              <span className="flex justify-center"><ExcludeButton tip={i === 0} row={r} allowed={canExclude} signedIn={signedIn} onExcluded={onExcluded} big /></span>
            </li>
          ))}
          {locked > 0 && (
            <li className="relative min-h-0" style={{ gridRow: `span ${locked}` }}>
              <div aria-hidden className="grid h-full select-none blur-[5px]" style={{ gridTemplateRows: `repeat(${locked}, minmax(0, 1fr))` }}>
                {Array.from({ length: locked }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-line/60">
                    <span className="h-3 w-4 rounded bg-line" />
                    <span className="h-3 flex-1 rounded bg-line" />
                    <span className="h-3 w-12 rounded bg-line" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-[17px] font-semibold">{t.more(locked)}</p>
                <p className="-mt-1 text-sm text-mute">{t.noCard}</p>
                <Link href={signupHref(lang)} className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white shadow-sm">{t.seeAll}</Link>
              </div>
            </li>
          )}
        </ul>
        {message && (
          <div className="absolute inset-x-0 bottom-0 top-6 flex flex-col items-center justify-center rounded-2xl bg-canvas p-6 text-center">{message}</div>
        )}
        {panel !== null && data && canEdit && rows[panel] && (
          <SwapPanel
            row={rows[panel]}
            options={canSwap ? swapOptions(rows[panel], available(data, rows)) : null}
            onPick={(b) => swapIn(panel, b)}
            onExclude={canExclude ? async (kind) => { if (await excludeRow(rows[panel], kind)) { setPanel(null); onExcluded(); } } : undefined}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
      {data?.source === "sample" ? (
        <p className="mt-1.5 h-[13px] shrink-0 truncate text-[10px] leading-[13px] text-amber-800" data-testid="yields-date">{t.sample}</p>
      ) : (
        <p className="mt-1.5 h-[13px] shrink-0 truncate text-[10px] leading-[13px] text-mute" data-testid="yields-date">{t.asOf} {data?.asOf ? plainDate(data.asOf, lang) : "—"}.{dataFacts(data, lang, currency)}</p>
      )}
      <p className="h-[25px] shrink-0 overflow-hidden text-[10px] leading-[12.5px] text-mute" data-testid="phone-mc">
        {mc?.expYield != null && mc.p5 != null && !list ? t.mc(n, pct(mc.expYield), pct(mc.p5)) : t.mcRun(n)}
      </p>
      <p className="mt-1 shrink-0 text-[9px] leading-tight text-mute/80" data-testid="phone-footer-note">{FOOTER_NOTE[lang]}</p>
    </div>
  );
}

/** Admin only: maturity, seniority and coupon type as the data holds them ("–" when missing, never guessed). */
function adminFacts(r: ResultRow): string {
  const m = r.maturity ? r.maturity.slice(0, 10).split("-").reverse().join("/") : "–";
  return `${m} · ${r.seniority || "–"} · ${couponTypeLabel("en", r.couponType)}`;
}

/** A yellow admin chip that copies text; "Copied" shows in the same fixed width for 2 seconds. */
/** An ISIN that copies to the clipboard when clicked; "Copied ✓" takes its place for a moment, so nothing shifts. */
function CopyIsin({ isin, admin, phone, title }: { isin?: string | null; admin?: boolean; phone?: boolean; title?: string }) {
  const [done, setDone] = useState(false);
  if (!isin) return <Dim />;
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    try { await navigator.clipboard.writeText(isin); setDone(true); setTimeout(() => setDone(false), 1500); } catch { setDone(false); }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={title ?? "Click to copy"}
      aria-label={`Copy ISIN ${isin}`}
      data-testid="copy-isin"
      className={`block max-w-full truncate text-left font-mono ${phone ? "text-[11px] leading-tight" : "text-[11px]"} ${admin ? "text-amber-800" : "text-mute"} hover:text-ink`}
    >
      {done ? "Copied ✓" : isin}
    </button>
  );
}

function CopyChip({ text, label, testId }: { text: string; label: string; testId: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { setDone(false); } }}
      className="w-[5.5rem] rounded-full border border-amber-300 bg-amber-50 py-0.5 text-center text-[11px] font-medium text-amber-900 hover:bg-amber-100"
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

/** Admin only: paste GPT's answer; the ratings found are saved in the database and shown in every BR / IR column. */
function GptPastePanel({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"" | "saving" | "error">("");
  const found = parseGptRatings(text);
  const n = Object.keys(found).length;
  return (
    <PanelShell title="Paste GPT answer (admin)" onClose={onClose}>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => { setText(e.target.value); setState(""); }}
        data-testid="gpt-paste"
        placeholder="Paste GPT's answer here (ISIN | IR | BR | Basis)"
        className="mt-1 min-h-0 w-full flex-1 resize-none rounded-lg border border-amber-300 bg-amber-50 p-2 font-mono text-[11px] text-ink outline-none"
      />
      <div className="mt-2 flex h-7 shrink-0 items-center justify-between gap-2 text-[12px]">
        <span className={state === "error" ? "text-red-700" : "text-mute"}>{state === "error" ? "Not saved, try again" : `${n} rating${n === 1 ? "" : "s"} found`}</span>
        <span className="flex gap-2">
          <button type="button" onClick={() => { setText(""); setState(""); }} className="rounded-full px-3 py-1 text-mute hover:bg-canvas">Clear</button>
          <button
            type="button"
            disabled={!n || state === "saving"}
            onClick={async () => { setState("saving"); if (await saveGptRatings(found)) onSaved(); else setState("error"); }}
            data-testid="gpt-show"
            className="w-28 rounded-full bg-amber-500 py-1 font-medium text-white disabled:opacity-40"
          >
            {state === "saving" ? "Saving…" : "Save ratings"}
          </button>
        </span>
      </div>
    </PanelShell>
  );
}

/** Drawn over the blurred row slots after the visible rows: the sign-up offer. */
function LockedOverlay({ count, top }: { count: number; top: number }) {
  const t = useFinderText();
  const lang = useContext(FinderLangContext);
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
        href={signupHref(lang)}
        className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white shadow-sm transition hover:bg-[#0077ed]"
      >
        {t.seeAll}
      </Link>
    </div>
  );
}



/** A visitor's bond name: a blurred stand-in of varying length (the real issuer is never sent to the browser). */
const FAKE_NAMES = ["Xxxxxx Group", "Xxx Bank Xx", "Xxxxxxx AB", "Xxxxx Energy", "Xxxx Holding", "Xxxxxxxxx", "Xxxx Finance", "Xxxxxx SpA", "Xxxxx Telecom", "Xxxxxxx NV"];
function HiddenName({ rank }: { rank: number }) {
  return <span aria-hidden className="select-none blur-[5px]">{FAKE_NAMES[(rank - 1) % FAKE_NAMES.length]}</span>;
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


/** Sign-up link that returns to this home page (the saved result is restored there). */
const signupHref = (lang: FinderLang) => `/signup?next=${lang === "en" ? "/" : `/${lang}`}`;

const FACT_WORDS = {
  en: ["bonds", "issuers"], it: ["obbligazioni", "emittenti"], fr: ["obligations", "émetteurs"], de: ["Anleihen", "Emittenten"],
} as const;

/** "12,345 bonds · 1,234 issuers" from the data of this search (never typed in by hand); empty until the data is in. */
function dataFacts(data: Response | null, lang: FinderLang, currency: string): string {
  if (!data?.scanned || !data.issuers || data.source !== "live") return "";
  const f = new Intl.NumberFormat(lang);
  const w = FACT_WORDS[lang];
  return ` ${f.format(data.scanned)} ${currency} ${w[0]} · ${f.format(data.issuers)} ${w[1]}.`;
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
    lifeLoss: list.length && list.every((r) => r.pd != null) ? listLifeLoss(list.map((r) => r.pd!), list.map(lgdOfRow)) : null,
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

/** The minus at the end of a row: one tap excludes the issuer, and the list is searched again without it (another bond
 *  takes its place). Without the plan feature it is a faint link to the plans, same size, so nothing moves. */
function ExcludeButton({ row, allowed, signedIn, onExcluded, big = false, tip }: { row: ResultRow; allowed: boolean; signedIn: boolean; onExcluded: () => void; big?: boolean; tip?: boolean }) {
  const t = useFinderText();
  const [busy, setBusy] = useState(false);
  const size = big ? "h-9 w-9" : "h-6 w-6";
  const icon = (
    <svg width={big ? 16 : 13} height={big ? 16 : 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="M8 12h8" />
    </svg>
  );
  if (!allowed) {
    return (
      <Link href={signedIn ? "/pricing" : "/signup"} title={t.excludePaid} aria-label={t.excludePaid} data-testid="exclude-locked" data-tip={tip ? "blacklist" : undefined} className={`inline-flex ${size} items-center justify-center rounded-full text-red-500/70 hover:bg-canvas hover:text-red-600`}>
        {icon}
      </Link>
    );
  }
  const label = `${t.exclude}: ${row.issuer}`;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const ok = await excludeRow(row, "issuer");
        setBusy(false);
        if (ok) onExcluded();
      }}
      title={label}
      aria-label={label}
      data-testid="exclude-row"
      data-tip={tip ? "blacklist" : undefined}
      className={`inline-flex ${size} items-center justify-center rounded-full text-red-500 hover:bg-canvas hover:text-red-600 disabled:opacity-40`}
    >
      {icon}
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
              <span className={`${b.sp !== undefined ? "w-[4.5rem]" : "w-8"} text-center`}><RiskBadge risk={b.risk} sp={b.sp} /></span>
              {b.sp !== undefined && <><span className="w-12 text-center" title={IR_HEAD}><GptRate isin={b.isin} kind="ir" /></span><span className="w-12 text-center" title={BR_HEAD}><GptRate isin={b.isin} /></span><span className="w-[3.25rem] text-center" title={SPREAD_NOTE}><Spread ytm={b.ytm} years={b.duration} /></span><span className="w-24 text-center" title={RISKPAY_NOTE}><RiskPayCell isin={b.isin} ytm={b.ytm} years={b.duration} pd={b.pd} life={b.life} /></span></>}
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

