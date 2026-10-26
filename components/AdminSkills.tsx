"use client";

import { useState } from "react";

type Key = "irbr" | "lr_gov" | "lr_corp";
const BOXES: { key: Key; title: string; hint: string }[] = [
  { key: "irbr", title: "1. IR / BR", hint: "Sent with every IR/BR calculation. Empty = built-in default text." },
  { key: "lr_gov", title: "2. LR governments", hint: "Pre-filled with the countries methodology (v1.0). Not used by a button yet." },
  { key: "lr_corp", title: "3. LR corporate", hint: "Pre-filled with the corporate methodology (v2.0). Not used by a button yet." },
];

export default function AdminSkills({ saved, defaults }: { saved: Record<Key, string>; defaults: Record<Key, string> }) {
  const [text, setText] = useState<Record<Key, string>>({ irbr: saved.irbr || defaults.irbr, lr_gov: saved.lr_gov || defaults.lr_gov, lr_corp: saved.lr_corp || defaults.lr_corp });
  const [stored, setStored] = useState<Record<Key, string>>(saved);
  const [msg, setMsg] = useState<Partial<Record<Key, string>>>({});
  const save = async (key: Key) => {
    setMsg((m) => ({ ...m, [key]: "Saving…" }));
    const r = await fetch("/api/admin/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, text: text[key] }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) { setStored(j); setMsg((m) => ({ ...m, [key]: "Saved." })); } else setMsg((m) => ({ ...m, [key]: j.error ?? "Could not save." }));
  };
  return (
    <div className="mt-6 space-y-8">
      {BOXES.map((b) => (
        <section key={b.key} data-testid={`skill-${b.key}`}>
          <h2 className="font-medium">{b.title}</h2>
          <p className="text-xs text-mute">{b.hint} {stored[b.key].trim() ? "Saved text in use." : "Showing the starting text, not saved yet."}</p>
          <textarea value={text[b.key]} onChange={(e) => setText({ ...text, [b.key]: e.target.value })} rows={12} className="mt-2 w-full rounded-lg border border-line px-3 py-2 font-mono text-xs" aria-label={b.title} />
          <div className="mt-1 flex items-center gap-3 text-xs">
            <button type="button" onClick={() => save(b.key)} className="rounded-full border border-line px-3 py-1">Save</button>
            <span className="text-mute">{text[b.key].length.toLocaleString()} characters</span>
            <span>{msg[b.key]}</span>
          </div>
        </section>
      ))}
    </div>
  );
}
