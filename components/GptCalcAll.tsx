"use client";

import { useEffect, useState } from "react";
import { calcGptRating, useGptCalc } from "@/lib/gptStore";

type Info = { settings: { provider: "gemini" | "openai" | "anthropic"; model: string; dailyCap: number }; used: number; keyPresent: boolean; keyName: string; secretsUrl: string; keyUrl: string };

/** Admin only: "Calculate all 10" (IR and BR through the API, one bond after the other), with progress, errors and the calculator settings. */
export function GptCalcAll({ isins }: { isins: string[] }) {
  const calc = useGptCalc();
  const [run, setRun] = useState<{ done: number; total: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [form, setForm] = useState<{ provider: string; model: string; cap: string } | null>(null);
  const firstError = isins.map((i) => calc[i]).find((c) => c?.error);

  const refresh = () => fetch("/api/admin/gpt-calc", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) { setInfo(j); setForm({ provider: j.settings.provider, model: j.settings.model, cap: String(j.settings.dailyCap) }); } }).catch(() => {});
  useEffect(() => { if (open) refresh(); }, [open]);

  async function all() {
    setRun({ done: 0, total: isins.length });
    let n = 0;
    for (const isin of isins) {
      const err = await calcGptRating(isin);
      setRun({ done: ++n, total: isins.length });
      if (err && /daily limit|No API key/i.test(err)) break;
    }
    setRun(null);
  }
  async function save() {
    if (!form) return;
    const r = await fetch("/api/admin/gpt-calc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: { provider: form.provider, model: form.model, dailyCap: Number(form.cap) } }) }).catch(() => null);
    if (r?.ok) setInfo(await r.json());
  }

  return (
    <span className="relative flex shrink-0 items-center gap-1" data-testid="gpt-calc-all-wrap">
      <button type="button" onClick={all} disabled={!!run || !isins.length} data-testid="gpt-calc-all" className="w-[7.5rem] rounded-full border border-amber-300 bg-amber-50 py-0.5 text-center text-[11px] font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-70">
        {run ? `Calculating ${run.done}/${run.total}…` : "Calculate all 10"}
      </button>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Calculator settings" title="Calculator settings" data-testid="gpt-calc-settings" className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-[11px] text-amber-900 hover:bg-amber-100">⚙</button>
      {(open || firstError) && (
        <div className="absolute bottom-full right-0 z-20 mb-1 w-72 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900 shadow" data-testid="gpt-calc-panel">
          {firstError?.error && <p className="mb-1 font-medium text-red-700" data-testid="gpt-calc-error">{firstError.error}{firstError.missingKey && info?.secretsUrl ? "" : ""}</p>}
          {(firstError?.missingKey || (open && info && !info.keyPresent)) && <p className="mb-1">Add the key as a secret: <a className="underline" href="https://github.com/1903978-prog/10bonds/settings/secrets/actions/new" target="_blank" rel="noreferrer">github.com/…/secrets/actions/new</a> (name {info?.keyName ?? "GEMINI_API_KEY"}; create the key at <a className="underline" href={info?.keyUrl ?? "https://aistudio.google.com/apikey"} target="_blank" rel="noreferrer">{info?.keyUrl ?? "https://aistudio.google.com/apikey"}</a>), then it is live after the next deploy.</p>}
          {open && info && form && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value, model: e.target.value === "anthropic" ? "claude-sonnet-5-5" : e.target.value === "openai" ? "gpt-4o" : "gemini-3.6-flash" })} className="rounded border border-amber-300 bg-white px-1">
                  <option value="gemini">Gemini (free tier)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="min-w-0 flex-1 rounded border border-amber-300 bg-white px-1" aria-label="Model" />
              </div>
              <div className="flex items-center gap-1">
                <label className="shrink-0">Daily limit</label>
                <input value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value.replace(/\D/g, "") })} className="w-14 rounded border border-amber-300 bg-white px-1" />
                <button type="button" onClick={save} className="ml-auto rounded-full border border-amber-400 bg-white px-2">Save</button>
              </div>
              <p className="text-amber-800">Used today: {info.used}/{info.settings.dailyCap} · key {info.keyPresent ? "found" : "missing"} · one click is one call. Free tier: Google may use the prompts to improve its models, quality can be lower than paid models, and calls are spaced 5 s apart. Results stay provisional, admin only, never in rankings.</p>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
