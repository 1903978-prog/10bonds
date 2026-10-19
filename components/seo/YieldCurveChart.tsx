"use client";

import { useMemo, useState } from "react";
import { countryName, type Curve, type CurveText } from "@/lib/seo/yieldCurves";

const NUM: Record<string, string> = { it: "it-IT", fr: "fr-FR", de: "de-DE", en: "en-GB" };
const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#ca8a04", "#db2777", "#4f46e5", "#65a30d", "#0d9488", "#b45309", "#7c3aed", "#e11d48", "#0284c7", "#15803d"];
const W = 760, H = 340, L = 44, R = 14, T = 14, B = 30;

/** Government yield curves by country: pick countries and a horizon. Everything is drawn in the browser. */
export default function YieldCurveChart({ locale, text, curves, initial }: { locale: string; text: CurveText; curves: Curve[]; initial: string[] }) {
  const names = useMemo(() => {
    return Object.fromEntries(curves.map((c) => [c.country, countryName(c.country, NUM[locale] ?? "en-GB")]));
  }, [curves, locale]);
  const order = useMemo(() => [...curves].sort((a, b) => names[a.country].localeCompare(names[b.country], locale)), [curves, names, locale]);
  const color = (code: string) => COLORS[curves.findIndex((c) => c.country === code) % COLORS.length];
  const [on, setOn] = useState<string[]>(() => {
    const start = initial.filter((c) => curves.some((x) => x.country === c));
    return start.length ? start : curves.slice(0, 4).map((c) => c.country);
  });
  const [range, setRange] = useState<0 | 1 | 2>(0);
  const pct = (v: number) => `${v.toLocaleString(NUM[locale], { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;

  const first = new Date().getFullYear();
  const last = range === 0 ? first + 10 : range === 1 ? first + 20 : Infinity;
  const shown = curves.filter((c) => on.includes(c.country)).map((c) => ({ ...c, points: c.points.filter((p) => p.year <= last) })).filter((c) => c.points.length);
  const all = shown.flatMap((c) => c.points);

  if (!curves.length) return <p className="mt-6 rounded-2xl bg-white p-6 text-mute">{text.empty}</p>;

  const x0 = all.length ? Math.min(...all.map((p) => p.year)) : first;
  const x1 = all.length ? Math.max(...all.map((p) => p.year), x0 + 1) : first + 10;
  const y0 = all.length ? Math.floor(Math.min(...all.map((p) => p.ytm)) * 2) / 2 : 0;
  const y1 = all.length ? Math.ceil(Math.max(...all.map((p) => p.ytm)) * 2) / 2 : 5;
  const sx = (year: number) => L + ((year - x0) / (x1 - x0)) * (W - L - R);
  const sy = (v: number) => T + (1 - (v - y0) / Math.max(y1 - y0, 0.5)) * (H - T - B);
  const yTicks: number[] = [];
  for (let v = y0; v <= y1 + 1e-9; v += y1 - y0 > 4 ? 1 : 0.5) yTicks.push(Math.round(v * 10) / 10);
  const step = Math.max(1, Math.ceil((x1 - x0) / 8));
  const xTicks: number[] = [];
  for (let y = x0; y <= x1; y += step) xTicks.push(y);

  const chip = "rounded-full px-3 py-1 text-[13px] border transition";
  return (
    <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold">{text.chartTitle}</h2>
        <div className="flex gap-1">
          {text.ranges.map((r, i) => (
            <button key={r} type="button" onClick={() => setRange(i as 0 | 1 | 2)} className={`${chip} ${range === i ? "border-accent bg-accent text-white" : "border-line text-mute hover:text-ink"}`}>{r}</button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label={text.chartTitle}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="#e5e7eb" strokeDasharray="3 3" />
            <text x={L - 6} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{pct(v)}</text>
          </g>
        ))}
        {xTicks.map((y) => <text key={y} x={sx(y)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b7280">{y}</text>)}
        {shown.map((c) => (
          <g key={c.country}>
            <polyline fill="none" stroke={color(c.country)} strokeWidth="2" points={c.points.map((p) => `${sx(p.year)},${sy(p.ytm)}`).join(" ")} />
            {c.points.map((p) => (
              <circle key={p.year} cx={sx(p.year)} cy={sy(p.ytm)} r="3.5" fill={color(c.country)}>
                <title>{`${names[c.country]} ${p.year}: ${pct(p.ytm)} (${p.bonds} ${text.bondsCol})`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setOn(curves.map((c) => c.country))} className={`${chip} border-line text-mute hover:text-ink`}>{text.all}</button>
        <button type="button" onClick={() => setOn([])} className={`${chip} border-line text-mute hover:text-ink`}>{text.none}</button>
        {order.map((c) => {
          const active = on.includes(c.country);
          return (
            <button key={c.country} type="button" aria-pressed={active} onClick={() => setOn(active ? on.filter((x) => x !== c.country) : [...on, c.country])}
              className={`${chip} inline-flex items-center gap-1.5 ${active ? "border-ink/20 text-ink" : "border-transparent text-mute"}`}>
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: active ? color(c.country) : "#d1d5db" }} />
              {names[c.country]}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-mute">{text.note}</p>
    </section>
  );
}
