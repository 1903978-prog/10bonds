"use client";

import { useState } from "react";
import { shownPoints } from "@/components/LossChart";
import type { CurvePoint } from "@/lib/lossCurve";

/** One colour per horizon, 2 to 10 years. */
const COLOURS = ["#0066cc", "#e4572e", "#17a673", "#8e44ad", "#f0a202", "#1abc9c", "#c0392b", "#5d6d7e", "#d35400"];

/**
 * Admin only: the expected-loss curve for every horizon from 2 to 10 years on one chart, one colour each, with no slope
 * line so the curves stay clear. Hovering shows each horizon's expected loss at that target yield. Same box and size as
 * the single chart, so nothing around it moves.
 */
export default function AllCurvesChart({ curves, yLabel, xLabel, yearsLabel }: { curves: { duration: number; points: CurvePoint[]; max: number }[]; yLabel: string; xLabel: string; yearsLabel: string }) {
  const W = 800, H = 360, L = 56, R = 16, T = 12, B = 44;
  const X_START = 3;
  const series = curves.map((c) => ({ duration: c.duration, shown: shownPoints(c.points) }));
  const x0 = X_START;
  const x1 = Math.max(X_START + 0.5, ...curves.map((c) => c.max));
  const yMax = Math.max(0.01, ...series.flatMap((s) => s.shown.map((p) => p.loss))) * 1.1;
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => H - B - (v / yMax) * (H - B - T);
  const xTicks = Array.from({ length: Math.floor((x1 - x0) / 0.5) + 1 }, (_, i) => x0 + i * 0.5);
  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 1.1) * (i / 4));
  const [hover, setHover] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const sx = pt.matrixTransform(ctm.inverse()).x;
    setHover(x0 + ((sx - L) / (W - L - R)) * (x1 - x0));
  };
  // The point nearest to the hovered target on each curve.
  const at = (points: CurvePoint[], ytm: number) => {
    let best = points[0];
    for (const p of points) if (best && Math.abs(p.ytm - ytm) < Math.abs(best.ytm - ytm)) best = p;
    return best;
  };
  const hoverRow = hover === null ? null : series.map((s, i) => ({ colour: COLOURS[i], duration: s.duration, p: at(s.shown, hover) })).filter((r) => r.p);
  const readout = hoverRow && hover !== null
    ? `Target ${hover.toFixed(2)}%  ·  ${hoverRow.map((r) => `${r.duration} ${yearsLabel}: ${r.p!.loss.toFixed(2)}%`).join("  ·  ")}`
    : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`${yLabel} / ${xLabel}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#e5e5ea" />
          <text x={L - 10} y={Y(v) + 4} textAnchor="end" className="fill-[#86868b] text-[12px]">{v.toFixed(2)}%</text>
        </g>
      ))}
      {xTicks.map((v) => (
        <text key={`x${v}`} x={X(v)} y={H - B + 18} textAnchor="middle" className="fill-[#86868b] text-[12px]">{v.toFixed(1)}%</text>
      ))}
      <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="fill-[#86868b] text-[12px]">{xLabel}</text>
      <text x={20} y={H / 2} textAnchor="middle" transform={`rotate(-90 20 ${H / 2})`} className="fill-[#86868b] text-[12px]">{yLabel}</text>
      {series.map((s, i) => (
        <path
          key={s.duration}
          d={s.shown.map((p, j) => `${j ? "L" : "M"}${X(p.ytm).toFixed(1)},${Y(p.loss).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={COLOURS[i]}
          strokeWidth={2}
        />
      ))}
      <g data-testid="all-curves-legend" className="text-[12px]">
        {series.map((s, i) => (
          <g key={s.duration}>
            <line x1={L + 8} x2={L + 28} y1={T + 12 + i * 16} y2={T + 12 + i * 16} stroke={COLOURS[i]} strokeWidth={2.5} />
            <text x={L + 34} y={T + 16 + i * 16} className="fill-[#1d1d1f]">{s.duration} {yearsLabel}</text>
          </g>
        ))}
      </g>
      {hoverRow && hover !== null && (
        <g pointerEvents="none">
          <line x1={X(hover)} x2={X(hover)} y1={T} y2={H - B} stroke="#86868b" strokeDasharray="2 3" />
          {hoverRow.map((r) => (
            <circle key={r.duration} cx={X(r.p!.ytm)} cy={Y(r.p!.loss)} r={3.5} fill={r.colour} />
          ))}
          <text x={L + 8} y={H - B - 10} className="fill-[#1d1d1f] text-[12px]">{readout}</text>
        </g>
      )}
    </svg>
  );
}
