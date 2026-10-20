"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CURVE_RATINGS, type CurveRating } from "@/lib/riskPremium/curve";
import { shortStatus, STATUS_LABEL, type RiskStatus } from "@/lib/riskPremium/status";
import type { CurveVersion } from "@/lib/riskPremium/versions";
import type { BracketRow, Row } from "@/lib/riskPremium/shadow";

// Admin -> Bond Engine -> Risk Premium Model. Curve versions (drafts until activated), the shadow comparison of the
// current and risk-adjusted top 10, exceptional spread reviews, sensitivity and the audit trail.
// The public ranking only changes when the mode is switched to "on" here.

type Summary = { count: number; ytm: number | null; duration: number | null; risk: number | null; surplusBp: number | null };
type Compare = { scenario: { duration: number; ytm: number; risk: number }; current: { rows: Row[]; summary: Summary }; riskAdjusted: { rows: Row[]; summary: Summary; targetReached: boolean; counts: Record<RiskStatus, number> }; overlap: number; bracket: BracketRow[] };
type Payload = {
  mode: "shadow" | "on"; versions: CurveVersion[]; active: number | null; asOf: string | null; source: string; runId: number | null;
  reviews: { isin: string; decision: string; note: string; by: string; at: string }[];
  audit: { id: number; at: string; by: string; versionId: number | null; action: string; justification: string | null }[];
  runs: { id: number; at: string; version: string | null; dataAsOf: string | null; bonds: number }[];
  bund: { years: number; ytm: number }[];
  compare: Compare; draftCompare: (Compare & { id: number; version: string }) | null;
  universe: { counts: Record<string, number>; reasons: Record<string, number>; belowHurdle: Row[]; exceptional: Row[]; eligible: number };
  sensitivity: { shift: number; scope: string; eligible: number; belowHurdle: number; exceptional: number; top: number; sameAsBase: number }[];
};

const TABS = ["Curve", "Compare", "Review", "Rejected", "Sensitivity", "History"] as const;
type Tab = (typeof TABS)[number];
const card = "rounded-[24px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)]";
const btn = "rounded-full border border-line px-3 py-1 text-xs font-medium hover:bg-canvas disabled:opacity-50";
const btnMain = "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50";
const input = "rounded-lg border border-line px-2 py-1 text-sm tabular-nums";
const bp = (x: number | null) => (x === null ? "–" : `${x > 0 ? "+" : ""}${Math.round(x)}`);

export default function RiskPremiumAdmin() {
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<Tab>("Curve");
  const [msg, setMsg] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [sc, setSc] = useState({ duration: "5", ytm: "4", risk: "7" });
  const [draftId, setDraftId] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ id: number | null; version: string; premiums: Record<string, string>; minMaturity: string; maxMaturity: string; floor: string; exceptionalBp: string } | null>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ ...sc, ...(draftId ? { draft: String(draftId) } : {}) });
    const r = await fetch(`/api/admin/risk-premium?${q}`, { cache: "no-store" });
    if (r.ok) setData(await r.json());
    else setMsg("Could not load the risk premium model. Is the accounts database connected?");
  }, [sc, draftId]);
  useEffect(() => { load(); }, [load]);

  async function post(body: Record<string, unknown>, ok: string, ask = "Justification for this change (saved in the audit trail):") {
    const justification = window.prompt(ask);
    if (!justification) return false;
    setBusy(true); setMsg(null); setProblems([]);
    const r = await fetch("/api/admin/risk-premium", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, justification }) });
    const b = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(b.error ?? "Something went wrong."); setProblems(b.problems ?? []); return false; }
    setMsg(ok);
    await load();
    return true;
  }

  if (!data) return <p className="text-mute">{msg ?? "Loading…"}</p>;
  const active = data.versions.find((v) => v.status === "active") ?? null;
  const drafts = data.versions.filter((v) => v.status === "draft");
  const startEdit = (v: CurveVersion | null, id: number | null, version: string) =>
    setEdit({ id, version, premiums: Object.fromEntries(CURVE_RATINGS.map((r) => [r, String(v?.premiums[r] ?? "")])), minMaturity: String(v?.minMaturity ?? 4), maxMaturity: String(v?.maxMaturity ?? 6), floor: v?.floor ?? "BBB-", exceptionalBp: String(v?.exceptionalBp ?? 200) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Risk Premium Model</h1>
          <p className="text-sm text-mute">
            <Link href="/admin" className="text-accent">Admin</Link> · Bond engine · Active curve {active ? `v${active.version}` : "none"} · data {data.source} as of {data.asOf?.slice(0, 10) ?? "–"} · {data.bund.length} Bunds as benchmark{data.runId ? ` · run #${data.runId} recorded` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${data.mode === "on" ? "bg-green-100 text-green-800" : "bg-amber-50 text-amber-900"}`} data-testid="risk-mode">
            {data.mode === "on" ? "Public ranking: risk-adjusted (on)" : "Public ranking: current (shadow mode)"}
          </span>
          {data.mode === "on" ? (
            <button disabled={busy} className={btn} onClick={() => post({ action: "mode", mode: "shadow" }, "Back to shadow mode: users see the current ranking.")}>Switch back to shadow</button>
          ) : (
            <button disabled={busy || !active} className={btn} onClick={() => {
              const confirm = window.prompt("This changes the ranking every user sees. Type ACTIVATE to continue.");
              if (confirm === "ACTIVATE") post({ action: "mode", mode: "on", confirm }, "Risk-adjusted ranking is now live for users.");
            }}>Turn on for users…</button>
          )}
        </div>
      </div>

      <div className="inline-flex rounded-full bg-white p-1 text-sm shadow-sm">
        {TABS.map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1 ${k === tab ? "bg-ink text-white" : "text-mute"}`}>
            {k}{k === "Review" && data.universe.exceptional.length ? ` (${data.universe.exceptional.length})` : ""}
          </button>
        ))}
      </div>

      {msg && (
        <div className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">
          {msg}
          {problems.length > 0 && <ul className="mt-1 list-disc pl-5 text-red-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}

      <div className="h-[calc(100vh-260px)] min-h-[420px] overflow-auto">
        {tab === "Curve" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className={card}>
              <h2 className="font-semibold">Minimum required spread over the Bund (bp)</h2>
              <p className="mb-2 text-xs text-mute">EUR corporate bonds, remaining maturity {active?.minMaturity ?? 4}-{active?.maxMaturity ?? 6} years, senior plain fixed-rate. Screening hurdles, not observed spreads. Floor {active?.floor ?? "BBB-"} · exceptional spread at +{active?.exceptionalBp ?? 200} bp surplus.</p>
              <table className="w-full text-xs tabular-nums">
                <thead><tr className="text-left text-mute"><th>Rating</th><th className="text-right">Active v{active?.version ?? "–"}</th><th className="text-right">Step</th>{drafts.map((d) => <th key={d.id} className="text-right">Draft v{d.version}</th>)}</tr></thead>
                <tbody>
                  {CURVE_RATINGS.map((r, i) => (
                    <tr key={r} className="border-t border-line/60">
                      <td className="py-px">{r}</td>
                      <td className="text-right">{active?.premiums[r] ?? "–"}</td>
                      <td className="text-right text-mute">{i && active ? `+${active.premiums[r] - active.premiums[CURVE_RATINGS[i - 1]]}` : "—"}</td>
                      {drafts.map((d) => <td key={d.id} className={`text-right ${active && d.premiums[r] !== active.premiums[r] ? "font-semibold text-accent" : ""}`}>{d.premiums[r]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={btn} disabled={busy} onClick={() => startEdit(active, null, nextVersion(data.versions))}>New draft from active</button>
                <button className={btn} disabled={busy} onClick={() => post({ action: "restore_defaults", version: nextVersion(data.versions) }, "Draft with the Version 1.0 defaults created.")}>Restore Version 1.0 defaults (as draft)</button>
                {active && <button className={btn} disabled={busy || data.mode === "on"} onClick={() => post({ action: "deactivate" }, "Active curve archived.")}>Deactivate active</button>}
              </div>
              {drafts.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {drafts.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-2">
                      <span>Draft v{d.version} · {d.minMaturity}-{d.maxMaturity}y · floor {d.floor} · +{d.exceptionalBp} bp</span>
                      <button className={btn} onClick={() => startEdit(d, d.id, d.version)}>Edit</button>
                      <button className={btn} onClick={() => { setDraftId(d.id); setTab("Compare"); }}>Compare</button>
                      <button className={btnMain} disabled={busy} onClick={() => post({ action: "activate", id: d.id }, `Version ${d.version} is now the active curve.`)}>Activate</button>
                      <button className={btn} disabled={busy} onClick={() => post({ action: "delete_draft", id: d.id }, "Draft deleted.")}>Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className={card}>
              {edit ? (
                <>
                  <h2 className="font-semibold">{edit.id ? `Edit draft v${edit.version}` : "New draft"}</h2>
                  <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
                    <label>Version</label><input className={input} value={edit.version} onChange={(e) => setEdit({ ...edit, version: e.target.value })} />
                    {CURVE_RATINGS.map((r: CurveRating) => (
                      <FragmentRow key={r} label={`${r} (bp)`}><input className={input} inputMode="numeric" value={edit.premiums[r]} onChange={(e) => setEdit({ ...edit, premiums: { ...edit.premiums, [r]: e.target.value } })} /></FragmentRow>
                    ))}
                    <label>Maturity from / to (y)</label>
                    <span className="flex gap-2"><input className={`${input} w-16`} value={edit.minMaturity} onChange={(e) => setEdit({ ...edit, minMaturity: e.target.value })} /><input className={`${input} w-16`} value={edit.maxMaturity} onChange={(e) => setEdit({ ...edit, maxMaturity: e.target.value })} /></span>
                    <label>Credit floor</label>
                    <select className={input} value={edit.floor} onChange={(e) => setEdit({ ...edit, floor: e.target.value })}>{CURVE_RATINGS.map((r) => <option key={r}>{r}</option>)}</select>
                    <label>Exceptional surplus (bp)</label><input className={input} value={edit.exceptionalBp} onChange={(e) => setEdit({ ...edit, exceptionalBp: e.target.value })} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className={btnMain} disabled={busy} onClick={async () => {
                      const body = { ...edit, action: edit.id ? "update_draft" : "draft", fromId: active?.id };
                      if (await post(body, "Draft saved. It changes nothing until you activate it.")) setEdit(null);
                    }}>Save draft</button>
                    <button className={btn} onClick={() => setEdit(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-semibold">How it works</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mute">
                    <li>Required extra yield between two ratings = difference of their premiums (AA- to BBB+: 95 - 50 = 45 bp). A lower-rated bond wins only when its extra yield is strictly greater.</li>
                    <li>Risk-adjusted yield = yield - required premium (a ranking score, not a yield anyone earns).</li>
                    <li>Surplus = spread over the maturity-matched Bund - required premium. The ranking uses the surplus.</li>
                    <li>Surplus at or above the exceptional threshold: the bond waits for your review.</li>
                    <li>Only EUR corporate bonds in the maturity range, at or above the floor. Governments, agencies and possible subordinated, callable or floating bonds are not evaluated.</li>
                    <li>Drafts never change results. Activating a draft archives the old version; recorded runs keep the version they used.</li>
                  </ul>
                  <p className="mt-3 text-xs text-mute">Universe (EUR): {Object.entries(data.universe.counts).map(([k, v]) => `${STATUS_LABEL[k as RiskStatus] ?? k} ${v}`).join(" · ")}</p>
                </>
              )}
            </section>
          </div>
        )}

        {tab === "Compare" && (
          <div className="space-y-3">
            <div className={`${card} flex flex-wrap items-center gap-3 text-sm`}>
              <label>Duration <input className={`${input} w-14`} value={sc.duration} onChange={(e) => setSc({ ...sc, duration: e.target.value })} /></label>
              <label>Target yield % <input className={`${input} w-16`} value={sc.ytm} onChange={(e) => setSc({ ...sc, ytm: e.target.value })} /></label>
              <label>Highest risk <input className={`${input} w-12`} value={sc.risk} onChange={(e) => setSc({ ...sc, risk: e.target.value })} /></label>
              <label>Also compare
                <select className={`${input} ml-1`} value={draftId ?? ""} onChange={(e) => setDraftId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">no draft</option>
                  {drafts.map((d) => <option key={d.id} value={d.id}>draft v{d.version}</option>)}
                </select>
              </label>
              <span className="text-mute">Same bonds in both lists: {data.compare.overlap} · pool: {Object.entries(data.compare.riskAdjusted.counts).filter(([, v]) => v).map(([k, v]) => `${STATUS_LABEL[k as RiskStatus]} ${v}`).join(", ")}</span>
            </div>
            <div className={`grid gap-3 ${data.draftCompare ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
              <RowsCard title="Current ranking (what users see)" rows={data.compare.current.rows} s={data.compare.current.summary} />
              <RowsCard title={`Risk-adjusted, v${active?.version ?? "1.0"}${data.compare.riskAdjusted.targetReached ? "" : " · target not reached"}`} rows={data.compare.riskAdjusted.rows} s={data.compare.riskAdjusted.summary} />
              {data.draftCompare && <RowsCard title={`Risk-adjusted, draft v${data.draftCompare.version}`} rows={data.draftCompare.riskAdjusted.rows} s={data.draftCompare.riskAdjusted.summary} />}
            </div>
            <BracketCard rows={data.compare.bracket} min={active?.minMaturity ?? 4} max={active?.maxMaturity ?? 6} />
          </div>
        )}

        {tab === "Review" && (
          <section className={card}>
            <h2 className="font-semibold">Exceptional spread: always left out</h2>
            <p className="mb-2 text-xs text-mute">A surplus this wide usually means a structure the rating misses, so these bonds never enter the list. Shown for information only.</p>
            <BondTable rows={data.universe.exceptional} extra={(r) => {
              const d = data.reviews.find((x) => x.isin === r.isin);
              return (
                <span className="flex items-center gap-1 whitespace-nowrap">
                  {d && <span className="text-xs text-mute">{d.decision} {d.at.slice(0, 10)}</span>}
                </span>
              );
            }} />
          </section>
        )}

        {tab === "Rejected" && (
          <section className={card}>
            <h2 className="font-semibold">Below required compensation ({data.universe.counts.below_hurdle ?? 0})</h2>
            <p className="mb-2 text-xs text-mute">Spread over the Bund does not exceed the required premium. Worst first.</p>
            <BondTable rows={data.universe.belowHurdle} />
            <h3 className="mt-4 text-sm font-semibold">Not evaluated, by reason</h3>
            <ul className="text-sm text-mute">{Object.entries(data.universe.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k}>{v} · {k}</li>)}</ul>
          </section>
        )}

        {tab === "Sensitivity" && (
          <section className={card}>
            <h2 className="font-semibold">Curve moved by ±10, ±25, ±50 bp</h2>
            <p className="mb-2 text-xs text-mute">Universe counts and the default search (5 years, 4%, risk up to 7). &quot;Same&quot; = bonds also in the unchanged list.</p>
            <table className="text-sm tabular-nums">
              <thead><tr className="text-left text-xs text-mute"><th className="pr-4">Ratings moved</th><th className="pr-4">Shift</th><th className="pr-4">Eligible</th><th className="pr-4">Below hurdle</th><th className="pr-4">Exceptional</th><th className="pr-4">In top 10</th><th>Same</th></tr></thead>
              <tbody>{data.sensitivity.map((s) => <tr key={s.scope + s.shift} className="border-t border-line/60"><td>{s.scope === "all" ? "All" : "BBB band"}</td><td>{s.shift > 0 ? "+" : ""}{s.shift}</td><td>{s.eligible}</td><td>{s.belowHurdle}</td><td>{s.exceptional}</td><td>{s.top}</td><td>{s.sameAsBase}</td></tr>)}</tbody>
            </table>
          </section>
        )}

        {tab === "History" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className={card}>
              <h2 className="font-semibold">Versions</h2>
              <ul className="mt-1 text-sm">{data.versions.map((v) => <li key={v.id} className="border-t border-line/60 py-1">v{v.version} · {v.status} · created {v.createdAt.slice(0, 16).replace("T", " ")} by {v.createdBy}{v.activatedAt ? ` · activated ${v.activatedAt.slice(0, 10)} by ${v.activatedBy}` : ""}{v.justification ? ` · “${v.justification}”` : ""}</li>)}</ul>
              <h2 className="mt-4 font-semibold">Recorded runs</h2>
              <ul className="mt-1 text-sm text-mute">{data.runs.map((r) => <li key={r.id}>#{r.id} · v{r.version} · data {r.dataAsOf?.slice(0, 10) ?? "–"} · {r.bonds} bonds · {r.at.slice(0, 16).replace("T", " ")}</li>)}</ul>
            </section>
            <section className={card}>
              <h2 className="font-semibold">Audit trail</h2>
              <ul className="mt-1 text-sm">{data.audit.map((a) => <li key={a.id} className="border-t border-line/60 py-1">{a.at.slice(0, 16).replace("T", " ")} · {a.by} · {a.action}{a.versionId ? ` (version #${a.versionId})` : ""}{a.justification ? ` · “${a.justification}”` : ""}</li>)}</ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <><label>{label}</label>{children}</>;
}

function nextVersion(vs: CurveVersion[]): string {
  const nums = vs.map((v) => v.version.split(".").map(Number)).sort((a, b) => b[0] - a[0] || (b[1] ?? 0) - (a[1] ?? 0));
  const [maj, min] = nums[0] ?? [1, 0];
  return `${maj}.${(min ?? 0) + 1}`;
}

function BracketCard({ rows, min, max }: { rows: BracketRow[]; min: number; max: number }) {
  const inTop = rows.filter((r) => r.inTop).length;
  return (
    <section className={card}>
      <h2 className="text-sm font-semibold">All EUR bonds maturing in {min}–{max} years ({rows.length}): why in or out</h2>
      <p className="mb-1 text-xs text-mute">{inTop} in the top 10, {rows.length - inTop} left out. Extra yield is over the maturity-matched AAA Bund. Unrated bonds are never shown on the site and are not listed.</p>
      <div className="max-h-[50vh] overflow-y-auto">
        <table className="w-full table-fixed text-xs tabular-nums">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-mute">
              <th className="w-6">#</th><th className="w-44">Issuer</th><th className="w-12 text-right">Yield</th><th className="w-10 text-right">Risk</th><th className="w-10 text-right">Dur.</th><th className="w-14 text-right">Over AAA</th><th className="w-10 text-right">Req.</th><th className="w-12 text-right">Surplus</th><th className="pl-3">Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.isin} className={`border-t border-line/60 ${r.inTop ? "font-medium" : "text-mute"}`}>
                <td>{r.inTop ? r.rank : "–"}</td>
                <td className="truncate" title={`${r.name} · ${r.isin}`}>{r.issuer}</td>
                <td className="text-right">{r.ytm.toFixed(2)}</td>
                <td className="text-right">{r.risk ?? "–"}</td>
                <td className="text-right">{r.duration.toFixed(1)}</td>
                <td className="text-right">{r.spreadBp === null ? "–" : Math.round(r.spreadBp)}</td>
                <td className="text-right">{r.requiredBp ?? "–"}</td>
                <td className="text-right">{bp(r.surplusBp)}</td>
                <td className="truncate pl-3" title={r.why}>{r.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RowsCard({ title, rows, s }: { title: string; rows: Row[]; s: Summary }) {
  return (
    <section className={card}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-1 text-xs text-mute">{s.count} bonds · avg yield {s.ytm?.toFixed(2) ?? "–"}% · duration {s.duration?.toFixed(1) ?? "–"} · risk {s.risk ?? "–"} · surplus {bp(s.surplusBp)} bp</p>
      <BondTable rows={rows} compact />
    </section>
  );
}

function BondTable({ rows, compact, extra }: { rows: Row[]; compact?: boolean; extra?: (r: Row) => React.ReactNode }) {
  if (!rows.length) return <p className="text-sm text-mute">No bonds.</p>;
  return (
    <table className="w-full table-fixed text-xs tabular-nums">
      <thead>
        <tr className="text-left text-mute">
          {compact && <th className="w-5">#</th>}<th>Issuer</th>{!compact && <th className="w-28">ISIN</th>}<th className="w-12 text-right">Yield</th><th className="w-14 text-right">Rating</th><th className="w-10 text-right">Req.</th><th className="w-12 text-right">Spread</th><th className="w-12 text-right">Surplus</th>{!compact && <th className="w-14 text-right">Adj. yld</th>}<th className={compact ? "w-24" : "w-48"}>{extra ? "" : "Status"}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.isin + r.rank} className="border-t border-line/60">
            {compact && <td>{r.rank}</td>}
            <td className="truncate" title={`${r.name} · ${r.isin} · duration ${r.duration.toFixed(1)}`}>{r.issuer}</td>
            {!compact && <td className="truncate">{r.isin}</td>}
            <td className="text-right">{r.ytm.toFixed(2)}</td>
            <td className="text-right" title={r.ratingSource ?? ""}>{r.rating ?? "–"}</td>
            <td className="text-right">{r.requiredBp ?? "–"}</td>
            <td className="text-right">{r.spreadBp === null ? "–" : Math.round(r.spreadBp)}</td>
            <td className={`text-right ${r.surplusBp !== null && r.surplusBp <= 0 ? "text-red-700" : ""}`}>{bp(r.surplusBp)}</td>
            {!compact && <td className="text-right">{r.riskAdjustedYtm?.toFixed(2) ?? "–"}</td>}
            <td className="truncate pl-2" title={r.reason ?? ""}>{extra ? extra(r) : shortStatus(r.status, r.reason)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
