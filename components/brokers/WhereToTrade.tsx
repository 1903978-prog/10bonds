"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// "Where can I trade this bond?" under the bond results. It points to the broker comparisons by market.
// It never claims a specific ISIN is available at a broker (no verified per-ISIN data), and it has no effect
// on which bonds are shown or their order.

type Market = { country: string; title: string; href: string; brokers: string[] };
const FLAGS: Record<string, string> = { it: "Italy", fr: "France", de: "Germany" };

export default function WhereToTrade() {
  const [markets, setMarkets] = useState<Market[]>([]);
  useEffect(() => {
    fetch("/api/brokers/where")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setMarkets(b?.markets ?? []))
      .catch(() => {});
  }, []);
  if (markets.length === 0) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute" data-testid="where-to-trade" title="These brokers give access to this kind of bond; check that a specific ISIN is available on the broker's own platform before you plan a purchase.">
      <span className="font-medium text-ink">Where can I trade these bonds?</span>
      {markets.map((m) => (
        <Link key={m.country} href={m.href} className="text-accent hover:underline" hrefLang={m.country}>
          {FLAGS[m.country] ?? m.country}{m.brokers.length > 0 ? ` (${m.brokers.slice(0, 3).join(", ")})` : ""}
        </Link>
      ))}
    </p>
  );
}
