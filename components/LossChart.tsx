"use client";

import { LIMITS } from "@/lib/limits";
import type { CurvePoint } from "@/lib/lossCurve";

/**
 * Expected loss on your money against the target average yield, with a dot for the current target. Drawn in the same
 * box as the results table, so it keeps the table's size and nothing around it moves.
 */
export default function LossChart({ points, max, current, loss, xLabel, yLabel }: { points: CurvePoint[] | null; max: number; current: number; loss: number | null; xLabel: string; yLabel: string }) {
  const W = 800, H = 360, L = 56, R = 16, T = 12, B = 44;
  const x0 = LIMITS.ytm.min, x1 = Math.max(max, x0 + 0.01);
  const yMax = Math.max(0.01, ...(points ?? []).map((p) => p.loss), loss ?? 0) * 1.1;
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => H - B - (v / yMax) * (H - B - T);
  const path = (points ?? []).map((p, i) => `${i ? "L" : "M"}${X(p.ytm).toFixed(1)},${Y(p.loss).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: Math.floor(x1) - Math.ceil(x0) + 1 }, (_, i) => Math.ceil(x0) + i);
  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 1.1) * (i / 4));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`${yLabel} / ${xLabel}`}>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#e5e5ea" />
          <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="fill-[#86868b] text-[12px]">{v.toFixed(2)}%</text>
        </g>
      ))}
      {ticks.map((v) => (
        <text key={v} x={X(v)} y={H - B + 18} textAnchor="middle" className="fill-[#86868b] text-[12px]">{v}%</text>
      ))}
      <text x={W / 2} y={H - 6} textAnchor="middle" className="fill-[#86868b] text-[12px]">{xLabel}</text>
      <text x={14} y={H / 2} textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`} className="fill-[#86868b] text-[12px]">{yLabel}</text>
      {path && <path d={path} fill="none" stroke="#0066cc" strokeWidth={2.5} />}
      {loss !== null && <circle cx={X(current)} cy={Y(loss)} r={6} fill="#0066cc" stroke="#fff" strokeWidth={2} />}
    </svg>
  );
}
