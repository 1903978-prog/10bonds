"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ProRow } from "@/lib/pro";
import { registerFor } from "@/lib/proRegisters";

const d = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const tone = { pending: "bg-amber-100 text-amber-900", approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800", none: "" };

export default function ProAdmin() {
  const [rows, setRows] = useState<ProRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/pro", { cache: "no-store" });
    if (r.ok) setRows((await r.json()).requests);
    else setError("Could not load the requests.");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function decide(userId: number, status: "approved" | "rejected" | "pending") {
    const r = await fetch("/api/admin/pro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, status }) });
    if (!r.ok) setError("Could not save that.");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-accent">← Admin</Link>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Professional access</h1>
        <p className="text-sm text-mute">Approve only people you can match to a regulated firm (check the licence number on the regulator&apos;s register).</p>
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {rows?.length === 0 && <p className="text-mute">No requests yet.</p>}
      <div className="space-y-3">
        {rows?.map((r) => (
          <div key={r.userId} className="rounded-lg border border-line bg-white p-5" data-testid="pro-admin-row">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[r.status]}`}>{r.status}</span>
              <span className="font-medium">{r.firm}</span>
              <span className="text-sm text-mute">· {r.role} · {r.country}</span>
            </div>
            <p className="mt-2 text-sm">
              {r.username ? `${r.username} · ` : ""}{r.email}
            </p>
            <p className="text-sm text-mute">
              {r.regulator} · licence {r.licence}
              {r.website ? <> · <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer noopener" className="text-accent">{r.website}</a></> : null}
              {" "}· asked {d(r.requestedAt)}
              {r.registerUrl ? <> · <a href={r.registerUrl} target="_blank" rel="noreferrer noopener" className="text-accent">applicant’s register link</a></> : null}
              {registerFor(r.regulator) ? <> · <a href={registerFor(r.regulator)!} target="_blank" rel="noreferrer noopener" className="text-accent">open the {r.regulator} register</a></> : null}
              {r.trialEndsAt ? <> · trial ends {d(r.trialEndsAt)}</> : null}
            </p>
            <div className="mt-3 flex gap-2 text-sm">
              {r.status !== "approved" && <button onClick={() => decide(r.userId, "approved")} className="rounded-full bg-accent px-4 py-1.5 font-medium text-white" data-testid="pro-approve">Approve and start 14-day trial</button>}
              {r.status !== "rejected" && <button onClick={() => decide(r.userId, "rejected")} className="rounded-full bg-canvas px-4 py-1.5 font-medium">{r.status === "approved" ? "Remove access" : "Reject"}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
