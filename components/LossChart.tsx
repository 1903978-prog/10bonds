"use client";

import { useState } from "react";
import type { CurvePoint } from "@/lib/lossCurve";

/** The chart starts at this target yield; lower targets are not shown. */
const X_START = 3;

/**
 * Expected loss on your money against the target average yield, with a dot for the current target and a second curve:
 * how much more expected loss one extra point of yield costs (dashed line, no axis; read it on hover). Hovering shows the
 * exact target, expected loss and slope at that point. Drawn in the same box as the results table, so it keeps the
 * table's size and nothing around it moves.
 */
export default function LossChart({ points, max, current, loss, xLabel, yLabel, slopeLabel, hoverText }: { points: CurvePoint[] | null; max: number; current: number; loss: number | null; xLabel: string; yLabel: string; slopeLabel: string; hoverText: string }) {
  const W = 800, H = 360, L = 56, R = 16, T = 12, B = 44;
  const shown = (points ?? []).filter((p) => p.ytm >= X_START - 1e-9);
  const x0 = X_START, x1 = Math.max(max, x0 + 0.5);
  const yMax = Math.max(0.01, ...shown.map((p) => p.loss), loss ?? 0) * 1.1;
  // Slope between each pair of neighbouring points (points of expected loss per +1 point of yield), drawn at the middle
  // of that step, so it lines up with the blue line without averaging across bends.
  const segs = shown.slice(1).map((p, i) => {
    const a = shown[i];
    return { x: (a.ytm + p.ytm) / 2, s: p.ytm === a.ytm ? 0 : (p.loss - a.loss) / (p.ytm - a.ytm) };
  });
  const sMax = Math.max(0.01, ...segs.map((g) => Math.abs(g.s))) * 1.1;
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => H - B - (v / yMax) * (H - B - T);
  const S = (v: number) => H - B - (v / sMax) * (H - B - T);
  const path = shown.map((p, i) => `${i ? "L" : "M"}${X(p.ytm).toFixed(1)},${Y(p.loss).toFixed(1)}`).join(" ");
  const slopePath = segs.map((g, i) => `${i ? "L" : "M"}${X(g.x).toFixed(1)},${S(g.s).toFixed(1)}`).join(" ");
  const xTicks = Array.from({ length: Math.floor((x1 - x0) / 0.5) + 1 }, (_, i) => x0 + i * 0.5);
  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 1.1) * (i / 4));
  const [hover, setHover] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!shown.length) return;
    // Map the mouse into the chart's own units, so the empty space around the drawing (the SVG keeps its shape) is counted.
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const sx = pt.matrixTransform(ctm.inverse()).x;
    const ytm = x0 + ((sx - L) / (W - L - R)) * (x1 - x0);
    let best = 0;
    shown.forEach((p, i) => {
      if (Math.abs(p.ytm - ytm) < Math.abs(shown[best].ytm - ytm)) best = i;
    });
    setHover(best);
  };
  const h = hover !== null ? shown[hover] : null;
  // Slope shown on hover: the step to the right of the hovered point (the step to the left for the last point).
  const hs = hover === null ? 0 : segs[Math.min(hover, segs.length - 1)]?.s ?? 0;
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
      <g data-testid="loss-chart-legend" className="text-[12px]">
        <line x1={L + 8} x2={L + 28} y1={T + 12} y2={T + 12} stroke="#0066cc" strokeWidth={2.5} />
        <text x={L + 34} y={T + 16} className="fill-[#1d1d1f]">{yLabel}</text>
        <line x1={L + 8} x2={L + 28} y1={T + 30} y2={T + 30} stroke="#86868b" strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={L + 34} y={T + 34} className="fill-[#1d1d1f]">{slopeLabel}</text>
      </g>
      {slopePath && <path d={slopePath} fill="none" stroke="#86868b" strokeWidth={1.5} strokeDasharray="5 4" />}
      {path && <path d={path} fill="none" stroke="#0066cc" strokeWidth={2.5} />}
      {loss !== null && <circle cx={X(current)} cy={Y(loss)} r={6} fill="#0066cc" stroke="#fff" strokeWidth={2} />}
      {h && hover !== null && (
        <g pointerEvents="none">
          <line x1={X(h.ytm)} x2={X(h.ytm)} y1={T} y2={H - B} stroke="#86868b" strokeDasharray="2 3" />
          <circle cx={X(h.ytm)} cy={Y(h.loss)} r={4} fill="#0066cc" />
          <text x={L + 8} y={H - B - 10} className="fill-[#1d1d1f] text-[13px]">{hoverText.replace("{y}", h.ytm.toFixed(2)).replace("{l}", h.loss.toFixed(2)).replace("{s}", hs.toFixed(2))}</text>
        </g>
      )}
    </svg>
  );
}
