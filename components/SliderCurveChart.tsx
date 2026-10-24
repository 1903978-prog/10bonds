"use client";

import { useState } from "react";
import { useBoxSize } from "@/components/useBoxSize";
import type { SliderPosition } from "@/lib/sliderPortfolios";

const BLUE = "#0066cc";
const DOT = 5.5; // dot radius in px
const GAP = 13; // centre to centre of dots that share one portfolio

/**
 * Simple search, chart mode: the 30 positions of the "Return & risk" slider as 30 dots, return across and expected
 * loss on your money up, joined by a line. Positions that show the very same 10 bonds sit side by side at that one
 * point under one number range (e.g. "4–6"). The chosen position is the filled dot; hovering a dot shows its numbers,
 * a click chooses it (same as moving the slider). Fills its box, drawn at the box's real pixel size.
 */
export default function SliderCurveChart({ positions, current, onPick, xLabel, yLabel, dotText, sameText, noneText }: {
  positions: SliderPosition[];
  current: number;
  onPick: (position: number) => void;
  xLabel: string;
  yLabel: string;
  dotText: string; // {p} {y} {l}
  sameText: string; // {n}
  noneText: string;
}) {
  const [box, size] = useBoxSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const F = size.w < 520 ? 12 : 14;
  const W = size.w, H = size.h, L = F * 5, R = 24, T = 22 + F, B = F * 4;

  const shown = positions.filter((p) => !p.unavailable && p.ytm !== null && p.expectedLoss !== null);
  const none = positions.filter((p) => p.unavailable).map((p) => p.position);
  // One group per distinct portfolio, in slider order.
  const groups: { root: SliderPosition; members: SliderPosition[] }[] = [];
  for (const p of shown) {
    const root = p.sameAs ?? p.position;
    const g = groups.find((x) => x.root.position === root);
    if (g) g.members.push(p);
    else groups.push({ root: p, members: [p] });
  }
  const ytms = shown.map((p) => p.ytm!);
  const lo = ytms.length ? Math.min(...ytms) : 0, hi = ytms.length ? Math.max(...ytms) : 1;
  const pad = Math.max(0.05, (hi - lo) * 0.06);
  const x0 = lo - pad, x1 = hi + pad;
  const yMax = Math.max(0.01, ...shown.map((p) => p.expectedLoss!)) * 1.15;
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => H - B - (v / yMax) * (H - B - T);
  const step = niceStep((x1 - x0) / Math.max(3, Math.floor((W - L - R) / 110)));
  const xTicks: number[] = [];
  for (let v = Math.ceil(x0 / step) * step; v <= x1 + 1e-9; v += step) xTicks.push(v);
  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 1.15) * (i / 4));
  const line = groups.map((g, i) => `${i ? "L" : "M"}${X(g.root.ytm!).toFixed(1)},${Y(g.root.expectedLoss!).toFixed(1)}`).join(" ");
  const range = (ps: number[]) => (ps.length > 1 ? `${ps[0]}–${ps[ps.length - 1]}` : String(ps[0]));
  const h = hover === null ? null : shown.find((p) => p.position === hover) ?? null;
  const tip = h
    ? dotText.replace("{p}", String(h.position)).replace("{y}", h.ytm!.toFixed(2)).replace("{l}", h.expectedLoss!.toFixed(2)) + (h.sameAs ? ` · ${sameText.replace("{n}", String(h.sameAs))}` : "")
    : null;

  return (
    <div ref={box} className="h-full w-full overflow-hidden" data-testid="slider-curve">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label={`${yLabel} / ${xLabel}`} fontSize={F}>
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#e5e5ea" />
            <text x={L - 10} y={Y(v) + F / 3} textAnchor="end" className="fill-[#86868b]">{v.toFixed(2)}%</text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={`x${v}`} x={X(v)} y={H - B + F + 8} textAnchor="middle" className="fill-[#86868b]">{v.toFixed(step < 0.1 ? 2 : 1)}%</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" className="fill-[#86868b]">{xLabel}</text>
        <text x={F} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 ${F} ${(T + H - B) / 2})`} className="fill-[#86868b]">{yLabel}</text>
        {line && <path d={line} fill="none" stroke={BLUE} strokeOpacity={0.45} strokeWidth={2.5} strokeLinejoin="round" />}
        {groups.map((g) => {
          const cx = X(g.root.ytm!), cy = Y(g.root.expectedLoss!);
          const n = g.members.length;
          return (
            <g key={g.root.position}>
              {n > 1 && <rect x={cx - ((n - 1) * GAP) / 2 - DOT - 3} y={cy - DOT - 3} width={(n - 1) * GAP + 2 * DOT + 6} height={2 * DOT + 6} rx={DOT + 3} fill="#eef4fb" stroke={BLUE} strokeOpacity={0.35} />}
              <text x={cx} y={cy - DOT - 8} textAnchor="middle" fontSize={F - 2} className="fill-[#1d1d1f] tabular-nums">{range(g.members.map((m) => m.position))}</text>
              {g.members.map((m, i) => {
                const x = cx + (i - (n - 1) / 2) * GAP;
                const on = m.position === current;
                return (
                  <g key={m.position} data-testid={`curve-dot-${m.position}`} style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover(m.position)} onMouseLeave={() => setHover(null)} onClick={() => onPick(m.position)}>
                    {on && <circle cx={x} cy={cy} r={DOT + 5} fill={BLUE} fillOpacity={0.18} />}
                    <circle cx={x} cy={cy} r={on ? DOT + 1.5 : DOT} fill={on ? BLUE : "#fff"} stroke={BLUE} strokeWidth={2} />
                    <circle cx={x} cy={cy} r={GAP / 2 + 3} fill="transparent" />
                  </g>
                );
              })}
            </g>
          );
        })}
        {tip && (
          <g pointerEvents="none">
            <rect x={L + 6} y={4} width={Math.min(W - L - R - 12, tip.length * F * 0.56 + 16)} height={F + 12} rx={8} fill="#1d1d1f" fillOpacity={0.88} />
            <text x={L + 14} y={4 + F + 2} className="fill-white">{tip}</text>
          </g>
        )}
        {!tip && none.length > 0 && (
          <text x={W - R} y={4 + F + 2} textAnchor="end" fontSize={F - 2} className="fill-[#86868b]">{range(none)}: {noneText}</text>
        )}
      </svg>
    </div>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
