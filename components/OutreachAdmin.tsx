"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import type { OutreachRow } from "@/lib/outreach";

const tone: Record<string, string> = { draft: "bg-amber-100 text-amber-900", sent: "bg-green-100 text-green-800", failed: "bg-red-100 text-red-800", optout: "bg-canvas text-mute" };

export default function OutreachAdmin() {
  const [rows, setRows] = useState<OutreachRow[] | null>(null);
  const [replyTo, setReplyTo] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/outreach", { cache: "no-store" });
    if (r.ok) { const j = await r.json(); setRows(j.rows); setReplyTo(j.replyToSet); } else setMsg("Could not load.");
  }, []);
  useEffect(() => { load(); }, [load]);
  const post = async (body: object) => (await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json().catch(() => ({}));

  async function send(r: OutreachRow) {
    if (!window.confirm(`Send this e-mail to ${r.firm} (${r.email}) now? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", id: r.id, confirm: true }) });
    const j = await res.json().catch(() => ({}));
    setMsg(j.result === "sent" ? `Sent to ${r.firm}.` : j.result === "not-configured" ? "Not sent: set OUTREACH_REPLY_TO (an inbox that receives replies) and the e-mail service on the server first." : j.result === "blocked" ? "Not sent: e-mail to firms in this country needs prior consent." : "Not sent.");
    load();
  }
  const counts = (rows ?? []).reduce<Record<string, number>>((a, r) => ((a[r.country] = (a[r.country] ?? 0) + 1), a), {});
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-accent">← Admin</Link>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Pro outreach</h1>
        <p className="text-sm text-mute">Drafts only. Nothing is sent until you press Send on a line and confirm. Firm-level contact addresses taken from each firm’s own website, no personal addresses.</p>
      </div>
      {!replyTo && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Sending is switched off until the server has an OUTREACH_REPLY_TO address (the inbox that receives replies and “STOP”).</p>}
      <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-mute">Germany: unsolicited e-mail advertising, even to firms, needs prior consent (UWG §7), so Send is blocked for German firms. Italy and France allow B2B e-mail to a firm’s public address with a clear opt-out, which every draft contains. Ask a lawyer to confirm before the first send.</p>
      {msg && <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent" data-testid="outreach-msg">{msg}</p>}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button onClick={async () => { const j = await post({ action: "load" }); setMsg(`${j.added ?? 0} drafts added.`); load(); }} className="rounded-full bg-accent px-4 py-2 font-medium text-white" data-testid="outreach-load">Load first batch as drafts</button>
        <span className="text-mute" data-testid="outreach-counts">{Object.entries(counts).map(([c, n]) => `${c}: ${n}`).join(" · ") || "No drafts yet."}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white p-5">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-mute"><th className="pb-2 pr-3">Country</th><th className="pb-2 pr-3">Firm</th><th className="pb-2 pr-3">Address</th><th className="pb-2 pr-3">Status</th><th /></tr></thead>
          <tbody>
            {rows?.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-t border-line align-top" data-testid="outreach-row">
                  <td className="py-2 pr-3">{r.country}</td>
                  <td className="pr-3">{r.firm}<span className="block text-xs text-mute">{r.city} · <a href={r.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-accent">source</a></span></td>
                  <td className="pr-3">{r.email}</td>
                  <td className="pr-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[r.status]}`}>{r.status}</span>{r.blocked && r.status === "draft" && <span className="ml-1 text-xs text-mute">send blocked</span>}</td>
                  <td className="space-x-2 whitespace-nowrap text-right">
                    <button onClick={() => setOpen(open === r.id ? null : r.id)} className="rounded-full bg-canvas px-3 py-1">Read</button>
                    {(r.status === "draft" || r.status === "failed") && <button onClick={() => send(r)} disabled={r.blocked} className="rounded-full bg-ink px-3 py-1 text-white disabled:opacity-40" data-testid="outreach-send">Send</button>}
                    {r.status !== "sent" && r.status !== "optout" && <button onClick={async () => { await post({ action: "optout", id: r.id }); load(); }} className="rounded-full bg-canvas px-3 py-1">Do not contact</button>}
                  </td>
                </tr>
                {open === r.id && (
                  <tr><td colSpan={5} className="bg-canvas/60 px-3 py-3"><p className="font-medium">{r.subject}</p><pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] text-ink/80">{r.body}</pre></td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
