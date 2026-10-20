"use client";

import { useEffect, useRef, useState } from "react";
import { useFinderText } from "@/lib/finderText";
import type { Frontier as FrontierData } from "@/lib/frontier";

const RED = "#ff3b30";
const BLUE = "#0a84ff";

/** Landing chart, shown before the visitor moves a control: every bond as a grey dot, 4-6 year bonds in blue, in red their efficient frontier from risk 1 to 8. */
export default function Frontier({ currency }: { currency: string }) {
  const t = useFinderText();
  const [data, setData] = useState<FrontierData | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 680, h: 360 });

  useEffect(() => {
    fetch(`/api/bonds/frontier?${new URLSearchParams({ currency })}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setData({ dots: b.dots ?? [], picks: b.picks ?? [] }))
      .catch(() => {});
  }, [currency]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(300, Math.round(e.contentRect.width)), h: Math.max(220, Math.round(e.contentRect.height)) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = size;
  const L = 44, R = 12, T = 18, B = 40;
  const dots = data?.dots ?? [];
  // Each bond sits anywhere across the width of its risk score (fixed per dot), so the bonds read as one continuous cloud.
  const spread = (i: number) => ((((Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1) + 1) % 1) - 0.5;
  const rx = (i: number) => dots[i][0] + spread(i);
  // The frontier bonds, safest first, each drawn at the centre of its risk level.
  const picks = (data?.picks ?? []).filter((i) => dots[i]);
  // The axis follows the bulk of the bonds (a few distressed yields would flatten everything else) and always the red bonds.
  const sorted = dots.map((d) => d[1]).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const top = Math.max(sorted.length ? q(0.99) : 5, ...picks.map((i) => dots[i][1]));
  const bottom = Math.min(sorted.length ? q(0.005) : 0, ...picks.map((i) => dots[i][1]));
  const lo = Math.max(0, Math.floor(bottom * 2) / 2 - 0.5);
  const hi = Math.ceil(top + 0.5);
  // Risk 1 (lowest) on the right, risk 10 on the left, like the 1-bond chart; half a step of room at each end.
  const x = (r: number) => L + ((10.5 - r) / 10) * (W - L - R);
  // Every bond is drawn; the rare yields beyond the axis sit on its edge.
  const y = (v: number) => T + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (H - T - B);
  const step = hi - lo > 10 ? 2 : hi - lo > 4 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  const path = picks.map((i, k) => `${k ? "L" : "M"}${x(dots[i][0]).toFixed(1)},${y(dots[i][1]).toFixed(1)}`).join(" ");

  return (
    <div className="flex h-full flex-col" data-testid="frontier">
      <h2 className="text-[17px] font-semibold">{t.frontierTitle}</h2>
      <div className="mt-0.5 flex flex-wrap gap-x-4 text-[11px] text-mute">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#aeaeb2] align-middle" />{t.frontierDots(data ? dots.length : null, currency)}</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: BLUE }} />{t.frontierBlue}</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: RED }} />{t.frontierLine}</span>
      </div>
      <div ref={box} className="mt-1 min-h-0 w-full flex-1 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={t.frontierTitle} className="block">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e5e5ea" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="13" fill="#86868b">{v.toFixed(step < 1 ? 1 : 0)}%</text>
            </g>
          ))}
          {Array.from({ length: 10 }, (_, i) => i + 1).map((l) => (
            <text key={l} x={x(l)} y={H - B + 17} textAnchor="middle" fontSize="13" fill="#86868b">{l}</text>
          ))}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize="13" fill="#86868b">{t.riskAxis}</text>
          <g fill="#aeaeb2" fillOpacity="0.5">
            {dots.map(([, v, b], i) => (b ? null : <circle key={i} cx={x(rx(i))} cy={y(v)} r="1.8" />))}
          </g>
          <g fill={BLUE} fillOpacity="0.55">
            {dots.map(([, v, b], i) => (b ? <circle key={i} cx={x(rx(i))} cy={y(v)} r="1.8" /> : null))}
          </g>
          <path d={path} fill="none" stroke={RED} strokeWidth="2" strokeLinejoin="round" />
          {picks.map((i) => (
            <circle key={i} cx={x(dots[i][0])} cy={y(dots[i][1])} r="4.5" fill={RED} stroke="#fff" strokeWidth="1.5" data-testid="frontier-pick" />
          ))}
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-mute">{t.frontierHow} {t.frontierStart}</p>
    </div>
  );
}
