"use client";

import { useEffect, useState } from "react";
import type { PromoConfig } from "@/lib/promo";

/** Promo box: on/off, percent off the first month, start and end (UTC). Saved with the button. */
export default function PromoAdmin() {
  const [c, setC] = useState<PromoConfig | null>(null);
  const [state, setState] = useState("");
  useEffect(() => {
    fetch("/api/admin/promo", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => j?.promo && setC(j.promo)).catch(() => {});
  }, []);
  if (!c) return null;
  const inp = "rounded-lg border border-line px-2 py-1 text-[12px]";
  async function save() {
    setState("saving");
    const r = await fetch("/api/admin/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ promo: c }) }).catch(() => null);
    setState(r?.ok ? "saved" : "error");
  }
  return (
    <div className="mb-3 rounded-lg border border-line bg-white p-4" data-testid="promo-admin">
      <h2 className="text-sm font-semibold">Halloween 2026 promo</h2>
      <p className="text-[11px] text-mute">Percent off the first month of Plus, Premium and Pro, shown crossed out on the Plans page and applied by Stripe. Times are UTC (5 Nov end of day in Rome = 22:59:59Z).</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
        <label className="flex items-center gap-1"><input type="checkbox" checked={c.enabled} onChange={(e) => setC({ ...c, enabled: e.target.checked })} /> On</label>
        <label className="flex items-center gap-1"><input type="number" min={1} max={99} className={`${inp} w-16`} value={c.percent} onChange={(e) => setC({ ...c, percent: Number(e.target.value) })} />% off</label>
        <label className="flex items-center gap-1">from <input className={`${inp} w-44`} value={c.startsAt} onChange={(e) => setC({ ...c, startsAt: e.target.value })} /></label>
        <label className="flex items-center gap-1">until <input className={`${inp} w-44`} value={c.endsAt} onChange={(e) => setC({ ...c, endsAt: e.target.value })} /></label>
        <button onClick={save} className="rounded-full bg-ink px-3 py-1 text-white">Save</button>
        <span className="w-12 text-mute">{state === "saved" ? "Saved" : state === "error" ? "Error" : ""}</span>
      </div>
    </div>
  );
}
