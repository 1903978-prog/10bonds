"use client";

import { useEffect, useRef, useState } from "react";
import type { PortfolioAnalysis } from "@/lib/portfolioAnalysis";
import { RiskBadge } from "./RiskBadge";

const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(2)}%`);
const yrs = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(1)} yrs`);
const eur = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/** Portfolio check-up: value-weighted yield, duration and risk, and where the portfolio sits on the market's yield-vs-risk curve. */
export default function PortfolioCheck({ a }: { a: PortfolioAnalysis }) {
  const t = a.totals;
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-8" data-testid="pro-check">
      <h2 className="text-xl font-semibold tracking-tight">Portfolio check-up</h2>
      <p className="mt-1 text-sm text-mute">
        {a.positions.length} {a.positions.length === 1 ? "bond" : "bonds"} found{a.notFound.length ? ` · ${a.notFound.length} not in our data` : ""}. Averages are weighted by market value.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Market value" value={eur(t.value)} />
        <Stat label="Yield (YTM)" value={pct(t.ytm)} />
        <Stat label="Duration" value={yrs(t.duration)} />
        <Stat label="Risk (1–10)" value={t.risk === null ? "—" : <RiskBadge risk={Math.round(t.risk * 10) / 10} />} />
      </div>

      {a.band && a.curve.length > 0 && t.ytm !== null && t.risk !== null && (
        <>
          <h3 className="mt-7 text-[15px] font-semibold">Yield vs risk, durations {a.band.from.toFixed(1)}–{a.band.to.toFixed(1)} years</h3>
          <p className="mt-1 text-xs text-mute">Market yields at each risk score for bonds with a duration close to this portfolio (±20%). The dot is this portfolio.</p>
          <Chart curve={a.curve} dot={{ risk: t.risk, ytm: t.ytm }} />
          <Verdict curve={a.curve} risk={t.risk} ytm={t.ytm} />
        </>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs text-mute">
            <tr>
              <th className="py-2 pr-3 font-medium">Bond</th>
              <th className="py-2 pr-3 text-right font-medium">Quantity</th>
              <th className="py-2 pr-3 text-right font-medium">Price*</th>
              <th className="py-2 pr-3 text-right font-medium">Value</th>
              <th className="py-2 pr-3 text-right font-medium">YTM</th>
              <th className="py-2 pr-3 text-right font-medium">Duration</th>
              <th className="py-2 text-right font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {a.positions.map((p) => (
              <tr key={p.isin} className="border-t border-line">
                <td className="py-2 pr-3">
                  <p className="font-medium">{p.name}</p>
                  <p className="font-mono text-xs text-mute">{p.isin}</p>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{p.quantity.toLocaleString("en-GB")}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{p.price === null ? "—" : p.price.toFixed(2)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{eur(p.value)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{pct(p.ytm)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{yrs(p.duration)}</td>
                <td className="py-2 text-right"><RiskBadge risk={p.risk} /></td>
              </tr>
            ))}
            {a.notFound.map((isin) => (
              <tr key={isin} className="border-t border-line text-mute">
                <td className="py-2 pr-3 font-mono text-xs" colSpan={7}>{isin} · not in our data, left out of the averages</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-mute">* Indicative clean price per 100, worked out from the yield (annual coupon assumed). Check live prices with your broker.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-canvas p-4">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-[17px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Verdict({ curve, risk, ytm }: { curve: PortfolioAnalysis["curve"]; risk: number; ytm: number }) {
  const at = curve.find((c) => c.risk === Math.round(risk));
  if (!at) return null;
  const gap = at.best - ytm;
  return (
    <p className="mt-3 rounded-xl bg-canvas px-4 py-3 text-sm" data-testid="pro-verdict">
      At risk score {Math.round(risk)}, bonds with a similar duration yield {pct(at.typical)} typically and up to {pct(at.best)}.
      {gap > 0.05 ? ` This portfolio yields ${pct(ytm)}: up to ${gap.toFixed(2)} points a year may be available for the same risk.` : ` This portfolio yields ${pct(ytm)}, close to the best available for its risk.`}
    </p>
  );
}

const M = { l: 48, r: 16, t: 16, b: 40 };

function Chart({ curve, dot }: { curve: PortfolioAnalysis["curve"]; dot: { risk: number; ytm: number } }) {
  // Draw at the real width so labels keep their size on a phone.
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 240 : 300;
  const ys = [...curve.flatMap((c) => [c.best, c.typical]), dot.ytm];
  let lo = Math.floor(Math.min(...ys) * 2) / 2 - 0.5;
  const hi = Math.ceil(Math.max(...ys) * 2) / 2 + 0.5;
  lo = Math.max(lo, Math.min(0, ...ys));
  const x = (r: number) => M.l + ((r - 1) / 9) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
  const path = (k: "best" | "typical") => curve.map((c, i) => `${i ? "L" : "M"}${x(c.risk).toFixed(1)},${y(c[k]).toFixed(1)}`).join(" ");
  const step = hi - lo > 6 ? 2 : hi - lo > 3 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);

  return (
    <figure ref={box} className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Yield against risk score, with this portfolio as a dot" data-testid="pro-chart">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="#e5e5ea" />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6e6e73">{v}%</text>
          </g>
        ))}
        {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
          <text key={r} x={x(r)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="#6e6e73">{r}</text>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#6e6e73">{W < 480 ? "Risk score" : "Risk score (1 = lowest, 10 = highest)"}</text>
        <path d={path("typical")} fill="none" stroke="#a1a1a6" strokeWidth="2" strokeDasharray="5 4" />
        <path d={path("best")} fill="none" stroke="#0071e3" strokeWidth="2.5" />
        {curve.map((c) => <circle key={c.risk} cx={x(c.risk)} cy={y(c.best)} r="3.5" fill="#0071e3" />)}
        <circle cx={x(dot.risk)} cy={y(dot.ytm)} r="8" fill="#ea580c" stroke="#fff" strokeWidth="2.5" />
        <text x={x(dot.risk)} y={y(dot.ytm) - 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1d1d1f">This portfolio</text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute">
        <span><span className="mr-1.5 inline-block h-0.5 w-5 bg-accent align-middle" />Best yield available</span>
        <span><span className="mr-1.5 inline-block w-5 border-t-2 border-dashed border-[#a1a1a6] align-middle" />Typical yield (median)</span>
        <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#ea580c] align-middle" />This portfolio</span>
      </figcaption>
    </figure>
  );
}
