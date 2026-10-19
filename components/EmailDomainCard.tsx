"use client";

import { useEffect, useState } from "react";
import type { DomainState } from "@/lib/emailDomain";

/** Admin: whether confirmation e-mails are on, and the DNS records still to add at Namecheap. */
export default function EmailDomainCard() {
  const [s, setS] = useState<DomainState | null>(null);
  useEffect(() => {
    fetch("/api/admin/email-domain", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => {});
  }, []);
  if (!s) return null;
  return (
    <div className="rounded-[24px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]" data-testid="email-domain">
      <h2 className="text-lg font-semibold">Confirmation e-mails</h2>
      {!s.configured ? (
        <p className="mt-2 text-sm text-mute">Off: no Resend key on the server yet.</p>
      ) : s.status === "verified" ? (
        <p className="mt-2 text-sm text-mute">On: sending from {s.domain} (verified).</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-mute">
            Off until {s.domain} is verified ({s.status}). Add these records at{" "}
            <a className="text-accent" href={`https://ap.www.namecheap.com/domains/domaincontrolpanel/${s.domain}/advancedns`} target="_blank" rel="noreferrer">Namecheap Advanced DNS</a>
            {" "}(Host = the name without “.{s.domain}”). This page checks again each time you open it.
          </p>
          {s.error && <p className="mt-2 text-sm text-red-600">{s.error}</p>}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="text-mute"><tr><th className="py-1 pr-3">Type</th><th className="py-1 pr-3">Host</th><th className="py-1 pr-3">Value</th><th className="py-1 pr-3">Priority</th><th className="py-1">Status</th></tr></thead>
              <tbody>
                {s.records.map((r, i) => (
                  <tr key={i} className="border-t border-line/60 align-top">
                    <td className="py-1.5 pr-3">{r.type}</td>
                    <td className="py-1.5 pr-3 font-mono">{r.name}</td>
                    <td className="py-1.5 pr-3 font-mono break-all">{r.value}</td>
                    <td className="py-1.5 pr-3">{r.priority ?? ""}</td>
                    <td className="py-1.5">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
