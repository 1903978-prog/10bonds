"use client";

import { useMemo, useState } from "react";
import { bondYield, checkBond, type BondInput } from "@/lib/seo/calc";
import type { CalculatorText } from "@/lib/seo/calculators";

const NUM: Record<string, string> = { it: "it-IT", fr: "fr-FR", de: "de-DE", en: "en-GB" };
const field = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-[16px]";

/** Gross and after-tax yield to maturity. Everything is computed in the browser; nothing is sent anywhere. */
export default function YieldCalculator({ locale, text }: { locale: string; text: CalculatorText }) {
  const L = text.labels;
  const today = new Date().toISOString().slice(0, 10);
  const inFive = `${Number(today.slice(0, 4)) + 5}${today.slice(4)}`;
  const [price, setPrice] = useState("98");
  const [coupon, setCoupon] = useState("3");
  const [frequency, setFrequency] = useState<1 | 2 | 4>(2);
  const [maturity, setMaturity] = useState(inFive);
  const [settlement, setSettlement] = useState(today);
  const [rate, setRate] = useState(String(text.defaultRate));
  const n = (v: string) => Number(v.replace(",", "."));
  const input: BondInput = { price: n(price), coupon: n(coupon), frequency, maturity, settlement, taxRate: n(rate) };
  const error = checkBond(input);
  const r = useMemo(() => (error ? null : bondYield(input)), [error, price, coupon, frequency, maturity, settlement, rate]);
  const f = (x: number, d = 2) => x.toLocaleString(NUM[locale], { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-8" data-testid="yield-calculator">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">{L.price}<input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={field} data-testid="calc-price" /></label>
        <label className="text-sm font-medium">{L.coupon}<input inputMode="decimal" value={coupon} onChange={(e) => setCoupon(e.target.value)} className={field} data-testid="calc-coupon" /></label>
        <label className="text-sm font-medium">{L.maturity}<input type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} className={field} data-testid="calc-maturity" /></label>
        <label className="text-sm font-medium">{L.settlement}<input type="date" value={settlement} onChange={(e) => setSettlement(e.target.value)} className={field} /></label>
        <label className="text-sm font-medium">{L.frequency}
          <select value={frequency} onChange={(e) => setFrequency(Number(e.target.value) as 1 | 2 | 4)} className={field}>
            <option value={1}>{L.annual}</option><option value={2}>{L.semi}</option><option value={4}>{L.quarterly}</option>
          </select>
        </label>
        <div className="text-sm font-medium">{L.tax}
          <div className="mt-1 flex flex-wrap gap-2">
            {text.presets.map((p) => (
              <button key={p.label} type="button" onClick={() => setRate(String(p.rate))} className={`rounded-full px-3 py-1.5 text-xs ${n(rate) === p.rate ? "bg-accent text-white" : "bg-canvas"}`}>{p.label}</button>
            ))}
          </div>
          <label className="mt-2 block text-xs text-mute">{L.custom}<input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={field} data-testid="calc-rate" /></label>
        </div>
      </div>
      {error || !r || !Number.isFinite(r.grossYtm) ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{L.invalid}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-canvas p-4"><p className="text-xs text-mute">{L.gross}</p><p className="mt-1 text-2xl font-semibold" data-testid="calc-gross">{f(r.grossYtm)}%</p></div>
            <div className="rounded-2xl bg-canvas p-4"><p className="text-xs text-mute">{L.net} ({n(rate).toLocaleString(NUM[locale], { maximumFractionDigits: 3 })}%)</p><p className="mt-1 text-2xl font-semibold text-accent" data-testid="calc-net">{f(r.netYtm)}%</p></div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-mute">{L.current}</dt><dd>{f(r.currentYield)}%</dd></div>
            <div><dt className="text-xs text-mute">{L.accrued}</dt><dd>{f(r.accrued, 3)}</dd></div>
            <div><dt className="text-xs text-mute">{L.dirty}</dt><dd>{f(r.dirtyPrice, 3)}</dd></div>
            <div><dt className="text-xs text-mute">{L.years}</dt><dd>{f(r.years, 1)}</dd></div>
          </dl>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-accent">{L.flows} ({r.cashflows.length})</summary>
            <div className="mt-2 max-h-64 overflow-auto">
              <table className="w-full text-left"><thead className="text-xs text-mute"><tr><th className="py-1">{L.date}</th><th>{L.grossFlow}</th><th>{L.netFlow}</th></tr></thead>
                <tbody>{r.cashflows.map((c) => <tr key={c.date} className="border-t border-line"><td className="py-1">{c.date}</td><td>{f(c.gross, 3)}</td><td>{f(c.net, 3)}</td></tr>)}</tbody>
              </table>
            </div>
          </details>
        </>
      )}
      <p className="mt-5 text-xs text-mute">{text.taxNote}</p>
    </div>
  );
}
