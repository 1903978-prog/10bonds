"use client";

import { useCallback, useEffect, useState } from "react";

type Pt = { years: number; yield: number; previous: number | null; changeBp: number | null };
type Curve = { asOf: string; previousAsOf: string | null; fetchedAt: string; points: Pt[]; seriesIds: string[] } | null;
type Sel = { asOf: string; previousAsOf: string | null; points: Pt[] } | null;
type Dash = {
  par: Curve; zero: Curve; treasury: Sel; bund: Curve; status: "current" | "stale" | "incomplete" | "failed"; treasuryFresh: boolean; treasuryLastFailed: boolean;
  lastSuccess: string | null; nextRefresh: string; history: { curve_type: string; n: number }[];
  imports: { id: number; started_at: string; trigger: string; ok: boolean; message: string }[]; treasuryImports: { id: number; started_at: string; trigger: string; ok: boolean; message: string }[];
  comparison: { date: string; rows: { years: number; fed: number; treasury: number; diffBp: number }[] } | null;
};
const when = (x: string | null) => (x ? new Date(x).toLocaleString("en-GB", { timeZone: "Europe/Berlin" }) + " (Berlin)" : "–");
const bp = (v: number | null) => (v === null ? "–" : `${v > 0 ? "+" : ""}${v}`);
const pct = (v: number | null | undefined, d = 3) => (v === null || v === undefined ? "–" : `${v.toFixed(d)}%`);
const COLOR = { current: "text-green-700", stale: "text-amber-700", incomplete: "text-amber-700", failed: "text-red-700" } as const;
type Series = { pts: { years: number; yield: number }[]; color: string; dash?: string; dots?: boolean };

function Chart({ series, label }: { series: Series[]; label: string }) {
  const all = series.flatMap((s) => s.pts.map((p) => p.yield)), lo = Math.floor(Math.min(...all) * 4) / 4, hi = Math.ceil(Math.max(...all) * 4) / 4;
  const X = (y: number) => 40 + ((y - 1) / 29) * 540, Y = (v: number) => 10 + (1 - (v - lo) / (hi - lo || 1)) * 170;
  const path = (p: { years: number; yield: number }[]) => p.map((q, i) => `${i ? "L" : "M"}${X(q.years).toFixed(1)},${Y(q.yield).toFixed(1)}`).join("");
  return (
    <svg viewBox="0 0 600 210" className="mt-3 w-full max-w-2xl" role="img" aria-label={label}>
      {[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line x1="40" x2="580" y1={Y(v)} y2={Y(v)} stroke="currentColor" opacity=".12" /><text x="34" y={Y(v) + 4} fontSize="10" textAnchor="end" fill="currentColor">{v.toFixed(2)}%</text></g>)}
      {[1, 5, 10, 15, 20, 25, 30].map((y) => <text key={y} x={X(y)} y="200" fontSize="10" textAnchor="middle" fill="currentColor">{y}y</text>)}
      {series.map((s, i) => s.dots
        ? <g key={i}>{s.pts.map((p) => <circle key={p.years} cx={X(p.years)} cy={Y(p.yield)} r="3.5" fill={s.color} />)}</g>
        : <path key={i} d={path(s.pts)} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash} />)}
    </svg>
  );
}

export default function UsTreasuryAdmin() {
  const [d, setD] = useState<Dash | null>(null);
  const [view, setView] = useState<"PAR" | "ZERO">("PAR");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await fetch("/api/admin/us-treasury-benchmark", { cache: "no-store" }); if (r.ok) setD(await r.json()); else setMsg("Could not load."); }, []);
  useEffect(() => { load(); }, [load]);
  const refresh = async () => { setBusy(true); setMsg("Working…"); try { const r = await fetch("/api/admin/us-treasury-benchmark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh" }) }); setMsg((await r.json().catch(() => ({}))).message ?? "Done."); } finally { setBusy(false); load(); } };
  if (!d) return <p className="mt-6 text-sm text-mute">{msg || "Loading…"}</p>;
  const cur = view === "PAR" ? d.par : d.zero, other = view === "PAR" ? d.zero : d.par;
  const otherBy = new Map((other?.points ?? []).map((p) => [p.years, p])), tBy = new Map((d.treasury?.points ?? []).map((p) => [p.years, p]));
  const stat = (k: string, v: string, c = "") => <div className="rounded-lg border border-line px-3 py-2"><div className="text-[11px] uppercase tracking-wide text-mute">{k}</div><div className={`text-sm font-medium tabular-nums ${c}`}>{v}</div></div>;
  const name = view === "PAR" ? "Treasury par yield" : "Treasury zero-coupon yield";
  return (
    <div className="mt-4 space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat("Latest observation (Fed)", d.par?.asOf ?? "–")}
        {stat("Last successful update", when(d.lastSuccess))}
        {stat("Next scheduled update", when(d.nextRefresh))}
        {stat("Maturities", `${d.par?.points.length ?? 0}/30`)}
        {stat("Freshness", d.status, COLOR[d.status])}
        {stat("Zero-coupon curve", d.zero?.asOf ?? "none")}
        {stat("Previous week used", d.par?.previousAsOf ?? "none saved yet")}
        {stat("Treasury published", d.treasury ? `${d.treasury.asOf}${d.treasuryFresh ? "" : " (older)"}` : "none")}
      </div>
      <p className="text-sm text-mute">Official source: Board of Governors of the Federal Reserve System, fitted nominal Treasury yield curve (FEDS 2006-28), 1 to 30 years. It is a staff research dataset, not an official statistical release, and can be delayed or revised; the Fed usually posts it once a week (Tuesday, up to the previous Friday), so on a Monday its newest day is normally about 10 days old, and “current” here means at most 12 days old. Par yields are coupon-equivalent; zero-coupon yields are continuously compounded; the two are never mixed and neither is the market yield of one Treasury. The U.S. Treasury’s own published par yields (selected tenors, daily) are kept apart as a cross-check. Beyond 30 years: N/A.{" "}
        <a className="text-accent" href="https://www.federalreserve.gov/data/nominal-yield-curve.htm" target="_blank" rel="noreferrer">Source and methodology</a></p>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={refresh} className="rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-50">Refresh now</button>
        <div className="inline-flex overflow-hidden rounded-lg border border-line text-sm">
          {(["PAR", "ZERO"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`px-3 py-2 ${view === v ? "bg-ink text-white" : ""}`}>{v === "PAR" ? "Par yield" : "Zero-coupon"}</button>)}
        </div>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
      {cur ? (
        <>
          <Chart label={`US Treasury ${view === "PAR" ? "par" : "zero-coupon"} yield curve 1 to 30 years`}
            series={[{ pts: cur.points, color: "#0a66c2" }, ...(other ? [{ pts: other.points, color: "#94a3b8", dash: "4 3" }] : []), ...(d.treasury ? [{ pts: d.treasury.points, color: "#d97706", dots: true }] : [])]} />
          <p className="text-xs text-mute"><span className="text-[#0a66c2]">━</span> {view === "PAR" ? "Par yield" : "Zero-coupon yield"} (Fed) · <span>╌</span> {view === "PAR" ? "Zero-coupon" : "Par"} (Fed) · <span className="text-[#d97706]">●</span> Treasury published par yield ({d.treasury?.asOf ?? "none"})</p>
          <table className="w-full max-w-3xl text-sm tabular-nums">
            <thead><tr className="text-left text-xs text-mute"><th className="py-1">Maturity</th><th>{name}</th><th>Previous week</th><th>Change (bp)</th><th>{view === "PAR" ? "Zero-coupon (Fed)" : "Par yield (Fed)"}</th><th>Treasury published</th></tr></thead>
            <tbody>
              {cur.points.map((p) => <tr key={p.years} className="border-t border-line"><td className="py-1">{p.years} {p.years === 1 ? "year" : "years"}</td><td>{pct(p.yield)}</td><td>{pct(p.previous)}</td><td>{bp(p.changeBp)}</td><td>{pct(otherBy.get(p.years)?.yield)}</td><td>{tBy.has(p.years) ? pct(tBy.get(p.years)!.yield, 2) : "–"}</td></tr>)}
              <tr className="border-t border-line text-mute"><td className="py-1">Over 30 years</td><td colSpan={5}>N/A — outside the verified curve</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-mute">Fed series {cur.seriesIds[0]?.slice(0, -2)}01…30, observation date {cur.asOf}, fetched {when(cur.fetchedAt)}. Treasury column: published tenors only (1, 2, 3, 5, 7, 10, 20, 30 years), different methodology, no interpolation. “–” means not published.</p>
        </>
      ) : <p className="text-sm">No official curve saved yet. Press “Refresh now”.</p>}
      {d.comparison && (
        <div>
          <h2 className="text-sm font-semibold">Fed fitted par vs Treasury published par, {d.comparison.date}</h2>
          <p className="text-xs text-mute">Two different methodologies, so small differences are expected. Fed minus Treasury, in bp.</p>
          <table className="mt-1 w-full max-w-md text-sm tabular-nums">
            <thead><tr className="text-left text-xs text-mute"><th className="py-1">Maturity</th><th>Fed</th><th>Treasury</th><th>Difference (bp)</th></tr></thead>
            <tbody>{d.comparison.rows.map((r) => <tr key={r.years} className="border-t border-line"><td className="py-1">{r.years}y</td><td>{pct(r.fed)}</td><td>{pct(r.treasury, 2)}</td><td>{bp(r.diffBp)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {d.par && d.bund && (
        <div>
          <h2 className="text-sm font-semibold">German Bund vs U.S. Treasury</h2>
          <Chart label="Bund and US Treasury curves" series={[{ pts: d.bund.points, color: "#0a66c2" }, { pts: d.par.points, color: "#b91c1c" }]} />
          <p className="text-xs text-mute"><span className="text-[#0a66c2]">━</span> German Bund, EUR, annual-coupon yield, Bundesbank ({d.bund.asOf}) · <span className="text-[#b91c1c]">━</span> U.S. Treasury, USD, coupon-equivalent par yield, Federal Reserve ({d.par.asOf}). Different currencies, compounding conventions and dates: the two levels are not equivalent investment returns, and FX and hedging costs are not included.</p>
        </div>
      )}
      <div>
        <h2 className="text-sm font-semibold">Recent imports</h2>
        <ul className="mt-1 space-y-1 text-xs text-mute">
          {d.imports.map((i) => <li key={i.id}>{when(i.started_at)} · Fed · {i.trigger} · <span className={i.ok ? "text-green-700" : "text-red-700"}>{i.ok ? "ok" : "failed"}</span> · {i.message}</li>)}
          {d.treasuryImports.map((i) => <li key={`t${i.id}`}>{when(i.started_at)} · Treasury · {i.trigger} · <span className={i.ok ? "text-green-700" : "text-red-700"}>{i.ok ? "ok" : "failed"}</span> · {i.message}</li>)}
        </ul>
      </div>
    </div>
  );
}
