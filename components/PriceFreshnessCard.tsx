"use client";
import { useEffect, useState } from "react";

type Group = { reason: string; count: number };
type Row = { currency: "EUR" | "USD"; total: number; last24h: number; within1: number; within3: number; within5: number; noDate: number; newestQuote: string | null; lastPush: string | null; pushIsReal: boolean; notRefreshed: Group[] };
type Data = { rows: Row[]; banner: { red: boolean; reasons: string[] }; columns: { attempt: boolean; status: boolean; reason: boolean }; staleRuleDays: number } | null;
type Bond = { isin: string; name: string | null; issuer: string | null; priceDate: string | null; ageTradingDays: number | null; status: string | null };

const stamp = (s: string | null, tz: string) => (s ? new Date(s).toLocaleString("en-GB", { timeZone: tz, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");
const pct = (n: number, t: number) => (t ? `${Math.round((n / t) * 1000) / 10}%` : "–");
const num = (n: number) => n.toLocaleString("en");

function Group({ cur, g }: { cur: string; g: Group }) {
  const [open, setOpen] = useState(false);
  const [bonds, setBonds] = useState<Bond[] | null>(null);
  const toggle = () => {
    setOpen(!open);
    if (!bonds) fetch(`/api/admin/price-freshness?bonds=1&cur=${cur}&reason=${encodeURIComponent(g.reason)}`, { cache: "no-store" }).then((r) => r.json()).then((r) => setBonds(r.data ?? [])).catch(() => setBonds([]));
  };
  return (
    <li className="py-1.5 text-sm" data-testid={`group-${cur}`}>
      <button onClick={toggle} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <span>{g.reason}: <b>{num(g.count)}</b></span>
        <span className="text-xs text-mute">{open ? "Hide" : "Show bonds"}</span>
      </button>
      {open && (
        <div className="mt-2 max-h-64 overflow-auto rounded-md bg-canvas p-2 text-xs">
          {!bonds ? "…" : bonds.length === 0 ? "No bonds." : bonds.map((b) => (
            <div key={b.isin} className="flex justify-between gap-3 py-0.5"><span>{b.isin} {b.name ?? b.issuer ?? ""}</span><span className="shrink-0 text-mute">{b.priceDate ?? "no date"}{b.ageTradingDays !== null ? ` · ${b.ageTradingDays} d` : ""}</span></div>
          ))}
          {bonds && bonds.length >= 300 && <p className="mt-1 text-mute">First 300 shown; the CSV has all.</p>}
        </div>
      )}
    </li>
  );
}

/** Admin home: how fresh the bond prices are, for EUR and USD, with the last LM push and the bonds that were not refreshed. */
export default function PriceFreshnessCard() {
  const [data, setData] = useState<Data | undefined>(undefined);
  useEffect(() => {
    fetch("/api/admin/price-freshness", { cache: "no-store" }).then((r) => r.json()).then((r) => setData(r.data ?? null)).catch(() => setData(null));
  }, []);
  return (
    <section className="rounded-lg border border-line bg-white p-6" data-testid="price-freshness-top">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Price freshness</h2>
        <a href="/api/admin/price-freshness?csv=1" className="text-sm underline" data-testid="fresh-csv">Download CSV (not refreshed)</a>
      </div>
      {data?.banner.red && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert" data-testid="fresh-banner">
          {data.banner.reasons.map((r) => <p key={r}>{r}</p>)}
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(data?.rows ?? []).map((r) => (
          <div key={r.currency} className="rounded-xl bg-canvas p-3" data-testid={`fresh-${r.currency}`}>
            <p className="text-xs text-mute">{r.currency} database · {num(r.total)} bonds</p>
            <p className="mt-1 text-sm">Price within 1 trading day: <b>{pct(r.within1, r.total)}</b> ({num(r.within1)})</p>
            <p className="text-sm">Within 3 trading days: <b>{pct(r.within3, r.total)}</b> ({num(r.within3)})</p>
            <p className="text-sm">Within 5 trading days: <b>{pct(r.within5, r.total)}</b> ({num(r.within5)})</p>
            <p className="mt-1 text-xs text-mute">Last {r.pushIsReal ? "push" : "quote (no push time sent yet)"}: {stamp(r.lastPush, "Asia/Bangkok")} Bangkok · {stamp(r.lastPush, "Europe/Berlin")} CET</p>
          </div>
        ))}
        {data === undefined && <p className="text-sm text-mute">…</p>}
      </div>
      {data === null && <p className="mt-2 text-sm text-mute">Bond data is not connected.</p>}
      {data && (
        <>
          <h3 className="mt-5 text-base font-semibold">Not refreshed (price older than 3 trading days)</h3>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.rows.map((r) => (
              <div key={r.currency}>
                <p className="text-xs text-mute">{r.currency}</p>
                {r.notRefreshed.length === 0 ? <p className="text-sm">None.</p> : <ul className="divide-y divide-line">{r.notRefreshed.map((g) => <Group key={g.reason} cur={r.currency} g={g} />)}</ul>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-mute">
            Trading days use the TARGET2 calendar (EUR) and the SIFMA calendar (USD). Price date = the price's own date, else the yield date. Portfolio rule: a price older than {data.staleRuleDays} trading days is left out.
            {!data.columns.reason && " The data feed does not send refresh reasons yet, so every group reads “No reason sent by data feed”."}
            {!data.columns.attempt && " It does not send a push time yet either; the newest quote time is shown instead and the 26 h push alert is off."}
          </p>
        </>
      )}
    </section>
  );
}
