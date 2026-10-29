"use client";
import { useEffect, useState } from "react";

type Row = { currency: string; total: number; last24h: number; newest: string | null; within3td: number; withinRule: number };
type Data = { basis: string; ruleDays: number; rows: Row[] } | null;

const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");
const pct = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}%` : "–");

/** Top of the admin home: bonds with a price newer than 24 h, for the EUR and the USD database. */
export default function PriceFreshnessCard() {
  const [data, setData] = useState<Data | undefined>(undefined);
  useEffect(() => {
    fetch("/api/admin/price-freshness", { cache: "no-store" }).then((r) => r.json()).then((r) => setData(r.data ?? null)).catch(() => setData(null));
  }, []);
  return (
    <section className="rounded-lg border border-line bg-white p-6" data-testid="price-freshness-top">
      <h2 className="text-lg font-semibold">Prices newer than 24 hours</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(data?.rows ?? [{ currency: "EUR", total: 0, last24h: 0, newest: null, within3td: 0, withinRule: 0 }, { currency: "USD", total: 0, last24h: 0, newest: null, within3td: 0, withinRule: 0 }]).map((r) => (
          <div key={r.currency} className="rounded-xl bg-canvas p-3" data-testid={`fresh-${r.currency}`}>
            <p className="text-xs text-mute">{r.currency} database</p>
            <p className="mt-1 text-2xl font-semibold">{data ? `${r.last24h.toLocaleString("en")} of ${r.total.toLocaleString("en")} (${pct(r.last24h, r.total)})` : "…"}</p>
            <p className="mt-1 text-xs text-mute">Within 3 trading days: {data ? `${r.within3td.toLocaleString("en")} (${pct(r.within3td, r.total)})` : "…"} · Within {data?.ruleDays ?? 5} trading days (site rule): {data ? `${r.withinRule.toLocaleString("en")} (${pct(r.withinRule, r.total)})` : "…"}</p>
            <p className="mt-1 text-xs text-mute">Newest price: {data ? when(r.newest) : "…"}</p>
          </div>
        ))}
      </div>
      {data === null && <p className="mt-2 text-sm text-mute">Bond data is not connected.</p>}
      {data && <p className="mt-2 text-xs text-mute">Based on the {data.basis === "price_as_of" ? "price's own date" : "yield date (the copy has no price date yet)"}.</p>}
    </section>
  );
}
