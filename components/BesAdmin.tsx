"use client";

import { useCallback, useEffect, useState } from "react";

type R = Record<string, string | number | null | string[]>;
type Bench = Record<string, { source: string; asOf: string | null; benchmarkNotch: number; pointsInCurve: number; shortest: number; longest: number; bondsUsing: number; grid: { years: number; yield: number | null; extended: boolean; nearbyBonds: number }[] }>;
type Dash = { run: (R & { stats: Record<string, number | null> & { benchmarks?: Bench } }) | null; runs: R[]; byRisk: R[]; byBucket: R[]; reasons: { n: string; c: number }[]; top: R[]; bottom: R[]; highYtmPoor: R[]; modYtmStrong: R[]; filters: { c: string[]; t: string[]; s: string[] }; portfolios: R[] };
type List = { rows: R[]; total: number; page: number };
const f = (v: unknown, d = 1) => (v === null || v === undefined || v === "" ? "–" : Number.isFinite(Number(v)) ? Number(v).toFixed(d) : String(v));
const pct = (v: unknown, d = 2) => (v === null || v === undefined ? "–" : `${(Number(v) * 100).toFixed(d)}%`);
const when = (x: unknown) => (x ? new Date(String(x)).toLocaleString("en-GB", { timeZone: "Europe/Rome" }) : "–");
const BUCKET = ["< 2y", "2–4y", "4–7y", "7–10y", "10–16y", "16y+"];

export default function BesAdmin() {
  const [d, setD] = useState<Dash | null>(null);
  const [msg, setMsg] = useState("");
  const [fl, setFl] = useState<Record<string, string>>({ sort: "bes", dir: "desc" });
  const [page, setPage] = useState(0);
  const [list, setList] = useState<List | null>(null);
  const [detail, setDetail] = useState<R | null>(null);
  const [ref, setRef] = useState<{ corporate: { rows: [string, number[]][]; years: number[]; source: Record<string, string> }; sovereign: { rows: [string, number[]][]; years: number[]; note: string }; interpolation: string } | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/bond-efficiency", { cache: "no-store" });
    if (r.ok) setD(await r.json()); else setMsg("Could not load.");
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const p = new URLSearchParams({ list: "1", page: String(page), ...Object.fromEntries(Object.entries(fl).filter(([, v]) => v)) });
    fetch(`/api/admin/bond-efficiency?${p}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setList);
  }, [fl, page]);
  const open = async (isin: string) => { const r = await fetch(`/api/admin/bond-efficiency?isin=${isin}`, { cache: "no-store" }); if (r.ok) setDetail((await r.json()).bond); };
  const recalc = async () => { setMsg("Requesting…"); const r = await fetch("/api/admin/bond-efficiency", { method: "POST" }); setMsg((await r.json().catch(() => ({}))).message ?? "Done."); load(); };
  const showRef = async () => { if (ref) return setRef(null); const r = await fetch("/api/admin/bond-efficiency?ref=1"); if (r.ok) setRef(await r.json()); };
  if (!d) return <p className="mt-6 text-sm text-mute">{msg || "Loading…"}</p>;
  const st = d.run?.stats ?? {};
  const stat = (k: string, v: string) => <div className="rounded-lg border border-line px-3 py-2"><div className="text-[11px] uppercase tracking-wide text-mute">{k}</div><div className="text-sm font-medium tabular-nums">{v}</div></div>;
  const sel = (k: string, label: string, opts: string[]) => (
    <label className="text-xs text-mute">{label}<select className="ml-1 rounded border border-line px-1 py-0.5 text-sm text-ink" value={fl[k] ?? ""} onChange={(e) => { setPage(0); setFl({ ...fl, [k]: e.target.value }); }}><option value="">all</option>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>
  );
  const bondRows = (rows: R[]) => (
    <table className="w-full text-left text-xs tabular-nums"><thead className="text-mute"><tr><th>Code</th><th>Risk</th><th>Equiv.</th><th>Cur</th><th>Type</th><th>Yrs</th><th>YTM</th><th>Bench.</th><th>Gross bp</th><th>PD cum.</th><th>Loss bp/y</th><th>Net bp</th><th>Peers</th><th>BES</th><th>Status</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={String(r.isin)} className="cursor-pointer border-t border-line hover:bg-slate-50" onClick={() => open(String(r.isin))}>
          <td>{r.bond_code ?? r.isin}</td><td>{r.risk_class ?? "–"}</td><td>{r.rating_equivalent ?? "–"}</td><td>{r.currency}</td><td>{r.issuer_type}</td><td>{f(r.years_left)}</td><td>{f(r.ytm, 2)}</td><td>{f(r.benchmark_yield, 2)}</td>
          <td>{f(r.gross_spread_bp, 0)}</td><td>{pct(r.cumulative_pd)}</td><td>{f(r.annual_expected_loss_bp, 1)}</td><td>{f(r.credit_adjusted_spread_bp, 0)}</td><td>{r.efficiency_peer_count ?? 0}</td><td className="font-semibold">{f(r.efficiency_score)}</td><td>{r.efficiency_status}</td>
        </tr>))}</tbody></table>
  );
  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={recalc} className="rounded-lg bg-ink px-4 py-2 text-sm text-white" data-testid="bes-recalc">Recalculate Bond Efficiency</button>
        <span className="text-sm text-mute">{msg}</span>
      </div>
      {!d.run ? <p className="rounded-lg border border-line p-4 text-sm">No run published yet. The “Bond Efficiency” job on GitHub runs nightly (06:00 Bangkok) and every 3 hours; press the button to ask for one.</p> : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stat("Total bonds", String(st.total ?? "–"))}{stat("Valid BES", String(st.valid ?? "–"))}{stat("Limited BES", String(st.limited ?? "–"))}{stat("No BES", String(st.unavailable ?? "–"))}
            {stat("Latest price date", when(d.run.price_as_of))}{stat("Last calculation", when(d.run.finished_at))}{stat("Runtime", d.run.runtime_ms ? `${(Number(d.run.runtime_ms) / 1000).toFixed(1)} s` : "–")}{stat("Method / reference data", `${d.run.method} · ${d.run.reference_version}`)}
            {stat("Mean / median net spread", `${f(st.meanNetBp, 0)} / ${f(st.medianNetBp, 0)} bp`)}{stat("Mean / median BES", `${f(st.meanBes)} / ${f(st.medianBes)}`)}{stat("Invalid or stale inputs", String(st.invalidInputs ?? "–"))}{stat("Benchmark data", "same daily copy as the bonds")}
          </div>
          <section data-testid="bes-benchmarks">
            <h2 className="font-medium">Benchmark for each maturity</h2>
            <p className="mt-1 text-xs text-mute">A bond is compared with the government bond yield of its own currency at its own remaining maturity. The curve is built from the plain fixed-rate government bonds in the same daily copy (same price date as the bonds). Between two government bonds the yield is read in a straight line. Outside the curve the nearest end yield is held flat (no slope extrapolation): up to 1 year before the shortest and 10 years beyond the longest point; such bonds are marked Limited, further out there is no score. These are yields to maturity, so the spread is an approximation, not a Z-spread. EUR uses the German Bund curve; the ECB AAA euro-area curve is not loaded (it is a spot-rate curve and would need a par-yield conversion first).</p>
            {Object.entries(d.run.stats.benchmarks ?? {}).map(([cur, b]) => (
              <div key={cur} className="mt-3 overflow-x-auto">
                <p className="text-sm"><b>{cur}</b> · {b.source} · price date {when(b.asOf)} · {b.pointsInCurve} points from {f(b.shortest)}y to {f(b.longest)}y · used by {b.bondsUsing} bonds · benchmark default risk: {b.benchmarkNotch === 0 ? "AAA" : "AA"} government</p>
                <table className="mt-1 text-xs tabular-nums"><thead className="text-mute"><tr><th className="pr-3 text-left">Maturity</th>{b.grid.map((g) => <th key={g.years} className="px-2">{g.years}y</th>)}</tr></thead>
                  <tbody>
                    <tr className="border-t border-line"><td className="pr-3">Yield %</td>{b.grid.map((g) => <td key={g.years} className="px-2">{g.yield === null ? "–" : f(g.yield, 2)}{g.extended ? "*" : ""}</td>)}</tr>
                    <tr className="border-t border-line"><td className="pr-3">Govt bonds nearby</td>{b.grid.map((g) => <td key={g.years} className="px-2">{g.nearbyBonds}</td>)}</tr>
                  </tbody></table>
                <p className="text-[11px] text-mute">* held flat from the end of the curve (assumption, Limited).</p>
              </div>))}
          </section>
          <section><h2 className="font-medium">Why bonds have no full score</h2><ul className="mt-2 list-disc pl-5 text-sm">{d.reasons.map((r) => <li key={r.n}>{r.n} — {r.c}</li>)}</ul></section>
          <section className="grid gap-6 sm:grid-cols-2">
            <div><h2 className="font-medium">By risk class</h2><table className="mt-2 w-full text-left text-xs tabular-nums"><thead className="text-mute"><tr><th>Risk</th><th>Bonds</th><th>Scored</th><th>Mean BES</th><th>Mean net bp</th></tr></thead><tbody>{d.byRisk.map((r) => <tr key={String(r.risk_class)} className="border-t border-line"><td>{r.risk_class}</td><td>{r.n}</td><td>{r.scored}</td><td>{f(r.mean_bes)}</td><td>{f(r.mean_net, 0)}</td></tr>)}</tbody></table></div>
            <div><h2 className="font-medium">By remaining maturity</h2><table className="mt-2 w-full text-left text-xs tabular-nums"><thead className="text-mute"><tr><th>Band</th><th>Bonds</th><th>Scored</th><th>Mean BES</th><th>Mean net bp</th></tr></thead><tbody>{d.byBucket.map((r) => <tr key={String(r.b)} className="border-t border-line"><td>{BUCKET[Number(r.b)]}</td><td>{r.n}</td><td>{r.scored}</td><td>{f(r.mean_bes)}</td><td>{f(r.mean_net, 0)}</td></tr>)}</tbody></table></div>
          </section>
          <section><h2 className="font-medium">Efficient Database positions (diagnostic only, not used to select)</h2>
            {d.portfolios.length === 0 ? <p className="mt-2 text-sm text-mute">No published snapshot to compare.</p> : (
              <div className="mt-2 max-h-72 overflow-auto"><table className="w-full text-left text-xs tabular-nums"><thead className="text-mute"><tr><th>Term</th><th>Pos.</th><th>Bonds</th><th>Without BES</th><th>Avg BES</th><th>Min</th><th>Max</th><th>Avg net bp</th></tr></thead><tbody>{d.portfolios.map((p) => <tr key={`${p.horizon}${p.position}`} className="border-t border-line"><td>{p.horizon}</td><td>{p.position}</td><td>{p.n}</td><td>{Number(p.n) - Number(p.scored)}</td><td>{f(p.avg_bes)}</td><td>{f(p.min_bes)}</td><td>{f(p.max_bes)}</td><td>{f(p.avg_net, 0)}</td></tr>)}</tbody></table></div>)}
          </section>
          <section><h2 className="font-medium">Top 20 by BES</h2><div className="mt-2 overflow-x-auto">{bondRows(d.top)}</div></section>
          <section><h2 className="font-medium">Bottom 20 by BES</h2><div className="mt-2 overflow-x-auto">{bondRows(d.bottom)}</div></section>
          <section><h2 className="font-medium">High yield but poor BES (BES under 25, highest YTM)</h2><div className="mt-2 overflow-x-auto">{bondRows(d.highYtmPoor)}</div></section>
          <section><h2 className="font-medium">Moderate yield but strong BES (BES 80+, lowest YTM)</h2><div className="mt-2 overflow-x-auto">{bondRows(d.modYtmStrong)}</div></section>
          <section>
            <h2 className="font-medium">All bonds</h2>
            <div className="mt-2 flex flex-wrap gap-3">
              {sel("currency", "Currency", d.filters.c ?? [])}{sel("issuerType", "Issuer type", d.filters.t ?? [])}{sel("sector", "Sector", d.filters.s ?? [])}
              {sel("risk", "Risk", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])}{sel("status", "Status", ["valid", "limited", "unavailable"])}
              <label className="text-xs text-mute">Years ≥<input className="ml-1 w-14 rounded border border-line px-1 text-sm text-ink" value={fl.minYears ?? ""} onChange={(e) => { setPage(0); setFl({ ...fl, minYears: e.target.value }); }} /></label>
              <label className="text-xs text-mute">≤<input className="ml-1 w-14 rounded border border-line px-1 text-sm text-ink" value={fl.maxYears ?? ""} onChange={(e) => { setPage(0); setFl({ ...fl, maxYears: e.target.value }); }} /></label>
              <label className="text-xs text-mute">BES ≥<input className="ml-1 w-14 rounded border border-line px-1 text-sm text-ink" value={fl.minBes ?? ""} onChange={(e) => { setPage(0); setFl({ ...fl, minBes: e.target.value }); }} /></label>
              <label className="text-xs text-mute">≤<input className="ml-1 w-14 rounded border border-line px-1 text-sm text-ink" value={fl.maxBes ?? ""} onChange={(e) => { setPage(0); setFl({ ...fl, maxBes: e.target.value }); }} /></label>
              {sel("sort", "Sort", ["bes", "net"])}{sel("dir", "Order", ["desc", "asc"])}
            </div>
            {list && <div className="mt-2 overflow-x-auto">{bondRows(list.rows)}<p className="mt-2 text-xs text-mute">{list.total} bonds · page {page + 1} <button className="ml-3 underline" disabled={page === 0} onClick={() => setPage(page - 1)}>prev</button> <button className="ml-2 underline" disabled={(page + 1) * 50 >= list.total} onClick={() => setPage(page + 1)}>next</button></p></div>}
          </section>
          {detail && (
            <section className="rounded-xl border border-line p-4" data-testid="bes-detail">
              <div className="flex justify-between"><h2 className="font-medium">{String(detail.bond_code ?? detail.isin)} — full calculation</h2><button className="text-sm underline" onClick={() => setDetail(null)}>close</button></div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                {([["ISIN", detail.isin], ["Risk class", `${detail.risk_class} (${detail.rating_equivalent}-equivalent, proprietary)`], ["Issuer type / sector / rank", `${detail.issuer_type} / ${detail.sector} / ${detail.rank}`], ["Years left", f(detail.years_left, 2)], ["YTM", `${f(detail.ytm, 2)}%`], ["Benchmark", `${f(detail.benchmark_yield, 2)}% · ${detail.benchmark_source ?? "–"}`], ["Gross spread", `${f(detail.gross_spread_bp, 0)} bp`], ["Cumulative PD (used)", pct(detail.cumulative_pd, 3)], ["Annual equivalent PD", pct(detail.annual_equivalent_pd, 4)], ["LGD", pct(detail.lgd, 0)], ["Cumulative expected loss", pct(detail.cumulative_loss, 3)], ["Annual credit loss", `${f(detail.annual_expected_loss_bp, 1)} bp`], ["Benchmark credit loss", `${f(detail.benchmark_loss_bp, 1)} bp`], ["Liquidity cost", "not estimated (no bid/ask data)"], ["Credit-adjusted net spread", `${f(detail.credit_adjusted_spread_bp, 0)} bp`], ["S&P Table 24 PD (reference)", detail.sp_cumulative_pd === null ? "n/a" : pct(detail.sp_cumulative_pd, 3)], ["Peer group", `${detail.peer_group ?? "–"} (${detail.efficiency_peer_count} bonds)`], ["BES / status", `${f(detail.efficiency_score)} · ${detail.efficiency_status}`]] as [string, unknown][]).map(([k, v]) => <div key={k}><dt className="text-[11px] uppercase tracking-wide text-mute">{k}</dt><dd>{String(v ?? "–")}</dd></div>)}
              </dl>
              {Array.isArray(detail.notes) && detail.notes.length > 0 && <ul className="mt-3 list-disc pl-5 text-xs text-mute">{detail.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
            </section>
          )}
          <section><button onClick={showRef} className="text-sm underline">{ref ? "Hide" : "Show"} reference default tables (admin only)</button>
            {ref && (
              <div className="mt-3 space-y-4 text-xs tabular-nums">
                <p>{ref.interpolation}. Corporate: {ref.corporate.source.report} ({ref.corporate.source.published}), {ref.corporate.source.table}, {ref.corporate.source.period}. Usage rights: {ref.corporate.source.usageRights}.</p>
                <div className="overflow-x-auto"><table><thead><tr><th className="pr-2 text-left">Corporate</th>{ref.corporate.years.map((y) => <th key={y} className="px-1">{y}y</th>)}</tr></thead><tbody>{ref.corporate.rows.map(([c, p]) => <tr key={c} className="border-t border-line"><td className="pr-2">{c}</td>{p.map((v, i) => <td key={i} className="px-1">{v.toFixed(2)}</td>)}</tr>)}</tbody></table></div>
                <p>Sovereign — {ref.sovereign.note}</p>
                <div className="overflow-x-auto"><table><thead><tr><th className="pr-2 text-left">Sovereign FC</th>{ref.sovereign.years.map((y) => <th key={y} className="px-1">{y}y</th>)}</tr></thead><tbody>{ref.sovereign.rows.map(([c, p]) => <tr key={c} className="border-t border-line"><td className="pr-2">{c}</td>{p.map((v, i) => <td key={i} className="px-1">{v.toFixed(2)}</td>)}</tr>)}</tbody></table></div>
              </div>)}
          </section>
          <section><h2 className="font-medium">Recent runs</h2><ul className="mt-2 text-xs">{d.runs.map((r) => <li key={String(r.id)}>#{r.id} · {r.status} · {r.trigger} · {when(r.finished_at ?? r.requested_at)}{r.error ? ` · ${r.error}` : ""}</li>)}</ul></section>
        </>
      )}
    </div>
  );
}
