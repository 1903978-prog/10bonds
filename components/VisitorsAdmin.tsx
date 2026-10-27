"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import type { VisitorPage, VisitorRow } from "@/lib/accounts";
import { FUNNEL_LABEL } from "@/lib/trackRules";

const when = (s: string) => new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dur = (s: number) => (s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`);

export default function VisitorsAdmin() {
  const [rows, setRows] = useState<VisitorRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pages, setPages] = useState<Record<string, VisitorPage[]>>({});
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/admin/visitors", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => setRows(j.visitors)).catch(() => setError(true));
  }, []);
  async function toggle(code: string) {
    if (open === code) return setOpen(null);
    setOpen(code);
    if (!pages[code]) {
      const j = await fetch(`/api/admin/visitors?code=${code}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (j?.pages) setPages((p) => ({ ...p, [code]: j.pages }));
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-accent">← Admin</Link>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Visitors</h1>
        <p className="text-sm text-mute">Visitors who allowed statistics, each with an anonymous number. No names or e-mails are stored against a number. Your own devices are left out. A “~” before a country means it is estimated from the browser timezone.</p>
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Could not load the visitors.</p>}
      {rows?.length === 0 && <p className="text-mute">No visitors recorded yet.</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-[24px] bg-white p-5">
          <table className="w-full text-sm" data-testid="visitors-table">
            <thead>
              <tr className="text-left text-xs text-mute">
                {["Visitor", "First seen", "Last seen", "Visits", "Country", "Device", "Language", "Came from", "Pages", "Time", "Searches", "Furthest step"].map((h) => <th key={h} className="pb-2 pr-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.code}>
                  <tr className="cursor-pointer border-t border-line hover:bg-canvas" onClick={() => toggle(r.code)}>
                    <td className="py-2 pr-3 font-mono">{r.code}</td>
                    <td className="pr-3 text-mute">{when(r.firstSeen)}</td>
                    <td className="pr-3 text-mute">{when(r.lastSeen)}</td>
                    <td className="pr-3 tabular-nums">{r.visits}</td>
                    <td className="pr-3">{r.country ? `${r.countrySource === "estimated" ? "~" : ""}${r.country}` : "—"}</td>
                    <td className="pr-3">{r.device ?? "—"}</td>
                    <td className="pr-3">{r.lang ?? "—"}</td>
                    <td className="max-w-[9rem] truncate pr-3">{r.referrer ?? "direct"}</td>
                    <td className="pr-3 tabular-nums">{r.pages}</td>
                    <td className="pr-3 tabular-nums">{dur(r.seconds)}</td>
                    <td className="pr-3 tabular-nums">{r.searches}</td>
                    <td className="pr-3">{FUNNEL_LABEL[r.stage] ?? "Page view"}</td>
                  </tr>
                  {open === r.code && (
                    <tr key={`${r.code}-p`} className="bg-canvas/60">
                      <td colSpan={12} className="px-3 py-2">
                        {!pages[r.code] ? <span className="text-mute">Loading…</span> : pages[r.code].length === 0 ? <span className="text-mute">No pages.</span> : (
                          <ul className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                            {pages[r.code].map((p) => <li key={p.path} className="flex justify-between"><span className="font-mono">{p.path}</span><span className="tabular-nums text-mute">{p.views}× · {dur(p.seconds)}</span></li>)}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
