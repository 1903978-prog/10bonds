"use client";
import Link from "next/link";

import { useCallback, useEffect, useState } from "react";
import AdminData from "./AdminData";
import PriceFreshnessCard from "./PriceFreshnessCard";
import EmailDomainCard from "./EmailDomainCard";
import AdminUsers from "./AdminUsers";

type Code = { code: string; days: number; note: string | null; createdAt: string; redeemedBy: string | null; redeemedAt: string | null };
type Stats = { users: number; verified: number; onTrial: number; newThisWeek: number; events30d: { kind: string; n: number }[]; topPages30d: { path: string; n: number }[] };

const d = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const card = "rounded-lg border border-line bg-white p-6";

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
    // This device stops counting in the stats (also when signed out), and its earlier visits are removed.
    let visitorId: string | null = null;
    try {
      visitorId = window.localStorage.getItem("tb_vid");
    } catch {}
    fetch("/api/admin/this-device", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId }) }).catch(() => {});
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
    if (b.codes?.length) void copy(b.codes.join("\n"), "all");
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
      <p className="-mt-4 text-sm text-mute">Only you can see this page. · <Link href="/admin/funnel" className="text-accent">Funnel</Link> · <Link href="/admin/visitors" className="text-accent">Visitors</Link> · <Link href="/admin/pro" className="text-accent">Professional access requests</Link> · <Link href="/admin/outreach" className="text-accent">Pro outreach</Link> · <Link href="/admin/features" className="text-accent">Plan features</Link> · <Link href="/admin/risk-premium" className="text-accent">Bond engine: Risk Premium Model</Link> · <Link href="/admin/brokers" className="text-accent">Broker management</Link> · <Link href="/admin/seo" className="text-accent">SEO Management</Link> · <Link href="/admin/benchmark" className="text-accent">ETF comparison</Link> · <Link href="/admin/methodology" className="text-accent">Methodology 1–4</Link> · <Link href="/admin/risk-bands" className="text-accent">Risk bands</Link> · <Link href="/admin/efficient-database" className="text-accent">Efficient Database</Link> · <Link href="/admin/bond-efficiency" className="text-accent">Bond Efficiency</Link> · <Link href="/admin/bund-benchmark" className="text-accent">Bund benchmark</Link> · <Link href="/admin/us-treasury-benchmark" className="text-accent">US Treasury benchmark</Link> · <Link href="/admin/portfolio-efficiency" className="text-accent">Portfolio Efficiency</Link> · <Link href="/admin/data-quality" className="text-accent">Price checks</Link> · <Link href="/admin/bond-data" className="text-accent">Bond data</Link> · <Link href="/admin/classification" className="text-accent">Country &amp; industry</Link> · <Link href="/admin/legal-risk" className="text-accent">Legal risk</Link> · <Link href="/admin/assessments" className="text-accent">Assessments &amp; corrections</Link> · <Link href="/admin/welcome-email" className="text-accent">Welcome e-mail</Link> · <Link href="/admin/weekly-email" className="text-accent">Weekly e-mail</Link> · <Link href="/admin/skills" className="text-accent">Rating skills</Link> · <Link href="/admin/landingpage1" className="text-accent">Landing page 1 (saved)</Link></p>


      <PriceFreshnessCard />

      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="admin-stats">
          {[["Accounts", s.users], ["E-mail confirmed", s.verified], ["On free Premium (code)", s.onTrial], ["New in 7 days", s.newThisWeek]].map(([k, v]) => (
            <div key={k} className={card}>
              <p className="text-xs text-mute">{k}</p>
              <p className="mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}

      <EmailDomainCard />

      <AdminUsers />

      <AdminData />

      <section className={card}>
        <h2 className="text-lg font-semibold">Promo codes</h2>
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
              <button onClick={() => copy(fresh.join("\n"), "all")} className="text-sm text-accent">{copied === "all" ? "Copied to clipboard" : "Copy all"}</button>
            </div>
            <p className="mt-2 font-mono text-[15px] leading-7">{fresh.map((c) => <span key={c} className="block">{maskCode(c)}</span>)}</p>
            <p className="mt-2 text-xs text-mute">New users enter them when they sign up; existing users under “Have a code?” at https://10bonds.com/pricing.</p>
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
                    <span data-testid="code-masked">{maskCode(c.code)}</span>
                    <button onClick={() => copy(c.code, c.code)} className="ml-2 rounded-full border border-line px-2 py-0.5 font-sans text-xs text-accent hover:bg-canvas" data-testid="code-copy">{copied === c.code ? "Copied" : "Copy"}</button>
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
            <p className="mt-1 text-xs text-mute">Only visitors who allowed Statistics cookies are counted. Your own visits are left out on every device where you have opened this page.</p>
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

/** Codes stay hidden on screen; the copy buttons still copy the real code. */
function maskCode(code: string): string {
  return code.replace(/^(10B-)?(.*)$/, (_m, p: string | undefined, rest: string) => (p ?? "") + rest.replace(/[A-Z0-9]/g, "•"));
}
