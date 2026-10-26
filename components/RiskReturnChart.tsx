"use client";

import { useState } from "react";
import { useBoxSize } from "@/components/useBoxSize";

const BLUE = "#0066cc";
const GRID = "#e5e5ea";
const MUTE = "#6b6b72";

export type FrontierPoint = { position: number; ytm: number; expectedLoss: number };

/**
 * The landing's Yield vs. Expected Loss chart: every point of the finder's "Return & risk" slider (up to 30), return up and
 * expected loss across, joined in slider order by one blue line. Nothing is computed or smoothed here: the figures are the
 * engine's (/api/landing/frontier). Hover (PC) or tap (phone) a point and its numbers appear in the line under the chart.
 * Drawn at the box's real pixel size so the text stays readable; touch targets are 22 px wide whatever the dot size.
 */
export default function RiskReturnChart({ points, retLabel, lossLabel, ariaLabel, detail, hint }: {
  points: FrontierPoint[];
  retLabel: string;
  lossLabel: string;
  ariaLabel: string;
  /** {p} {n} {y} {l} */
  detail: string;
  hint: string;
}) {
  const [box, size] = useBoxSize<HTMLDivElement>({ w: 560, h: 300 }, { w: 200, h: 140 });
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const small = size.w < 480;
  const F = small ? 11 : 13;
  const W = size.w, H = size.h, L = small ? F * 3.6 : F * 4.4, R = 14, T = F * 2.2, B = F * 3.6;
  const ytms = points.map((p) => p.ytm);
  const lo = points.length ? Math.min(...ytms) : 0, hi = points.length ? Math.max(...ytms) : 1;
  const pad = Math.max(0.05, (hi - lo) * 0.06);
  const r0 = lo - pad, r1 = hi + pad;
  const lMax = Math.max(0.01, ...points.map((p) => p.expectedLoss)) * 1.06;
  const X = (l: number) => L + (l / lMax) * (W - L - R);
  const Y = (r: number) => H - B - ((r - r0) / (r1 - r0)) * (H - B - T);
  const rStep = niceStep((r1 - r0) / Math.max(2, Math.floor((H - B - T) / (small ? 46 : 52))));
  const rTicks: number[] = [];
  for (let v = Math.ceil(r0 / rStep) * rStep; v <= r1 + 1e-9; v += rStep) rTicks.push(v);
  const lStep = niceStep(lMax / Math.max(2, Math.floor((W - L - R) / (small ? 70 : 100))));
  const lTicks: number[] = [];
  for (let v = 0; v <= lMax + 1e-9; v += lStep) lTicks.push(v);
  const line = points.map((p, i) => `${i ? "L" : "M"}${X(p.expectedLoss).toFixed(1)},${Y(p.ytm).toFixed(1)}`).join(" ");
  const on = hover ?? picked;
  const a = on === null ? null : points.find((p) => p.position === on) ?? null;
  const text = a ? detail.replace("{p}", String(a.position)).replace("{n}", String(points.length)).replace("{y}", a.ytm.toFixed(2)).replace("{l}", a.expectedLoss.toFixed(2)) : hint;
  const dot = small ? 5 : 5.5;
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div ref={box} className="min-h-0 flex-1 overflow-hidden" data-testid="risk-return-chart">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block touch-manipulation" role="img" aria-label={ariaLabel} fontSize={F}>
          {rTicks.map((v) => (
            <g key={`y${v}`}>
              <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={GRID} />
              <text x={L - 6} y={Y(v) + F / 3} textAnchor="end" fill={MUTE}>{v.toFixed(rStep < 0.1 ? 2 : 1)}%</text>
            </g>
          ))}
          {lTicks.map((v) => (
            <text key={`x${v}`} x={X(v)} y={H - B + F + 6} textAnchor="middle" fill={MUTE}>{v.toFixed(lStep < 0.1 ? 2 : 1)}%</text>
          ))}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontWeight={600} fill={MUTE}>{lossLabel} →</text>
          <text x={4} y={F + 2} fontWeight={600} fill={MUTE}>{retLabel} ↑</text>
          {line && <path d={line} fill="none" stroke={BLUE} strokeWidth={2.5} strokeLinejoin="round" />}
          {points.map((p) => {
            const cx = X(p.expectedLoss), cy = Y(p.ytm);
            const act = p.position === on;
            return (
              <g key={p.position} data-testid={`rr-dot-${p.position}`} style={{ cursor: "pointer" }}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHover(p.position)} onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
                onClick={() => setPicked(p.position === picked ? null : p.position)}>
                {act && <circle cx={cx} cy={cy} r={dot + 5} fill={BLUE} fillOpacity={0.16} />}
                <circle cx={cx} cy={cy} r={act ? dot + 1.5 : dot} fill={act ? BLUE : "#fff"} stroke={BLUE} strokeWidth={2} />
                <circle cx={cx} cy={cy} r={11} fill="transparent" />
              </g>
            );
          })}
          {a && <text x={Math.min(W - R - 8, Math.max(L + 8, X(a.expectedLoss)))} y={Y(a.ytm) - dot - 8} textAnchor="middle" fontSize={F} fontWeight={600} fill="#1d1d1f">{a.position}</text>}
        </svg>
      </div>
      <p className="mt-1.5 h-[28px] shrink-0 line-clamp-2 text-[11.5px] leading-[14px] tabular-nums sm:h-[18px] sm:text-[12.5px]" style={{ color: a ? "#1d1d1f" : MUTE }} aria-live="polite" data-testid="rr-detail">{text}</p>
    </div>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
