"use client";

import { type ReactNode } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import HeatMapChart from "@/components/HeatMapChart";
import type { HeatMap } from "@/lib/heatMapGrid";
import SliderCurveChart from "@/components/SliderCurveChart";
import { useBoxSize } from "@/components/useBoxSize";
import { FINDER_TEXT, type FinderLang, type FinderText } from "@/lib/finderText";
import type { BenchmarkBond } from "@/lib/benchmarkPortfolio";
import type { SliderPosition } from "@/lib/sliderPortfolios";

// The landing carousel's "real screen" slides (the owner, 24/10/2026): the finder's own chart components with fixed
// sample numbers, inside a browser frame with the app's header and controls, drawn at a fixed design size and scaled to
// the box, so each slide looks like a screenshot of a PC (or, on phones, of the phone page) and nothing depends on data.

const BLUE = "#0066cc";
const NAV: Record<FinderLang, string[]> = {
  en: ["Risk assessment", "Knowledge", "Plans", "Sign in", "Sign up free"],
  it: ["Valutazione del rischio", "Conoscenza", "Piani", "Accedi", "Registrati"],
  fr: ["Évaluation du risque", "Savoir", "Offres", "Connexion", "S'inscrire"],
  de: ["Risikobewertung", "Wissen", "Pläne", "Anmelden", "Registrieren"],
};

/** Draws `render` at a fixed design width and scales it to fill the box: wide = PC page, narrow = phone page. */
export function ScaledScreen({ render }: { render: (wide: boolean) => ReactNode }) {
  const [box, size] = useBoxSize<HTMLDivElement>({ w: 700, h: 420 }, { w: 100, h: 100 });
  const wide = size.w >= 520;
  const DW = wide ? 1000 : 430;
  const k = size.w / DW;
  return (
    <div ref={box} className="relative min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#d5d9df] bg-[#F5F5F7] shadow-[0_2px_10px_rgba(17,45,59,0.08)]" aria-hidden>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: DW, height: size.h / k, transform: `scale(${k})` }}>
        {render(wide)}
      </div>
    </div>
  );
}

/** Browser bar (PC only), the app header and the page area. */
function Chrome({ wide, lang, children, bare }: { wide: boolean; lang: FinderLang; children: ReactNode; bare?: boolean }) {
  const nav = NAV[lang];
  return (
    <div className="flex h-full w-full flex-col bg-[#F5F5F7] text-[#1d1d1f]">
      {wide && (
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#dcdfe4] bg-[#ebecef] px-4">
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />)}
          <span className="mx-auto flex h-6 w-[380px] items-center justify-center rounded-md bg-white text-[13px] text-[#55555b]">10bonds.com</span>
          <span className="w-[52px]" />
        </div>
      )}
      {!(bare && !wide) && <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#e3e5e8] bg-white px-6">
        <span className="text-[28px] font-semibold leading-none tracking-tight">10</span>
        <span className="flex items-center gap-6 text-[14px] text-[#55555b]">
          {wide && nav.slice(0, 3).map((n) => <span key={n}>{n}</span>)}
          <span className="font-semibold text-[#1d1d1f]">{lang.toUpperCase()}</span>
          {wide && <span>{nav[3]}</span>}
          <span className="rounded-full bg-[#0071e3] px-4 py-1.5 text-[14px] font-medium text-white">{nav[4]}</span>
        </span>
      </div>}
      <div className={`flex min-h-0 flex-1 gap-4 ${wide ? "p-5" : "p-3"}`}>{children}</div>
    </div>
  );
}

const Seg = ({ items, on }: { items: string[]; on: number }) => (
  <div className="flex rounded-full bg-[#f0f0f3] p-1 text-[15px] font-medium">
    {items.map((s, i) => <span key={s} className={`flex-1 rounded-full py-1.5 text-center ${i === on ? "bg-white shadow-sm" : "text-[#55555b]"}`}>{s}</span>)}
  </div>
);
const Track = ({ at }: { at: number }) => (
  <div className="relative mt-3 h-1.5 rounded-full bg-[#e5e5ea]">
    <span className="absolute left-0 top-0 h-1.5 rounded-full" style={{ width: `${at * 100}%`, background: BLUE }} />
    <span className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-[#d2d2d7] bg-white shadow" style={{ left: `calc(${at * 100}% - 10px)` }} />
  </div>
);

/** The finder's left panel (PC only): mode, currency, horizon and, for portfolios, the return & risk slider. */
function Controls({ f, single, horizon, mix }: { f: FinderText; single: boolean; horizon: number; mix: number }) {
  return (
    <div className="flex w-[250px] shrink-0 flex-col gap-4 rounded-[20px] bg-white p-5">
      <div className="text-[22px] font-semibold leading-[1.1] tracking-tight">{f.h1}</div>
      <Seg items={[f.single, f.portfolio]} on={single ? 0 : 1} />
      <div>
        <div className="text-[13px] text-[#55555b]">{f.currency}</div>
        <div className="mt-1.5"><Seg items={["EUR", "USD"]} on={0} /></div>
      </div>
      <div>
        <div className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">{f.horizon}</span><span className="text-[15px] font-semibold">{horizon} {f.years}</span></div>
        <Track at={(horizon - 1) / 14} />
        <div className="mt-1.5 flex justify-between text-[12px] text-[#55555b]"><span>{f.year1}</span><span>15 {f.years}</span></div>
      </div>
      {!single && (
        <div>
          <div className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">{f.mixLabel}</span></div>
          <Track at={1 - (mix - 1) / 29} />
          <div className="mt-1.5 flex justify-between text-[12px] text-[#55555b]"><span>{f.highReturn}</span><span>{f.lowReturn}</span></div>
        </div>
      )}
    </div>
  );
}

const Panel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-[20px] bg-white p-5 ${className}`}>{children}</div>
);

// Fixed sample numbers (nothing here is live).
const frontier = (n = 30): SliderPosition[] => Array.from({ length: n }, (_, i) => {
  const loss = Math.round(4.45 * Math.pow(i / (n - 1), 1.7) * 1000) / 1000;
  return { position: i + 1, target: null, query: null, ytm: Math.round((3.3 + 3.95 * (1 - Math.exp(-loss / 1.3))) * 100) / 100, expectedLoss: loss, avgRisk: null, worstRisk: null, isins: [], sameAs: null, unavailable: false };
});
const SAMPLE_BONDS: BenchmarkBond[] = [
  { name: "Teva", year: 2030, risk: 7, ytm: 5.1 }, { name: "Renault", year: 2031, risk: 7, ytm: 4.6 }, { name: "Unibail-Rodamco", year: 2030, risk: 4, ytm: 3.9 },
  { name: "Verizon", year: 2031, risk: 4, ytm: 3.55 }, { name: "Eni", year: 2031, risk: 3, ytm: 3.4 }, { name: "Telefonica", year: 2030, risk: 6, ytm: 3.35 },
  { name: "ING", year: 2030, risk: 3, ytm: 3.3 }, { name: "BNP Paribas", year: 2031, risk: 3, ytm: 3.25 }, { name: "TotalEnergies", year: 2031, risk: 3, ytm: 3.15 }, { name: "Santander", year: 2030, risk: 3, ytm: 3.15 },
];

/** The 10 bonds as rows: rank, issuer, maturity year, risk, return. */
function BondList({ f, bonds, compact }: { f: FinderText; bonds: BenchmarkBond[]; compact?: boolean }) {
  const rows = Array.from({ length: 10 }, (_, i) => bonds[i] ?? null);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex border-b border-[#ececef] pb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#55555b]">
        <span className="w-6" /><span className="min-w-0 flex-1">{f.single}</span>
        {!compact && <span className="w-16 text-right">{f.maturity}</span>}<span className="w-14 text-center">{f.risk}</span><span className="w-16 text-right">%</span>
      </div>
      <ol className="flex min-h-0 flex-1 flex-col justify-between">
        {rows.map((b, i) => (
          <li key={i} className="flex items-center border-b border-[#f3f3f5] text-[15px] tabular-nums last:border-0">
            <span className="w-6 text-[#6b6b72]">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{b?.name ?? "–"}</span>
            {!compact && <span className="w-16 text-right text-[#55555b]">{b?.year ?? "–"}</span>}
            <span className="w-14 text-center">{b?.risk != null ? <RiskBadge risk={b.risk} /> : "–"}</span>
            <span className="w-16 text-right font-semibold">{b?.ytm != null ? b.ytm.toFixed(2) : "–"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Portfolio search: the 30-dot efficient-frontier chart (the finder's chart mode), with the chosen list beside it. */
export function FrontierScreen({ lang }: { lang: FinderLang }) {
  const f = FINDER_TEXT[lang];
  const positions = frontier();
  return (
    <ScaledScreen render={(wide) => (
      <Chrome wide={wide} lang={lang}>
        {wide && <Controls f={f} single={false} horizon={5} mix={8} />}
        <Panel>
          <div className="min-h-0 flex-1"><SliderCurveChart positions={positions} current={8} onPick={() => {}} retLabel={f.chartX} lossLabel={f.chartY} dotText={f.chartDot} sameText={f.chartSame} noneText={f.chartNone} labels={false} /></div>
        </Panel>
        {wide && <Panel className="max-w-[250px]"><BondList f={f} bonds={SAMPLE_BONDS} compact /></Panel>}
      </Chrome>
    )} />
  );
}

export type OneBondData = {
  asOf: string;
  duration: number;
  points: { level: number; ytm: number | null; ghost: boolean }[];
  bond: { level: number; issuer: string; name: string; isin: string; coupon: number; maturity: string; ytm: number; duration: number; risk: number; minInvestment: number | null; currency: string };
};

/** The one-bond chart (the finder's, risk 8 to 1): blue line over the best step each, grey dots for the skipped ones, drawn at its box's real size. */
function BestByRisk({ f, data }: { f: FinderText; data: OneBondData }) {
  const [box, size] = useBoxSize<HTMLDivElement>({ w: 600, h: 300 }, { w: 200, h: 120 });
  const pts = data.points;
  const top = Math.max(2, ...pts.map((p) => p.level));
  const vals = pts.map((p) => p.ytm).filter((v): v is number => v !== null);
  const lo = Math.floor(Math.min(...vals) * 2) / 2 - 0.5, hi = Math.ceil(Math.max(...vals) * 2) / 2 + 0.5;
  const small = size.h < 200;
  const narrow = size.w < 520;
  const W = size.w, H = size.h, L = 52, R = 24, T = small ? 26 : 30, B = small ? 40 : 52, PAD = 22;
  const x = (r: number) => L + PAD + ((top - r) / (top - 1)) * (W - L - PAD - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const step = size.h < 200 ? (hi - lo > 4 ? 2 : 1) : hi - lo > 10 ? 2 : hi - lo > 4 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  const line = pts.filter((p) => p.ytm !== null && !p.ghost).sort((a, b) => b.level - a.level);
  return (
    <div ref={box} className="h-full w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" fontSize={14} role="img" aria-label={f.chartLabel}>
        {ticks.map((v) => (
          <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e5e5ea" /><text x={L - 10} y={y(v) + 5} textAnchor="end" fill="#86868b">{v.toFixed(step < 1 ? 1 : 0)}%</text></g>
        ))}
        {pts.map((p) => <text key={p.level} x={x(p.level)} y={H - B + (small ? 16 : 22)} textAnchor="middle" fill="#86868b">{p.level}</text>)}
        <text x={(L + W - R) / 2} y={H - (small ? 2 : 8)} textAnchor="middle" fill="#86868b" fontSize={small ? 12 : 14}>{f.riskAxis}</text>
        {pts.filter((p) => p.ghost && p.ytm !== null).map((p) => (
          <g key={`g${p.level}`}><circle cx={x(p.level)} cy={y(p.ytm!)} r={4.5} fill="#fff" stroke="#c7c7cc" strokeWidth={2} />{!narrow && <text x={x(p.level)} y={y(p.ytm!) - 12} textAnchor="middle" fontSize={12} fill="#aeaeb2">{p.ytm!.toFixed(1)}%</text>}</g>
        ))}
        <polyline points={line.map((p) => `${x(p.level)},${y(p.ytm!)}`).join(" ")} fill="none" stroke={BLUE} strokeWidth={3} strokeLinejoin="round" />
        {line.map((p) => {
          const on = p.level === data.bond.level;
          return (
            <g key={p.level}>
              <circle cx={x(p.level)} cy={y(p.ytm!)} r={on ? 8 : 6} fill={on ? BLUE : "#fff"} stroke={BLUE} strokeWidth={2.5} />
              {(!narrow || on || p.level === 1 || p.level === top) && <text x={x(p.level)} y={y(p.ytm!) - 14} textAnchor="middle" fontWeight={on ? 700 : 600} fill="#1d1d1f">{p.ytm!.toFixed(1)}%</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** One bond: the best return for each risk level, with one real bond's card under it (a stored snapshot, lib/landingOneBond.json). */
export function OneBondScreen({ lang, data, asOf, locale }: { lang: FinderLang; data: OneBondData; asOf?: string; locale: string }) {
  const f = FINDER_TEXT[lang];
  const b = data.bond;
  const num = (v: number, d = 1) => v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
  const date = new Date(b.maturity.slice(0, 10) + "T12:00:00Z").toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const sym = b.currency === "USD" ? "US$" : "€";
  const facts: [string, ReactNode][] = [
    ["ISIN", b.isin], [f.risk, <RiskBadge key="r" risk={b.risk} />], [f.duration, `${num(b.duration)} ${f.yrs}`],
    [f.coupon, `${num(b.coupon, 2)}%`], [f.maturity, date], [f.minInvest, b.minInvestment ? `${sym}${num(b.minInvestment / 1000, 0)}k` : "–"],
  ];
  return (
    <ScaledScreen render={(wide) => (
      <Chrome wide={wide} lang={lang} bare>
        {wide && <Controls f={f} single horizon={data.duration} mix={8} />}
        <Panel className={wide ? "" : "!p-3"}>
          {wide && <div className="mb-1 text-[22px] font-semibold tracking-tight">{f.bestByRating}</div>}
          <div className={wide ? "min-h-0 flex-1" : "min-h-[240px] flex-1"}><BestByRisk f={f} data={data} /></div>
          {!wide && (
            <div className="mt-2 flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-[12px] border border-[#e5e5ea] px-3 py-2 text-[14px] tabular-nums">
              <span className="min-w-0 truncate font-semibold">{b.issuer}</span>
              <RiskBadge risk={b.risk} />
              <span className="font-semibold">{num(b.ytm, 2)}%</span>
              <span className="text-[#6b6b72]">{date}</span>
            </div>
          )}
          {wide && <div className="mt-3 shrink-0 rounded-[12px] border border-[#e5e5ea] px-4 py-3 text-[15px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate"><span className="font-semibold">{b.issuer}</span>{!wide && <span className="ml-2 align-middle"><RiskBadge risk={b.risk} /></span>}{wide && b.name !== b.issuer && <span className="text-[13px] text-[#6b6b72]"> · {b.name}</span>}</span>
              <span className={`shrink-0 font-semibold tabular-nums ${wide ? "text-[26px]" : "text-[22px]"}`}>{num(b.ytm, 2)}% <span className="text-[13px] font-normal text-[#6b6b72]">{f.yieldLower}</span></span>
            </div>
            <dl className={`mt-1 grid gap-x-5 ${wide ? "grid-cols-3" : "grid-cols-2"}`}>
              {(wide ? facts : facts.filter(([k]) => k !== f.risk && k !== f.minInvest)).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 whitespace-nowrap border-b border-[#f0f0f3] py-0.5 text-[13px] tabular-nums sm:text-[14px]"><dt className="text-[#6b6b72]">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            {asOf && <div className="mt-0.5 text-right text-[12px] text-[#6b6b72]">{asOf}</div>}
          </div>}
        </Panel>
      </Chrome>
    )} />
  );
}

/** The 10 bonds of the portfolio, with names. */
export function ListScreen({ lang, bonds, mix = 8, asOf }: { lang: FinderLang; bonds: BenchmarkBond[] | undefined; mix?: number; asOf?: string }) {
  const f = FINDER_TEXT[lang];
  return (
    <ScaledScreen render={(wide) => (
      <Chrome wide={wide} lang={lang} bare>
        {wide && <Controls f={f} single={false} horizon={5} mix={mix} />}
        <Panel>
          <BondList f={f} bonds={bonds ?? []} />
          {asOf && <div className="mt-2 shrink-0 text-right text-[12px] text-[#6b6b72]">{asOf}</div>}
        </Panel>
      </Chrome>
    )} />
  );
}

// The multi-year slide (the owner's mockup, 26/10/2026): one risk-return curve per horizon, 2 to 10 years, fixed sample shapes.
const YEAR_COLOURS = ["#2f5fc4", "#d9552b", "#4a9d6f", "#7a46b0", "#e39a2d", "#4fb59f", "#b83a26", "#5c6a74", "#b8541f"];
const YEAR_ENDS: [number, number][] = [[0.9, 5.3], [1.0, 5.55], [3.7, 6.25], [4.5, 6.18], [4.2, 5.95], [3.65, 5.6], [4.2, 5.88], [4.3, 5.84], [4.4, 5.8]];
const curveAt = (end: [number, number], u: number) => {
  const k = 3.2 + (end[1] - 3.2) * (1 - Math.exp(-5 * u)) / (1 - Math.exp(-5));
  return [end[0] * u, k] as const;
};

export function MultiYearScreen({ sub, subShort, insightShort, yLabel, xLabel, insightK, insight }: { sub: string; subShort: string; insightShort: string; yLabel: string; xLabel: string; insightK: string; insight: string }) {
  const [box, size] = useBoxSize<HTMLDivElement>({ w: 600, h: 300 }, { w: 200, h: 120 });
  const narrow = size.w < 520;
  const F = narrow ? 12 : 12;
  const W = size.w, H = size.h, L = narrow ? (size.h >= 200 ? 58 : 48) : 60, R = narrow ? 30 : 40, T = 8, B = narrow ? 34 : 44;
  const X = (v: number) => L + (v / 4.95) * (W - L - R);
  const Y = (v: number) => T + ((6.4 - v) / 3.4) * (H - T - B);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="text-[13px] text-[#52666F] sm:text-[14px]"><span className="sm:hidden">{subShort}</span><span className="hidden sm:inline">{sub}</span></p>
      <div ref={box} className="mt-2 min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#e3ebe7]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" fontSize={F} role="img" aria-label={sub}>
          {[3, 3.5, 4, 4.5, 5, 5.5, 6].map((v) => (
            <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#eef2f0" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" fill="#6b7b83">{v.toFixed(1)}%</text></g>
          ))}
          {(narrow ? [0, 2.48, 4.95] : [0, 1.24, 2.48, 3.71, 4.95]).map((v) => <text key={v} x={X(v)} y={H - B + 16} textAnchor="middle" fill="#6b7b83">{v.toFixed(2)}%</text>)}
          <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fill="#6b7b83" fontSize={F - 1}>{xLabel}</text>
          {size.h >= 200 && <text transform={`translate(11 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fill="#6b7b83" fontSize={F - 1}>{yLabel}</text>}
          {YEAR_ENDS.map((e, i) => {
            const pts = Array.from({ length: 24 }, (_, j) => curveAt(e, j / 23));
                        return (
              <g key={i}>
                <polyline points={pts.map(([a, b]) => `${X(a)},${Y(b)}`).join(" ")} fill="none" stroke={YEAR_COLOURS[i]} strokeWidth={2} strokeLinejoin="round" />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 shrink-0 rounded-[10px] bg-[#EDF6F1] px-3 py-2 text-[12px] leading-snug text-[#132D3B] sm:text-[13px]">
        <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-[#127052]">{insightK}</span>
        <span className="sm:hidden">{insightShort}</span><span className="hidden sm:inline">{insight}</span>
      </div>
    </div>
  );
}

// The heat-map slide (the owner's mockup, 26/10/2026): a fixed sample grid, target return up, horizon across.
const HEAT_H = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30];
const HEAT_Y = Array.from({ length: 18 }, (_, i) => Math.round((3 + i * 0.2) * 10) / 10);
const HEAT_SAMPLE: HeatMap = {
  horizons: HEAT_H,
  ytms: HEAT_Y,
  cells: HEAT_Y.map((y) => HEAT_H.map((h) => {
    const top = h < 4 ? 4.6 + 0.4 * h : h > 14 ? 6 : 6.2;
    if (y > top + 1e-9) return null;
    return Math.round(Math.min(4.5, 0.03 * Math.pow(h, 0.8) * Math.exp(1.05 * (y - 3))) * 100) / 100;
  })),
};

export function HeatMapScreen({ sub, subShort, insightShort, insightK, insight, retLabel, yrs }: { sub: string; subShort: string; insightShort: string; insightK: string; insight: string; retLabel: string; yrs: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="text-[13px] text-[#52666F] sm:text-[14px]"><span className="sm:hidden">{subShort}</span><span className="hidden sm:inline">{sub}</span></p>
      {/* Phones: a small picture of the map (no figures, no legend text), like the mockup. */}
      <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#e3ebe7] p-2 heat-mini" aria-hidden>
        <HeatMapChart plain map={HEAT_SAMPLE} method="m1" onMethod={() => {}} retLabel={retLabel} yearsLabel={yrs} blacklist={false} onBlacklist={() => {}} />
      </div>
      <div className="mt-2 shrink-0 rounded-[10px] bg-[#EDF6F1] px-3 py-2 text-[12px] leading-snug text-[#132D3B] sm:text-[13px]">
        <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-[#127052]">{insightK}</span>
        <span className="sm:hidden">{insightShort}</span><span className="hidden sm:inline">{insight}</span>
      </div>
    </div>
  );
}
