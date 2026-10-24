"use client";

import { useState } from "react";
import type { EtfBenchmark } from "@/lib/etfBenchmark";

export default function AdminEtf({ initial }: { initial: EtfBenchmark }) {
  const [b, setB] = useState(initial);
  const [msg, setMsg] = useState("");
  const field = (k: keyof EtfBenchmark, label: string, hint: string) => (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={String(b[k])}
        onChange={(e) => setB({ ...b, [k]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        data-testid={`etf-${k}`}
      />
      <span className="text-xs text-mute">{hint}</span>
    </label>
  );
  const save = async () => {
    setMsg("Saving…");
    const r = await fetch("/api/benchmark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setB(j); setMsg("Saved. Live within 5 minutes."); } else setMsg(j.error ?? "Could not save.");
  };
  return (
    <div className="mt-6 space-y-4">
      {field("ret", "Benchmark value: gross YTM, %", "e.g. 4.46")}
      {field("risk", "Average risk (10BONDS scale 1–10)", "BBB to BB is about 5 to 7, average about 6")}
      {field("riskRange", "Risk band shown in the tip", "e.g. 5–7")}
      {field("asOf", "Observation date (YYYY-MM-DD)", "Shown to customers")}
      {field("source", "Source (admin only)", "Provider and page; never shown to customers")}
      {field("methodology", "Methodology (admin only)", "How the figure is calculated")}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={b.verified} onChange={(e) => setB({ ...b, verified: e.target.checked })} data-testid="etf-verified" /> Verified (methodology and data-use rights confirmed)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={b.on} onChange={(e) => setB({ ...b, on: e.target.checked })} data-testid="etf-on" /> Show the box
      </label>
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} className="rounded-full bg-ink px-5 py-2 text-sm text-white" data-testid="etf-save">Save</button>
        <span className="text-sm text-mute">{msg}</span>
      </div>
    </div>
  );
}
