"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { RiskBadge, riskColor } from "@/components/RiskBadge";
import type { LandingText } from "@/lib/landingText";

const NAVY = "#112D3B";
const GREEN = "#127052";
const MUTE = "#52666F";
const BLUE = "#0066cc";
const EVERY = 6000; // ms per slide while nobody touches the carousel

/** One card of the landing carousel: same white card as the comparison, filling the carousel's fixed height. */
export function SlideCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-[18px] border border-[#e3ebe7] bg-white p-4 shadow-[0_8px_30px_rgba(17,45,59,0.07)] lg:p-5">
      {/* Right padding keeps the title clear of the dots, which sit in the same corner on every slide. */}
      <h2 className="truncate pr-20 text-[15px] font-semibold tracking-tight lg:text-[14px]">{title}</h2>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/**
 * The landing's right-hand cards as a carousel (the owner, 24/10/2026): every slide is stacked in the same grid cell,
 * so the box always has the height of the tallest one and nothing moves when the slide changes. Turns on its own
 * until the visitor taps a dot or swipes; stops on hover; never turns when the visitor asks for reduced motion.
 */
export default function LandingCarousel({ t, slides }: { t: LandingText; slides: { key: string; node: ReactNode }[] }) {
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;

  useEffect(() => {
    if (held || stopped || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setAt((i) => (i + 1) % n), EVERY);
    return () => clearTimeout(id);
  }, [at, held, stopped, n]);

  const go = (i: number) => { setStopped(true); setAt(((i % n) + n) % n); };

  return (
    <div
      className="relative grid min-w-0"
      role="region"
      aria-roledescription="carousel"
      aria-label={t.carousel.label}
      data-testid="landing-carousel"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1));
      }}
    >
      {slides.map((s, i) => (
        <div key={s.key} data-testid={`slide-${s.key}`} aria-hidden={i !== at} inert={i !== at}
          className={`min-w-0 [grid-area:1/1] transition-opacity duration-500 ${i === at ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          {s.node}
        </div>
      ))}
      <div className="absolute right-3 top-[15px] flex items-center lg:right-4 lg:top-[19px]">
        {slides.map((s, i) => (
          <button key={s.key} type="button" onClick={() => go(i)} aria-label={`${t.carousel.slide} ${i + 1} / ${n}`} aria-current={i === at}
            data-testid={`dot-${s.key}`} className="grid h-5 w-4 place-items-center">
            <span className={`block h-1.5 rounded-full transition-all ${i === at ? "w-3.5" : "w-1.5 bg-[#c9d6d0]"}`} style={i === at ? { background: NAVY } : undefined} />
          </button>
        ))}
      </div>
    </div>
  );
}

// The slides' pictures are fixed drawings of the finder's screens (no live data), so they load at once and never shift.

/** One bond: the finder's "best return for each risk level" curve, the reason to sign up. */
export function CurveSlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  const pts: [number, number][] = [[7, 5.1], [6, 4.6], [5, 4.2], [4, 4.0], [3, 3.6], [2, 3.1], [1, 2.8]];
  const W = 320, H = 170, L = 30, R = 14, T = 20, B = 26;
  const x = (r: number) => L + ((7 - r) / 6) * (W - L - R);
  const y = (v: number) => T + ((5.6 - v) / 3.1) * (H - T - B);
  const fmt = (v: number) => v.toLocaleString(c.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <SlideCard title={<><span className="sm:hidden">{c.curveShort}</span><span className="hidden sm:inline">{c.curve}</span></>}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-0 min-h-[150px] w-full flex-1" role="img" aria-label={c.curve} fontSize={9}>
        {[2.5, 3.5, 4.5].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#eef2f0" />
            <text x={L - 5} y={y(v) + 3} textAnchor="end" fill={MUTE}>{fmt(v)}%</text>
          </g>
        ))}
        <polyline points={pts.map(([r, v]) => `${x(r)},${y(v)}`).join(" ")} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" />
        {pts.map(([r, v], i) => (
          <g key={r}>
            <circle cx={x(r)} cy={y(v)} r={i === 2 ? 5.5 : 4} fill={i === 2 ? BLUE : "#fff"} stroke={BLUE} strokeWidth={2} />
            <text x={x(r)} y={y(v) - 9} textAnchor="middle" fontWeight={600} fill="#132D3B">{fmt(v)}%</text>
            <text x={x(r)} y={H - B + 14} textAnchor="middle" fill={MUTE}>{r}</text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px] lg:text-[12px]">
        <span style={{ color: MUTE }}>{c.curveX}</span>
        <Link href="/signup" className="shrink-0 rounded-full px-2.5 py-1 font-semibold text-white hover:opacity-90" style={{ background: GREEN }} data-testid="carousel-signup">{c.curveCta}</Link>
      </div>
    </SlideCard>
  );
}

/** The portfolio: ten bonds, names hidden as on the visitor's list. */
export function ListSlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  const rows: [number, number, number, number][] = [ // name width %, risk, return, year
    [62, 5, 4.92, 2031], [48, 4, 4.71, 2030], [70, 6, 4.66, 2032], [55, 3, 4.38, 2030], [44, 5, 4.35, 2031],
    [66, 4, 4.21, 2029], [52, 3, 4.08, 2031], [60, 4, 3.97, 2030], [40, 2, 3.71, 2029], [58, 3, 3.64, 2030],
  ];
  return (
    <SlideCard title={c.list}>
      <div className="flex text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: MUTE }}>
        <span className="w-5" /><span className="min-w-0 flex-1 truncate">{c.bond}</span><span className="w-[72px] truncate text-right">{c.maturity}</span><span className="w-12 text-center">{c.risk}</span><span className="w-14 text-right">{c.ret}</span>
      </div>
      <ol className="mt-1 flex flex-1 flex-col justify-between">
        {rows.map(([w, risk, ret, yr], i) => (
          <li key={i} className="flex items-center border-t border-[#eef2f0] text-[11.5px] leading-[19px] tabular-nums lg:py-[2px] lg:text-[12px]">
            <span className="w-5 shrink-0" style={{ color: MUTE }}>{i + 1}</span>
            <span className="flex-1"><span className="block h-2 rounded-full bg-[#dfe7e3] blur-[1.5px]" style={{ width: `${w}%` }} /></span>
            <span className="w-[72px] text-right" style={{ color: MUTE }}>{yr}</span>
            <span className="w-12 text-center"><RiskBadge risk={risk} /></span>
            <span className="w-14 text-right font-semibold">{ret.toLocaleString(c.locale, { minimumFractionDigits: 2 })}%</span>
          </li>
        ))}
      </ol>
    </SlideCard>
  );
}

/** Countries: the 10bonds.com risk score of the euro area's main issuers. */
export function CountrySlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  const rows: [string, number][] = [["de", 1], ["nl", 1], ["fr", 3], ["es", 3], ["it", 4], ["ro", 6]];
  return (
    <SlideCard title={c.country}>
      <ul className="flex flex-1 flex-col justify-around">
        {rows.map(([k, risk]) => (
          <li key={k} className="flex items-center gap-3 text-[12.5px] lg:text-[13px]">
            <span className="w-20 shrink-0 truncate font-medium">{c.countries[k as keyof typeof c.countries]}</span>
            <span className="h-2 flex-1 rounded-full bg-[#eef2f0]">
              <span className="block h-2 rounded-full" style={{ width: `${risk * 10}%`, background: riskColor(risk) }} />
            </span>
            <RiskBadge risk={risk} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] lg:text-[12px]" style={{ color: MUTE }}>{c.scale}</p>
    </SlideCard>
  );
}

/** One company: LVMH on the 10bonds.com risk scale. */
export function CompanySlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  const risk = 3;
  return (
    <SlideCard title={c.company}>
      <div className="flex flex-1 flex-col justify-center gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] text-[13px] font-bold tracking-[0.12em] text-white" style={{ background: NAVY }}>LVMH</span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold min-[400px]:text-[15px] lg:text-[16px]">LVMH Moët Hennessy Louis Vuitton</p>
            <p className="truncate text-[12px]" style={{ color: MUTE }}>{c.sector}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[12px]" style={{ color: MUTE }}>
            <span>{c.rating}</span><RiskBadge risk={risk} size="lg" />
          </div>
          {/* The 1-10 scale, the company's place marked. */}
          <div className="mt-3 grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="h-2 rounded-full" style={{ background: riskColor(i + 1), opacity: i + 1 === risk ? 1 : 0.22 }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10.5px]" style={{ color: MUTE }}><span>1</span><span>10</span></div>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] lg:text-[12px]" style={{ color: MUTE }}>{c.scale}</p>
    </SlideCard>
  );
}
