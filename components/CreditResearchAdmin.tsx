"use client";

import { useCallback, useEffect, useState } from "react";

type Ov = {
  paused: boolean; avgMs: number | null;
  jobs: Record<string, string>; analyses: Record<string, string>;
  workers: { worker_id: string; model: string | null; current_isin: string | null; stage: string | null; host: string | null; last_seen: string; online: boolean }[];
  recent: { isin: string; priority: number; status: string; stage: string | null; exposure_count: number; attempts: number; last_error: string | null; updated_at: string; issuer_rating_min: string | null; issuer_rating_max: string | null; bond_rating_min: string | null; bond_rating_max: string | null; rating_verification_status: string | null }[];
};

const rng = (a: string | null, b: string | null) => (a === null ? "—" : a === b ? Number(a) : `${Number(a)}–${Number(b)}`);

export default function CreditResearchAdmin() {
  const [d, setD] = useState<Ov | null>(null);
  const [msg, setMsg] = useState("");
  const [isin, setIsin] = useState("");
  const [token, setToken] = useState("");
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead className="text-mute"><tr><th className="py-1">ISIN</th><th>P</th><th>Status</th><th>Stage</th><th>IR</th><th>BR</th><th>Rating status</th><th>Seen</th><th>Tries</th><th>Updated</th><th>Last error</th></tr></thead>
            <tbody>
              {d.recent.map((r) => (
                <tr key={r.isin} className="border-t border-line" title={r.last_error ?? undefined}>
                  <td className="py-1 font-mono">{r.isin}</td><td>P{r.priority}</td><td>{r.status}</td><td>{r.stage ?? ""}</td>
                  <td>{rng(r.issuer_rating_min, r.issuer_rating_max)}</td><td>{rng(r.bond_rating_min, r.bond_rating_max)}</td>
                  <td>{r.rating_verification_status ?? "—"}</td><td>{r.exposure_count}×</td><td>{r.attempts}</td><td>{new Date(r.updated_at).toLocaleString()}</td><td className="max-w-[16rem] truncate text-red-700" title={r.last_error ?? undefined}>{r.last_error ?? ""}</td>
                </tr>
              ))}
              {!d.recent.length && <tr><td colSpan={11} className="py-2 text-mute">No jobs yet. They appear after the next search.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
