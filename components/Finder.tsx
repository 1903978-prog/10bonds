"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LimitReached, QuotaNote, type Quota } from "./SearchQuota";
import { LIMITS, riskLevel } from "@/lib/limits";
import { RiskBadge } from "./RiskBadge";
import type { ResultsPayload } from "@/lib/tiers";
import { FINDER_TEXT, FinderLangContext, useFinderText, type FinderLang } from "@/lib/finderText";
import { track } from "@/lib/track";
import SingleBond from "./SingleBond";
import WhereToTrade from "./brokers/WhereToTrade";

type Response = ResultsPayload & {
  quota?: Quota | null;
  source: "live" | "sample";
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
  // The highest yield available at each horizon and risk level, loaded once, so the yield slider follows both at once.
  const capFor = (d: number, r: number) => caps?.[String(r)]?.[String(Math.round(d * 100) / 100)] ?? LIMITS.ytm.max;
  const ytmMax = capFor(duration, risk);

  useEffect(() => {
    fetch("/api/bonds/caps")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (!b?.caps) return;
        setCaps(b.caps);
        const cap = b.caps[String(LIMITS.risk.initial)]?.[String(LIMITS.duration.initial)];
        if (typeof cap === "number") setYtm((y) => Math.min(y, cap));
      })
      .catch(() => {});
  }, []);

  const changeDuration = (d: number) => {
    setDuration(d);
    const cap = capFor(d, risk);
    setYtm((y) => (y > cap ? cap : y));
  };
  const changeRisk = (r: number) => {
    setRisk(r);
    const cap = capFor(duration, r);
    setYtm((y) => (y > cap ? cap : y));
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
        const qs = new URLSearchParams({ duration: String(duration), ytm: String(ytm), risk: String(risk) });
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
  }, [duration, ytm, risk, mode]);

  const tier = data?.tier ?? "visitor";
  const paid = tier === "plus" || tier === "premium";
  const signedIn = tier !== "visitor";
  // Visitors are asked to open a free account first; upgrade prompts come only after that.
  const lockTo = signedIn ? { href: "/pricing", label: "Plus" } : { href: "/signup", label: t.signUp };

  return (
    <FinderLangContext.Provider value={lang}>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-6">
      {/* Inputs */}
      <section className="rounded-[28px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-8 lg:sticky lg:top-20 lg:self-start">
        <Title className="text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-[40px]">
          {t.h1}
        </Title>
        <p className="mt-3 text-[15px] leading-relaxed text-mute sm:text-base">
          {t.intro}
        </p>

        <div role="tablist" aria-label={t.mode} className="mt-6 grid grid-cols-2 rounded-full bg-canvas p-1 text-sm font-medium">
          {([["single", t.single], ["portfolio", t.portfolio]] as const).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-2 transition ${mode === m ? "bg-white shadow-sm" : "text-mute"}`}
            >
              {label}
            </button>
          ))}
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
        {mode === "portfolio" && (<>
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
        </>)}

        <p className="mt-8 text-xs leading-relaxed text-mute">
          {mode === "portfolio"
            ? t.howPortfolio
            : t.howSingle}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-mute">{t.riskNote}</p>
      </section>

      {/* Results */}
      {mode === "single" ? (
        <section className="rounded-[28px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
          <SingleBond duration={duration} preview={preview.current} />
          <p className="mt-5 flex gap-2 rounded-2xl bg-canvas px-4 py-3 text-xs leading-relaxed text-mute">
            <span aria-hidden>ⓘ</span>
            <span>{t.info} {t.gross}</span>
          </p>
        </section>
      ) : (
      <section className="rounded-[28px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
        {data?.source === "sample" && (
          <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t.sample}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={data ? String(Math.min(10, data.rows.length + data.lockedCount)) : "—"} label={t.found} />
          <Stat value={paid ? pct(data?.summary?.avgYtm) : null} label={t.avgYield} lock={lockTo} />
          <Stat value={paid ? (data?.summary?.avgRisk != null ? <RiskBadge risk={data.summary.avgRisk} /> : "—") : null} label={t.avgRisk} lock={lockTo} />
          <Stat value={paid ? yrs(data?.summary?.avgDuration, t.yrs) : null} label={t.avgDuration} lock={lockTo} />
        </div>

        <div className={`mt-5 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
          {limit ? (
            <LimitReached quota={limit} />
          ) : error ? (
            <p className="rounded-2xl bg-canvas p-6 text-center text-sm text-mute">{error}</p>
          ) : data && data.rows.length === 0 ? (
            <p className="rounded-2xl bg-canvas p-6 text-center text-sm text-mute">
              {t.none}
            </p>
          ) : (
            <Results data={data} paid={paid} signedIn={signedIn} />
          )}
          {!limit && <QuotaNote quota={data?.quota} />}
        </div>

        <p className="mt-5 flex gap-2 rounded-2xl bg-canvas px-4 py-3 text-xs leading-relaxed text-mute">
          <span aria-hidden>ⓘ</span>
          <span>
            {t.info}
            {data?.asOf ? ` ${t.asOf} ${data.asOf}.` : ""} {t.gross}
          </span>
        </p>
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
    <div className="mt-8">
      <div className="flex items-baseline justify-between">
        <label className="text-[15px] font-semibold">{props.label}</label>
        <span className="text-[17px] font-semibold tabular-nums">{props.display}</span>
      </div>
      <input
        type="range"
        aria-label={props.label}
        className="slider mt-4"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        style={{ ["--fill" as string]: `${fill}%` }}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <div className="mt-2 flex justify-between text-xs text-mute">
        <span>{props.minLabel}</span>
        <span>{props.maxLabel}</span>
      </div>
    </div>
  );
}

function Stat({ value, label, lock }: { value: ReactNode | null; label: string; lock?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-line/70 px-4 py-3">
      {value === null ? (
        <Link href={lock?.href ?? "/signup"} className="flex items-center gap-1.5 text-[15px] font-semibold text-accent">
          <Lock /> {lock?.label}
        </Link>
      ) : (
        <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      )}
      <div className="mt-0.5 text-xs text-mute">{label}</div>
    </div>
  );
}

function Results({ data, paid, signedIn }: { data: Response | null; paid: boolean; signedIn: boolean }) {
  const t = useFinderText();
  const rows = data?.rows ?? [];
  const locked = data?.lockedCount ?? 0;
  return (
    <div>
      {/* Desktop table */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-line text-left text-xs text-mute">
            <th className="py-2 pl-2 font-medium">#</th>
            <th className="py-2 font-medium">{t.issuer}</th>
            <th className="py-2 font-medium">{t.bond}</th>
            <th className="py-2 text-right font-medium">{t.yield}</th>
            <th className="py-2 text-right font-medium">{t.duration}</th>
            <th className="py-2 pr-2 text-right font-medium" title={t.riskNote}>{t.risk}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rank} className="border-b border-line/60 last:border-0">
              <td className="py-3 pl-2 text-mute tabular-nums">{r.rank}</td>
              <td className="py-3 font-medium">{r.issuer}</td>
              <td className="py-3">
                {paid ? (
                  <>
                    <div>{r.name}</div>
                    <div className="text-xs text-mute">{r.isin}</div>
                  </>
                ) : signedIn ? (
                  <Link href="/pricing" className="inline-flex items-center gap-1 text-xs text-accent"><Lock /> {t.isinPlus}</Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-mute"><Lock /> {t.freeAccount}</span>
                )}
              </td>
              <td className="py-3 text-right font-semibold tabular-nums">{pct(r.ytm)}</td>
              <td className="py-3 text-right tabular-nums">{signedIn ? r.duration?.toFixed(1) : <Dim />}</td>
              <td className="py-3 pr-2 text-right">{signedIn ? <RiskBadge risk={r.risk} title={t.riskNote} /> : <Dim />}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone cards */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <li key={r.rank} className="flex items-center gap-3 rounded-2xl border border-line/70 px-4 py-3">
            <span className="w-5 text-sm text-mute tabular-nums">{r.rank}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.issuer}</div>
              <div className="truncate text-xs text-mute">
                {paid
                  ? <>{r.isin} · {r.duration?.toFixed(1)} {t.yrs} · {t.risk} <RiskBadge risk={r.risk} /></>
                  : signedIn
                    ? <>{r.duration?.toFixed(1)} {t.yrs} · {t.risk} <RiskBadge risk={r.risk} /> · {t.isinPlus}</>
                    : t.detailsFree}
              </div>
            </div>
            <span className="font-semibold tabular-nums">{pct(r.ytm)}</span>
          </li>
        ))}
      </ul>

      {locked > 0 && <LockedRows count={locked} />}
      {rows.length > 0 && <WhereToTrade />}
      {signedIn && !paid && rows.length > 0 && (
        <Link
          href="/pricing"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3 text-sm transition hover:bg-line/60"
        >
          <span>{t.plusPitch}</span>
          <span className="shrink-0 font-medium text-accent">{t.seePlans}</span>
        </Link>
      )}
    </div>
  );
}

function LockedRows({ count }: { count: number }) {
  const t = useFinderText();
  return (
    <div className="relative mt-2">
      <div aria-hidden className="select-none space-y-2 blur-[6px]">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-line/70 px-4 py-3">
            <span className="h-3 w-4 rounded bg-line" />
            <span className="h-3 flex-1 rounded bg-line" />
            <span className="h-3 w-12 rounded bg-line" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-[17px] font-semibold">{t.more(count)}</p>
        <p className="-mt-1 text-sm text-mute">{t.noCard}</p>
        <Link
          href="/signup"
          className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white shadow-sm transition hover:bg-[#0077ed]"
        >
          {t.seeAll}
        </Link>
      </div>
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

