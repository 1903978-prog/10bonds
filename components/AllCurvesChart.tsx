"use client";

import { useState } from "react";
import { useBoxSize } from "@/components/useBoxSize";
import { shownPoints } from "@/components/LossChart";
import type { CurvePoint } from "@/lib/lossCurve";

/** One colour per horizon, 2 to 10 years. */
const COLOURS = ["#0066cc", "#e4572e", "#17a673", "#8e44ad", "#f0a202", "#1abc9c", "#c0392b", "#5d6d7e", "#d35400"];

/**
 * Admin only: the expected-loss curve for every horizon from 2 to 10 years on one chart, one colour each, with no slope
 * line so the curves stay clear. Return goes up, expected loss across (the owner, 24/10/2026, same as the slider chart).
 * Hovering shows each horizon's expected loss at that target yield. It fills whatever box
 * it is put in (drawn at the box's real pixel size, so text stays readable at any size); the box decides the layout.
 */
export default function AllCurvesChart({ curves, retLabel, lossLabel, yearsLabel }: { curves: { duration: number; points: CurvePoint[]; max: number }[]; retLabel: string; lossLabel: string; yearsLabel: string }) {
  const [box, size] = useBoxSize<HTMLDivElement>();
  const narrow = size.w < 520;
  const F = narrow ? 12 : 14; // font size in px
  const W = size.w, H = size.h, L = narrow ? 52 : 70, R = 16, T = 14, B = narrow ? 50 : 58;
  const X_START = 3;
  const series = curves.map((c) => ({ duration: c.duration, shown: shownPoints(c.points) }));
  // Return (up) from X_START to the highest slider maximum; expected loss (across) from 0.
  const r0 = X_START;
  const r1 = Math.max(X_START + 0.5, ...curves.map((c) => c.max));
  const lMax = Math.max(0.01, ...series.flatMap((s) => s.shown.map((p) => p.loss))) * 1.1;
  const X = (loss: number) => L + (loss / lMax) * (W - L - R);
  const Y = (ret: number) => H - B - ((ret - r0) / (r1 - r0)) * (H - B - T);
  const rStep = (H - B - T) / ((r1 - r0) / 0.5) < F * 1.6 ? 1 : 0.5;
  const rTicks = Array.from({ length: Math.floor((r1 - r0) / rStep) + 1 }, (_, i) => r0 + i * rStep);
  const lTicks = [0, 1, 2, 3, 4].map((i) => (lMax / 1.1) * (i / 4));
  const [hover, setHover] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const sy = pt.matrixTransform(ctm.inverse()).y;
    const r = r0 + ((H - B - sy) / (H - B - T)) * (r1 - r0);
    setHover(r >= r0 && r <= r1 ? r : null);
  };
  // The point nearest to the hovered target on each curve.
  const at = (points: CurvePoint[], ytm: number) => {
    let best = points[0];
    for (const p of points) if (best && Math.abs(p.ytm - ytm) < Math.abs(best.ytm - ytm)) best = p;
    return best;
  };
  const hoverRow = hover === null ? null : series.map((s, i) => ({ colour: COLOURS[i], duration: s.duration, p: at(s.shown, hover) })).filter((r) => r.p);
  // While hovering, the legend also gives each horizon's expected loss at the hovered target.
  const lossAt = (duration: number) => hoverRow?.find((r) => r.duration === duration)?.p?.loss;
  return (
    <div ref={box} className="h-full w-full overflow-hidden">
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label={`${retLabel} / ${lossLabel}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {rTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#e5e5ea" />
          <text x={L - 10} y={Y(v) + 4} textAnchor="end" fontSize={F} className="fill-[#86868b]">{v.toFixed(1)}%</text>
        </g>
      ))}
      {lTicks.map((v) => (
        <text key={`x${v}`} x={X(v)} y={H - B + F + 8} textAnchor="middle" fontSize={F} className="fill-[#86868b]">{v.toFixed(2)}%</text>
      ))}
      <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize={F} className="fill-[#86868b]">{lossLabel}</text>
      <text x={F} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 ${F} ${(T + H - B) / 2})`} fontSize={F} className="fill-[#86868b]">{retLabel}</text>
      {series.map((s, i) => (
        <path
          key={s.duration}
          d={s.shown.map((p, j) => `${j ? "L" : "M"}${X(p.loss).toFixed(1)},${Y(p.ytm).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={COLOURS[i]}
          strokeWidth={narrow ? 2.25 : 3}
        strokeLinejoin="round"
        />
      ))}
      <g data-testid="all-curves-legend" fontSize={F}>
        <rect x={L + 4} y={T + 2} width={F * (hover === null ? 5.6 : 9.6)} height={(series.length + (hover === null ? 0 : 1)) * (F + 8) + 8} rx={8} fill="white" fillOpacity={0.9} />
        {series.map((s, i) => (
          <g key={s.duration}>
            <line x1={L + 12} x2={L + 12 + F * 1.6} y1={T + 12 + i * (F + 8) + F / 2 - 1} y2={T + 12 + i * (F + 8) + F / 2 - 1} stroke={COLOURS[i]} strokeWidth={3.5} strokeLinecap="round" />
            <text x={L + 18 + F * 1.6} y={T + 12 + i * (F + 8) + F - 2} className="fill-[#1d1d1f]">{s.duration} {yearsLabel}</text>
            {lossAt(s.duration) !== undefined && (
              <text x={L + F * 9} y={T + 12 + i * (F + 8) + F - 2} textAnchor="end" className="fill-[#1d1d1f] tabular-nums">{lossAt(s.duration)!.toFixed(2)}%</text>
            )}
          </g>
        ))}
        {hover !== null && (
          <text x={L + 12} y={T + 12 + series.length * (F + 8) + F - 2} className="fill-[#86868b]">@ {hover.toFixed(2)}%</text>
        )}
      </g>
      {hoverRow && hover !== null && (
        <g pointerEvents="none">
          <line x1={L} x2={W - R} y1={Y(hover)} y2={Y(hover)} stroke="#86868b" strokeDasharray="2 3" />
          {hoverRow.map((r) => (
            <circle key={r.duration} cx={X(r.p!.loss)} cy={Y(r.p!.ytm)} r={4.5} fill={r.colour} />
          ))}
        </g>
      )}
    </svg>
    </div>
  );
}
