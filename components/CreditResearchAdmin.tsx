"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

type Meth = { engine: string; engineVersion: string; methodologyVersion: string; skillHash: string; skillSource: string; pcSkill: string; lastVerified: string; calculationConsistency: string; evidenceGate: string; needsRecalculation: number; cases: { name: string; pass: boolean }[] };
type Ov = {
  methodology?: Meth; paused: boolean; avgMs: number | null;
  jobs: Record<string, string>; analyses: Record<string, string>;
  workers: { worker_id: string; model: string | null; current_isin: string | null; stage: string | null; host: string | null; last_seen: string; online: boolean }[];
  references?: { isin: string; issuer: string; lei: string | null; status: string; source_label: string; data: { inputs: { parameter: string; value: string; unit: string; period: string }[]; example: { ir: { point: number; min: number; max: number }; br: { point: number; min: number; max: number }; note: string }; caveats: string[]; seniority: { value: string; basis: string } } }[];
  recent: Row[];
};

type Params = { found: number; max: number; confidence: "high" | "medium" | "low"; items: { key: string; label: string; group: string; found: boolean; source: string | null; detail: string | null; neededFor: "IR" | "BR" | "supporting" }[] };
type Facts = {
  isin: string; issuerType: string; seniority: string; guaranteed: boolean | null; conflicts: string[]; notes?: string[];
  evidence: { url: string; title: string; publisher: string; publishedAt: string | null; period: string | null; primary: boolean; verification: string; retrievedAt: string }[];
  risks: { key: string; color: string; explanation: string; evidence: string[] }[];
  figures?: { parameter: string; value: number; unit: string; quote: string; url: string; period: string | null; reportingDate: string | null }[];
  issuer?: { legalName: string | null; lei: string | null };
  bond?: { legalIssuerMatchesIsin: boolean; seniorityVerified: boolean; guaranteeStatus: string; bondType: string | null; resolutionTreatment: string | null; callable: boolean | null; embeddedRisksAssessed: boolean };
};
type Gate = { allowed?: boolean; reasons?: string[]; rangeWidth?: number | null; coverage?: { found: number; max: number }; sourceQuality?: { primary: number; reliable: number }; methodologyVersion?: string };
export type Row = { isin: string; priority: number; status: string; stage: string | null; exposure_count: number; attempts: number; last_error: string | null; updated_at: string; issuer_rating_min: string | null; issuer_rating_max: string | null; bond_rating_min: string | null; bond_rating_max: string | null; rating_verification_status: string | null; publication_status: string | null; publish_ir: boolean | null; publish_br: boolean | null; gate: { ir?: Gate; br?: Gate } | null; last_attempt: { blocked?: boolean; at?: string } | null; parameters: Params | null; scored: { steps: { label: string; delta: number }[]; missing: string[]; version: string } | null; facts?: Facts; trace?: Record<string, unknown> | null; row_version?: string | null; view: { issuer: string | null; lei: string | null; primary: number; reliable: number; sources: number; next: string | null; message: string | null } | null };

const LEGEND: [string, string][] = [
  ["ISIN / Issuer", "The bond's code and the company or country behind it. Click a row for the full calculation and the evidence."],
  ["Job", "The worker's task: Waiting = queued, Researching = the Lenovo is working on it, Finished = research done (this is NOT a publication), Failed = it will retry."],
  ["IR", "Issuer Rating, 0–100, how safe the issuer looks (higher = safer). A range; a narrow range means well-evidenced. Grey = calculated but not public."],
  ["BR", "Bond Rating, 0–100: the issuer rating adjusted for this bond's own ranking, guarantee and features. Grey = not public."],
  ["Parameters", "How many of the required inputs were verified, out of the maximum for this kind of issuer. This is a count, not a statistical confidence."],
  ["Sources", "Independent sources: primary (the issuer or an official body) / reliable overall. Pages of one site count once; the site's own data copy counts zero."],
  ["Publication", "Insufficient evidence = not enough verified facts. Review required = enough for an internal calculation but a check failed. Publishable = every automatic test passed and it is public. Human validated = a person approved it."],
  ["Last update", "When the research result last changed."],
];
const PUB_LABEL: Record<string, string> = { researching: "Researching", insufficient_evidence: "Insufficient evidence", review_required: "Review required", publishable: "Publishable", validated: "Human validated" };
const JOB_LABEL: Record<string, string> = { queued: "Waiting", processing: "Researching", done: "Finished", failed: "Failed" };

const rng = (a: string | null, b: string | null) => (a === null ? "—" : a === b ? Number(a) : `${Number(a)}–${Number(b)}`);

export default function CreditResearchAdmin() {
  const [d, setD] = useState<Ov | null>(null);
  const [msg, setMsg] = useState("");
  const [isin, setIsin] = useState("");
  const [token, setToken] = useState("");
  const [openIsin, setOpenIsin] = useState<string | null>(null);
  const load = useCallback(() => fetch("/api/admin/credit-research", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => j && setD(j)).catch(() => {}), []);
  useEffect(() => { void load(); const t = setInterval(load, 10_000); return () => clearInterval(t); }, [load]);
  const act = async (action: string, extra: object = {}) => {
    setMsg("…");
    const r = await fetch("/api/admin/credit-research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const j = await r.json().catch(() => ({}));
    if (j.token) setToken(j.token);
    setMsg(r.ok ? "Done" : j.error ?? "Failed");
    void load();
  };
  if (!d) return <p className="text-sm text-mute">Loading…</p>;
  const w = d.workers[0];
  const J = d.jobs, A = d.analyses;
  return (
    <div className="space-y-5 text-sm" data-testid="credit-research">
      <h1 className="text-xl font-semibold">Credit Research</h1>
      {d.methodology && (() => { const m = d.methodology; const bad = (x: string) => x === "FAIL" ? "text-red-700" : "text-green-700"; return (
        <section className="rounded border border-line p-2" data-testid="methodology">
          <div className="mb-1 font-medium">Rating methodology</div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
            <div>Rating engine: <b>{m.engine}</b></div><div>Engine version: {m.engineVersion}</div>
            <div>Methodology version: {m.methodologyVersion}</div><div className="break-all">Source skill hash: {m.skillHash}</div>
            <div>Skill source: {m.skillSource}</div><div>Skill file on the PC: {m.pcSkill}</div>
            <div>Last verified: {new Date(m.lastVerified).toLocaleString("en-GB", { timeZone: "Europe/Rome" })}</div>
            <div>Calculation consistency: <b className={bad(m.calculationConsistency)} data-testid="consistency">{m.calculationConsistency}</b></div>
            <div>Evidence publication gate: <b className={bad(m.evidenceGate)} data-testid="evidence-gate">{m.evidenceGate}</b></div>
            <div>Published ratings made with another method (to recalculate): {m.needsRecalculation}</div>
          </div>
        </section>); })()}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Worker", w ? (w.online ? "online" : "offline") : "never connected"],
          ["Model", w?.model || "—"],
          ["Now analysing", w?.current_isin ?? "idle"],
          ["Queue", `${J.queued} (P0 ${J.p0}, P1 ${J.p1}, P2 ${J.p2}, P3 ${J.p3})`],
          ["In progress", J.processing], ["Failed", J.failed], ["Completed today", J.done_today],
          ["Avg time per bond", d.avgMs ? `${Math.round(d.avgMs / 1000)} s` : "—"],
          ["Bonds with IR", A.with_ir], ["Bonds with BR", A.with_br], ["Validated", A.validated], ["Needs review", A.review],
        ].map(([k, v]) => <div key={String(k)} className="rounded border border-line p-2"><div className="text-[11px] text-mute">{k}</div><div className="font-medium">{String(v)}</div></div>)}
      </section>
      <section className="flex flex-wrap items-center gap-2">
        <button className="rounded border border-line px-3 py-1" onClick={() => act(d.paused ? "resume" : "pause")}>{d.paused ? "Resume worker" : "Pause worker"}</button>
        <button className="rounded border border-line px-3 py-1" onClick={() => act("retry")}>Retry failed</button>
        <input value={isin} onChange={(e) => setIsin(e.target.value.toUpperCase())} placeholder="ISIN" className="w-40 rounded border border-line px-2 py-1 font-mono" />
        <button className="rounded border border-line px-3 py-1" onClick={() => act("analyze", { isin })}>Analyse now</button>
        <span className="text-mute">{d.paused ? "Paused: the worker gets no new jobs. " : ""}{msg}</span>
      </section>
      <section className="rounded border border-line p-3">
        <div className="mb-1 font-medium">Worker access token</div>
        <p className="mb-2 text-[12px] text-mute">Shown once. Put it in the worker&apos;s WORKER_TOKEN setting. Creating a new one does not stop the old one; “Revoke all” does.</p>
        <button className="mr-2 rounded border border-line px-3 py-1" onClick={() => act("token")}>Create token</button>
        <button className="rounded border border-line px-3 py-1" onClick={() => act("revoke")}>Revoke all tokens</button>
        {token && <code className="mt-2 block break-all rounded bg-soft p-2 text-[12px]" data-testid="new-token">{token}</code>}
      </section>
      {d.references?.length ? (
        <section className="rounded border border-line p-3" data-testid="reference-cases">
          <div className="mb-1 font-medium">Reference cases (teaching examples, internal, never public)</div>
          {d.references.map((c) => (
            <details key={c.isin} className="mb-1">
              <summary className="cursor-pointer">{c.isin} · {c.issuer} · LEI {c.lei} · {c.status} · source: {c.source_label}</summary>
              <div className="mt-1 space-y-1 text-[12px]">
                <div>Seniority: {c.data.seniority.value} ({c.data.seniority.basis})</div>
                <div>Example (not from the approved formula): IR {c.data.example.ir.point} ({c.data.example.ir.min}–{c.data.example.ir.max}), BR {c.data.example.br.point} ({c.data.example.br.min}–{c.data.example.br.max}). {c.data.example.note}</div>
                <div>Inputs: {c.data.inputs.map((i) => `${i.parameter} ${i.value} ${i.unit.split(" ")[0]} (${i.period})`).join("; ")}</div>
                <ul className="list-disc pl-5 text-red-700">{c.data.caveats.map((x, k) => <li key={k}>{x}</li>)}</ul>
              </div>
            </details>
          ))}
        </section>
      ) : null}
      <section>
        <div className="mb-1 font-medium">Latest jobs</div>
        <details className="mb-2 rounded border border-line p-2" data-testid="legend">
          <summary className="cursor-pointer font-medium">What the columns mean</summary>
          <dl className="mt-1 grid gap-x-3 gap-y-1 text-[12px] sm:grid-cols-[9rem_1fr]">
            {LEGEND.map(([k, v]) => <div key={k} className="contents"><dt className="font-medium">{k}</dt><dd className="text-mute">{v}</dd></div>)}
          </dl>
        </details>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[12px]">
            <thead className="text-mute"><tr>
              <th className="py-1" title={LEGEND[0][1]}>ISIN</th><th title={LEGEND[0][1]}>Issuer</th><th title={LEGEND[1][1]}>Job</th><th title={LEGEND[2][1]}>IR</th><th title={LEGEND[3][1]}>BR</th>
              <th title={LEGEND[4][1]}>Parameters</th><th title={LEGEND[5][1]}>Sources</th><th title={LEGEND[6][1]}>Publication</th><th title={LEGEND[7][1]}>Last update</th>
            </tr></thead>
            <tbody>
              {d.recent.map((r) => {
                const p = r.parameters, open = openIsin === r.isin, v = r.view;
                const grey = (pub: boolean | null) => (pub ? "" : "text-mute");
                return (
                  <Fragment key={r.isin}>
                    <tr className="cursor-pointer border-t border-line hover:bg-soft" onClick={() => setOpenIsin(open ? null : r.isin)} data-testid="job-row">
                      <td className="py-1 font-mono">{open ? "▾" : "▸"} {r.isin}</td><td className="max-w-[12rem] truncate">{v?.issuer ?? "—"}</td>
                      <td title={r.last_error ?? undefined}>{JOB_LABEL[r.status] ?? r.status}</td>
                      <td className={grey(r.publish_ir)} title={r.publish_ir ? "Public" : "Internal only: not published"}>{rng(r.issuer_rating_min, r.issuer_rating_max)}</td>
                      <td className={grey(r.publish_br)} title={r.publish_br ? "Public" : "Internal only: not published"}>{rng(r.bond_rating_min, r.bond_rating_max)}</td>
                      <td data-testid="params-cell" title="Verified parameters out of the maximum. A count, not a statistical confidence.">{p ? `${p.found} of ${p.max}` : "—"}</td>
                      <td title="Independent primary / reliable sources">{v ? `${v.primary} / ${v.reliable}` : "—"}</td>
                      <td data-testid="pub-cell" title={LEGEND[6][1]}>{PUB_LABEL[r.publication_status ?? ""] ?? "—"}{r.publish_ir ? " · IR public" : ""}{r.publish_br ? " · BR public" : ""}</td>
                      <td>{new Date(r.updated_at).toLocaleString()}</td>
                    </tr>
                    {open && <tr className="bg-soft" data-testid="job-detail"><td colSpan={9} className="p-2"><Detail r={r} onValidate={(i) => void act("validate", { isin: i })} /></td></tr>}
                  </Fragment>
                );
              })}
              {!d.recent.length && <tr><td colSpan={9} className="py-2 text-mute">No jobs yet. They appear after the next search.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function Detail({ r, onValidate }: { r: Row; onValidate?: (isin: string) => void }) {
  const f = r.facts, p = r.parameters, v = r.view, sc = r.scored;
  const irReasons = r.gate?.ir?.reasons ?? [], brReasons = r.gate?.br?.reasons ?? [];
  const sec = "rounded border border-line p-2";
  const h = "mb-1 font-medium";
  return (
    <div className="space-y-2" data-testid="detail-panel">
      {v?.message && <p className="rounded border border-amber-400 p-2 text-amber-800" data-testid="blocked">{v.message}</p>}
      {r.last_attempt?.blocked && <p className="rounded border border-line p-2">A newer calculation was blocked by the gate; the earlier {r.rating_verification_status === "validated" ? "validated" : "published"} rating was kept.</p>}
      {!f && <p className="text-mute">No finished research for this bond yet.</p>}
      {r.trace && <Calc trace={r.trace} version={r.row_version ?? null} />}
      {onValidate && f && r.rating_verification_status !== "validated" && <button className="rounded border border-line px-3 py-1" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Mark ${r.isin} as human validated? Its IR and BR become public.`)) onValidate(r.isin); }}>Mark as human validated</button>}
      {f && (
        <div className="grid gap-2 md:grid-cols-2">
          <div className={sec}><div className={h}>1. Issuer and bond</div>
            <div>Issuer: {f.issuer?.legalName ?? "not verified"} · LEI {f.issuer?.lei ?? "—"} · type {f.issuerType}</div>
            <div>Bond {f.isin}: seniority {f.seniority}{f.bond?.seniorityVerified ? " (verified)" : " (not verified)"} · guarantee {f.bond?.guaranteeStatus ?? "unknown"} · type {f.bond?.bondType ?? "not identified"} · resolution {f.bond?.resolutionTreatment ?? "not identified"} · callable {f.bond?.callable === null || f.bond?.callable === undefined ? "not assessed" : f.bond.callable ? "yes" : "no"}</div>
          </div>
          <div className={sec}><div className={h}>10. Next parameter the worker will research</div><div>{v?.next ?? "Nothing mandatory is missing."}</div></div>
          <div className={sec}><div className={h}>2–3. Parameters {p ? `${p.found} of ${p.max}` : ""}: found or missing, and which are mandatory</div>
            <table className="w-full"><tbody>{p?.items.map((i) => <tr key={i.key} className="border-t border-line"><td className="pr-2 text-mute">{i.group}</td><td className="pr-2">{i.label}</td><td className="pr-2 text-mute">{i.neededFor === "supporting" ? "supporting" : `mandatory for ${i.neededFor}`}</td><td className={i.found ? "pr-2 text-green-700" : "pr-2 text-red-700"}>{i.found ? "found" : "missing"}{i.detail ? ` (${i.detail})` : ""}</td></tr>)}</tbody></table>
          </div>
          <div className={sec}><div className={h}>4. Evidence sources</div>
            <ul className="space-y-0.5">{f.evidence.map((e) => <li key={e.url} className="break-all">{e.primary ? "primary" : "secondary"} · {e.verification} · {e.publisher || "—"} · published {e.publishedAt ?? e.period ?? "date not recorded"} · <a className="underline" href={e.url} target="_blank" rel="noreferrer">{e.url}</a></li>)}{!f.evidence.length && <li className="text-mute">None.</li>}</ul>
          </div>
          <div className={sec}><div className={h}>5. Financial figures and reporting period</div>
            <ul className="space-y-0.5">{(f.figures ?? []).map((x) => <li key={x.parameter}>{x.parameter} = {x.value} {x.unit} · period {x.period ?? "?"} ({x.reportingDate ?? "date not recorded"}) · <span className="text-mute">“{x.quote}”</span></li>)}{!f.figures?.length && <li className="text-mute">No cited figures.</li>}</ul>
          </div>
          <div className={sec}><div className={h}>6. The six risk categories</div>
            <ul>{["news_mgmt_legal", "politics_regulation", "market_competition_tech", "rates_refinancing_liquidity", "macro_fx_energy", "health_climate_cyber"].map((k) => { const x = f.risks.find((y) => y.key === k); return <li key={k}>{k.replace(/_/g, " ")}: <b>{x?.color ?? "GREY"}</b>{x?.explanation ? ` · ${x.explanation}` : " · not assessed"}{x && x.color === "GREEN" && !x.evidence.length ? " (no evidence, counts as not assessed)" : ""}</li>; })}</ul>
          </div>
          <div className={sec}><div className={h}>7. IR calculation (factor by factor, model {sc?.version ?? "?"})</div>
            <ol className="list-decimal pl-5">{(sc?.steps ?? []).filter((x) => !/^Bond structure|^Enforceable guarantee/.test(x.label)).map((x, k) => <li key={k}>{x.label}: {x.delta}</li>)}</ol>
            <div className="mt-1 text-mute">Missing-data treatment: {sc?.missing.length ? sc.missing.join("; ") : "none"}. Unknown inputs widen the range; nothing is guessed.</div>
          </div>
          <div className={sec}><div className={h}>8. BR calculation (issuer to bond adjustments)</div>
            <ol className="list-decimal pl-5">{(sc?.steps ?? []).filter((x) => /^Bond structure|^Enforceable guarantee/.test(x.label)).map((x, k) => <li key={k}>{x.label}: {x.delta}</li>)}</ol>
            {!(sc?.steps ?? []).some((x) => /^Bond structure/.test(x.label)) && <div className="text-mute">No recorded adjustments.</div>}
          </div>
          <div className={`${sec} md:col-span-2`}><div className={h}>9. Why publication is blocked</div>
            {irReasons.length || brReasons.length ? <ul className="list-disc pl-5">{irReasons.map((x, k) => <li key={`i${k}`}>IR: {x}</li>)}{brReasons.map((x, k) => <li key={`b${k}`}>BR: {x}</li>)}</ul> : <div className="text-green-700">All automatic checks passed.</div>}
            <div className="mt-1 text-mute">Range width: IR {r.gate?.ir?.rangeWidth ?? "?"}, BR {r.gate?.br?.rangeWidth ?? "?"} (maximum 15). Gate {r.gate?.ir?.methodologyVersion ?? ""}.</div>
          </div>
        </div>
      )}
      <details className="text-mute"><summary className="cursor-pointer">Technical details</summary>
        <div>Priority P{r.priority} · stage {r.stage ?? "—"} · tries {r.attempts} · seen {r.exposure_count}× · job status {r.status} · rating status {r.rating_verification_status ?? "—"}{r.last_error ? ` · last error: ${r.last_error}` : ""}</div>
      </details>
    </div>
  );
}

/** "View IR/BR calculation": the stored trace, exactly as the engine produced it (inputs, formulas, weights, intermediate results, adjustments). */
function Calc({ trace, version }: { trace: Record<string, unknown>; version: string | null }) {
  const [show, setShow] = useState(false);
  const t = trace as { engineVersion?: string; methodologyVersion?: string; skillHash?: string; ir?: unknown; br?: unknown; unverified?: string[]; factorScores?: { key: string; weight: number; min: number; max: number; origin: string }[]; bondAdjustments?: { tier: string | null; csaRange: number[] | null; sfaPoints: number; flags: string[] }; publicationEligibility?: { allowed: boolean; reasons: string[] } };
  return (
    <div className="rounded border border-line p-2" data-testid="calc">
      <button className="rounded border border-line px-3 py-1" data-testid="view-calc" onClick={(e) => { e.stopPropagation(); setShow(!show); }}>{show ? "Hide" : "View"} IR/BR calculation</button>
      {version && t.engineVersion && version !== t.engineVersion && <span className="ml-2 text-amber-800">Stored with another version: needs recalculation.</span>}
      {show && (
        <div className="mt-2 space-y-1">
          <div>Engine {t.engineVersion} · {t.methodologyVersion} · skill hash <span className="break-all">{t.skillHash}</span></div>
          <div>IR {JSON.stringify(t.ir)} · BR {JSON.stringify(t.br)}{t.unverified?.length ? " · " + t.unverified.join(" ") : ""}</div>
          {!!t.factorScores?.length && <table className="w-full text-left"><thead><tr><th>Factor</th><th>Weight</th><th>Min</th><th>Max</th><th>Origin</th></tr></thead><tbody>{t.factorScores.map((x) => <tr key={x.key}><td>{x.key}</td><td>{(x.weight * 100).toFixed(2)}%</td><td>{x.min}</td><td>{x.max}</td><td>{x.origin}</td></tr>)}</tbody></table>}
          {t.bondAdjustments && <div>Bond: tier {t.bondAdjustments.tier ?? "—"} · capital-structure adjustment {JSON.stringify(t.bondAdjustments.csaRange)} · structural points {t.bondAdjustments.sfaPoints} {t.bondAdjustments.flags.join(", ")}</div>}
          <div>Publication: {t.publicationEligibility ? (t.publicationEligibility.allowed ? "eligible" : "blocked: " + t.publicationEligibility.reasons.join(" ")) : "—"}</div>
          <details><summary>Full stored trace (JSON)</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap text-[11px]">{JSON.stringify(trace, null, 2)}</pre></details>
        </div>
      )}
    </div>
  );
}
