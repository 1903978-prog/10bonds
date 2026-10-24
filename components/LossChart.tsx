"use client";

import { useState } from "react";
import type { CurvePoint } from "@/lib/lossCurve";
import { useBoxSize } from "@/components/useBoxSize";

/** The chart starts at this target yield; lower targets are not shown. */
const X_START = 3;

/** Points from the chart's start on. */
export const shownPoints = (points: CurvePoint[] | null) => (points ?? []).filter((p) => p.ytm >= X_START - 1e-9);

/** Slope at the point nearest to this target yield (see curveSlopes). */
export function slopeAt(points: CurvePoint[], ytm: number) {
  const shown = shownPoints(points);
  if (!shown.length) return 0;
  const slopes = curveSlopes(shown);
  let best = 0;
  shown.forEach((p, i) => {
    if (Math.abs(p.ytm - ytm) < Math.abs(shown[best].ytm - ytm)) best = i;
  });
  return slopes[best];
}

/** Slope of the curve in expected loss (points) per +1 point of target yield, by central differences between neighbours. */
export function curveSlopes(shown: CurvePoint[]) {
  return shown.map((p, i) => {
    const a = shown[Math.max(0, i - 1)], b = shown[Math.min(shown.length - 1, i + 1)];
    return b.ytm === a.ytm ? 0 : ((b.loss - a.loss) / (b.ytm - a.ytm));
  });
}

/**
 * Expected loss on your money against the target average yield, with a dot for the current target and a second curve:
 * how much more expected loss one extra point of yield costs (dashed line, no axis; read it on hover). Hovering shows the
 * exact target, expected loss and slope at that point. It fills the box it is put in, drawn at the box's real pixel size.
 */
export default function LossChart({ points, max, current, loss, xLabel, yLabel, slopeLabel, hoverText, onPick }: { points: CurvePoint[] | null; max: number; current: number; loss: number | null; xLabel: string; yLabel: string; slopeLabel: string; hoverText: string; onPick?: (ytm: number) => void }) {
  const [box, size] = useBoxSize<HTMLDivElement>();
  const F = size.w < 520 ? 12 : 14; // font size in px
  const W = size.w, H = size.h, L = F * 5, R = 16, T = 14, B = F * 4;
  const shown = shownPoints(points);
  const x0 = X_START, x1 = Math.max(max, x0 + 0.5);
  const yMax = Math.max(0.01, ...shown.map((p) => p.loss), loss ?? 0) * 1.1;
  const slopes = curveSlopes(shown);
  const sMax = Math.max(0.01, ...slopes.map((s) => Math.abs(s))) * 1.1;
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => H - B - (v / yMax) * (H - B - T);
  const S = (v: number) => H - B - (v / sMax) * (H - B - T);
  const path = shown.map((p, i) => `${i ? "L" : "M"}${X(p.ytm).toFixed(1)},${Y(p.loss).toFixed(1)}`).join(" ");
  const slopePath = shown.map((p, i) => `${i ? "L" : "M"}${X(p.ytm).toFixed(1)},${S(slopes[i]).toFixed(1)}`).join(" ");
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
  const hs = hover === null ? 0 : slopes[hover];
  return (
    <div ref={box} className="h-full w-full overflow-hidden">
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label={`${yLabel} / ${xLabel}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onClick={() => { if (onPick && h) onPick(h.ytm); }} style={onPick ? { cursor: "pointer" } : undefined}>
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#e5e5ea" />
          <text x={L - 10} y={Y(v) + 4} textAnchor="end" fontSize={F} className="fill-[#86868b]">{v.toFixed(2)}%</text>
        </g>
      ))}
      {xTicks.map((v) => (
        <text key={`x${v}`} x={X(v)} y={H - B + F + 8} textAnchor="middle" fontSize={F} className="fill-[#86868b]">{v.toFixed(1)}%</text>
      ))}
      <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize={F} className="fill-[#86868b]">{xLabel}</text>
      <text x={F} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 ${F} ${(T + H - B) / 2})`} fontSize={F} className="fill-[#86868b]">{yLabel}</text>
      <g data-testid="loss-chart-legend" fontSize={F}>
        <line x1={L + 8} x2={L + 32} y1={T + 10} y2={T + 10} stroke="#0066cc" strokeWidth={3} />
        <text x={L + 40} y={T + 10 + F / 3} className="fill-[#1d1d1f]">{yLabel}</text>
        <line x1={L + 8} x2={L + 32} y1={T + 16 + F} y2={T + 16 + F} stroke="#86868b" strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={L + 40} y={T + 16 + F + F / 3} className="fill-[#1d1d1f]">{slopeLabel}</text>
      </g>
      {slopePath && <path d={slopePath} fill="none" stroke="#86868b" strokeWidth={1.5} strokeDasharray="5 4" />}
      {path && <path d={path} fill="none" stroke="#0066cc" strokeWidth={3} strokeLinejoin="round" />}
      {loss !== null && <circle cx={X(current)} cy={Y(loss)} r={7} fill="#0066cc" stroke="#fff" strokeWidth={2} />}
      {h && hover !== null && (
        <g pointerEvents="none">
          <line x1={X(h.ytm)} x2={X(h.ytm)} y1={T} y2={H - B} stroke="#86868b" strokeDasharray="2 3" />
          <circle cx={X(h.ytm)} cy={Y(h.loss)} r={4} fill="#0066cc" />
          {/* Top right, on its own dark box, so it never covers the curves (they start low on the left). */}
          {(() => {
            const tip = hoverText.replace("{y}", h.ytm.toFixed(2)).replace("{l}", h.loss.toFixed(2)).replace("{s}", hs.toFixed(2));
            const w = Math.min(W - L - R - 12, tip.length * F * 0.56 + 16);
            return (
              <>
                <rect x={W - R - w - 4} y={T + 2} width={w} height={F + 12} rx={8} fill="#1d1d1f" fillOpacity={0.88} />
                <text x={W - R - w + 4} y={T + 2 + F + 2} fontSize={F} className="fill-white">{tip}</text>
              </>
            );
          })()}
        </g>
      )}
    </svg>
    </div>
  );
}
