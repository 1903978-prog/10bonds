"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Exclusion } from "@/lib/blacklist";

/** Profile page: the bonds and issuers the customer chose never to see, each with a remove button. */
export default function ExclusionsCard({ card }: { card: string }) {
  const [data, setData] = useState<{ allowed: boolean; items: Exclusion[] } | null>(null);
  const load = () =>
    fetch("/api/account/blacklist", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setData(j))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);

  async function remove(e: Exclusion) {
    setData((d) => d && { ...d, items: d.items.filter((x) => !(x.kind === e.kind && x.value === e.value)) });
    await fetch("/api/account/blacklist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) }).catch(() => null);
    load();
  }

  if (!data) return null;
  return (
    <div className={card} id="excluded" data-testid="exclusions">
      <h2 className="text-lg font-semibold">Excluded bonds and issuers</h2>
      <p className="mt-1 text-sm text-mute">
        {data.allowed
          ? "They never appear in your top 10. Add one with the ⇄ button next to a bond."
          : <>Paid plans can exclude bonds or issuers so they never appear in the top 10. <Link href="/pricing" className="text-accent">See plans</Link></>}
      </p>
      {data.items.length > 0 && (
        <ul className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {data.items.map((e) => (
            <li key={`${e.kind}:${e.value}`} className="flex items-center gap-1.5 rounded-full bg-canvas py-1 pl-3 pr-1 text-xs">
              <span className="text-mute">{e.kind === "issuer" ? "Issuer" : "Bond"}</span>
              <span className="max-w-[16rem] truncate font-medium">{e.label}</span>
              <button type="button" onClick={() => remove(e)} aria-label={`Remove ${e.label}`} className="h-5 w-5 rounded-full text-mute hover:bg-white">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
