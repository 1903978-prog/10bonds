"use client";
import { useState } from "react";

const post = (body: unknown) => fetch("/api/admin/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Admin: the BUY/WATCH/AVOID switch for customers. */
export default function AssessmentsAdmin({ verdicts }: { verdicts: boolean }) {
  const [on, setOn] = useState(verdicts);
  return (
    <label className="flex items-center gap-2 text-sm" data-testid="assessments-admin">
      <input type="checkbox" checked={on} onChange={async (e) => { const v = e.target.checked; if ((await post({ verdicts: v })).ok) setOn(v); }} />
      Show BUY / WATCH / AVOID and &quot;Our view&quot; to customers (keep off until the compliance review is done)
    </label>
  );
}

export function CorrectionStatus({ id, status }: { id: number; status: string }) {
  const [s, setS] = useState(status);
  return (
    <select value={s} className="rounded border border-line px-1 text-sm" onChange={async (e) => { const v = e.target.value; if ((await post({ correction: id, status: v })).ok) setS(v); }}>
      <option value="open">Open</option>
      <option value="done">Corrected</option>
      <option value="rejected">Rejected</option>
    </select>
  );
}
