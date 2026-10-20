"use client";

import { useState } from "react";
import Link from "next/link";
import { BAND_RISKS, RISK_BANDS } from "@/lib/riskPremium/bands";

// Admin only (yellow, like everything only the admin sees): move the required extra yield over the Bund per risk
// score and watch the top 10 change. Only the admin's own list changes; "Save as draft" stores the curve as a new
// draft version, which goes live only when activated in Admin -> Risk Premium Model.

export type TunerState = { on: boolean; shifts: number[] };
export const TUNER_OFF: TunerState = { on: false, shifts: BAND_RISKS.map(() => 0) };
const STEP = 5;

export default function AdminTuner({ state, onChange, engine }: {
  state: TunerState;
  onChange: (s: TunerState) => void;
  engine?: { method: string; version: string | null; preview?: boolean; premiums?: Record<string, number> };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const premiums = engine?.preview ? engine.premiums : undefined;
  const set = (i: number, d: number) => onChange({ ...state, shifts: state.shifts.map((x, j) => (j === i ? x + d : x)) });

  async function save() {
    if (!premiums) return;
    const version = window.prompt("Version number for the new draft (e.g. 1.1):");
    if (!version) return;
    const justification = window.prompt("Why this curve? (saved in the audit trail)");
    if (!justification) return;
    const r = await fetch("/api/admin/risk-premium", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "draft", version, premiums, justification }) });
    const b = await r.json().catch(() => ({}));
    setMsg(r.ok ? `Draft v${version} saved.` : [b.error, ...(b.problems ?? [])].filter(Boolean).join(" · ") || "Could not save.");
  }

  const status = !state.on ? "Off: you see what users see."
    : !engine?.preview ? "Loading…"
    : engine.method === "risk-adjusted" ? `Risk-adjusted list, curve v${engine.version} moved as below (only you see this).`
    : "No bond passes at this horizon: the curve covers 4–6 year maturities. Showing the current list.";

  return (
    <div className="mt-2 rounded-2xl bg-yellow-100 px-3 py-2 text-[12px] text-ink ring-1 ring-yellow-300" data-testid="admin-tuner">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={state.on} onChange={(e) => onChange({ ...state, on: e.target.checked })} />
          Admin: risk premium tuning
        </label>
        <Link href="/admin/risk-premium" className="text-[11px] underline">Model</Link>
      </div>
      <p className="mt-0.5 truncate text-[11px] leading-tight text-ink/70" title={status}>{status}</p>
      <div className={`mt-1 grid grid-cols-7 gap-1 text-center tabular-nums ${state.on ? "" : "pointer-events-none opacity-40"}`}>
        {BAND_RISKS.map((risk, i) => (
          <div key={risk} className="rounded-lg bg-white/70 py-1" title={`Risk ${risk}: ${RISK_BANDS[risk].join(", ")}`}>
            <div className="text-[10px] text-ink/60">R{risk}</div>
            <div className="font-medium" title={`${state.shifts[i] > 0 ? "+" : ""}${state.shifts[i]} bp vs curve`}>{premiums ? premiums[RISK_BANDS[risk][0]] : "–"}</div>
            <div className="mt-0.5 flex justify-center gap-0.5">
              <button aria-label={`Lower risk ${risk}`} className="h-5 w-5 rounded bg-yellow-200 leading-none hover:bg-yellow-300" onClick={() => set(i, -STEP)}>−</button>
              <button aria-label={`Raise risk ${risk}`} className="h-5 w-5 rounded bg-yellow-200 leading-none hover:bg-yellow-300" onClick={() => set(i, STEP)}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-2 whitespace-nowrap">
        <button className="rounded-full bg-yellow-200 px-3 py-1 font-medium hover:bg-yellow-300 disabled:opacity-40" disabled={!state.on} onClick={() => onChange({ ...state, shifts: BAND_RISKS.map(() => 0) })}>Reset</button>
        <button className="rounded-full bg-yellow-400 px-3 py-1 font-medium hover:bg-yellow-500 disabled:opacity-40" disabled={!state.on || !premiums} onClick={save}>Save as draft</button>
        <span className="truncate text-[11px] text-ink/70" title="bp over the Bund, first notch of each risk score">{msg ?? "bp over Bund"}</span>
      </div>
    </div>
  );
}
