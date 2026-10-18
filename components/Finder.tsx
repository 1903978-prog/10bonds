"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LIMITS } from "@/lib/limits";
import type { ResultsPayload } from "@/lib/tiers";

type Response = ResultsPayload & {
  source: "live" | "sample";
  asOf: string | null;
  durationBand: number;
  inputs: { duration: number; ytm: number };
};

const pct = (n: number | null | undefined, d = 2) => (n === null || n === undefined ? "—" : `${n.toFixed(d)}%`);
const yrs = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(1)} yrs`);

export default function Finder() {
  const [duration, setDuration] = useState<number>(LIMITS.duration.initial);
  const [ytm, setYtm] = useState<number>(LIMITS.ytm.initial);
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const preview = useRef<string | null>(null);

  useEffect(() => {
    preview.current = new URLSearchParams(window.location.search).get("preview");
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ duration: String(duration), ytm: String(ytm) });
        if (preview.current) qs.set("preview", preview.current);
        const res = await fetch(`/api/bonds?${qs}`, { signal: ctrl.signal });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
        setData(body);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [duration, ytm]);

  const tier = data?.tier ?? "visitor";
  const paid = tier === "plus" || tier === "premium";
  const signedIn = tier !== "visitor";
  // Visitors are asked to open a free account first; upgrade prompts come only after that.
  const lockTo = signedIn ? { href: "/pricing", label: "Plus" } : { href: "/signup", label: "Sign up" };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-6">
      {/* Inputs */}
      <section className="rounded-[28px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-8 lg:sticky lg:top-20 lg:self-start">
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight sm:text-[40px]">
          Find the best bonds for your goals
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute sm:text-base">
          Choose how long you want to invest and the yield you are after. We show the 10 bonds that match best.
        </p>

        <Slider
          label="Investment horizon"
          hint="Target duration"
          value={duration}
          display={`${duration % 1 === 0 ? duration : duration.toFixed(1)} years`}
          min={LIMITS.duration.min}
          max={LIMITS.duration.max}
          step={LIMITS.duration.step}
          minLabel="1 year"
          maxLabel="15 years"
          onChange={setDuration}
        />
        <Slider
          label="Target annual yield"
          hint="Yield to maturity"
          value={ytm}
          display={`${ytm.toFixed(1)}%`}
          min={LIMITS.ytm.min}
          max={LIMITS.ytm.max}
          step={LIMITS.ytm.step}
          minLabel="1.0%"
          maxLabel="12.0%"
          onChange={setYtm}
        />

        <p className="mt-8 text-xs leading-relaxed text-mute">
          Bonds are ranked by how close their yield is to your target, with a small preference for stronger credit ratings.
        </p>
      </section>

      {/* Results */}
      <section className="rounded-[28px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
        {data?.source === "sample" && (
          <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Sample data. These bonds and yields are made up and are shown only to preview the design.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={data ? String(Math.min(10, data.rows.length + data.lockedCount)) : "—"} label="bonds found" />
          <Stat value={paid ? pct(data?.summary?.avgYtm) : null} label="average yield" lock={lockTo} />
          <Stat value={paid ? data?.summary?.avgRating ?? "—" : null} label="average rating" lock={lockTo} />
          <Stat value={paid ? yrs(data?.summary?.avgDuration) : null} label="average duration" lock={lockTo} />
        </div>

        <div className={`mt-5 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
          {error ? (
            <p className="rounded-2xl bg-canvas p-6 text-center text-sm text-mute">{error}</p>
          ) : data && data.rows.length === 0 ? (
            <p className="rounded-2xl bg-canvas p-6 text-center text-sm text-mute">
              No bonds match this horizon. Try a different duration.
            </p>
          ) : (
            <Results data={data} paid={paid} signedIn={signedIn} />
          )}
        </div>

        <p className="mt-5 flex gap-2 rounded-2xl bg-canvas px-4 py-3 text-xs leading-relaxed text-mute">
          <span aria-hidden>ⓘ</span>
          <span>
            Results are for information only and are not investment advice.
            {data?.asOf ? ` Yields as of ${data.asOf}.` : ""} Yields are gross and indicative.
          </span>
        </p>
      </section>
    </div>
  );
}

function Slider(props: {
  label: string;
  hint: string;
  value: number;
  display: string;
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

function Stat({ value, label, lock }: { value: string | null; label: string; lock?: { href: string; label: string } }) {
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
  const rows = data?.rows ?? [];
  const locked = data?.lockedCount ?? 0;
  return (
    <div>
      {/* Desktop table */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-line text-left text-xs text-mute">
            <th className="py-2 pl-2 font-medium">#</th>
            <th className="py-2 font-medium">Issuer</th>
            <th className="py-2 font-medium">Bond</th>
            <th className="py-2 text-right font-medium">Yield</th>
            <th className="py-2 text-right font-medium">Duration</th>
            <th className="py-2 pr-2 text-right font-medium">Rating</th>
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
                  <Link href="/pricing" className="inline-flex items-center gap-1 text-xs text-accent"><Lock /> ISIN with Plus</Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-mute"><Lock /> Free account</span>
                )}
              </td>
              <td className="py-3 text-right font-semibold tabular-nums">{pct(r.ytm)}</td>
              <td className="py-3 text-right tabular-nums">{signedIn ? r.duration?.toFixed(1) : <Dim />}</td>
              <td className="py-3 pr-2 text-right">{signedIn ? <RatingPill rating={r.rating ?? null} /> : <Dim />}</td>
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
                  ? `${r.isin} · ${r.duration?.toFixed(1)} yrs · ${r.rating ?? "NR"}`
                  : signedIn
                    ? `${r.duration?.toFixed(1)} yrs · ${r.rating ?? "NR"} · ISIN with Plus`
                    : "Details with a free account"}
              </div>
            </div>
            <span className="font-semibold tabular-nums">{pct(r.ytm)}</span>
          </li>
        ))}
      </ul>

      {locked > 0 && <LockedRows count={locked} />}
      {signedIn && !paid && rows.length > 0 && (
        <Link
          href="/pricing"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3 text-sm transition hover:bg-line/60"
        >
          <span>Get the ISIN codes, coupons, maturities and shortlist averages with Plus.</span>
          <span className="shrink-0 font-medium text-accent">See plans</span>
        </Link>
      )}
    </div>
  );
}

function LockedRows({ count }: { count: number }) {
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
        <p className="text-[17px] font-semibold">{count} more bonds match your goals</p>
        <p className="-mt-1 text-sm text-mute">Free, no card needed.</p>
        <Link
          href="/signup"
          className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white shadow-sm transition hover:bg-[#0077ed]"
        >
          See all 10 with a free account
        </Link>
      </div>
    </div>
  );
}

function RatingPill({ rating }: { rating: string | null }) {
  return (
    <span className="inline-block min-w-[44px] rounded-full bg-canvas px-2.5 py-1 text-center text-xs font-semibold">
      {rating ?? "NR"}
    </span>
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

