"use client";

import { useCallback, useEffect, useState } from "react";

type R = Record<string, unknown>;
type Cand = { isin: string; cls: number; dur: number; ns: number; grossBp: number; lossBp: number; ytm: number; bes: number | null; sector: string };
type Prev = { source: string; reproducible: boolean; note: string | null; netSpreadBp: number | null; ytm: number | null; duration: number | null; riskMin: number | null; riskMax: number | null; added: string[]; removed: string[]; feasibleUnderSameRules: boolean | null; improvementBp: number | null; regression: boolean };
type Check = { rule: string; ok: boolean; detail: string };
type Data = { run: (R & { stats: Record<string, number | string | string[] | null> }) | null; runs: R[]; positions: R[] };
const f = (v: unknown, d = 1) => (v === null || v === undefined || v === "" ? "–" : Number.isFinite(Number(v)) ? Number(v).toFixed(d) : String(v));
const when = (x: unknown) => (x ? new Date(String(x)).toLocaleString("en-GB", { timeZone: "Europe/Rome" }) : "–");
const j = <T,>(v: unknown): T | null => (v == null ? null : typeof v === "string" ? (JSON.parse(v) as T) : (v as T));

export default function PortfolioEfficiencyAdmin() {
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [hz, setHz] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/portfolio-efficiency", { cache: "no-store" });
    if (r.ok) setD(await r.json()); else setMsg("Could not load.");
  }, []);
  useEffect(() => { load(); }, [load]);
  const recalc = async () => { setMsg("Requesting…"); const r = await fetch("/api/admin/portfolio-efficiency", { method: "POST" }); setMsg((await r.json().catch(() => ({}))).message ?? "Done."); load(); };
  if (!d) return <p className="mt-6 text-sm text-mute">{msg || "Loading…"}</p>;
  const st = d.run?.stats ?? {};
  const stat = (k: string, v: string) => <div className="rounded-lg border border-line px-3 py-2"><div className="text-[11px] uppercase tracking-wide text-mute">{k}</div><div className="text-sm font-medium tabular-nums">{v}</div></div>;
  const rows = d.positions.filter((p) => !hz || p.horizon === hz);
  const sel = open === null ? null : d.positions.find((p) => Number(p.row_no) === open) ?? null;
  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={recalc} className="rounded-lg bg-ink px-4 py-2 text-sm text-white" data-testid="pe-recalc">Recalculate all 90</button>
        <span className="text-sm text-mute">{msg}</span>
      </div>
      {!d.run ? <p className="rounded-lg border border-line p-4 text-sm">No run published yet. The “Portfolio Efficiency” job on GitHub runs nightly (06:00 Bangkok, after the Efficient Database and Bond Efficiency jobs); press the button to ask for one.</p> : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stat("Configurations", `${st.total ?? 0} / 90`)}{stat("Proven optimal", String(st.optimal ?? "–"))}{stat("Not proven (time limit)", String(st.uncertified ?? "–"))}{stat("Infeasible", String(st.infeasible ?? "–"))}
            {stat("Errors (kept stale)", String(st.errors ?? "–"))}{stat("With calibrated Portfolio BES", String(st.calibrated ?? "–"))}{stat("Without calibrated BES", String(st.withoutCalibration ?? "–"))}{stat("Mean net spread", `${f(st.meanNetBp, 0)} bp`)}
            {stat("Latest optimisation", when(d.run.finished_at))}{stat("Price batch", String(d.run.batch_id))}{stat("Reference version", String(d.run.reference_version))}{stat("Runtime / solver", `${f(Number(d.run.runtime_ms) / 1000, 0)} s / ${f(st.solverSeconds, 0)} s`)}
            {stat("Compared with previous", `${st.compared ?? 0} positions`)}{stat("Mean / median change", `${f(st.meanImprovementBp, 1)} / ${f(st.medianImprovementBp, 1)} bp`)}{stat("Largest change", `${f(st.maxImprovementBp, 1)} bp`)}{stat("Lists changed", String(st.changed ?? "–"))}
          </div>
          {Array.isArray(st.regressions) && st.regressions.length > 0 && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">Lower net spread than the previous list under the same data and rules at: {st.regressions.join(", ")}. Investigate before relying on Methodology 5.</p>}
          <section>
            <div className="flex items-center gap-3"><h2 className="font-medium">Portfolios</h2>
              <select className="rounded border border-line px-1 py-0.5 text-sm" value={hz} onChange={(e) => setHz(e.target.value)}><option value="">all horizons</option><option>SHORT</option><option>MEDIUM</option><option>LONG</option></select></div>
            <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-xs tabular-nums">
              <thead className="text-mute"><tr><th>#</th><th>Term</th><th>Pos</th><th>Classes</th><th>Risk</th><th>Return %</th><th>Dur</th><th>Gross bp</th><th>Credit loss bp</th><th>Net bp</th><th>Previous net</th><th>Change</th><th>Avg bond BES</th><th>Portfolio BES</th><th>Status</th></tr></thead>
              <tbody>{rows.map((p) => { const pv = j<Prev>(p.previous); return (
                <tr key={String(p.row_no)} className="cursor-pointer border-t border-line hover:bg-slate-50" onClick={() => setOpen(Number(p.row_no))}>
                  <td>{String(p.row_no)}</td><td>{String(p.horizon)}</td><td>{String(p.position)}{p.repeat_of ? ` = ${p.repeat_of}` : ""}</td><td>{(p.allowed as number[]).join(",")}</td><td>{f(p.risk_min, 0)}–{f(p.risk_max, 0)}</td>
                  <td>{f(p.ytm, 2)}</td><td>{f(p.duration, 2)}</td><td>{f(p.gross_spread_bp, 0)}</td><td>{f(p.credit_loss_bp, 0)}</td><td className="font-semibold">{f(p.net_spread_bp, 0)}</td>
                  <td>{pv?.reproducible ? f(pv.netSpreadBp, 0) : "n/a"}</td><td>{pv?.reproducible && pv.feasibleUnderSameRules ? `${Number(pv.improvementBp) >= 0 ? "+" : ""}${f(pv.improvementBp, 1)}` : "–"}</td>
                  <td>{f(p.avg_bond_bes)}</td><td title={String(p.portfolio_bes_reason ?? "")}>{p.portfolio_bes === null ? "n/a" : f(p.portfolio_bes)}</td>
                  <td>{String(p.status)}{p.stale ? " · STALE" : ""}{p.data_status === "limited" ? " · limited" : ""}</td>
                </tr>); })}</tbody></table></div>
            <p className="mt-2 text-xs text-mute">n/a under Portfolio BES = “Unavailable – insufficient calibration data”: it needs a frozen reference of earlier price batches (20 days, 2,000 comparable portfolios). Today’s sample is stored as history from this run on. Equal positions that share the same allowed risk classes have the same exact optimum (shown “= position”).</p>
          </section>
          {sel && <Detail p={sel} onClose={() => setOpen(null)} />}
          <section><h2 className="font-medium">Run history</h2>
            <table className="mt-2 w-full text-left text-xs"><thead className="text-mute"><tr><th>Run</th><th>Status</th><th>Trigger</th><th>Finished</th><th>Method</th><th>Matrix</th><th>Note</th></tr></thead>
              <tbody>{d.runs.map((r) => <tr key={String(r.id)} className="border-t border-line"><td>#{String(r.id)}</td><td>{String(r.status)}</td><td>{String(r.trigger)}</td><td>{when(r.finished_at)}</td><td>{String(r.method ?? "")}</td><td>{String(r.matrix_version ?? "")}</td><td>{String(r.error ?? "")}</td></tr>)}</tbody></table></section>
        </>
      )}
    </div>
  );
}

function Detail({ p, onClose }: { p: R; onClose: () => void }) {
  const bonds = j<Cand[]>(p.bonds) ?? [], checks = j<Check[]>(p.checks) ?? [], pv = j<Prev>(p.previous);
  const codes = (p.bond_codes as string[]) ?? [];
  return (
    <section className="rounded-lg border border-line p-4">
      <div className="flex items-center justify-between"><h2 className="font-medium">{String(p.horizon)} position {String(p.position)} · {String(p.status)}</h2><button onClick={onClose} className="text-sm text-accent">Close</button></div>
      {p.failure ? <p className="mt-2 text-sm text-red-700">{String(p.failure)}{p.stale ? " (last valid result kept, stale)" : ""}</p> : null}
      <p className="mt-2 text-xs text-mute">Portfolio BES: {p.portfolio_bes === null ? String(p.portfolio_bes_reason ?? "unavailable") : `${f(p.portfolio_bes)} / 100`} · within-day opportunity percentile (sample of comparable portfolios, near the top by construction, not an efficiency score): {f(p.opportunity_pct)} · candidates {String(p.candidates)} · solver {f(p.solver_seconds)} s · calculated {when(p.calculated_at)}</p>
      <table className="mt-3 w-full text-left text-xs tabular-nums"><thead className="text-mute"><tr><th>Code</th><th>ISIN</th><th>Risk</th><th>Dur</th><th>Return %</th><th>Gross bp</th><th>Credit loss bp</th><th>Net bp</th><th>BES</th><th>Sector</th></tr></thead>
        <tbody>{bonds.map((b, i) => <tr key={b.isin} className="border-t border-line"><td>{codes[i] ?? ""}</td><td>{b.isin}</td><td>{b.cls}</td><td>{f(b.dur, 2)}</td><td>{f(b.ytm, 2)}</td><td>{f(b.grossBp, 0)}</td><td>{f(b.lossBp, 1)}</td><td className="font-semibold">{f(b.ns, 0)}</td><td>{f(b.bes)}</td><td>{b.sector}</td></tr>)}</tbody></table>
      <h3 className="mt-4 text-sm font-medium">Rule checks</h3>
      <ul className="mt-1 list-disc pl-5 text-xs">{checks.map((c) => <li key={c.rule} className={c.ok ? "" : "text-red-700"}>{c.ok ? "PASS" : "FAIL"} · {c.detail}</li>)}</ul>
      {pv && <>
        <h3 className="mt-4 text-sm font-medium">Previous list ({pv.source})</h3>
        {pv.reproducible
          ? <p className="mt-1 text-xs">Net spread {f(pv.netSpreadBp, 1)} bp → {f(p.net_spread_bp, 1)} bp ({pv.improvementBp !== null && pv.improvementBp >= 0 ? "+" : ""}{f(pv.improvementBp, 1)}); return {f(pv.ytm, 2)}% → {f(p.ytm, 2)}%; duration {f(pv.duration, 2)} → {f(p.duration, 2)}; risk {pv.riskMin}–{pv.riskMax} → {String(p.risk_min)}–{String(p.risk_max)}. {pv.note ?? ""}</p>
          : <p className="mt-1 text-xs">Not comparable on one basis. {pv.note}</p>}
        <p className="mt-1 text-xs">Added: {pv.added.join(", ") || "none"} · Removed: {pv.removed.join(", ") || "none"}</p>
      </>}
    </section>
  );
}
