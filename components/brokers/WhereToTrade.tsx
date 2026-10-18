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
    <section className="mt-6 rounded-[24px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)]" data-testid="where-to-trade">
      <h3 className="font-semibold">Where can I trade these bonds?</h3>
      <p className="mt-1 text-sm text-mute">
        Compare the cost of buying bonds at brokers in your country. These brokers give access to this kind of bond; check that a specific ISIN is
        available on the broker&apos;s own platform before you plan a purchase.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {markets.map((m) => (
          <li key={m.country}>
            <Link href={m.href} className="block rounded-2xl bg-canvas px-4 py-3 text-sm transition hover:bg-line/60" hrefLang={m.country}>
              <span className="block text-xs text-mute">{FLAGS[m.country] ?? m.country}</span>
              <span className="block font-medium text-accent">{m.title}</span>
              {m.brokers.length > 0 && <span className="block text-xs text-mute">{m.brokers.join(" · ")}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
