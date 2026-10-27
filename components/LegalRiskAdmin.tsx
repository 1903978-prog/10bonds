"use client";

import { useState } from "react";
import type { Dashboard } from "@/lib/legalRisk/dashboard";
import type { Level } from "@/lib/legalRisk/checks";

type Row = Dashboard["criteria"][number];
const TECH_LABEL = { implemented: "Implemented", partial: "Partly", not_started: "Not started", not_needed: "Not needed" } as const;
const DOT: Record<Level, string> = { pass: "bg-emerald-500", warn: "bg-amber-400", fail: "bg-red-500" };

/** Colour for a 0-100 score: calm below 25, amber to 50, red above. */
const tone = (n: number) => (n >= 50 ? "text-red-700" : n >= 25 ? "text-amber-700" : "text-ink");

function Bar({ initial, residual }: { initial: number; residual: number }) {
  return (
    <div className="flex items-center gap-2" title={`Initial ${initial}, residual ${residual}`}>
      <div className="relative h-1.5 w-24 rounded-full bg-canvas">
        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-300" style={{ width: `${Math.min(100, initial)}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-800" style={{ width: `${Math.min(100, residual)}%` }} />
      </div>
      <span className="w-14 text-xs tabular-nums text-mute"><span className={tone(initial)}>{initial}</span> → <span className={tone(residual)}>{residual}</span></span>
    </div>
  );
}

function Chip({ children, kind }: { children: React.ReactNode; kind: "ok" | "open" | "neutral" }) {
  const c = kind === "ok" ? "bg-emerald-50 text-emerald-800" : kind === "open" ? "bg-amber-50 text-amber-900" : "bg-canvas text-mute";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
}

const techKind = (t: Row["technical"]) => (t === "implemented" || t === "not_needed" ? "ok" : t === "partial" ? "open" : "neutral");

export default function LegalRiskAdmin({ initial }: { initial: Dashboard }) {
  const [d, setD] = useState(initial);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");

  const call = async (init?: RequestInit, done = "") => {
    setBusy(true);
    const r = await fetch("/api/admin/legal-risk", { cache: "no-store", ...init }).catch(() => null);
    const j = r?.ok ? ((await r.json().catch(() => null)) as Dashboard | null) : null;
    setBusy(false);
    if (j?.criteria) { setD(j); setMsg(done); } else setMsg("Could not complete that. Check the reviewer name and try again.");
  };
  const post = (body: object, done: string) => call({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, done);

  const rows = d.criteria;
  const tracking = (c: Row) => c.review?.tracking ?? (c.technical === "implemented" ? "done" : c.technical === "partial" ? "in_progress" : "not_started");
  const done = rows.filter((c) => tracking(c) === "done").length;
  const progress = Math.round((rows.reduce((s, c) => s + (tracking(c) === "done" ? 1 : tracking(c) === "in_progress" ? 0.5 : 0), 0) / rows.length) * 100);
  const reviewed = rows.filter((c) => c.reviewed).length;
  const critical = rows.filter((c) => d.summary.criticalIds.includes(c.id));
  const top = d.summary.topIds.map((id) => rows.find((c) => c.id === id)!);
  const fails = d.checks.filter((c) => c.level === "fail").length;
  const warns = d.checks.filter((c) => c.level === "warn").length;

  const tile = (label: string, value: React.ReactNode, sub: string) => (
    <div className="rounded-lg border border-line bg-white p-5" data-testid={`lr-tile-${label.toLowerCase().replace(/\W+/g, "-")}`}>
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-mute">{sub}</p>
    </div>
  );

  return (
    <div className="mt-8 space-y-10" data-testid="legal-risk">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tile("Overall exposure", <>{d.summary.initialAverage} → {d.summary.residualAverage}</>, "Average of 20, initial → residual. Never zero.")}
        {tile("Critical unresolved", critical.length, "Possible authorisation questions or large open items")}
        {tile("Mitigation progress", `${progress}%`, `${done} of ${rows.length} criteria with safeguards in place`)}
        {tile("Last assessment", d.assessedAt, "Reassess a row after changing code")}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Three separate statuses</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-line bg-white p-5"><p className="text-xs text-mute">1. Technical safeguards implemented</p><p className="mt-1 text-2xl font-semibold tabular-nums">{rows.filter((c) => c.technical === "implemented").length} full · {rows.filter((c) => c.technical === "partial").length} partial</p><p className="mt-1 text-xs text-mute">Code and copy only. Not a legal conclusion.</p></div>
          <div className="rounded-lg border border-line bg-white p-5"><p className="text-xs text-mute">2. Legal interpretation pending</p><p className="mt-1 text-2xl font-semibold tabular-nums">{rows.length - reviewed} of {rows.length}</p><p className="mt-1 text-xs text-mute">Questions only qualified counsel can answer.</p></div>
          <div className="rounded-lg border border-line bg-white p-5"><p className="text-xs text-mute">3. Legal review completed</p><p className="mt-1 text-2xl font-semibold tabular-nums">{reviewed} of {rows.length}</p><p className="mt-1 text-xs text-mute">Set only by a named reviewer below.</p></div>
        </div>
      </section>

      {critical.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Critical unresolved issues</h2>
          <p className="mt-1 text-sm text-mute">Listed regardless of score because an authorisation, registration or licence question could be open.</p>
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white">
            {critical.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <button type="button" onClick={() => setOpen(c.id)} className="text-left font-medium text-accent">{c.id}. {c.title}</button>
                <span className="text-xs text-mute">{c.applicability} · {c.owner}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Technical compliance checks</h2>
          <button type="button" disabled={busy} onClick={() => call(undefined, "Checks re-run.")} className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50" data-testid="lr-run">Run technical checks</button>
        </div>
        <p className="mt-1 text-sm text-mute">{fails ? `${fails} failing, ` : "None failing, "}{warns} open warning{warns === 1 ? "" : "s"}. Checks that read the source code run in every release (npm test) and block it on failure.</p>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white" data-testid="lr-checks">
          {d.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-5 py-3 text-sm">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[c.level]}`} aria-label={c.level} />
              <div className="min-w-0"><p className="font-medium">{c.title} <span className="text-xs font-normal text-mute">· criteria {c.criteria.join(", ")}</span></p><p className="text-xs text-mute">{c.detail}</p></div>
            </li>
          ))}
          {d.sourceChecks.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-5 py-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" aria-label="runs in release tests" />
              <div className="min-w-0"><p className="font-medium">{c.title} <span className="text-xs font-normal text-mute">· criteria {c.criteria.join(", ")}</span></p><p className="text-xs text-mute">Runs in the release tests (lib/legalRisk/sourceChecks.test.ts), not on the live site.</p></div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Twenty criteria</h2>
        <p className="mt-1 text-sm text-mute">Bar: light = initial risk, dark = residual risk. Risk = probability × impact ÷ 100 (subjective). Tap a row for evidence, law, mitigation and review.</p>
        {msg && <p className="mt-2 text-sm text-mute" role="status">{msg}</p>}
        {d.groups.map((g) => (
          <div key={g} className="mt-5">
            <h3 className="text-sm font-semibold text-mute">{g}</h3>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-white">
              {rows.filter((c) => c.group === g).map((c) => (
                <li key={c.id} data-testid={`lr-row-${c.id}`}>
                  <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-left text-sm">
                    <span className="w-6 text-mute tabular-nums">{c.id}</span>
                    <span className="min-w-[200px] flex-1 font-medium">{c.title}</span>
                    <Bar initial={c.initial} residual={c.residual} />
                    <span className="flex flex-wrap gap-1.5">
                      <Chip kind={techKind(c.technical)}>Safeguards: {TECH_LABEL[c.technical]}</Chip>
                      <Chip kind={c.reviewed ? "ok" : "open"}>{c.reviewed ? "Legal review done" : "Legal pending"}</Chip>
                    </span>
                  </button>
                  {open === c.id && <Detail c={c} reviewer={reviewer} setReviewer={setReviewer} note={note} setNote={setNote} busy={busy} post={post} tracking={tracking(c)} />}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Top 10 exposures by initial risk</h2>
        <ol className="mt-3 divide-y divide-line rounded-lg border border-line bg-white text-sm">
          {top.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5"><span><span className="mr-3 text-mute tabular-nums">{i + 1}</span>{c.title}</span><Bar initial={c.initial} residual={c.residual} /></li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Data sources and licences</h2>
        <p className="mt-1 text-sm text-mute">Removing a supplier&apos;s name or logo does not resolve a licence restriction. &quot;Unconfirmed&quot; means no documented commercial redistribution right was found.</p>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white text-sm">
          {d.dataSources.map((s) => (
            <li key={s.id} className="px-5 py-3">
              <p className="font-medium">{s.what} <Chip kind={s.licence === "unconfirmed" ? "open" : "ok"}>{s.licence}</Chip></p>
              <p className="text-xs text-mute">{s.where} · {s.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Scoring model versions</h2>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white text-sm">
          {d.modelVersions.map((m) => (
            <li key={m.id} className="px-5 py-3"><p className="font-medium">{m.id} <span className="text-xs font-normal text-mute">v{m.version} · effective {m.effective}</span></p><p className="text-xs text-mute">{m.module} · {m.description}</p></li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Detail({ c, reviewer, setReviewer, note, setNote, busy, post, tracking }: {
  c: Row; reviewer: string; setReviewer: (v: string) => void; note: string; setNote: (v: string) => void; busy: boolean;
  post: (body: object, done: string) => Promise<void>; tracking: string;
}) {
  const list = (items: string[], empty = "None.") => items.length ? <ul className="mt-1 list-disc space-y-1 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mt-1 text-mute">{empty}</p>;
  const h = "mt-4 text-xs font-semibold uppercase tracking-wide text-mute";
  return (
    <div className="border-t border-line bg-canvas/50 px-5 py-4 text-sm" data-testid={`lr-detail-${c.id}`}>
      <p><span className="text-mute">Jurisdiction:</span> {c.jurisdiction} · <span className="text-mute">Applicability:</span> {c.applicability} · <span className="text-mute">Owner:</span> {c.owner} · <span className="text-mute">Confidence:</span> {c.confidence}</p>
      {c.authorisationQuestion && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">A registration, authorisation or licence question may be open here, whatever the score.</p>}
      <p className={h}>Applicable law</p><p className="mt-1">{c.law}</p>
      <p className={h}>Scores (subjective)</p>
      <p className="mt-1 tabular-nums">Probability {c.probability} × impact {c.impact} ÷ 100 = <b>{c.initial}</b> initial · after safeguards {c.residualProbability} × {c.residualImpact} ÷ 100 = <b>{c.residual}</b> residual</p>
      <p className={h}>Evidence</p>
      <ul className="mt-1 space-y-1.5">{c.evidence.map((e, i) => <li key={i}><code className="rounded bg-white px-1 py-0.5 text-xs">{e.ref}</code> {e.note} {!e.verified && <Chip kind="neutral">not verifiable from code</Chip>}</li>)}</ul>
      <p className={h}>Recommended mitigation</p><p className="mt-1">{c.mitigation}</p>
      <p className={h}>Safeguards already in place</p>{list(c.implemented)}
      <p className={h}>Waiting for the owner&apos;s approval</p>{list(c.awaitingApproval)}
      <p className={h}>Questions for qualified counsel</p>{list(c.legalQuestions)}
      <p className={h}>Verification</p><p className="mt-1">{c.verification.join(" · ")}{c.checks.length ? ` · checks: ${c.checks.join(", ")}` : ""}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <label className="text-xs text-mute">Implementation
          <select value={tracking} disabled={busy} onChange={(e) => post({ id: c.id, action: "tracking", tracking: e.target.value }, "Saved.")} className="ml-2 rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink" data-testid={`lr-tracking-${c.id}`}>
            <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="done">Done</option>
          </select>
        </label>
        <button type="button" disabled={busy} onClick={() => post({ id: c.id, action: "reassess" }, "Reassessed today. Re-run the technical checks above.")} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium">Reassess after changes</button>
        <span className="text-xs text-mute">{c.review?.reassessedAt ? `Last reassessed ${c.review.reassessedAt}` : "Not reassessed since the audit"}</span>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">Legal review</p>
        {c.reviewed && c.review ? (
          <p className="mt-2">Reviewed by <b>{c.review.reviewer}</b> on {c.review.reviewedAt}{c.review.reviewNote ? `: ${c.review.reviewNote}` : ""}. <button type="button" disabled={busy} onClick={() => post({ id: c.id, action: "review", clearReview: true }, "Review cleared.")} className="text-accent">Clear</button></p>
        ) : (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Reviewer name and firm" className="min-w-[200px] flex-1 rounded-lg border border-line px-3 py-1.5 text-sm" data-testid={`lr-reviewer-${c.id}`} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opinion reference or note" className="min-w-[200px] flex-1 rounded-lg border border-line px-3 py-1.5 text-sm" />
            <button type="button" disabled={busy || !reviewer.trim()} onClick={() => { post({ id: c.id, action: "review", reviewer, reviewNote: note }, "Review recorded."); setReviewer(""); setNote(""); }} className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40">Record reviewer approval</button>
          </div>
        )}
        <p className="mt-2 text-xs text-mute">Only a qualified reviewer&apos;s sign-off belongs here. A recorded review covers this criterion on today&apos;s facts and wording only.</p>
      </div>
    </div>
  );
}
