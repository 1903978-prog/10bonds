"use client";

import { useState } from "react";
import { METHODOLOGIES, type Methodology } from "@/lib/methodologyList";

export type StoredCount = Record<string, string>;

export default function MethodologyAdmin({ initial, stored }: { initial: Methodology; stored: Record<number, StoredCount> }) {
  const [active, setActive] = useState<Methodology>(initial);
  const [pick, setPick] = useState<Methodology>(initial);
  const [msg, setMsg] = useState("");
  const save = async () => {
    setMsg("Saving…");
    const r = await fetch("/api/admin/methodology", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: pick }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setActive(j.active); setMsg(`Saved. The site now uses Methodology ${j.active} (visible within a minute).`); } else setMsg(j.error ?? "Could not save.");
  };
  return (
    <div className="mt-6 space-y-3">
      <div role="radiogroup" aria-label="Methodology used by the public site" className="space-y-2" data-testid="methodology-list">
        {METHODOLOGIES.map((m) => (
          <label key={m.n} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${pick === m.n ? "border-amber-400 bg-amber-50" : "border-line"}`}>
            <input type="radio" name="methodology" checked={pick === m.n} onChange={() => setPick(m.n)} className="mt-1" data-testid={`methodology-${m.n}`} />
            <span className="min-w-0 text-sm">
              <span className="font-medium">{m.name}{active === m.n ? " · in use" : ""}</span>
              <span className="block text-mute">{m.text}</span>
              {stored[m.n] && <span className="mt-1 block text-xs text-mute">Stored lists (EUR, all sizes): {Object.entries(stored[m.n]).map(([k, v]) => `${k} ${v}`).join(" · ")}</span>}
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pick === active} className="rounded-full bg-ink px-5 py-2 text-sm text-white disabled:opacity-40" data-testid="methodology-save">Use this methodology</button>
        <span className="text-sm text-mute">{msg}</span>
      </div>
    </div>
  );
}
