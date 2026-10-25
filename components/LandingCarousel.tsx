"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { RiskBadge, riskColor } from "@/components/RiskBadge";
import type { LandingText } from "@/lib/landingText";
import type { BenchmarkBond } from "@/lib/benchmarkPortfolio";
import { COLOURS } from "@/components/AllCurvesChart";
import { bandOf } from "@/components/HeatMapChart";
import { findCompany } from "@/lib/companiesInFocus";

const LVMH = "FR0013482841";

const NAVY = "#112D3B";
const GREEN = "#127052";
const MUTE = "#52666F";
const BLUE = "#0066cc";
const EVERY = 3000; // ms per slide (the owner, 24/10/2026)

/** A slide's action title: the long one on desktop, the short one on phones. */
export const actionTitle = ([long, short]: readonly [string, string] | string[]) => (
  <><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{long}</span></>
);

/** One card of the landing carousel: same white card as the comparison, filling the carousel's fixed height. */
export function SlideCard({ title, children, href }: { title: ReactNode; children: ReactNode; href?: string }) {
  const box = "flex h-full flex-col rounded-[18px] border border-[#e3ebe7] bg-white p-4 shadow-[0_8px_30px_rgba(17,45,59,0.07)] lg:p-5";
  // With `href` the whole card opens that page (the Risk assessment pages, PR #188).
  if (href) return <Link href={href} className={`${box} transition hover:border-[#cfe6da]`} data-testid="slide-link">{inner(title, children)}</Link>;
  return <div className={box}>{inner(title, children)}</div>;
}

function inner(title: ReactNode, children: ReactNode) {
  return (
    <>
      {/* Right padding keeps the title clear of the dots, which sit in the same corner on every slide. */}
      <h2 className="truncate pr-28 text-[15px] font-semibold tracking-tight lg:text-[14px]">{title}</h2>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </>
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
  const touch = useRef<number | null>(null);
  const n = slides.length;

  useEffect(() => {
    if (held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setAt((i) => (i + 1) % n), EVERY);
    return () => clearTimeout(id);
  }, [at, held, n]);

  // A tap on an arrow or dot moves at once and restarts the 3 s count.
  const go = (i: number) => setAt(((i % n) + n) % n);

  return (
    <div
      className="relative grid min-w-0 h-[max(318px,calc(100svh_-_398px))] lg:h-[min(620px,calc(100vh_/_var(--z)_-_250px))]"
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
      {/* Arrows on the card's sides, over its padding, so they take no room of their own. */}
      {([-1, 1] as const).map((d) => (
        <button key={d} type="button" onClick={() => go(at + d)} aria-label={d < 0 ? t.carousel.prev : t.carousel.next} data-testid={d < 0 ? "carousel-prev" : "carousel-next"}
          className={`absolute top-1/2 grid h-7 w-7 lg:h-8 lg:w-8 -translate-y-1/2 place-items-center rounded-full border border-[#e3ebe7] bg-white text-[18px] leading-none shadow-[0_4px_14px_rgba(17,45,59,0.14)] transition hover:bg-[#F7F9F8] ${d < 0 ? "-left-3.5 lg:-left-4" : "-right-3.5 lg:-right-4"}`}
          style={{ color: NAVY }}>
          <span aria-hidden className="-mt-0.5">{d < 0 ? "‹" : "›"}</span>
        </button>
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

/** The portfolio search: 30 lists from lowest to highest risk, return up and expected loss across, as on the finder's chart. */
export function FrontierSlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  const W = 320, H = 170, L = 30, R = 14, T = 10, B = 28;
  const pts = Array.from({ length: 30 }, (_, i) => {
    const loss = 4.45 * Math.pow(i / 29, 1.7);
    return [loss, 3.3 + 3.95 * (1 - Math.exp(-loss / 1.3))] as const;
  });
  const x = (l: number) => L + (l / 4.6) * (W - L - R);
  const y = (v: number) => T + ((7.4 - v) / 4.2) * (H - T - B);
  const pct = (v: number, d: number) => `${v.toLocaleString(c.locale, { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
  const PICK = 7; // position 8, filled as on the finder
  return (
    <SlideCard title={actionTitle(c.act.frontier)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-0 min-h-[150px] w-full flex-1" role="img" aria-label={c.frontier} fontSize={9}>
        {[4, 5, 6, 7].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#eef2f0" />
            <text x={L - 5} y={y(v) + 3} textAnchor="end" fill={MUTE}>{pct(v, 1)}</text>
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((l) => <text key={l} x={x(l)} y={H - B + 13} textAnchor="middle" fill={MUTE}>{pct(l, 1)}</text>)}
        <text x={(L + W - R) / 2} y={H - 3} textAnchor="middle" fill={MUTE}>{c.lossAxis}</text>
        <polyline points={pts.map(([l, v]) => `${x(l)},${y(v)}`).join(" ")} fill="none" stroke="#a9bde6" strokeWidth={1.5} />
        {pts.map(([l, v], i) => (
          <g key={i}>
            <circle cx={x(l)} cy={y(v)} r={i === PICK ? 4.5 : 3} fill={i === PICK ? BLUE : "#fff"} stroke={BLUE} strokeWidth={1.4} />
            {(i === PICK || (i + 1) % 5 === 0) && <text x={x(l) + 5} y={y(v) + 10} fill="#132D3B">{i + 1}</text>}
          </g>
        ))}
      </svg>
    </SlideCard>
  );
}

/** Horizons: one return/risk curve per horizon, 2 to 10 years, as on the finder's "all curves" chart; legend bottom right. */
export function CurvesSlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  const W = 320, H = 170, L = 30, R = 22, T = 8, B = 28;
  // [years, top return, last loss]: middle horizons reach the most, short ones stop early.
  const curves: [number, number, number][] = [[2, 5.9, 1.3], [3, 5.85, 2.4], [4, 7.2, 4.4], [5, 7.0, 5.2], [6, 6.05, 4.8], [7, 5.75, 3.8], [8, 5.85, 4.1], [9, 5.85, 4.3], [10, 5.85, 4.8]];
  const x = (l: number) => L + (l / 5.4) * (W - L - R);
  const y = (v: number) => T + ((7.4 - v) / 4.2) * (H - T - B);
  const pct = (v: number, d: number) => `${v.toLocaleString(c.locale, { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
  const path = ([yrs, top, last]: [number, number, number]) => Array.from({ length: 24 }, (_, i) => {
    const l = last * Math.pow(i / 23, 1.5);
    const v = 3.3 + (top - 3.3) * (1 - Math.exp(-l / (0.25 + yrs * 0.12))) - Math.max(0, yrs - 5) * 0.06 * (1 - l / last);
    return `${i ? "L" : "M"}${x(l).toFixed(1)},${y(v).toFixed(1)}`;
  }).join(" ");
  return (
    <SlideCard title={actionTitle(c.act.curves)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-0 min-h-[150px] w-full flex-1" role="img" aria-label={c.act.curves[0]} fontSize={9}>
        {[4, 5, 6, 7].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#eef2f0" />
            <text x={L - 5} y={y(v) + 3} textAnchor="end" fill={MUTE}>{pct(v, 1)}</text>
          </g>
        ))}
        {[0, 1, 2, 3, 4, 5].map((l) => <text key={l} x={x(l)} y={H - B + 13} textAnchor="middle" fill={MUTE}>{pct(l, 0)}</text>)}
        <text x={(L + W - R) / 2} y={H - 3} textAnchor="middle" fill={MUTE}>{c.lossAxis}</text>
        {curves.map((k, i) => <path key={k[0]} d={path(k)} fill="none" stroke={COLOURS[i]} strokeWidth={1.6} strokeLinejoin="round" />)}
        {/* Legend bottom right, under the curves, in three columns. */}
        <g fontSize={8}>
          {curves.map(([yrs], i) => {
            const lx = W - R - 126 + Math.floor(i / 3) * 43, ly = H - B - 23 + (i % 3) * 9;
            return (
              <g key={yrs}>
                <line x1={lx} x2={lx + 10} y1={ly - 3} y2={ly - 3} stroke={COLOURS[i]} strokeWidth={2.5} strokeLinecap="round" />
                <text x={lx + 13} y={ly} fill="#132D3B">{yrs} {c.yrs}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </SlideCard>
  );
}

/** Heat map: expected loss on the money for each return (up) and horizon (across), green to dark red, as on the admin map. */
export function HeatSlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  const years = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20];
  const rets = [6.2, 5.8, 5.4, 5.0, 4.6, 4.2, 3.8, 3.4, 3.0];
  // Highest return each horizon can reach; above it the cell stays grey ("–").
  const cap = (y: number) => (y === 1 ? 4.0 : y <= 6 ? 6.4 : y <= 11 ? 5.8 : y <= 15 ? 5.6 : 5.0);
  const loss = (r: number, y: number) => 0.006 * Math.pow(y, 1.25) * Math.exp((r - 3) * 1.05);
  return (
    <SlideCard title={actionTitle(c.act.heat)}>
      <div className="grid min-h-0 flex-1 gap-[2px]" style={{ gridTemplateColumns: `30px repeat(${years.length}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rets.length}, minmax(0, 1fr)) 14px` }}>
        {rets.map((r) => {
          // The framed cell: the horizon with the lowest expected loss for this return (the safest maturity).
          const best = years.filter((y) => r <= cap(y) + 1e-9).reduce<number | null>((b, y) => (b === null || loss(r, y) < loss(r, b) ? y : b), null);
          return [
          <span key={`r${r}`} className="self-center pr-1 text-right text-[9px] tabular-nums" style={{ color: MUTE }}>{r.toLocaleString(c.locale, { minimumFractionDigits: 1 })}%</span>,
          ...years.map((y) => {
            const ok = r <= cap(y) + 1e-9;
            return <span key={`${r}-${y}`} className={`min-h-[14px] rounded-[3px] ${y === best ? "ring-2 ring-inset ring-[#132D3B]" : ""}`} style={{ background: ok ? bandOf(loss(r, y)).bg : "#f2f2f4" }} />;
          }),
        ];
        })}
        <span className="text-right text-[9px]" style={{ color: MUTE }}>{c.yrs}</span>
        {years.map((y) => <span key={`y${y}`} className="text-center text-[9px] tabular-nums" style={{ color: MUTE }}>{y}</span>)}
      </div>
      <p className="mt-2 flex items-center justify-between gap-2 text-[11px] lg:text-[11.5px]" style={{ color: MUTE }}>
        <span className="min-w-0"><span className="block truncate sm:hidden">{c.heatKeyShort}</span><span className="hidden sm:line-clamp-2">{c.heatKey}</span></span>
        <span className="flex shrink-0 items-center gap-1.5"><span className="h-3 w-4 rounded-[3px] bg-[#8cc782] ring-2 ring-inset ring-[#132D3B]" /><span className="h-2 w-8 rounded-full" style={{ background: "linear-gradient(90deg,#1b6e33,#c6e3a9,#f3e27c,#ec7f33,#8b1a12)" }} /></span>
      </p>
    </SlideCard>
  );
}

/** One bond: the finder's "best return for each risk level" curve, the reason to sign up. */
export function CurveSlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  const pts: [number, number][] = [[7, 5.1], [6, 4.6], [5, 4.2], [4, 4.0], [3, 3.6], [2, 3.1], [1, 2.8]];
  const W = 320, H = 170, L = 30, R = 14, T = 20, B = 26;
  const x = (r: number) => L + ((7 - r) / 6) * (W - L - R);
  const y = (v: number) => T + ((5.6 - v) / 3.1) * (H - T - B);
  const fmt = (v: number) => v.toLocaleString(c.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <SlideCard title={actionTitle(c.act.curve)}>
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
export function ListSlide({ t, bonds }: { t: LandingText; bonds: BenchmarkBond[] | undefined }) {
  const c = t.carousel;
  // Always 10 rows, "–" until the live list is there, so nothing moves when it arrives.
  const rows = Array.from({ length: 10 }, (_, i) => bonds?.[i] ?? null);
  return (
    <SlideCard title={actionTitle(c.act.list)}>
      <div className="flex text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: MUTE }}>
        <span className="w-5" /><span className="min-w-0 flex-1 truncate">{c.bond}</span><span className="w-[60px] truncate text-right">{c.maturity}</span><span className="w-11 text-center">{c.risk}</span><span className="w-14 text-right">{c.ret}</span>
      </div>
      <ol className="mt-1 flex flex-1 flex-col justify-between" data-testid="carousel-list">
        {rows.map((b, i) => (
          <li key={i} className="flex items-center border-t border-[#eef2f0] text-[11.5px] leading-[19px] tabular-nums lg:py-[2px] lg:text-[12px]">
            <span className="w-5 shrink-0" style={{ color: MUTE }}>{i + 1}</span>
            <span className="min-w-0 flex-1 truncate pr-2 font-medium" title={b?.name}>{b?.name ?? "–"}</span>
            <span className="w-[60px] shrink-0 text-right" style={{ color: MUTE }}>{b?.year ?? "–"}</span>
            <span className="w-11 shrink-0 text-center">{b?.risk != null ? <RiskBadge risk={b.risk} /> : "–"}</span>
            <span className="w-14 shrink-0 text-right font-semibold">{b?.ytm != null ? `${b.ytm.toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "–"}</span>
          </li>
        ))}
      </ol>
    </SlideCard>
  );
}

/** Countries: a picture of the Brazil page in Risk assessment (the owner, 24/10/2026), a fixed image so it never shifts. */
export function CountrySlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  return (
    <SlideCard title={actionTitle(c.act.country)} href="/risk-assessment/countries/brazil">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#e3ebe7] bg-[#F5F5F7]">
        {/* Desktop shows the whole page top; phones the narrow layout. Aligned to the top left, cropped at the bottom. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/carousel-brazil-phone.png" alt={c.countryAlt} className="absolute inset-0 h-full w-full object-cover object-top sm:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/carousel-brazil.png" alt={c.countryAlt} className="absolute inset-0 hidden h-full w-full object-cover object-left-top sm:block" />
      </div>
    </SlideCard>
  );
}

/** One company: LVMH on the 10bonds.com risk scale. */
export function CompanySlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  // Same score as the LVMH page in Risk assessment.
  const risk = findCompany(LVMH)?.risk ?? 2;
  return (
    <SlideCard title={actionTitle(c.act.company)} href={`/risk-assessment/${LVMH}`}>
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
