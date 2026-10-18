"use client";

import { useCallback, useEffect, useState } from "react";
import AdminData from "./AdminData";

type Code = { code: string; days: number; note: string | null; createdAt: string; redeemedBy: string | null; redeemedAt: string | null };
type Stats = { users: number; verified: number; onTrial: number; newThisWeek: number; events30d: { kind: string; n: number }[]; topPages30d: { path: string; n: number }[] };

const d = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const card = "rounded-[24px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]";

export default function AdminPanel() {
  const [data, setData] = useState<{ codes: Code[]; stats: Stats } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(30);
  const [note, setNote] = useState("");
  const [fresh, setFresh] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/codes", { cache: "no-store" });
    if (r.ok) setData(await r.json());
    else setError("Could not load the admin data.");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/admin/codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count, days, note }) });
    const b = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(b.error ?? "Could not create the codes.");
    setFresh(b.codes);
    setNote("");
    load();
  }

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const s = data?.stats;
  return (
    <div className="space-y-6">
      <h1 className="text-[32px] font-semibold tracking-tight">Admin</h1>
      <p className="-mt-4 text-sm text-mute">Only you can see this page. · <a href="/admin/pro" className="text-accent">Professional access requests</a> · <a href="/admin/brokers" className="text-accent">Broker management</a> · <a href="/admin/seo" className="text-accent">SEO Management</a></p>

      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="admin-stats">
          {[["Accounts", s.users], ["E-mail confirmed", s.verified], ["On Premium trial", s.onTrial], ["New in 7 days", s.newThisWeek]].map(([k, v]) => (
            <div key={k} className={card}>
              <p className="text-xs text-mute">{k}</p>
              <p className="mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}

      <AdminData />

      <section className={card}>
        <h2 className="text-lg font-semibold">Free trial codes</h2>
        <p className="mt-1 text-sm text-mute">Each code gives one account Premium (every feature of the most expensive plan) for the days you choose. One use per code.</p>
        <form onSubmit={generate} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block font-medium">How many</span>
            <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-1 w-24 rounded-xl border border-line px-3 py-2" data-testid="codes-count" />
          </label>
          <label className="text-sm">
            <span className="block font-medium">Days of Premium</span>
            <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-1 w-28 rounded-xl border border-line px-3 py-2" />
          </label>
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className="block font-medium">Note (optional, e.g. who it is for)</span>
            <input type="text" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
          </label>
          <button disabled={busy} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0077ed] disabled:opacity-60" data-testid="codes-generate">
            {busy ? "Creating…" : "Generate codes"}
          </button>
        </form>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {fresh.length > 0 && (
          <div className="mt-4 rounded-xl bg-canvas p-4" data-testid="codes-fresh">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">New codes</p>
              <button onClick={() => copy(fresh.join("\n"), "all")} className="text-sm text-accent">{copied === "all" ? "Copied" : "Copy all"}</button>
            </div>
            <p className="mt-2 font-mono text-[15px] leading-7">{fresh.map((c) => <span key={c} className="block">{c}</span>)}</p>
            <p className="mt-2 text-xs text-mute">They are used at https://10bonds.fly.dev/redeem after signing in.</p>
          </div>
        )}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-mute">
              <tr><th className="py-2 pr-3 font-medium">Code</th><th className="pr-3 font-medium">Days</th><th className="pr-3 font-medium">Note</th><th className="pr-3 font-medium">Created</th><th className="font-medium">Used by</th></tr>
            </thead>
            <tbody>
              {data?.codes.length === 0 && <tr><td colSpan={5} className="py-3 text-mute">No codes yet.</td></tr>}
              {data?.codes.map((c) => (
                <tr key={c.code} className="border-t border-line">
                  <td className="py-2 pr-3 font-mono">
                    <button onClick={() => copy(c.code, c.code)} className="hover:text-accent" title="Copy">{copied === c.code ? "Copied" : c.code}</button>
                  </td>
                  <td className="pr-3">{c.days}</td>
                  <td className="pr-3 text-mute">{c.note ?? ""}</td>
                  <td className="pr-3 text-mute">{d(c.createdAt)}</td>
                  <td>{c.redeemedBy ? `${c.redeemedBy} · ${d(c.redeemedAt!)}` : <span className="text-green-700">Not used yet</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {s && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className={card}>
            <h2 className="font-semibold">What people did (30 days)</h2>
            <p className="mt-1 text-xs text-mute">Only visitors who allowed Statistics cookies are counted.</p>
            <ul className="mt-3 space-y-1 text-sm">
              {s.events30d.length === 0 && <li className="text-mute">Nothing recorded yet.</li>}
              {s.events30d.map((e) => <li key={e.kind} className="flex justify-between"><span>{e.kind.replace("_", " ")}</span><span>{e.n}</span></li>)}
            </ul>
          </div>
          <div className={card}>
            <h2 className="font-semibold">Most visited pages (30 days)</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {s.topPages30d.length === 0 && <li className="text-mute">Nothing recorded yet.</li>}
              {s.topPages30d.map((p) => <li key={p.path} className="flex justify-between"><span className="truncate pr-3">{p.path}</span><span>{p.n}</span></li>)}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
