"use client";

import { useEffect, useRef, useState } from "react";
import { useFinderText } from "@/lib/finderText";
import type { Frontier as FrontierData } from "@/lib/frontier";

const RED = "#ff3b30";
const DOTS_MS = 1400, LINE_MS = 700;
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
  const picks = (data?.picks ?? []).filter((i) => dots[i] && dots[i][0] <= 8);
  // The axis follows the bulk of the bonds (a few distressed yields would flatten everything else) and always the red bonds.
  const sorted = dots.map((d) => d[1]).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const top = Math.max(sorted.length ? q(0.99) : 5, ...picks.map((i) => dots[i][1]));
  const bottom = Math.min(sorted.length ? q(0.005) : 0, ...picks.map((i) => dots[i][1]));
  const lo = Math.max(0, Math.floor(bottom * 2) / 2 - 0.5);
  const hi = Math.ceil(top + 0.5);
  // Risk 1 (lowest) on the right, risk 10 on the left, like the 1-bond chart; half a step of room at each end.
  // Only risk 8 to 1 is shown (the frontier ends at 8), so the dots fill the whole width.
  const x = (r: number) => L + ((8.5 - r) / 8) * (W - L - R);
  // Every bond is drawn; the rare yields beyond the axis sit on its edge.
  const y = (v: number) => T + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (H - T - B);
  const step = hi - lo > 10 ? 2 : hi - lo > 4 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  const cv = useRef<HTMLCanvasElement>(null);
  const [lineOn, setLineOn] = useState(false);
  const drawn = useRef<string>("");

  // Dots fly in over about 1.4 s (canvas, so thousands stay smooth), then the red line draws left to right.
  useEffect(() => {
    const c = cv.current;
    if (!c || !dots.length) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);
    const key = `${dots.length}`;
    const still = drawn.current === key || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pts = dots.map(([r, v, b], i) => ({ px: x(rx(i)), py: y(v), b, vis: r <= 8, d: ((i * 2654435761) % 1000) / 1000 * (DOTS_MS - 500) }));
    const paint = (t: number) => {
      g.clearRect(0, 0, W, H);
      for (const blue of [false, true]) {
        g.fillStyle = blue ? BLUE : "#aeaeb2";
        for (const p of pts) {
          if (!p.vis || !!p.b !== blue) continue;
          const k = Math.min(1, Math.max(0, (t - p.d) / 500));
          if (k <= 0) continue;
          const e = 1 - (1 - k) ** 3;
          g.globalAlpha = (blue ? 0.55 : 0.5) * e;
          g.beginPath();
          g.arc(p.px, p.py + (1 - e) * 24, 1.8, 0, 6.2832);
          g.fill();
        }
      }
    };
    if (still) { paint(DOTS_MS); setLineOn(true); drawn.current = key; return; }
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      paint(t);
      if (t < DOTS_MS) raf = requestAnimationFrame(tick);
      else { drawn.current = key; setLineOn(true); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, W, H]);

  const path = picks.map((i, k) => `${k ? "L" : "M"}${x(dots[i][0]).toFixed(1)},${y(dots[i][1]).toFixed(1)}`).join(" ");

  return (
    <div className="flex h-full flex-col" data-testid="frontier">
      <h2 className="text-[17px] font-semibold">{t.frontierTitle}</h2>
      <div className="mt-0.5 flex flex-wrap gap-x-4 text-[11px] text-mute">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#aeaeb2] align-middle" />{t.frontierDots(data ? dots.length : null, currency)}</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: BLUE }} />{t.frontierBlue}</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: RED }} />{t.frontierLine}</span>
      </div>
      <div ref={box} className="relative mt-1 min-h-0 w-full flex-1 overflow-hidden">
        <canvas ref={cv} aria-hidden style={{ width: W, height: H }} className="pointer-events-none absolute left-0 top-0" />
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={t.frontierTitle} className="block">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e5e5ea" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="13" fill="#86868b">{v.toFixed(step < 1 ? 1 : 0)}%</text>
            </g>
          ))}
          {Array.from({ length: 8 }, (_, i) => i + 1).map((l) => (
            <text key={l} x={x(l)} y={H - B + 17} textAnchor="middle" fontSize="13" fill="#86868b">{l}</text>
          ))}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize="13" fill="#86868b">{t.riskAxis}</text>
          <path d={path} pathLength={1} fill="none" stroke={RED} strokeWidth="2" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={lineOn ? 0 : 1} style={{ transition: drawn.current && lineOn ? `stroke-dashoffset ${LINE_MS}ms ease-in-out` : "none" }} />
          {lineOn && picks.map((i) => (
            <circle key={i} cx={x(dots[i][0])} cy={y(dots[i][1])} r="4.5" fill={RED} stroke="#fff" strokeWidth="1.5" data-testid="frontier-pick" />
          ))}
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-mute">{t.frontierHow} {t.frontierStart}</p>
    </div>
  );
}
