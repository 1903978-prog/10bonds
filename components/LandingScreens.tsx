"use client";

import { type ReactNode } from "react";
import { RiskBadge } from "@/components/RiskBadge";
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
function Chrome({ wide, lang, children }: { wide: boolean; lang: FinderLang; children: ReactNode }) {
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
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#e3e5e8] bg-white px-6">
        <span className="text-[28px] font-semibold leading-none tracking-tight">10</span>
        <span className="flex items-center gap-6 text-[14px] text-[#55555b]">
          {wide && nav.slice(0, 3).map((n) => <span key={n}>{n}</span>)}
          <span className="font-semibold text-[#1d1d1f]">{lang.toUpperCase()}</span>
          {wide && <span>{nav[3]}</span>}
          <span className="rounded-full bg-[#0071e3] px-4 py-1.5 text-[14px] font-medium text-white">{nav[4]}</span>
        </span>
      </div>
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
          <div className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">{f.mixLabel}</span><span className="text-[15px] font-semibold">{mix} / 30</span></div>
          <Track at={(mix - 1) / 29} />
          <div className="mt-1.5 flex justify-between text-[12px] text-[#55555b]"><span>{f.lowReturn}</span><span>{f.highReturn}</span></div>
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

/** The one-bond chart, drawn at its box's real size. */
function BestByRisk({ f }: { f: FinderText }) {
  const [box, size] = useBoxSize<HTMLDivElement>({ w: 600, h: 300 }, { w: 200, h: 120 });
  const pts: [number, number][] = [[10, 0], [9, 0], [8, 0], [7, 5.1], [6, 4.6], [5, 4.2], [4, 4.0], [3, 3.6], [2, 3.1], [1, 2.8]];
  const W = size.w, H = size.h, L = 56, R = 24, T = 30, B = 52;
  const x = (r: number) => L + ((10 - r) / 9) * (W - L - R);
  const y = (v: number) => T + ((5.6 - v) / 3.1) * (H - T - B);
  const shown = pts.filter(([, v]) => v > 0);
  return (
    <div ref={box} className="h-full w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" fontSize={14} role="img" aria-label={f.chartLabel}>
        {[2.5, 3.5, 4.5, 5.5].map((v) => (
          <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e5e5ea" /><text x={L - 10} y={y(v) + 5} textAnchor="end" fill="#6b6b72">{v.toFixed(1)}%</text></g>
        ))}
        <polyline points={shown.map(([r, v]) => `${x(r)},${y(v)}`).join(" ")} fill="none" stroke={BLUE} strokeWidth={3} strokeLinejoin="round" />
        {pts.map(([r, v]) => (
          <g key={r}>
            <text x={x(r)} y={H - B + 22} textAnchor="middle" fill="#6b6b72">{r}</text>
            {v > 0 && <><circle cx={x(r)} cy={y(v)} r={r === 7 ? 8 : 6} fill={r === 7 ? BLUE : "#fff"} stroke={BLUE} strokeWidth={2.5} /><text x={x(r)} y={y(v) - 14} textAnchor="middle" fontWeight={600}>{v.toFixed(1)}%</text></>}
          </g>
        ))}
        <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" fill="#6b6b72">{f.riskAxis}</text>
      </svg>
    </div>
  );
}

/** One bond: the best return for each risk level, with the chosen bond's card under it. */
export function OneBondScreen({ lang }: { lang: FinderLang }) {
  const f = FINDER_TEXT[lang];
  return (
    <ScaledScreen render={(wide) => (
      <Chrome wide={wide} lang={lang}>
        {wide && <Controls f={f} single horizon={5} mix={8} />}
        <Panel>
          <div className="min-h-0 flex-1"><BestByRisk f={f} /></div>
          <div className="mt-3 flex shrink-0 items-center justify-between rounded-[12px] border border-[#e5e5ea] px-4 py-3 text-[15px]">
            <span className="flex items-center gap-3"><RiskBadge risk={7} /><span className="font-semibold">Teva</span><span className="text-[#55555b]">Teva 4.375% 2030</span></span>
            <span className="text-[26px] font-semibold tabular-nums">5.10%</span>
          </div>
        </Panel>
      </Chrome>
    )} />
  );
}

/** The 10 bonds of the portfolio, with names. */
export function ListScreen({ lang, bonds }: { lang: FinderLang; bonds: BenchmarkBond[] | undefined }) {
  const f = FINDER_TEXT[lang];
  return (
    <ScaledScreen render={(wide) => (
      <Chrome wide={wide} lang={lang}>
        {wide && <Controls f={f} single={false} horizon={5} mix={8} />}
        <Panel><BondList f={f} bonds={bonds ?? []} /></Panel>
      </Chrome>
    )} />
  );
}
