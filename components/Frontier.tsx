"use client";

import { useEffect, useRef, useState } from "react";
import { useFinderText } from "@/lib/finderText";
import type { Frontier as FrontierData } from "@/lib/frontier";

const RED = "#ff3b30";

/** Landing chart, shown before the visitor moves a control: every bond as a grey dot, the 5-year efficient frontier in red. */
export default function Frontier({ currency }: { currency: string }) {
  const t = useFinderText();
  const [data, setData] = useState<FrontierData | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 680, h: 360 });

  useEffect(() => {
    fetch(`/api/bonds/frontier?${new URLSearchParams({ currency })}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setData({ dots: b.dots ?? [], line: b.line ?? [] }))
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
  const L = 44, R = 22, T = 26, B = 40, PAD = 22;
  const dots = data?.dots ?? [];
  const line = data?.line ?? [];
  // The axis follows the bulk of the bonds (a few distressed yields would flatten everything else) and always the red line.
  const sorted = dots.map((d) => d[1]).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const top = Math.max(sorted.length ? q(0.99) : 5, ...line.map((p) => p.ytm));
  const bottom = Math.min(sorted.length ? q(0.005) : 0, ...line.map((p) => p.ytm));
  const lo = Math.max(0, Math.floor(bottom * 2) / 2 - 0.5);
  const hi = Math.ceil(top + 0.5);
  // Risk 1 (lowest) on the right edge, risk 10 on the left, like the 1-bond chart.
  const col = (W - L - PAD - R) / 9;
  const x = (level: number) => L + PAD + ((10 - level) / 9) * (W - L - PAD - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const step = hi - lo > 10 ? 2 : hi - lo > 4 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  // Spread the dots of one risk score across its column (fixed per dot, so they never jump).
  const jitter = (i: number) => (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1 - 0.5;
  const path = line.map((p, i) => `${i ? "L" : "M"}${x(p.level).toFixed(1)},${y(p.ytm).toFixed(1)}`).join(" ");

  return (
    <div className="flex h-full flex-col" data-testid="frontier">
      <h2 className="text-[17px] font-semibold">{t.frontierTitle}</h2>
      <div className="mt-0.5 flex flex-wrap gap-x-4 text-[11px] text-mute">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#aeaeb2] align-middle" />{t.frontierDots}</span>
        <span><span className="mr-1 inline-block h-0.5 w-3 align-middle" style={{ background: RED }} />{t.frontierLine}</span>
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
          <g fill="#aeaeb2" fillOpacity="0.45">
            {/* Every bond is drawn; the rare yields beyond the axis sit on its edge. */}
            {dots.map(([r, v], i) => <circle key={i} cx={Math.min(W - R + 4, Math.max(L + 4, x(r) + jitter(i) * col * 0.6))} cy={y(Math.min(hi, Math.max(lo, v)))} r="2" />)}
          </g>
          <path d={path} fill="none" stroke={RED} strokeWidth="2.5" strokeLinejoin="round" />
          {line.map((p) => (
            <g key={p.level} data-testid={`frontier-${p.level}`}>
              <circle cx={x(p.level)} cy={y(p.ytm)} r="5" fill={RED} stroke="#fff" strokeWidth="1.5" />
              <text x={x(p.level)} y={y(p.ytm) - 11} textAnchor="middle" fontSize="12" fontWeight="600" fill={RED}>{p.ytm.toFixed(1)}%</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-mute">{t.frontierStart}</p>
    </div>
  );
}
