"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FEATURE_PLANS, FEATURES, type FeaturePlan, type Matrix } from "@/lib/features";

const PLAN_LABEL: Record<FeaturePlan, string> = { free: "Free", plus: "Plus", premium: "Premium", pro: "Pro" };

/** The admin's feature table: one row per feature, one tick per plan. Each click is saved at once. */
export default function FeatureAdmin() {
  const [m, setM] = useState<Matrix | null>(null);
  const [limits, setLimits] = useState<{ daily: number } | null>(null);
  const [state, setState] = useState<"" | "saving" | "saved" | "error" | "load">("");

  useEffect(() => {
    fetch("/api/admin/features", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j?.matrix ? (setM(j.matrix), setLimits(j.limits ?? null)) : setState("load")))
      .catch(() => setState("load"));
  }, []);

  async function flip(key: keyof Matrix, plan: FeaturePlan) {
    if (!m) return;
    const next = { ...m, [key]: { ...m[key], [plan]: !m[key][plan] } };
    setM(next);
    setState("saving");
    const r = await fetch("/api/admin/features", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matrix: next }) }).catch(() => null);
    setState(r?.ok ? "saved" : "error");
  }

  async function setLimit(raw: string) {
    const n = Math.round(Number(raw));
    if (!limits || !Number.isFinite(n) || n < 1 || n > 1000) return;
    const next = { ...limits, daily: n };
    setLimits(next);
    setState("saving");
    const r = await fetch("/api/admin/features", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limits: next }) }).catch(() => null);
    setState(r?.ok ? "saved" : "error");
  }

  const numbers = (
    <div className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]" data-testid="free-limits">
      <h2 className="text-sm font-semibold">Free searches per day</h2>
      <p className="text-[11px] text-mute">One counter for one-bond and portfolio searches together. Used when &ldquo;Unlimited&rdquo; is not ticked for Free. Resets at midnight, Rome time. Changes the site, counter and Plans page within a minute.</p>
      <div className="mt-2 flex gap-6 text-[12px]">
        <label className="flex items-center gap-2">
          <span>Searches per day</span>
          <input
            key={limits?.daily ?? "x"}
            type="number"
            min={1}
            max={1000}
            disabled={!limits}
            defaultValue={limits?.daily ?? ""}
            onBlur={(e) => setLimit(e.target.value)}
            aria-label="Free searches per day"
            data-testid="free-limit-daily"
            className="w-16 rounded-lg border border-line px-2 py-1 text-center tabular-nums"
          />
        </label>
      </div>
    </div>
  );

  const table = (built: boolean) => (
    <div className="rounded-[20px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <h2 className="text-sm font-semibold">{built ? "In the app now" : "Ideas, not built yet"}</h2>
      <p className="h-4 text-[11px] text-mute">{built ? "A tick changes the site within a minute." : "Ticks are saved for planning; the site does not change."}</p>
      <table className="mt-2 w-full table-fixed text-[12px]">
        <colgroup>
          <col />
          {FEATURE_PLANS.map((p) => <col key={p} className="w-[3.75rem]" />)}
        </colgroup>
        <thead>
          <tr className="border-b border-line text-left text-[11px] text-mute">
            <th className="py-1 font-medium">Feature</th>
            {FEATURE_PLANS.map((p) => <th key={p} className="py-1 text-center font-medium">{PLAN_LABEL[p]}</th>)}
          </tr>
        </thead>
        <tbody>
          {FEATURES.filter((f) => f.built === built).map((f) => (
            <tr key={f.key} className="border-b border-line/60" style={{ height: 26 }} data-testid={`feature-${f.key}`}>
              <td className={`truncate pr-2 ${built ? "" : "text-mute"}`} title={f.admin}>{f.admin}</td>
              {FEATURE_PLANS.map((p) => (
                <td key={p} className="text-center">
                  <input
                    type="checkbox"
                    aria-label={`${f.admin}: ${PLAN_LABEL[p]}`}
                    checked={!!m?.[f.key]?.[p]}
                    disabled={!m}
                    onChange={() => flip(f.key, p)}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <Link href="/admin" className="text-sm text-accent">← Admin</Link>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <h1 className="text-[26px] font-semibold tracking-tight">What each plan includes</h1>
        {/* Fixed width, so the title never moves when the status changes. */}
        <span className="w-40 text-right text-xs text-mute" data-testid="feature-state">
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : state === "error" ? <span className="text-red-700">Could not save</span> : state === "load" ? <span className="text-red-700">Could not load</span> : ""}
        </span>
      </div>
      <p className="text-sm text-mute">The Plans page lists the ticked features of each plan. Visitors without an account always see the top 3 only. Pro also needs your approval at <Link href="/admin/pro" className="text-accent">Professional access</Link>.</p>
      {numbers}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {table(true)}
        {table(false)}
      </div>
    </div>
  );
}
