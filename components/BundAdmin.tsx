"use client";

import { useCallback, useEffect, useState } from "react";

type Pt = { years: number; yield: number; changeBp: number | null };
type Curve = { asOf: string; previousAsOf: string | null; fetchedAt: string; points: Pt[]; seriesIds: string[] } | null;
type Dash = { zar: Curve; zst: Curve; status: "current" | "stale" | "incomplete" | "failed"; lastSuccess: string | null; nextRefresh: string; imports: { id: number; started_at: string; trigger: string; ok: boolean; message: string }[]; history: { curve_type: string; n: number; first: string; last: string }[] };
const when = (x: string | null) => (x ? new Date(x).toLocaleString("en-GB", { timeZone: "Europe/Berlin" }) + " (Berlin)" : "–");
const bp = (v: number | null) => (v === null ? "–" : `${v > 0 ? "+" : ""}${v} bp`);
const COLOR = { current: "text-green-700", stale: "text-amber-700", incomplete: "text-amber-700", failed: "text-red-700" } as const;

function Chart({ zar, zst }: { zar: Pt[]; zst: Pt[] | null }) {
  const all = [...zar, ...(zst ?? [])].map((p) => p.yield), lo = Math.floor(Math.min(...all) * 4) / 4, hi = Math.ceil(Math.max(...all) * 4) / 4;
  const X = (y: number) => 40 + ((y - 1) / 29) * 540, Y = (v: number) => 10 + (1 - (v - lo) / (hi - lo || 1)) * 170;
  const path = (p: Pt[]) => p.map((q, i) => `${i ? "L" : "M"}${X(q.years).toFixed(1)},${Y(q.yield).toFixed(1)}`).join("");
  return (
    <svg viewBox="0 0 600 210" className="mt-3 w-full max-w-2xl" role="img" aria-label="Bund yield curve 1 to 30 years">
      {[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line x1="40" x2="580" y1={Y(v)} y2={Y(v)} stroke="currentColor" opacity=".12" /><text x="34" y={Y(v) + 4} fontSize="10" textAnchor="end" fill="currentColor">{v.toFixed(2)}%</text></g>)}
      {[1, 5, 10, 15, 20, 25, 30].map((y) => <text key={y} x={X(y)} y="200" fontSize="10" textAnchor="middle" fill="currentColor">{y}y</text>)}
      {zst && <path d={path(zst)} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" />}
      <path d={path(zar)} fill="none" stroke="#0a66c2" strokeWidth="2.5" />
    </svg>
  );
}

export default function BundAdmin() {
  const [d, setD] = useState<Dash | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await fetch("/api/admin/bund-benchmark", { cache: "no-store" }); if (r.ok) setD(await r.json()); else setMsg("Could not load."); }, []);
  useEffect(() => { load(); }, [load]);
  const post = async (body: object) => { setBusy(true); setMsg("Working…"); try { const r = await fetch("/api/admin/bund-benchmark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); setMsg((await r.json().catch(() => ({}))).message ?? "Done."); } finally { setBusy(false); load(); } };
  const upload = async (f: File | undefined) => { if (f) await post({ action: "csv", text: await f.text() }); };
  if (!d) return <p className="mt-6 text-sm text-mute">{msg || "Loading…"}</p>;
  const z = d.zar, zst = d.zst, byY = new Map((zst?.points ?? []).map((p) => [p.years, p]));
  const stat = (k: string, v: string, c = "") => <div className="rounded-lg border border-line px-3 py-2"><div className="text-[11px] uppercase tracking-wide text-mute">{k}</div><div className={`text-sm font-medium tabular-nums ${c}`}>{v}</div></div>;
  return (
    <div className="mt-4 space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat("Latest observation", z?.asOf ?? "–")}
        {stat("Last successful refresh", when(d.lastSuccess))}
        {stat("Next scheduled refresh", when(d.nextRefresh))}
        {stat("Maturities", `${z?.points.length ?? 0}/30`)}
        {stat("Status", d.status, COLOR[d.status])}
        {stat("Zero-coupon curve", zst?.asOf ?? "none")}
        {stat("Previous week used", z?.previousAsOf ?? "none saved yet")}
        {stat("Saved days", d.history.map((h) => `${h.curve_type} ${h.n}`).join(" · ") || "0")}
      </div>
      <p className="text-sm text-mute">Source: Deutsche Bundesbank, dataset BBSIS (daily term structure on listed federal securities). “Annual coupon” yields are derived from the fitted term structure for Bunds with annual coupons; they are not the observed yield of one Bund. “Zero coupon” are Svensson-model spot rates, kept separately for discounting. Maturity matching only, duration is not matched. Beyond 30 years: N/A, outside official curve coverage. Display rule: “Source: Deutsche Bundesbank”.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={() => post({ action: "refresh" })} className="rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-50">Refresh now</button>
        <label className="text-sm text-mute">Import an official CSV: <input type="file" accept=".csv,text/csv,text/plain" disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} className="ml-1 text-sm" /></label>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
      {z ? (
        <>
          <Chart zar={z.points} zst={zst?.points ?? null} />
          <p className="text-xs text-mute"><span className="text-[#0a66c2]">━</span> Annual-coupon yield · <span>╌</span> Zero-coupon rate</p>
          <table className="w-full max-w-2xl text-sm tabular-nums">
            <thead><tr className="text-left text-xs text-mute"><th className="py-1">Maturity</th><th>Bund benchmark yield (annual coupon)</th><th>Change vs previous week</th><th>Zero-coupon rate</th></tr></thead>
            <tbody>
              {z.points.map((p) => <tr key={p.years} className="border-t border-line"><td className="py-1">{p.years} {p.years === 1 ? "year" : "years"}</td><td>{p.yield.toFixed(2)}%</td><td>{bp(p.changeBp)}</td><td>{byY.get(p.years) ? `${byY.get(p.years)!.yield.toFixed(2)}%` : "–"}</td></tr>)}
              <tr className="border-t border-line text-mute"><td className="py-1">Over 30 years</td><td colSpan={3}>N/A — outside official curve coverage</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-mute">Series: {z.seriesIds[0]?.replace("R01XX", "R<nn>XX")} (nn = 01…30), observation date {z.asOf}, fetched {when(z.fetchedAt)}.</p>
        </>
      ) : <p className="text-sm">No official curve saved yet. Press “Refresh now”.</p>}
      <div>
        <h2 className="text-sm font-semibold">Recent imports</h2>
        <ul className="mt-1 space-y-1 text-xs text-mute">{d.imports.map((i) => <li key={i.id}>{when(i.started_at)} · {i.trigger} · <span className={i.ok ? "text-green-700" : "text-red-700"}>{i.ok ? "ok" : "failed"}</span> · {i.message}</li>)}</ul>
      </div>
    </div>
  );
}
