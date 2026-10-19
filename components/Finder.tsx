"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { downloadXlsx } from "@/lib/xlsx";
import { LimitReached, QuotaNote, type Quota } from "./SearchQuota";
import { LIMITS } from "@/lib/limits";
import { RiskBadge } from "./RiskBadge";
import type { ResultsPayload } from "@/lib/tiers";
import { FINDER_TEXT, FinderLangContext, useFinderText, type FinderLang } from "@/lib/finderText";
import { track } from "@/lib/track";
import SingleBond from "./SingleBond";
import { fmtMin, minForExcel } from "@/lib/fmtMin";
import type { BondFilter } from "@/lib/bondFilter";
import { ageDays, isStale } from "@/lib/dataHealth";
import { MC_PATHS } from "@/lib/monteCarlo";

type Response = ResultsPayload & {
  quota?: Quota | null;
  source: "live" | "sample";
  scanned?: number;
  monteCarlo?: { paths: number; expYield: number | null; p5: number | null };
  asOf: string | null;
  durationBand: number;
  inputs: { duration: number; ytm: number; risk: number };
};

const pct = (n: number | null | undefined, d = 2) => (n === null || n === undefined ? "—" : `${n.toFixed(d)}%`);
const yrs = (n: number | null | undefined, unit = "yrs") => (n === null || n === undefined ? "—" : `${n.toFixed(1)} ${unit}`);

/** The bond finder. `lang` only changes the words; `heading` false renders the title as h2 where the page has its own h1. */
export default function Finder({ lang = "en", heading = true }: { lang?: FinderLang; heading?: boolean }) {
  const t = FINDER_TEXT[lang];
  const errText = t.error;
  const Title = heading ? "h1" : "h2";
  const [duration, setDuration] = useState<number>(LIMITS.duration.initial);
  const [ytm, setYtm] = useState<number>(LIMITS.ytm.initial);
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const preview = useRef<string | null>(null);
  const [risk, setRisk] = useState<number>(LIMITS.risk.initial);
  const [mode, setMode] = useState<"portfolio" | "single">("portfolio");
  const [caps, setCaps] = useState<Record<string, Record<string, number | null>> | null>(null);
  const [currency, setCurrency] = useState<BondFilter["currency"]>("EUR");
  const [size, setSize] = useState<BondFilter["size"]>("100k");
  const [minKnown, setMinKnown] = useState<boolean | null>(null);
  const sizeTouched = useRef(false);
  // The portfolio results box's height, given to the 1-bond box too, so switching mode never resizes the page.
  const resultsBox = useRef<HTMLElement>(null);
  const [resultsH, setResultsH] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (mode === "portfolio" && resultsBox.current) setResultsH(resultsBox.current.offsetHeight);
  });
  // The highest yield available at each horizon and risk level, loaded once, so the yield slider follows both at once.
  const capFor = (d: number, r: number) => caps?.[String(r)]?.[String(Math.round(d * 100) / 100)] ?? LIMITS.ytm.max;
  const ytmMax = capFor(duration, risk);

  useEffect(() => {
    fetch(`/api/bonds/caps?${new URLSearchParams({ currency, size })}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (!b?.caps) return;
        setCaps(b.caps);
        setMinKnown(Boolean(b.minKnown));
        if (!b.minKnown) setSize("100k");
        // Small orders (1k-10k) is the default once the data says which bonds they are.
        if (b.minKnown && !sizeTouched.current && size === "100k") { sizeTouched.current = true; setSize("1k"); }
        const cap = b.caps[String(risk)]?.[String(Math.round(duration * 100) / 100)];
        if (typeof cap === "number") setYtm((y) => Math.min(y, cap));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, size]);

  // A target at the maximum stays at the maximum when the horizon or risk changes, so more risk shows more yield.
  const followCap = (cap: number) => setYtm((y) => (y > cap || y >= ytmMax - 1e-9 ? cap : y));
  const changeDuration = (d: number) => {
    setDuration(d);
    followCap(capFor(d, risk));
  };
  const changeRisk = (r: number) => {
    setRisk(r);
    followCap(capFor(duration, r));
  };

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
  }, [duration, ytm, risk, mode, currency, size]);

  const tier = data?.tier ?? "visitor";
  const paid = tier === "plus" || tier === "premium";
  const signedIn = tier !== "visitor";
  // Visitors are asked to open a free account first; upgrade prompts come only after that.
  const lockTo = signedIn ? { href: "/pricing", label: t.avgPlus } : { href: "/signup", label: t.avgSignUp };

  return (
    <FinderLangContext.Provider value={lang}>
    <div className="finder-wide grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-5">
      {/* Inputs */}
      <section className="rounded-[28px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
        <Title className="text-[24px] font-semibold leading-[1.1] tracking-tight sm:text-[26px]">
          {t.h1}
        </Title>
        <p className="mt-1.5 text-[13px] leading-snug text-mute">
          {t.intro}
        </p>

        <div role="tablist" aria-label={t.mode} className="mt-3 grid grid-cols-2 rounded-full bg-canvas p-1 text-sm font-medium">
          {([["single", t.single], ["portfolio", t.portfolio]] as const).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 transition ${mode === m ? "bg-white shadow-sm" : "text-mute"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Toggle label={t.currency} value={currency} options={[["EUR", "EUR"], ["USD", "USD"]]} onChange={(v) => setCurrency(v as BondFilter["currency"])} testId="toggle-currency" />
          <Toggle
            label={t.minOrder}
            value={size}
            options={[["1k", t.small], ["100k", t.allSizes]]}
            onChange={(v) => { sizeTouched.current = true; setSize(v as BondFilter["size"]); }}
            testId="toggle-size"
            disabled={minKnown === false ? ["1k"] : []}
            disabledTitle={t.minNoData}
          />
        </div>

        <Slider
          label={t.horizon}
          hint={t.horizonHint}
          value={duration}
          display={`${duration % 1 === 0 ? duration : duration.toFixed(1)} ${t.years}`}
          min={LIMITS.duration.min}
          max={LIMITS.duration.max}
          step={LIMITS.duration.step}
          minLabel={t.year1}
          maxLabel={t.years15}
          onChange={changeDuration}
        />
        {/* In 1-bond mode these two stay in place, hidden, so nothing above or beside them moves. */}
        <div className={mode === "portfolio" ? "" : "invisible"} aria-hidden={mode !== "portfolio"}>
        <Slider
          label={t.yieldLabel}
          hint={t.yieldHint}
          value={ytm}
          display={`${ytm.toFixed(2)}%`}
          min={LIMITS.ytm.min}
          max={ytmMax}
          step={LIMITS.ytm.step}
          minLabel="1.0%"
          maxLabel={`${ytmMax.toFixed(2)}% ${t.maxNote}`}
          onChange={setYtm}
        />
        {/* Risk 1 (lowest) always on the right: the slider position is 11 - risk. */}
        <Slider
          label={t.ratingLabel}
          hint={t.ratingHint}
          value={LIMITS.risk.max + LIMITS.risk.min - risk}
          display={<RiskBadge risk={risk} />}
          min={LIMITS.risk.min}
          max={LIMITS.risk.max}
          step={LIMITS.risk.step}
          minLabel={t.highRiskLabel}
          maxLabel={t.lowRiskLabel}
          onChange={(pos) => changeRisk(LIMITS.risk.max + LIMITS.risk.min - pos)}
        />
        </div>

      </section>

      {/* Results */}
      {mode === "single" ? (
        <section
          className="flex flex-col rounded-[28px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-5 lg:min-h-[var(--results-h)]"
          style={resultsH ? { ["--results-h" as string]: `${resultsH}px` } : undefined}
        >
          <SingleBond duration={duration} preview={preview.current} currency={currency} size={size} />
          <p className="mt-auto pt-2 text-[11px] leading-snug text-mute" data-testid="ranking-note">{t.howSingle} {t.riskNote} {t.gross}</p>
        </section>
      ) : (
      <section ref={resultsBox} className="flex flex-col rounded-[28px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-5">
        {/* Every box, row and line below keeps its size and place whatever the results are: 10 row slots always, fixed-height boxes, messages drawn over the rows. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat value={data ? String(Math.min(10, data.rows.length + data.lockedCount)) : "—"} label={t.found} />
          <Stat value={!data ? "—" : paid ? pct(data.summary?.avgYtm) : null} label={t.avgYield} lock={lockTo} />
          <Stat value={!data ? "—" : paid ? (data.summary?.avgRisk != null ? <RiskBadge risk={data.summary.avgRisk} size="lg" /> : "—") : null} label={t.avgRisk} lock={lockTo} />
          <Stat value={!data ? "—" : paid ? yrs(data.summary?.avgDuration, t.yrs) : null} label={t.avgDuration} lock={lockTo} />
        </div>
        <div className="mt-1.5 h-4">
          {data && !paid && (
            <Link href={lockTo.href} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline" data-testid="avg-unlock">
              <Lock /> {lockTo.label}
            </Link>
          )}
        </div>

        <div className={`relative mt-2 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
          <ScanBar data={data} lang={lang} />
          <Results
            data={data}
            paid={paid}
            signedIn={signedIn}
            currency={currency}
            message={
              limit ? <LimitReached quota={limit} />
              : error ? <p className="text-sm text-mute">{error}</p>
              : data && data.rows.length === 0 ? <p className="text-sm text-mute">{t.none}</p>
              : null
            }
          />
          <div className="mt-1 h-4">{!limit && <QuotaNote quota={data?.quota} className="" />}</div>
        </div>

        <div className="mt-auto pt-2">
          {data?.source === "live" && isStale(data.asOf) ? (
            <p className="truncate text-[11px] leading-snug text-amber-800" role="status" data-testid="yields-stale">
              {t.stale(ageDays(data.asOf) ?? 0)}
            </p>
          ) : data?.source === "sample" ? (
            <p className="truncate text-[11px] leading-snug text-amber-800" role="status" data-testid="yields-sample">{t.sample}</p>
          ) : (
            <p className="text-[11px] leading-snug text-mute" data-testid="yields-date">
              {/* Same text before and after the data arrives: only the date fills in, the line never wraps differently. */}
              {t.asOf} {data?.asOf ? plainDate(data.asOf, lang) : "—"}. {t.gross}
            </p>
          )}
          <p className="mt-1 text-[11px] leading-snug text-mute" data-testid="ranking-note">{t.howPortfolio} {t.riskNote}</p>
          <MonteCarloNote data={data} lang={lang} />
        </div>
      </section>
      )}
    </div>
    </FinderLangContext.Provider>
  );
}

function Slider(props: {
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
    <div className="mt-4">
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

function Toggle({ label, value, options, onChange, testId, disabled = [], disabledTitle }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; testId: string; disabled?: string[]; disabledTitle?: string }) {
  return (
    <div>
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

function Stat({ value, label, lock }: { value: ReactNode | null; label: string; lock?: { href: string; label: string } }) {
  return (
    <div className="flex h-[60px] flex-col items-center justify-center rounded-xl border border-line/70 px-3 py-2 text-center">
      {value === null ? (
        // Locked: a grey lock and a dash; the one sign-up link sits under the row.
        <div className="flex items-center gap-1.5 text-xl font-semibold leading-tight text-mute/60" aria-label={lock?.label}>
          <Lock /> —
        </div>
      ) : (
        <div className="text-xl font-semibold leading-tight tabular-nums tracking-tight">{value}</div>
      )}
      <div className="text-[11px] text-mute">{label}</div>
    </div>
  );
}

/** A short "Scanning bond 1 … N" bar over the results each time they arrive; N is the real number of bonds searched. Overlays the box, so nothing moves. */
function ScanBar({ data, lang }: { data: Response | null; lang: FinderLang }) {
  const t = useFinderText();
  const [i, setI] = useState<number | null>(null);
  const [s, setS] = useState(0);
  const lastEnd = useRef(0);
  const n = data?.scanned ?? 0;
  const sims = data?.monteCarlo?.paths ?? 0;
  useEffect(() => {
    if (!n || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    // Quicker when the sliders are being moved, so it never gets in the way.
    const ms = start - lastEnd.current < 4000 ? 400 : 1000;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / ms));
      const eased = 1 - (1 - p) * (1 - p);
      setI(Math.max(1, Math.round(eased * n)));
      setS(Math.round(eased * sims));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        lastEnd.current = performance.now();
        setI(null);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lastEnd.current = performance.now();
      setI(null);
    };
  }, [data, n, sims]);
  if (i === null) return null;
  const fmt = new Intl.NumberFormat(lang);
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/90" aria-hidden="true" data-testid="scan-bar">
      <div className="w-64 max-w-[80%]">
        <p className="text-center text-[13px] tabular-nums text-mute">{t.scanning(fmt.format(i), fmt.format(n))}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(i / n) * 100}%` }} />
        </div>
        {sims > 0 && <p className="mt-2 text-center text-[11px] tabular-nums text-mute">{t.scanSims(fmt.format(s), fmt.format(sims))}</p>}
      </div>
    </div>
  );
}

/** The real Monte Carlo run behind this list: its size for everyone, its results for paid plans. */
function MonteCarloNote({ data, lang }: { data: Response | null; lang: FinderLang }) {
  const t = useFinderText();
  const mc = data?.monteCarlo;
  const n = new Intl.NumberFormat(lang).format(mc?.paths || MC_PATHS);
  return (
    <p className="mt-1 text-[11px] leading-snug text-mute" data-testid="monte-carlo">
      {mc?.expYield != null && mc.p5 != null ? t.mc(n, pct(mc.expYield), pct(mc.p5)) : t.mcRun(n)}
    </p>
  );
}

// Fixed sizes of the result table: a header and always 10 row slots, so nothing under it moves when the results change.
const SLOTS = 10;
const HEAD_H = 30;
const ROW_H = 34;
const CARD_H = 64;

function Results({ data, paid, signedIn, currency, message }: { data: Response | null; paid: boolean; signedIn: boolean; currency: string; message: ReactNode | null }) {
  const t = useFinderText();
  const rows = message ? [] : (data?.rows ?? []).slice(0, SLOTS);
  const locked = message ? 0 : Math.min(data?.lockedCount ?? 0, SLOTS - rows.length);
  const empty = SLOTS - rows.length - locked;
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
        </colgroup>
        <thead>
          <tr className="border-b border-line text-left text-xs text-mute" style={{ height: HEAD_H }}>
            <th className="py-0 pl-2 font-medium">#</th>
            <th className="truncate py-0 pr-3 font-medium">{t.issuer}</th>
            <th className="truncate py-0 pr-3 font-medium">{t.bond}</th>
            <th className="truncate px-3 py-0 text-center font-medium">{t.yield}</th>
            <th className="truncate px-3 py-0 text-center font-medium">{t.duration}</th>
            <th className="truncate px-3 py-0 text-center font-medium">{t.minInvest}</th>
            <th className="truncate px-3 py-0 text-center font-medium" title={t.riskNote}>{t.risk}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank} className="border-b border-line/60" style={{ height: ROW_H }}>
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
              <td className="px-3 py-0 text-center font-semibold tabular-nums">{pct(r.ytm)}</td>
              <td className="px-3 py-0 text-center tabular-nums">{signedIn ? r.duration?.toFixed(1) : <Dim />}</td>
              <td className="px-3 py-0 text-center tabular-nums">{signedIn ? fmtMin(r.minInvestment, currency) : <Dim />}</td>
              <td className="px-3 py-0 text-center">{signedIn ? <RiskBadge risk={r.risk} title={t.riskNote} /> : <Dim />}</td>
            </tr>
          ))}
          {Array.from({ length: locked }).map((_, i) => (
            <tr key={`l${i}`} aria-hidden className="select-none border-b border-line/60 blur-[5px]" style={{ height: ROW_H }}>
              <td className="pl-2"><span className="inline-block h-3 w-4 rounded bg-line align-middle" /></td>
              <td colSpan={5} className="pr-3"><span className="block h-3 rounded bg-line" /></td>
              <td className="px-3"><span className="block h-3 rounded bg-line" /></td>
            </tr>
          ))}
          {Array.from({ length: empty }).map((_, i) => (
            <tr key={`e${i}`} aria-hidden style={{ height: ROW_H }}><td colSpan={7} /></tr>
          ))}
        </tbody>
      </table>

      {/* Phone cards */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <li key={r.rank} className="flex items-center gap-3 overflow-hidden rounded-2xl border border-line/70 px-4" style={{ height: CARD_H }}>
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
            <span className="font-semibold tabular-nums">{pct(r.ytm)}</span>
          </li>
        ))}
        {Array.from({ length: locked }).map((_, i) => (
          <li key={`l${i}`} aria-hidden className="flex select-none items-center gap-3 rounded-2xl border border-line/70 px-4 blur-[5px]" style={{ height: CARD_H }}>
            <span className="h-3 w-4 rounded bg-line" />
            <span className="h-3 flex-1 rounded bg-line" />
            <span className="h-3 w-12 rounded bg-line" />
          </li>
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <li key={`e${i}`} aria-hidden style={{ height: CARD_H }} />
        ))}
      </ul>

      {locked > 0 && <LockedOverlay count={locked} top={rows.length} />}
      {message && (
        <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center rounded-2xl bg-canvas p-6 text-center sm:top-[30px]">
          {message}
        </div>
      )}
      </div>

      {/* One fixed-height line under the table: the Excel button, or the upgrade link, or nothing. */}
      <div className="mt-2 flex h-7 items-center">
        {paid && rows.length > 0 ? (
          <button
            type="button"
            data-testid="excel-download"
            onClick={() =>
              downloadXlsx(
                [["#", t.issuer, t.bond, "ISIN", `${t.yield} %`, t.duration, t.risk, t.minInvest], ...rows.map((r) => [r.rank, r.issuer, r.name, r.isin, r.ytm, r.duration, r.risk, minForExcel(r.minInvestment)])],
                "10bonds-top10.xlsx",
                "Top 10",
              )
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-canvas"
          >
            ⬇ {t.excel}
          </button>
        ) : signedIn && !paid && rows.length > 0 ? (
          <Link href="/pricing" className="flex min-w-0 items-center gap-3 text-xs">
            <span className="truncate text-mute">{t.plusPitch}</span>
            <span className="shrink-0 font-medium text-accent">{t.seePlans}</span>
          </Link>
        ) : null}
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
