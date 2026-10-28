"use client";

import { useCallback, useEffect, useState } from "react";

type Row = { [bond: `bond_${number}`]: string | null; row_no: number; horizon: string; position: number; avg_ytm: string | null; avg_duration: string | null; avg_risk: string | null; filled: boolean; status: string | null; error: string | null; shared_with: number | null; mapped_from: number | null; band_min?: string | null; band_max?: string | null; class_lo?: number | null; class_hi?: number | null; ladder_step?: number | null };
type Snap = { id: number; batch_id: string; status: string; data_as_of: string | null; calculated_at: string; published_at: string | null; runtime_ms: number | null; filled_count: number; distinct_portfolios: number; error: string | null; methodology: string; empty_policy: string };
type Job = { id: number; trigger: string; status: string; attempt: number; started_at: string; finished_at: string | null; message: string | null };
type Data = { id: number | null; snapshots: Snap[]; rows: Row[]; report: { problems?: string[]; blockers?: string[] } | null; jobs: Job[] };
type Detail = { row: Row; bonds: { ord: number; isin: string; issuer: string | null; name: string; coupon: string | null; maturity: string | null; rating: string | null; ytm: string; duration: string; risk: string; clean_price: string | null }[]; snapshot: { batch_id: string; methodology: string; calculated_at: string }; sharedWith: number[] };

const GROUPS = [["SHORT", "SHORT — 2 years: rows 1–30"], ["MEDIUM", "MEDIUM — 4 years: rows 31–60"], ["LONG", "LONG — 10 years: rows 61–90"]] as const;
const when = (x: string | null) => (x ? new Date(x).toLocaleString("en-GB", { timeZone: "Europe/Rome" }) : "–");

export default function SliderSnapshotAdmin() {
  const [d, setD] = useState<Data | null>(null);
  const [id, setId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(async (snap?: number | null) => {
    const r = await fetch(`/api/admin/efficient-database${snap ? `?id=${snap}` : ""}`, { cache: "no-store" });
    if (r.ok) { const j = (await r.json()) as Data; setD(j); setId(j.id); } else setMsg("Could not load.");
  }, []);
  useEffect(() => { load(); }, [load]);
  const rebuild = async () => {
    setMsg("Rebuilding…");
    const r = await fetch("/api/admin/efficient-database", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setMsg(j.message ?? "Done."); load();
  };
  const open = async (n: number) => {
    const r = await fetch(`/api/admin/efficient-database?id=${id}&row=${n}`, { cache: "no-store" });
    if (r.ok) setDetail(await r.json());
  };
  if (!d) return <p className="mt-6 text-sm text-mute">{msg || "Loading…"}</p>;
  const cur = d.snapshots.find((s) => s.id === id);
  const active = d.snapshots.find((s) => s.status === "published");
  const filled = d.rows.filter((r) => r.filled).length;
  const infeasible = d.rows.filter((r) => r.status === "INFEASIBLE").length;
  const unresolved = d.rows.filter((r) => r.status === "ERROR" || r.status === "PENDING").length;
  const ready = cur?.status === "published";
  const lastJob = d.jobs[0];
  const perH = (h: string) => `${d.rows.filter((r) => r.horizon === h && r.filled).length}/30`;
  const lastOk = d.jobs.find((j) => j.status === "done");
  const lastErr = d.jobs.find((j) => j.status === "failed");
  const stat = (k: string, v: string) => <div className="rounded-lg border border-line px-3 py-2"><div className="text-[11px] uppercase tracking-wide text-mute">{k}</div><div className="text-sm font-medium tabular-nums">{v}</div></div>;
  return (
    <div className="mt-6 space-y-6">
      <div className={`rounded-xl border px-4 py-3 ${ready ? "border-green-300 bg-green-50 text-green-900" : "border-amber-300 bg-amber-50 text-amber-900"}`} data-testid="slider-snapshot-status">
        <div className="text-lg font-semibold">{ready ? `PUBLISHED: ${filled}/90 valid, ${infeasible} infeasible` : `${filled}/90 valid, ${unresolved} unresolved: not published`}</div>
        <div className="text-sm">{ready ? `All 90 rows resolved. Valid per term: short ${perH("SHORT")}, medium ${perH("MEDIUM")}, long ${perH("LONG")}. Infeasible rows are empty on the website (no list exists under the approved rules).` : active ? `The website keeps serving the last complete snapshot (#${active.id}, data of ${when(active.data_as_of)}).` : "No complete snapshot is published yet, so the website uses the older per-term path (also instant, from stored lists)."}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stat("Active snapshot", active ? `#${active.id}` : "none")}
        {stat("Viewing", cur ? `#${cur.id} · ${cur.status}` : "–")}
        {stat("Price batch data time", when(cur?.data_as_of ?? null))}
        {stat("Last successful run", when(lastOk?.finished_at ?? null))}
        {stat("Published at", when(active?.published_at ?? null))}
        {stat("Build status", lastJob ? `${lastJob.status} (${lastJob.trigger}): ${lastJob.message ?? ""}`.slice(0, 120) : "no run yet")}
        {stat("Valid / infeasible / unresolved", `${filled} · ${infeasible} · ${unresolved}`)}
        {stat("Distinct portfolios", String(cur?.distinct_portfolios || new Set(d.rows.filter((r) => r.filled).map((r) => r.horizon + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => r[`bond_${i}`]).join(","))).size))}
        {stat("Calculation time", cur?.runtime_ms != null ? `${(cur.runtime_ms / 1000).toFixed(1)} s` : "–")}
        {stat("Last error", lastErr ? `${when(lastErr.started_at)}` : "none")}
      </div>
      {(d.report?.problems?.length || d.report?.blockers?.length) ? (
        <div className="rounded-lg border border-line p-3 text-sm" data-testid="slider-snapshot-blockers">
          <div className="font-medium">Why it is not 90/90</div>
          <ul className="mt-1 list-disc pl-5 text-mute">{[...(d.report.blockers ?? []), ...(d.report.problems ?? [])].map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => load(id)} className="rounded-lg border border-line px-3 py-1.5 text-sm">Refresh status</button>
        <button onClick={rebuild} className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" data-testid="slider-rebuild">Populate / Rebuild Efficient Database</button>
        <span className="text-sm text-mute">{msg}</span>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="slider-snapshot-table">
        <thead><tr className="text-left text-xs text-mute"><th className="py-1">Position</th><th>YTM / Duration</th><th>Band</th><th>Classes</th><th>Average risk</th><th>Step</th><th>Status</th>{Array.from({ length: 10 }, (_, i) => <th key={i}>Bond {i + 1}</th>)}</tr></thead>
        {GROUPS.map(([h, label]) => (
          <tbody key={h}>
            <tr><td colSpan={16} className="pt-4 text-xs font-semibold uppercase tracking-wide">{label}</td></tr>
            {d.rows.filter((r) => r.horizon === h).map((r) => (
              <tr key={r.row_no} onClick={() => open(r.row_no)} className="cursor-pointer border-t border-line hover:bg-black/5" title={r.error ?? ""}>
                <td className="py-1">{h} {String(r.position).padStart(2, "0")} <span className="text-mute">#{r.row_no}{r.mapped_from ? ` · shows ${r.mapped_from}` : r.shared_with ? ` · = ${r.shared_with}` : ""}</span></td>
                <td className="tabular-nums">{r.filled ? `${Number(r.avg_ytm).toFixed(2)}% / ${Number(r.avg_duration).toFixed(2)}y` : "–"}</td>
                <td className="tabular-nums">{r.band_min == null ? "–" : Number(r.band_min) === Number(r.band_max) ? Number(r.band_min).toFixed(1) : `${Number(r.band_min).toFixed(1)}–${Number(r.band_max).toFixed(1)}`}</td>
                <td className="tabular-nums">{r.class_lo == null ? "–" : `${r.class_lo}–${r.class_hi}`}</td>
                <td className="tabular-nums">{r.filled ? Number(r.avg_risk).toFixed(1) : "–"}</td>
                <td className="tabular-nums" title="0 = strict rules; 1 to 3 = ladder step (adjusted)">{!r.filled || r.ladder_step == null ? "–" : Number(r.ladder_step) > 0 ? `${r.ladder_step} · adjusted` : "0"}</td>
                <td className={r.filled ? "text-green-700" : r.status === "INFEASIBLE" ? "text-mute" : "text-red-700"}>{r.status ?? (r.filled ? "VALID" : "PENDING")}</td>
                {Array.from({ length: 10 }, (_, i) => <td key={i} className="font-mono text-[11px]">{r[`bond_${i + 1}` as `bond_${number}`] ?? "–"}</td>)}
              </tr>
            ))}
          </tbody>
        ))}
      </table></div>
      {detail && (
        <div className="rounded-xl border border-line p-4 text-sm" data-testid="slider-row-detail">
          <div className="flex items-center justify-between"><div className="font-semibold">{detail.row.horizon} {String(detail.row.position).padStart(2, "0")} (row {detail.row.row_no})</div><button onClick={() => setDetail(null)} className="text-xs underline">Close</button></div>
          <div className="mt-1 text-mute">Price batch {detail.snapshot.batch_id} · method {detail.snapshot.methodology} · calculated {when(detail.snapshot.calculated_at)}</div>
          <div className="text-mute">{detail.row.error ?? "All checks passed (10 bonds, issuer and sector caps, duration window, figures recomputed from the bond rows)."} {detail.sharedWith.length ? `Same portfolio as position(s) ${detail.sharedWith.join(", ")}.` : "Not shared with another position."}</div>
          {detail.bonds.length > 0 && (
            <table className="mt-2 w-full text-xs"><thead><tr className="text-left text-mute"><th>ISIN</th><th>Issuer</th><th>Rating</th><th>YTM</th><th>Dur.</th><th>Risk</th><th>Price</th></tr></thead>
              <tbody>{detail.bonds.map((b) => <tr key={b.isin} className="border-t border-line"><td>{b.isin}</td><td>{b.issuer ?? b.name}</td><td>{b.rating ?? "–"}</td><td>{Number(b.ytm).toFixed(2)}%</td><td>{Number(b.duration).toFixed(2)}</td><td>{b.risk}</td><td>{b.clean_price ?? "–"}</td></tr>)}</tbody></table>
          )}
        </div>
      )}
      <div>
        <div className="mb-1 text-sm font-medium">Snapshots (newest first)</div>
        <table className="w-full text-xs"><tbody>{d.snapshots.map((s) => <tr key={s.id} onClick={() => load(s.id)} className="cursor-pointer border-t border-line hover:bg-black/5"><td className="py-1">#{s.id}</td><td>{s.status}</td><td>{s.filled_count}/90</td><td>{when(s.calculated_at)}</td><td className="text-mute">{s.error ? s.error.slice(0, 90) : ""}</td></tr>)}</tbody></table>
      </div>
      <div>
        <div className="mb-1 text-sm font-medium">Job log</div>
        <table className="w-full text-xs"><tbody>{d.jobs.map((j) => <tr key={j.id} className="border-t border-line"><td className="py-1">{when(j.started_at)}</td><td>{j.trigger}</td><td>{j.status}{j.attempt > 1 ? ` (try ${j.attempt})` : ""}</td><td className="text-mute">{j.message?.slice(0, 120)}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
