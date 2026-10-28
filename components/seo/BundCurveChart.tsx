"use client";

import { useState } from "react";
import type { BundCurveText } from "@/lib/seo/bundCurve";

const NUM: Record<string, string> = { it: "it-IT", fr: "fr-FR", de: "de-DE", en: "en-GB" };
const W = 760, H = 300, L = 46, R = 14, T = 12, B = 28;
const sx = (y: number) => L + ((y - 1) / 29) * (W - L - R);

/** Bund curve, 1-30 years. Hover or tap a year to read its yield in a fixed slot (no layout shift). */
export default function BundCurveChart({ locale, text, points: rows }: { locale: string; text: Pick<BundCurveText, "chartTitle" | "years">; points: { years: number; yield: number }[] }) {
  const [sel, setSel] = useState(10);
  const Y0 = Math.floor(Math.min(...rows.map((r) => r.yield)) * 2) / 2, Y1 = Math.max(Y0 + 0.5, Math.ceil(Math.max(...rows.map((r) => r.yield)) * 2) / 2);
  const sy = (v: number) => T + (1 - (v - Y0) / (Y1 - Y0)) * (H - T - B);
  const loc = NUM[locale] ?? "en-GB";
  const pct = (v: number, d = 2) => `${v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
  const cur = rows.find((r) => r.years === sel) ?? rows[0];
  const yTicks: number[] = [];
  for (let v = Y0; v <= Y1 + 1e-9; v += 0.5) yTicks.push(Math.round(v * 10) / 10);
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * W;
    setSel(Math.min(30, Math.max(1, Math.round(1 + ((x - L) / (W - L - R)) * 29))));
  };
  return (
    <section className="mt-4 rounded-lg border border-line bg-white p-4 sm:p-6">
      <div className="flex h-6 items-center justify-between gap-3 text-[14px]">
        <h2 className="font-semibold">{text.chartTitle}</h2>
        <p className="tabular-nums text-mute" aria-live="polite">{cur.years} {text.years}: <span className="font-semibold text-ink">{pct(cur.yield)}</span></p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full touch-pan-y" role="img" aria-label={text.chartTitle} onPointerMove={pick} onPointerDown={pick}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="#e5e7eb" strokeDasharray="3 3" />
            <text x={L - 6} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{pct(v, 1)}</text>
          </g>
        ))}
        {rows.map((r) => <text key={r.years} x={sx(r.years)} y={H - 8} textAnchor="middle" fontSize="10" fill={r.years === sel ? "#111827" : "#6b7280"}>{r.years}</text>)}
        <line x1={sx(sel)} x2={sx(sel)} y1={T} y2={H - B} stroke="#9ca3af" strokeWidth="1" />
        <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={rows.map((r) => `${sx(r.years)},${sy(r.yield)}`).join(" ")} />
        {rows.map((r) => (
          <circle key={r.years} cx={sx(r.years)} cy={sy(r.yield)} r={r.years === sel ? 5 : 3.5} fill="#2563eb" stroke="#2563eb" strokeWidth="1.5" />
        ))}
      </svg>
    </section>
  );
}
