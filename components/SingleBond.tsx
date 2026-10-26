"use client";

import Link from "next/link";
import { useContext, useEffect, useRef, useState } from "react";
import { FinderLangContext, useFinderText } from "@/lib/finderText";
import { callableLabel, couponTypeLabel, FACT_TEXT, seniorityLabel } from "@/lib/bondFacts";
import type { CurvePoint } from "@/lib/singleBond";
import type { Tier } from "@/lib/types";
import { LimitReached, QuotaNote, type Quota } from "./SearchQuota";
import { RiskBadge } from "./RiskBadge";
import { GptRate, BR_HEAD, IR_HEAD } from "./GptRate";
import { Spread, RiskPayCell } from "./Spread";
import { downloadXlsx } from "@/lib/xlsx";
import { fmtMin, minForExcel } from "@/lib/fmtMin";
import { dominatedLevels, dropDominated } from "@/lib/curveFilter";
import type { FeatureKey } from "@/lib/features";

type Coverage = { count: number; min: number | null; max: number | null };
type Payload = { tier: Tier; features?: FeatureKey[]; points: CurvePoint[]; coverage?: Coverage; quota?: Quota | null; source: "live" | "sample"; asOf: string | null };

const range52 = (lo: number | null | undefined, hi: number | null | undefined) =>
  `${lo == null ? "–" : lo.toFixed(2)} / ${hi == null ? "–" : hi.toFixed(2)}`;
const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(2)}%`);

/** One-bond mode: best yield per risk step for the chosen duration; click a dot to see that bond, "Change" for the next one. */
export default function SingleBond({ duration, preview, currency = "EUR", size = "100k" }: { duration: number; preview: string | null; currency?: string; size?: string }) {
  const t = useFinderText();
  const errText = t.error;
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  // Reveal progress 0..1: dots appear one after the other (riskiest on the left first) while the counter climbs.
  const [prog, setProg] = useState(1);
  const lang = useContext(FinderLangContext);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ duration: String(duration), currency, size });
        if (preview) qs.set("preview", preview);
        const res = await fetch(`/api/bonds/curve?${qs}`, { signal: ctrl.signal });
        const body = await res.json();
        if (res.status === 402 && body.limitReached) {
          setLimit(body.limitReached);
          setError(null);
          return;
        }
        if (!res.ok) throw new Error(body.error ?? errText);
        setLimit(null);
        setData(body);
        setError(null);
        setIndex(0);
        setLevel(null); // a new horizon starts again from the lowest-risk bond
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [duration, preview, currency, size]);

  const nDots = dropDominated(data?.points ?? []).filter((p) => p.ytm !== null).length;
  useEffect(() => {
    if (!data) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setProg(1); return; }
    const dur = Math.max(900, nDots * 150 + 300);
    const t0 = performance.now();
    let raf = 0;
    setProg(0);
    const tick = (now: number) => {
      const v = Math.min(1, (now - t0) / dur);
      setProg(v);
      if (v < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, nDots]);
  const running = prog < 1;
  const visible = running ? Math.floor(prog * (nDots + 1)) : nDots;
  const scanned = data?.coverage?.count ?? null;

  const tier = data?.tier ?? "visitor";
  // Hide a risk step whose best yield is not above every lower-risk step: more risk must pay more.
  // The axis stops at the riskiest step on the blue line: riskier steps would only hold "no bond" or grey dots (6 to 1 if nothing riskier pays more).
  const onLine = dropDominated(data?.points ?? []).filter((p) => p.ytm !== null).map((p) => p.level);
  const top = onLine.length ? Math.max(2, ...onLine) : 10;
  const all = (data?.points ?? []).filter((p) => p.level <= top);
  const points = dropDominated(all);
  // Until a dot is tapped, show the lowest-risk bond (rightmost dot) so the card is always there.
  const shown = level ?? points.find((p) => p.ytm !== null)?.level ?? null;
  const point = shown === null ? null : all.find((p) => p.level === shown) ?? null;
  const bond = point?.options[index] ?? null;

  if (limit) return <LimitReached quota={limit} />;
  if (error) return <p className="rounded-2xl bg-canvas p-6 text-center text-sm text-mute">{error}</p>;

  return (
    <div className={`transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
      {/* On phones the chart and the bond are two separate rounded cards on the grey page; from sm up they are one box as before. */}
      <div className="rounded-[28px] bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none" data-testid="curve-card" data-tip="chart">
      <div className="flex items-baseline justify-between gap-2 whitespace-nowrap">
        <h2 className="shrink-0 text-[16px] font-semibold sm:text-[17px]">{t.bestByRating}</h2>
        <span className="min-w-0 truncate text-[11px] text-mute sm:text-xs">{t.tapDot}</span>
      </div>
      {/* Fixed-height counter line: climbs to the real number of bonds scanned, then stays as a quiet note. */}
      <div className="mt-1 h-4 text-[11px] tabular-nums text-mute sm:text-xs" aria-live="off" data-testid="scan-counter">
        {data && scanned !== null && scanned > 0 && (running
          ? `${CHECKED[lang]?.run ?? CHECKED.en.run} ${Math.round(scanned * prog * (2 - prog)).toLocaleString("en-US")}`
          : `${scanned.toLocaleString("en-US")} ${CHECKED[lang]?.done ?? CHECKED.en.done}`)}
      </div>
      <Chart visible={visible} points={points} ghosts={dominatedLevels(all)} axis={all} selected={shown} onPick={(l) => { setLevel(l); setIndex(0); }} />
      {dominatedLevels(all).length > 0 && <p className="hidden text-[11px] text-mute sm:block" data-testid="ghost-note">{t.ghostNote}</p>}
      </div>

      <div className={`mt-3 min-h-[440px] transition-opacity duration-300 sm:mt-0 sm:min-h-0 ${running ? "opacity-0" : "opacity-100"}`}>
      {point && bond ? (
        <BondBox
          currency={currency}
          label={point.label}
          bond={bond}
          tier={tier}
          features={data?.features ?? []}
          canChange={index + 1 < point.options.length}
          lockedMore={point.more > 0 && index + 1 >= point.options.length}
          isLast={index + 1 >= point.options.length}
          onChange={() => setIndex((i) => i + 1)}
          onBack={index > 0 ? () => setIndex(0) : undefined}
        />
      ) : (
        !loading && data && !points.some((p) => p.ytm !== null) && (
          <p className="mt-4 text-center text-sm text-mute">
            {t.noneSingle}
            {data.coverage && data.coverage.count < 200 && <><br />{t.noneCoverage(data.coverage.count, currency, data.coverage.min ?? 0, data.coverage.max ?? 0)}</>}
          </p>
        )
      )}
      </div>
      <div data-tip="quota"><QuotaNote quota={data?.quota} /></div>
    </div>
  );
}

const CHECKED: Record<string, { run: string; done: string }> = {
  en: { run: "Bonds checked", done: "bonds checked" },
  it: { run: "Obbligazioni analizzate", done: "obbligazioni analizzate" },
  fr: { run: "Obligations analysées", done: "obligations analysées" },
  de: { run: "Anleihen geprüft", done: "Anleihen geprüft" },
};

function Chart({ visible, points, ghosts, axis, selected, onPick }: { visible: number; points: CurvePoint[]; ghosts: CurvePoint[]; axis: CurvePoint[]; selected: number | null; onPick: (l: number) => void }) {
  const t = useFinderText();
  // PAD keeps the first risk column clear of the y-axis figures.
  // Drawn at the container's real pixel width so text stays readable on phones and the chart fills wide screens.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(680);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const admin = axis.some((p) => p.band !== undefined);
  const H = (W < 500 ? 170 : 300) + (admin ? 14 : 0), L = 44, R = 22, T = 26, B = admin ? 54 : 40, PAD = 22;
  const ys = [...points, ...ghosts].map((p) => p.ytm).filter((y): y is number => y !== null);
  const lo = ys.length ? Math.floor(Math.min(...ys) * 2) / 2 - 0.5 : 0;
  const hi = ys.length ? Math.ceil(Math.max(...ys) * 2) / 2 + 0.5 : 5;
  // Risk 1 (lowest) always on the right edge, the riskiest step shown at the left.
  const top = Math.max(2, ...axis.map((p) => p.level));
  const x = (level: number) => L + PAD + ((top - level) / (top - 1)) * (W - L - PAD - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const ticks: number[] = [];
  // At most ~6 gridlines (~4 on the short phone chart) so the axis figures never crowd each other.
  const step = W < 500 ? (hi - lo > 6 ? 2 : hi - lo > 2.5 ? 1 : 0.5) : hi - lo > 10 ? 2 : hi - lo > 4 ? 1 : 0.5;
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  const drawn = points.filter((p) => p.ytm !== null).sort((a, b) => b.level - a.level).slice(0, visible);
  const complete = visible >= points.filter((p) => p.ytm !== null).length;
  const path = drawn.map((p, i) => `${i ? "L" : "M"}${x(p.level).toFixed(1)},${y(p.ytm!).toFixed(1)}`).join(" ");

  return (
    <div ref={box} className="mt-1 w-full">
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={t.chartLabel}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e5e5ea" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="13" fill="#86868b">{v.toFixed(step < 1 ? 1 : 0)}%</text>
        </g>
      ))}
      {axis.map((p) => (
        <text key={p.level} x={x(p.level)} y={H - B + 17} textAnchor="middle" fontSize="13" fill="#86868b">
          {p.label}
          {admin && <tspan x={x(p.level)} dy={14} fontSize="10" data-testid={`sp-${p.level}`}>{p.band}</tspan>}
        </text>
      ))}
      {complete && ghosts.map((p) => (
        <g key={`g${p.level}`} data-testid={`ghost-${p.level}`} onClick={() => onPick(p.level)} style={{ cursor: "pointer" }}>
          <title>{t.ghostNote}</title>
          <circle cx={x(p.level)} cy={y(p.ytm!)} r="16" fill="transparent" />
          <circle cx={x(p.level)} cy={y(p.ytm!)} r={selected === p.level ? 6 : 4} fill={selected === p.level ? "#c7c7cc" : "#fff"} stroke="#c7c7cc" strokeWidth="2" />
          <text x={x(p.level)} y={y(p.ytm!) - 10} textAnchor="middle" fontSize="11" fill="#aeaeb2">{p.ytm!.toFixed(1)}%</text>
        </g>
      ))}
      <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize="13" fill="#86868b">{t.riskAxis}</text>
      <path d={path} fill="none" stroke="#0071e3" strokeWidth="2.5" strokeLinejoin="round" />
      {drawn.map((p) => (
        <g key={p.level} onClick={() => onPick(p.level)} style={{ cursor: "pointer" }} data-testid={`dot-${p.level}`}>
          <circle cx={x(p.level)} cy={y(p.ytm!)} r="16" fill="transparent" />
          <circle cx={x(p.level)} cy={y(p.ytm!)} r={selected === p.level ? 7 : 5} fill={selected === p.level ? "#0071e3" : "#fff"} stroke="#0071e3" strokeWidth="2.5" />
          <text x={x(p.level)} y={y(p.ytm!) - 14} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1d1d1f">{p.ytm!.toFixed(1)}%</text>
        </g>
      ))}
      {complete && ys.length > 0 && points.filter((p) => p.ytm === null).map((p) => (
        <g key={p.level} data-testid={`empty-${p.level}`}>
          <circle cx={x(p.level)} cy={y(lo)} r="2.5" fill="#c7c7cc" />
          <text x={x(p.level)} y={y(lo) - 20} textAnchor="middle" fontSize="9" fill="#86868b">
            {t.noBond.split(" ").map((w, i) => <tspan key={i} x={x(p.level)} dy={i ? 10 : 0}>{w}</tspan>)}
          </text>
        </g>
      ))}
    </svg>
    </div>
  );
}

function BondBox(props: {
  currency: string;
  label: string;
  bond: CurvePoint["options"][number];
  tier: Tier;
  features: FeatureKey[];
  canChange: boolean;
  lockedMore: boolean;
  isLast: boolean;
  onChange: () => void;
  onBack?: () => void;
}) {
  const { bond, tier } = props;
  const signedIn = tier !== "visitor";
  // ISIN and the other facts, and the Excel button, when the plan has them (the admin's feature table).
  const paid = props.features.includes("isin");
  const excel = props.features.includes("excel");
  const t = useFinderText();
  const lang = useContext(FinderLangContext);
  const f = FACT_TEXT[lang];
  const lock = signedIn ? <Link href="/pricing" className="text-accent">{t.withPlus}</Link> : <Link href="/signup" className="text-accent">{t.freeAccountLower}</Link>;
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-2 border-b border-line/50 py-1.5 text-[13px] sm:py-0.5 sm:text-xs">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right font-medium tabular-nums">{v}</dd>
    </div>
  );
  return (
    <div className="rounded-[28px] bg-white px-4 py-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:mt-1 sm:rounded-xl sm:border sm:border-line/70 sm:px-3 sm:py-2 sm:shadow-none" data-testid="bond-box">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 truncate text-sm">
          <span className="text-xs text-mute">{t.ratingStep} {props.label}{props.bond.rank > 1 ? ` · ${t.option} ${props.bond.rank}` : ""} · </span>
          <span className="font-semibold">{bond.issuer}</span>
          {paid && <span className="text-xs text-mute"> · {bond.name}</span>}
        </div>
        <div className="shrink-0 text-right text-lg font-semibold tabular-nums">{pct(bond.ytm)} <span className="text-xs font-normal text-mute">{t.yieldLower}</span></div>
      </div>
      <dl className="mt-1 grid grid-cols-1 gap-x-5 sm:grid-cols-2 lg:grid-cols-3">
        {row("ISIN", paid ? bond.isin : lock)}
        {row(t.risk, signedIn ? <RiskBadge risk={bond.risk} title={t.riskNote} sp={bond.sp} /> : lock)}
        {row(t.duration, signedIn ? `${bond.duration?.toFixed(1)} ${t.yrs}` : lock)}
        {row(t.coupon, paid ? (bond.coupon === null || bond.coupon === undefined ? "—" : `${bond.coupon}%`) : lock)}
        {row(f.couponType, paid ? couponTypeLabel(lang, bond.couponType) : lock)}
        {row(f.seniority, paid ? seniorityLabel(lang, bond.seniority) : lock)}
        {row(t.maturity, paid ? bond.maturity ?? "—" : lock)}
        {row(f.issueDate, paid ? bond.issueDate ?? "–" : lock)}
        {row(f.callable, paid ? callableLabel(lang, bond.callable) : lock)}
        {row(t.minInvest, signedIn ? fmtMin(bond.minInvestment, props.currency) : lock)}
        {row(t.country, signedIn ? bond.country || "—" : lock)}
        {row(t.currency, signedIn ? props.currency : lock)}
        {bond.sp !== undefined && <>{row(`${IR_HEAD} (admin)`, <GptRate isin={bond.isin} kind="ir" />)}{row(`${BR_HEAD} (admin)`, <GptRate isin={bond.isin} />)}{row("Spread vs Bund (admin)", <Spread ytm={bond.ytm} years={bond.duration} />)}{row("Risk Pay (admin)", <RiskPayCell isin={bond.isin} ytm={bond.ytm} years={bond.duration} pd={bond.pd} life={bond.life} lgd={bond.lgd} />)}</>}
        {bond.sp !== undefined && row("52w min / max (admin)", <span className="rounded bg-yellow-100 px-1">{range52(bond.low52w, bond.high52w)}</span>)}
      </dl>
      {/* Fixed slots: every control keeps the same place whichever bond is shown. */}
      <div className="mt-2 flex flex-wrap items-center gap-2 whitespace-nowrap">
        <span className="inline-flex h-7 w-48 shrink-0 items-center" data-tip="change">
          {props.canChange ? (
            <button onClick={props.onChange} className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#0077ed]">
              {t.change}
            </button>
          ) : props.lockedMore ? (
            <Link href="/signup" className="truncate rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white">{t.signUpOthers}</Link>
          ) : (
            <span className="truncate text-xs text-mute">{props.isLast ? t.noOther : ""}</span>
          )}
        </span>
        <button onClick={props.onBack} disabled={!props.onBack} className={`shrink-0 text-xs text-accent ${props.onBack ? "" : "invisible"}`}>{t.backBest}</button>
        {excel && paid && (
          <button
            type="button"
            data-testid="excel-download-bond"
            onClick={() =>
              downloadXlsx(
                [
                  [t.issuer, t.bond, "ISIN", `${t.yieldLower} %`, t.duration, `${t.coupon} %`, f.couponType, f.seniority, t.maturity, f.issueDate, f.callable, t.country, t.currency, t.minInvest],
                  [bond.issuer, bond.name, bond.isin, bond.ytm, bond.duration, bond.coupon ?? null, couponTypeLabel(lang, bond.couponType), seniorityLabel(lang, bond.seniority), bond.maturity ?? null, bond.issueDate ?? null, callableLabel(lang, bond.callable), bond.country ?? null, props.currency, minForExcel(bond.minInvestment)],
                ],
                `10bonds-${bond.isin ?? "bond"}.xlsx`,
                "Bond",
              )
            }
            className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-canvas"
          >
            ⬇ {t.excel}
          </button>
        )}
        <span className="hidden truncate text-[11px] text-mute sm:inline">{t.changeHint}</span>
      </div>
    </div>
  );
}
