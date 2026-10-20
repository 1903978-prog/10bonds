"use client";

import { useState } from "react";
import Link from "next/link";
import { BAND_RISKS, RISK_BANDS } from "@/lib/riskPremium/bands";
import { OUTLIER_SD } from "@/lib/outliers";

// Admin only (yellow, like everything only the admin sees). One slider sets how strongly the required extra yield
// over the Bund counts: 0% = today's ranking exactly, 100% = the active curve, more = stricter. Moving it changes only
// the admin's own list; "Save for all users" makes it what everyone gets. The +/- per risk score fine-tune the curve
// itself and are kept with "Save curve as draft" (activated in Admin -> Risk Premium Model).

// The second slider sets the outlier rule (lib/outliers.ts): bonds yielding more than k std dev above their cohort's
// average are left out everywhere. Same idea: it changes the admin's list at once, "Save" makes it the users' value.

export type TunerState = { weight: number | null; shifts: number[]; sd: number | null };
export const TUNER_START: TunerState = { weight: null, shifts: BAND_RISKS.map(() => 0), sd: null };
const STEP = 5;

type Engine = { method: string; version: string | null; weight: number; liveWeight: number; preview?: boolean; premiums?: Record<string, number> };

type Outliers = { sd: number; liveSd: number; count: number; liveCount: number };

export default function AdminTuner({ state, onChange, engine, outliers, onSaved }: { state: TunerState; onChange: (s: TunerState) => void; engine?: Engine; outliers?: Outliers; onSaved: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const live = engine?.liveWeight ?? 0;
  const weight = state.weight ?? live;
  const pct = Math.round(weight * 100);
  const premiums = engine?.premiums;
  const shifted = state.shifts.some((x) => x !== 0);
  const set = (i: number, d: number) => onChange({ ...state, weight, shifts: state.shifts.map((x, j) => (j === i ? x + d : x)) });
  const liveSd = outliers?.liveSd ?? OUTLIER_SD.default;
  const sd = state.sd ?? liveSd;

  async function post(body: Record<string, unknown>, ask: string, ok: string) {
    const justification = window.prompt(ask);
    if (!justification) return;
    const r = await fetch("/api/admin/risk-premium", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, justification }) });
    const b = await r.json().catch(() => ({}));
    setMsg(r.ok ? ok : [b.error, ...(b.problems ?? [])].filter(Boolean).join(" · ") || "Could not save.");
    if (r.ok) onSaved();
  }
  const saveWeight = () => post({ action: "weight", weight }, `Every user will get ${pct}%. Why? (saved in the audit trail)`, `Saved: users now get ${pct}%.`);
  const saveSd = () => post({ action: "outlier_sd", sd }, `Every user will get outliers above ${sd.toFixed(1)} std dev. Why? (saved in the audit trail)`, `Saved: outliers above ${sd.toFixed(1)} std dev.`);
  const saveDraft = () => {
    const version = window.prompt("Version number for the new draft curve (e.g. 1.1):");
    if (version) post({ action: "draft", version, premiums }, "Why this curve? (saved in the audit trail)", `Draft v${version} saved.`);
  };

  const status = !engine ? "Loading…"
    : weight === 0 ? "0%: today's ranking, no risk premium."
    : engine.method === "risk-adjusted" ? `${pct}% of curve v${engine.version}: risk-adjusted list.`
    : "No bond passes here (curve covers 4–6 year maturities): today's list.";

  return (
    <div className="mt-2 rounded-2xl bg-yellow-100 px-3 py-2 text-[12px] text-ink ring-1 ring-yellow-300" data-testid="admin-tuner">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="w-24 font-medium">Premium weight</span>
        <input
          type="range" min={0} max={300} step={5} value={pct} aria-label="Risk premium weight"
          onChange={(e) => onChange({ ...state, weight: Number(e.target.value) / 100 })}
          className="min-w-0 flex-1 accent-yellow-500"
        />
        <span className="w-10 text-right tabular-nums font-semibold">{pct}%</span>
      </div>
      <div className="flex items-center gap-2 whitespace-nowrap" title="A bond is an outlier (left out everywhere) when its yield is more than this many standard deviations above the average of similar bonds (same currency and risk score, similar duration).">
        <span className="w-24 font-medium">Outlier &gt; avg +</span>
        <input
          type="range" min={OUTLIER_SD.min} max={OUTLIER_SD.max} step={OUTLIER_SD.step} value={sd} aria-label="Outlier standard deviations"
          onChange={(e) => onChange({ ...state, sd: Number(e.target.value) })}
          className="min-w-0 flex-1 accent-yellow-500"
        />
        <span className="w-10 text-right tabular-nums font-semibold">{sd.toFixed(1)}σ</span>
        <button className="rounded-full bg-yellow-400 px-2 py-0.5 text-[11px] font-medium hover:bg-yellow-500 disabled:opacity-40" disabled={sd === liveSd} onClick={saveSd}>Save</button>
      </div>
      <p className="truncate text-[11px] leading-tight text-ink/70" title={status}>Users: {Math.round(live * 100)}%, {liveSd.toFixed(1)}σ · Outliers out: {outliers ? `${outliers.count} (users ${outliers.liveCount})` : "–"} · {status}</p>
      <div className={`mt-1 grid grid-cols-7 gap-1 text-center tabular-nums ${weight > 0 ? "" : "pointer-events-none opacity-40"}`}>
        {BAND_RISKS.map((risk, i) => (
          <div key={risk} className="rounded-lg bg-white/70 py-1" title={`Risk ${risk}: ${RISK_BANDS[risk].join(", ")} · ${state.shifts[i] > 0 ? "+" : ""}${state.shifts[i]} bp`}>
            <div className="text-[10px] text-ink/60">R{risk}</div>
            <div className="font-medium">{premiums && weight > 0 ? premiums[RISK_BANDS[risk][0]] : "–"}</div>
            <div className="mt-0.5 flex justify-center gap-0.5">
              <button aria-label={`Lower risk ${risk}`} className="h-5 w-5 rounded bg-yellow-200 leading-none hover:bg-yellow-300" onClick={() => set(i, -STEP)}>−</button>
              <button aria-label={`Raise risk ${risk}`} className="h-5 w-5 rounded bg-yellow-200 leading-none hover:bg-yellow-300" onClick={() => set(i, STEP)}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap">
        <button className="rounded-full bg-yellow-400 px-3 py-1 font-medium hover:bg-yellow-500 disabled:opacity-40" disabled={weight === live} onClick={saveWeight}>Save weight for all</button>
        <button className="rounded-full bg-yellow-200 px-2.5 py-1 font-medium hover:bg-yellow-300 disabled:opacity-40" disabled={!shifted || !premiums || weight === 0} onClick={saveDraft} title="Saves the curve with your +/- changes (and this weight) as a draft version">Draft</button>
        <button className="rounded-full bg-yellow-200 px-2.5 py-1 font-medium hover:bg-yellow-300" onClick={() => onChange(TUNER_START)}>Reset</button>
        <Link href="/admin/risk-premium" className="ml-auto text-[11px] underline">Model</Link>
      </div>
      {msg && <p className="truncate text-[11px] text-ink/70" title={msg}>{msg}</p>}
    </div>
  );
}
