"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

type Ov = {
  paused: boolean; avgMs: number | null;
  jobs: Record<string, string>; analyses: Record<string, string>;
  workers: { worker_id: string; model: string | null; current_isin: string | null; stage: string | null; host: string | null; last_seen: string; online: boolean }[];
  recent: { isin: string; priority: number; status: string; stage: string | null; exposure_count: number; attempts: number; last_error: string | null; updated_at: string; issuer_rating_min: string | null; issuer_rating_max: string | null; bond_rating_min: string | null; bond_rating_max: string | null; rating_verification_status: string | null; coverage: string | null; sources: number | null; missing: string | null; parameters: Params | null; same_as: string[] | null; steps: { label: string; delta: number }[] | null }[];
};

type Params = { found: number; max: number; confidence: "high" | "medium" | "low"; items: { key: string; label: string; group: string; found: boolean; source: string | null; detail: string | null }[] };

const LEGEND: [string, string][] = [
  ["ISIN", "The bond's code. Click a row to see exactly how its IR and BR were built."],
  ["P", "Priority in the queue: P0 = most urgent (a bond a visitor just searched), P3 = background. Waiting bonds slowly move up."],
  ["Status", "Where the job is: queued = waiting, processing = the Lenovo is working on it, done = IR and BR published, failed = it will retry (up to 5 times)."],
  ["Stage", "The step the worker is at right now (e.g. collecting sources, reading with Ollama, published)."],
  ["IR", "Issuer Rating, 0–100: how safe the company or country behind the bond looks. Shown as a range; a narrow range means well-evidenced."],
  ["BR", "Bond Rating, 0–100: IR adjusted for this bond's own ranking (senior or subordinated) and guarantee."],
  ["Rating status", "provisional = calculated, still unchecked by a person. review_required = calculated but a person should look (little data, conflicts, or the same numbers as another bond). validated = checked by a person (never set automatically)."],
  ["Parameters", "How many of the inputs needed for IR and BR were actually found, out of the maximum for this kind of issuer. Confidence: high 75%+, medium 50%+, low below."],
  ["Seen", "How many times this bond appeared in a visitor's top-10 list. More sightings = higher priority."],
  ["Tries", "How many times the worker has tried this bond (failed tries are repeated with a pause)."],
];
const STATUS_HELP: Record<string, string> = { provisional: "Calculated; no person has checked it yet.", review_required: "Calculated, but a person should check it (little data, conflict, or identical to another bond).", validated: "Checked by a person." };
const CONF_HELP = "Confidence = parameters found ÷ maximum: high 75%+, medium 50%+, low below 50%.";

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
      <section>
        <div className="mb-1 font-medium">Latest jobs</div>
        <details className="mb-2 rounded border border-line p-2" open data-testid="legend">
          <summary className="cursor-pointer font-medium">What the columns mean</summary>
          <dl className="mt-1 grid gap-x-3 gap-y-1 text-[12px] sm:grid-cols-[9rem_1fr]">
            {LEGEND.map(([k, v]) => <div key={k} className="contents"><dt className="font-medium">{k}</dt><dd className="text-mute">{v}</dd></div>)}
          </dl>
        </details>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="text-mute"><tr>
              <th className="py-1" title={LEGEND[0][1]}>ISIN</th><th title={LEGEND[1][1]}>P</th><th title={LEGEND[2][1]}>Status</th><th title={LEGEND[3][1]}>Stage</th>
              <th title={LEGEND[4][1]}>IR</th><th title={LEGEND[5][1]}>BR</th><th title={LEGEND[6][1]}>Rating status</th><th title={LEGEND[7][1]}>Parameters</th>
              <th title={LEGEND[8][1]}>Seen</th><th title={LEGEND[9][1]}>Tries</th><th>Updated</th><th>Last error</th>
            </tr></thead>
            <tbody>
              {d.recent.map((r) => {
                const p = r.parameters, open = openIsin === r.isin;
                return (
                  <Fragment key={r.isin}>
                    <tr className="cursor-pointer border-t border-line hover:bg-soft" title={r.last_error ?? "Click to see how IR and BR were built"} onClick={() => setOpenIsin(open ? null : r.isin)} data-testid="job-row">
                      <td className="py-1 font-mono">{open ? "▾" : "▸"} {r.isin}</td><td>P{r.priority}</td><td>{r.status}</td><td>{r.stage ?? ""}</td>
                      <td>{rng(r.issuer_rating_min, r.issuer_rating_max)}</td><td>{rng(r.bond_rating_min, r.bond_rating_max)}</td>
                      <td title={STATUS_HELP[r.rating_verification_status ?? ""] ?? undefined}>{r.rating_verification_status ?? "—"}</td>
                      <td title={CONF_HELP} data-testid="params-cell">{p ? <>{p.found}/{p.max} <span className={p.confidence === "high" ? "text-green-700" : p.confidence === "medium" ? "text-amber-700" : "text-red-700"}>{p.confidence}</span></> : "—"}</td>
                      <td>{r.exposure_count}×</td><td>{r.attempts}</td><td>{new Date(r.updated_at).toLocaleString()}</td><td className="max-w-[16rem] truncate text-red-700">{r.last_error ?? ""}</td>
                    </tr>
                    {open && (
                      <tr className="bg-soft" data-testid="job-detail"><td colSpan={12} className="p-2">
                        {r.same_as?.length ? <p className="mb-2 rounded border border-amber-400 p-2 text-amber-800">Same IR and BR ranges as {r.same_as.length} other bond(s) ({r.same_as.slice(0, 3).join(", ")}): the research found too little that tells the bonds apart, so a person should review it.</p> : null}
                        {p ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 font-medium">Parameters gathered: {p.found} of {p.max} ({p.confidence} confidence)</div>
                              <table className="w-full text-[12px]"><tbody>
                                {p.items.map((i) => <tr key={i.key} className="border-t border-line"><td className="py-0.5 pr-2 text-mute">{i.group}</td><td className="pr-2">{i.label}</td><td className={i.found ? "pr-2 text-green-700" : "pr-2 text-red-700"}>{i.found ? "found" : "missing"}{i.detail ? ` (${i.detail})` : ""}</td><td className="break-all text-mute">{i.source ?? ""}</td></tr>)}
                              </tbody></table>
                            </div>
                            <div>
                              <div className="mb-1 font-medium">How the number was built (start, then each step added)</div>
                              <ol className="list-decimal pl-5">{(r.steps ?? []).map((st, k) => <li key={k}>{st.label}: {st.delta > 0 && k > 0 ? "+" : ""}{st.delta}</li>)}</ol>
                              <p className="mt-1 text-mute">Every missing input widens the range instead of being guessed. Sources collected: {r.sources ?? 0}.</p>
                            </div>
                          </div>
                        ) : <p className="text-mute">No finished research for this bond yet.</p>}
                      </td></tr>
                    )}
                  </Fragment>
                );
              })}
              {!d.recent.length && <tr><td colSpan={12} className="py-2 text-mute">No jobs yet. They appear after the next search.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
