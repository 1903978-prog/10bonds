"use client";

import { useState } from "react";
import { defaultConfig, type BandConfig } from "@/lib/riskBands";

export default function RiskBandsAdmin({ initial }: { initial: BandConfig }) {
  const [c, setC] = useState(initial);
  const [msg, setMsg] = useState("");
  const set = (i: number, k: "min" | "max", v: string) => setC({ ...c, bands: c.bands.map((b, j) => (j === i ? { ...b, [k]: v as unknown as number } : b)) });
  const save = async () => {
    setMsg("Saving…");
    const r = await fetch("/api/admin/risk-bands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setC({ bands: j.bands, perCell: j.perCell }); setMsg("Saved. Applies at the next precompute run."); } else setMsg(j.error ?? "Could not save.");
  };
  return (
    <div className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Candidates kept per cell (duration year × risk score)</span>
        <input value={String(c.perCell)} onChange={(e) => setC({ ...c, perCell: e.target.value as unknown as number })} className="mt-1 w-32 rounded-lg border border-line px-3 py-2 text-sm" data-testid="bands-per-cell" />
        <span className="block text-xs text-mute">10 to 200. Default 30 (top 10 changed the lists on live data; top 30 is near identical).</span>
      </label>
      <table className="w-full text-sm" data-testid="bands-table">
        <thead><tr className="text-left text-xs text-mute"><th className="py-1">Position</th><th>Average risk from</th><th>to</th></tr></thead>
        <tbody>
          {c.bands.map((b, i) => (
            <tr key={b.k} className="border-t border-line/60">
              <td className="py-1 tabular-nums">{b.k}</td>
              <td><input value={String(b.min)} onChange={(e) => set(i, "min", e.target.value)} className="w-20 rounded border border-line px-2 py-1" data-testid={`band-min-${b.k}`} /></td>
              <td><input value={String(b.max)} onChange={(e) => set(i, "max", e.target.value)} className="w-20 rounded border border-line px-2 py-1" data-testid={`band-max-${b.k}`} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} className="rounded-full bg-ink px-5 py-2 text-sm text-white" data-testid="bands-save">Save</button>
        <button type="button" onClick={() => setC(defaultConfig())} className="rounded-full border border-line px-4 py-2 text-sm" data-testid="bands-reset">Back to the specified bands</button>
        <span className="text-sm text-mute">{msg}</span>
      </div>
    </div>
  );
}
