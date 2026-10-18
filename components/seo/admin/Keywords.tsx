"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import type { Opportunity } from "@/lib/seo/knowledge";
import type { Locale } from "@/lib/seo/locales";
import { api, Badge, btn, btnLight, card, day, ErrorNote, Field, input, num, Table } from "./ui";

type Kw = {
  id: number; market: Locale; keyword: string; intent: string; landingPath: string | null; volume: number | null; volumeSource: string | null; difficulty: number | null;
  position: number | null; clicks: number | null; impressions: number | null; metricsAt: string | null; status: string; nextAction: string | null;
  section: string | null; potential: string | null; verifiedAt: string | null; opportunity: Opportunity;
};
type Wave = { market: Locale; title: string; section: string; keyword: string; kind: string; path: string | null; state: string; owner: string | null };
type Data = { keywords: Kw[]; wave: Wave[]; sections: Record<string, string>; effortSplit: { label: string; share: number }[]; weights: Record<string, number>; gscConnected: boolean };

const STATE: Record<string, [string, "green" | "amber" | "gray" | "blue" | "red"]> = {
  live: ["Live", "green"], not_indexable: ["Built, not enough data to index", "amber"], review: ["Waiting for your review", "amber"], draft: ["Draft outline", "gray"],
  to_write: ["To write", "red"], other_thread: ["Not published yet (Admin → Brokers)", "blue"],
};
const EMPTY = { id: 0, keyword: "", intent: "informational", landingPath: "", volume: "", volumeSource: "", difficulty: "", status: "target", nextAction: "", section: "", potential: "", verifiedAt: "" };

export default function Keywords({ market }: { market: Locale }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [csv, setCsv] = useState<{ text: string; source: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Data>(`/api/admin/seo/keywords?market=${market}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [market]);
  useEffect(() => {
    load();
  }, [load]);

  async function call(body: Record<string, unknown>, done?: (r: Record<string, unknown>) => string | void) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await api<Record<string, unknown>>("/api/admin/seo/keywords", { market, ...body });
      const m = done?.(r);
      if (m) setMsg(m);
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (await call({ op: "save", ...form, id: form.id || null })) setForm(null);
  }

  if (!data) return error ? <ErrorNote error={error} /> : <p className="text-sm text-mute">Loading…</p>;
  return (
    <div className="space-y-5" data-testid="seo-keywords">
      <section className={card}>
        <h2 className="text-lg font-semibold">Knowledge Center plan · first wave</h2>
        <p className="mt-1 text-xs text-mute">From the market research brief. Every page ends with a next step into the bond finder. Effort split: {data.effortSplit.map((e) => `${e.label} ${e.share}%`).join(" · ")}.</p>
        <Table head={["Page", "Section", "Main keyword", "Status"]} min="40rem">
          {data.wave.map((w) => (
            <tr key={w.title} className="border-t border-line">
              <td className="py-2 pr-3">{w.path && w.state === "live" ? <a href={w.path} target="_blank" className="text-accent">{w.title}</a> : w.title}</td>
              <td className="pr-3">{data.sections[w.section]}</td>
              <td className="pr-3">{w.keyword}</td>
              <td><Badge tone={STATE[w.state][1]}>{STATE[w.state][0]}</Badge></td>
            </tr>
          ))}
        </Table>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Keywords · {market.toUpperCase()}</h2>
            <p className="mt-1 max-w-3xl text-xs text-mute">
              Sorted by Opportunity Score (0-100): demand {data.weights.demand}, competition {data.weights.competition}, intent {data.weights.intent}, app potential {data.weights.business}, current ranking {data.weights.ranking}, data freshness {data.weights.freshness}. Unknown factors are left out and shown as missing; “coverage” says how much of the score rests on real data. Volumes are third-party estimates and always show their source.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setForm({ ...EMPTY })} className={btn}>Add keyword</button>
            <button onClick={() => setCsv({ text: "", source: "" })} className={btnLight}>Import volumes (CSV)</button>
            <button disabled={busy || !data.gscConnected} onClick={() => call({ op: "sync" }, (r) => `Search Console figures updated for ${r.updated} keywords (to ${r.end}).`)} className={btnLight} title={data.gscConnected ? "" : "Connect Search Console first"}>Update from Search Console</button>
          </div>
        </div>
        <ErrorNote error={error} />
        {msg && <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{msg}</p>}
        {csv && (
          <div className="mt-4 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-2">
            <Field label="CSV file" hint="Columns: keyword, volume, and optionally difficulty (Semrush, Ahrefs or Keyword Planner exports work). Only keywords already in the list are updated.">
              <input type="file" accept=".csv,text/csv" className={input} onChange={async (e) => setCsv({ ...csv, text: (await e.target.files?.[0]?.text()) ?? "" })} />
            </Field>
            <Field label="Source (tool and month)" hint="e.g. Semrush, Oct 2026">
              <input value={csv.source} onChange={(e) => setCsv({ ...csv, source: e.target.value })} className={input} maxLength={200} />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <button disabled={busy || !csv.text || !csv.source} onClick={() => call({ op: "import", csv: csv.text, source: csv.source }, (r) => { setCsv(null); return `${r.updated} of ${r.rows} rows matched keywords in the list.`; })} className={btn}>Import</button>
              <button onClick={() => setCsv(null)} className={btnLight}>Cancel</button>
            </div>
          </div>
        )}
        {form && (
          <form onSubmit={save} className="mt-4 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-3">
            <Field label="Keyword"><input required value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} className={input} maxLength={120} /></Field>
            <Field label="Intent">
              <select value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value })} className={input}>
                {["informational", "commercial", "transactional", "navigational"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Landing page" hint="Site path, e.g. /it/guide/btp"><input value={form.landingPath} onChange={(e) => setForm({ ...form, landingPath: e.target.value })} className={input} /></Field>
            <Field label="Monthly volume" hint="Only from a keyword tool"><input inputMode="numeric" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} className={input} /></Field>
            <Field label="Volume source" hint="Required with a volume"><input value={form.volumeSource} onChange={(e) => setForm({ ...form, volumeSource: e.target.value })} className={input} /></Field>
            <Field label="Difficulty (0-100)"><input inputMode="numeric" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className={input} /></Field>
            <Field label="Knowledge Center section">
              <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className={input}>
                <option value="">—</option>{Object.entries(data.sections).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="App potential" hint="Chance of searches, sign-ups, subscriptions">
              <select value={form.potential} onChange={(e) => setForm({ ...form, potential: e.target.value })} className={input}>
                <option value="">Not judged</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </Field>
            <Field label="Last verified"><input type="date" value={form.verifiedAt} onChange={(e) => setForm({ ...form, verifiedAt: e.target.value })} className={input} /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}>
                {["target", "in_progress", "optimised", "ranking", "dropped"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Next action" wide><input value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} className={input} maxLength={300} /></Field>
            <div className="flex gap-2 sm:col-span-3">
              <button disabled={busy} className={btn}>Save</button>
              <button type="button" onClick={() => setForm(null)} className={btnLight}>Cancel</button>
              {form.id > 0 && <button type="button" onClick={() => confirm("Delete this keyword?") && call({ op: "delete", id: form.id }).then((ok) => ok && setForm(null))} className="ml-auto text-sm text-red-700">Delete</button>}
            </div>
          </form>
        )}
        <Table head={["Score", "Keyword", "Intent", "Landing page", "Volume", "Difficulty", "Position", "Clicks / impr.", "Status", "Next action", ""]} min="64rem">
          {data.keywords.length === 0 && <tr><td colSpan={11} className="py-3 text-mute">No keywords yet.</td></tr>}
          {data.keywords.map((k) => (
            <Fragment key={k.id}>
              <tr className="border-t border-line align-top">
                <td className="py-2 pr-3">
                  <button onClick={() => setOpen(open === k.id ? null : k.id)} className="text-left">
                    <b>{k.opportunity.score ?? "—"}</b>
                    <span className="block text-[11px] text-mute">{k.opportunity.coverage}% data</span>
                  </button>
                </td>
                <td className="pr-3 font-medium">{k.keyword}{k.section && <span className="block text-[11px] font-normal text-mute">{data.sections[k.section]}</span>}</td>
                <td className="pr-3 text-xs">{k.intent}</td>
                <td className="pr-3 text-xs">{k.landingPath ? <a href={k.landingPath} target="_blank" className="text-accent">{k.landingPath}</a> : "—"}</td>
                <td className="pr-3" title={k.volumeSource ?? ""}>{num(k.volume)}{k.volumeSource && <span className="block max-w-[10rem] text-[11px] text-mute">{k.volumeSource}</span>}</td>
                <td className="pr-3">{num(k.difficulty)}</td>
                <td className="pr-3">{num(k.position, 1)}</td>
                <td className="pr-3 whitespace-nowrap">{k.metricsAt ? `${num(k.clicks)} / ${num(k.impressions)}` : "—"}{k.metricsAt && <span className="block text-[11px] text-mute">to {day(k.metricsAt)}</span>}</td>
                <td className="pr-3 text-xs">{k.status}</td>
                <td className="pr-3 text-xs">{k.nextAction ?? ""}</td>
                <td>
                  <button onClick={() => setForm({ id: k.id, keyword: k.keyword, intent: k.intent, landingPath: k.landingPath ?? "", volume: k.volume?.toString() ?? "", volumeSource: k.volumeSource ?? "", difficulty: k.difficulty?.toString() ?? "", status: k.status, nextAction: k.nextAction ?? "", section: k.section ?? "", potential: k.potential ?? "", verifiedAt: k.verifiedAt ?? "" })} className="text-sm text-accent">Edit</button>
                </td>
              </tr>
              {open === k.id && (
                <tr>
                  <td colSpan={11} className="pb-3">
                    <ul className="rounded-xl bg-canvas p-3 text-xs">
                      {k.opportunity.factors.map((f) => (
                        <li key={f.id}><b>{f.label}</b> ({f.weight}): {f.points === null ? "missing" : `${f.points} pts`} — {f.note}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </Table>
      </section>
    </div>
  );
}
