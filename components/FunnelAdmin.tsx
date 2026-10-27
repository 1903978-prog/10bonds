"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FUNNEL, FUNNEL_EXTRA, FUNNEL_LABEL } from "@/lib/trackRules";

type Data = {
  days: number;
  steps: { kind: string; visitors: number; fromPrevious: number | null; fromTop: number | null }[];
  extra: { kind: string; visitors: number }[];
  table: { day: string; counts: Record<string, number> }[];
  payingNow: number;
  countries: { country: string; visitors: number; anonymousPageViews: number; accounts: number }[];
};

const pct = (v: number | null) => (v === null ? "–" : `${v}%`);

export default function FunnelAdmin() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setError(false);
    fetch(`/api/admin/funnel?days=${days}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setD)
      .catch(() => setError(true));
  }, [days]);
  const kinds = [...FUNNEL, ...FUNNEL_EXTRA] as string[];
  const max = Math.max(1, ...(d?.steps.map((s) => s.visitors) ?? [1]));
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-accent">← Admin</Link>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Funnel</h1>
        <p className="text-sm text-mute">Visitors who allowed usage statistics, counted once per step per day. Your own devices are left out. Visitors who refuse statistics are not counted, so real numbers are higher.</p>
      </div>
      <div className="flex gap-2 text-sm">
        {[7, 30, 90].map((n) => (
          <button key={n} onClick={() => setDays(n)} className={`rounded-full px-4 py-1.5 font-medium ${days === n ? "bg-accent text-white" : "bg-canvas"}`}>{n} days</button>
        ))}
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Could not load the numbers.</p>}
      {d && (
        <>
          <div className="rounded-[24px] bg-white p-5" data-testid="funnel-steps">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-mute"><th className="pb-2">Step</th><th className="pb-2 text-right">Visitors</th><th className="pb-2 text-right">From previous</th><th className="pb-2 text-right">From top</th><th className="w-1/3 pb-2" /></tr></thead>
              <tbody>
                {d.steps.map((s) => (
                  <tr key={s.kind} className="border-t border-line">
                    <td className="py-2">{FUNNEL_LABEL[s.kind] ?? s.kind}</td>
                    <td className="py-2 text-right tabular-nums">{s.visitors}</td>
                    <td className="py-2 text-right tabular-nums">{pct(s.fromPrevious)}</td>
                    <td className="py-2 text-right tabular-nums">{pct(s.fromTop)}</td>
                    <td className="py-2 pl-4"><div className="h-2 rounded-full bg-accent/70" style={{ width: `${(s.visitors / max) * 100}%` }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-mute">Paying subscribers right now, from the accounts table (not from browser events): <b data-testid="paying-now">{d.payingNow}</b></p>
          </div>
          <div className="rounded-[24px] bg-white p-5">
            <h2 className="font-semibold">Upgrade prompts and Pro</h2>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {d.extra.map((s) => <li key={s.kind} className="flex justify-between border-t border-line py-1.5"><span>{FUNNEL_LABEL[s.kind]}</span><span className="tabular-nums">{s.visitors}</span></li>)}
            </ul>
          </div>
          <div className="rounded-[24px] bg-white p-5" data-testid="funnel-countries">
            <h2 className="font-semibold">Countries</h2>
            <p className="text-xs text-mute">Visitors = people who allowed statistics. Page views without statistics = anonymous daily counts. Accounts = all sign-ups. “??” = country unknown.</p>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left text-xs text-mute"><th className="pb-1">Country</th><th className="pb-1 text-right">Visitors</th><th className="pb-1 text-right">Page views without statistics</th><th className="pb-1 text-right">Accounts</th></tr></thead>
              <tbody>
                {d.countries.length === 0 && <tr><td colSpan={4} className="py-2 text-mute">Nothing yet.</td></tr>}
                {d.countries.map((c) => <tr key={c.country} className="border-t border-line"><td className="py-1.5">{c.country}</td><td className="py-1.5 text-right tabular-nums">{c.visitors}</td><td className="py-1.5 text-right tabular-nums">{c.anonymousPageViews}</td><td className="py-1.5 text-right tabular-nums">{c.accounts}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-[24px] bg-white p-5">
            <h2 className="font-semibold">Daily visitors per step</h2>
            <table className="mt-2 w-full text-xs">
              <thead><tr className="text-left text-mute"><th className="pb-2 pr-3">Day</th>{kinds.map((k) => <th key={k} className="pb-2 pr-3 text-right font-medium">{FUNNEL_LABEL[k]}</th>)}</tr></thead>
              <tbody>
                {d.table.length === 0 && <tr><td className="py-2 text-mute" colSpan={kinds.length + 1}>No events yet.</td></tr>}
                {d.table.map((r) => (
                  <tr key={r.day} className="border-t border-line"><td className="py-1.5 pr-3">{r.day}</td>{kinds.map((k) => <td key={k} className="py-1.5 pr-3 text-right tabular-nums">{r.counts[k] ?? 0}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
