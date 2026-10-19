"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFinderText } from "@/lib/finderText";
import type { CurvePoint } from "@/lib/singleBond";
import type { Tier } from "@/lib/types";
import { LimitReached, QuotaNote, type Quota } from "./SearchQuota";
import { RiskBadge } from "./RiskBadge";
import { downloadXlsx } from "@/lib/xlsx";
import { fmtMin, minForExcel } from "@/lib/fmtMin";
import { dropDominated } from "@/lib/curveFilter";

type Payload = { tier: Tier; points: CurvePoint[]; quota?: Quota | null; source: "live" | "sample"; asOf: string | null };

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
        setLevel((l) => (l !== null && body.points[l - 1]?.ytm !== null ? l : null));
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

  const tier = data?.tier ?? "visitor";
  // Hide a risk step whose best yield is not above every lower-risk step: more risk must pay more.
  const points = dropDominated(data?.points ?? []);
  const point = level === null ? null : points.find((p) => p.level === level) ?? null;
  const bond = point?.options[index] ?? null;

  if (limit) return <LimitReached quota={limit} />;
  if (error) return <p className="rounded-2xl bg-canvas p-6 text-center text-sm text-mute">{error}</p>;

  return (
    <div className={`transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">{t.bestByRating}</h2>
        <span className="text-xs text-mute">{t.tapDot}</span>
      </div>
      <Chart points={points} axis={data?.points ?? []} selected={level} onPick={(l) => { setLevel(l); setIndex(0); }} />

      {point && bond ? (
        <BondBox
          currency={currency}
          label={point.label}
          bond={bond}
          tier={tier}
          canChange={index + 1 < point.options.length}
          lockedMore={point.more > 0 && index + 1 >= point.options.length}
          isLast={index + 1 >= point.options.length}
          onChange={() => setIndex((i) => i + 1)}
          onBack={index > 0 ? () => setIndex(0) : undefined}
        />
      ) : (
        !loading && data && !points.some((p) => p.ytm !== null) && <p className="mt-4 text-center text-sm text-mute">{t.noneSingle}</p>
      )}
      <QuotaNote quota={data?.quota} />
    </div>
  );
}

function Chart({ points, axis, selected, onPick }: { points: CurvePoint[]; axis: CurvePoint[]; selected: number | null; onPick: (l: number) => void }) {
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
  const H = W < 500 ? 240 : 300, L = 44, R = 22, T = 26, B = 40, PAD = 22;
  const ys = points.map((p) => p.ytm).filter((y): y is number => y !== null);
  const lo = ys.length ? Math.floor(Math.min(...ys) * 2) / 2 - 0.5 : 0;
  const hi = ys.length ? Math.ceil(Math.max(...ys) * 2) / 2 + 0.5 : 5;
  // Risk 1 (lowest) always on the right edge, risk 10 at the left.
  const x = (level: number) => L + PAD + ((10 - level) / 9) * (W - L - PAD - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const ticks: number[] = [];
  // At most ~6 gridlines so the axis figures never crowd each other.
  const step = hi - lo > 10 ? 2 : hi - lo > 4 ? 1 : 0.5;
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  const drawn = points.filter((p) => p.ytm !== null);
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
        </text>
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
      {ys.length > 0 && points.filter((p) => p.ytm === null).map((p) => (
        <g key={p.level} data-testid={`empty-${p.level}`}>
          <circle cx={x(p.level)} cy={y(lo)} r="4" fill="#fff" stroke="#c7c7cc" strokeWidth="2" strokeDasharray="2 2" />
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
  canChange: boolean;
  lockedMore: boolean;
  isLast: boolean;
  onChange: () => void;
  onBack?: () => void;
}) {
  const { bond, tier } = props;
  const signedIn = tier !== "visitor";
  const paid = tier === "plus" || tier === "premium";
  const t = useFinderText();
  const lock = signedIn ? <Link href="/pricing" className="text-accent">{t.withPlus}</Link> : <Link href="/signup" className="text-accent">{t.freeAccountLower}</Link>;
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-2 border-b border-line/50 py-0.5 text-xs">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right font-medium tabular-nums">{v}</dd>
    </div>
  );
  return (
    <div className="mt-1 rounded-xl border border-line/70 px-3 py-2" data-testid="bond-box">
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
        {row(t.risk, signedIn ? <RiskBadge risk={bond.risk} title={t.riskNote} /> : lock)}
        {row(t.duration, signedIn ? `${bond.duration?.toFixed(1)} ${t.yrs}` : lock)}
        {row(t.coupon, paid ? (bond.coupon === null || bond.coupon === undefined ? "—" : `${bond.coupon}%`) : lock)}
        {row(t.maturity, paid ? bond.maturity ?? "—" : lock)}
        {row(t.minInvest, signedIn ? fmtMin(bond.minInvestment, props.currency) : lock)}
        {(!signedIn || bond.country) && row(t.country, signedIn ? bond.country : lock)}
      </dl>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {props.canChange ? (
          <button onClick={props.onChange} className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#0077ed]">
            {t.change}
          </button>
        ) : props.lockedMore ? (
          <Link href="/signup" className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white">{t.signUpOthers}</Link>
        ) : (
          <span className="text-xs text-mute">{props.isLast ? t.noOther : ""}</span>
        )}
        {props.onBack && <button onClick={props.onBack} className="text-xs text-accent">{t.backBest}</button>}
        {paid && (
          <button
            type="button"
            data-testid="excel-download-bond"
            onClick={() =>
              downloadXlsx(
                [
                  [t.issuer, t.bond, "ISIN", `${t.yieldLower} %`, t.risk, t.duration, `${t.coupon} %`, t.maturity, t.country, t.minInvest],
                  [bond.issuer, bond.name, bond.isin, bond.ytm, bond.risk, bond.duration, bond.coupon ?? null, bond.maturity ?? null, bond.country ?? null, minForExcel(bond.minInvestment)],
                ],
                `10bonds-${bond.isin ?? "bond"}.xlsx`,
                "Bond",
              )
            }
            className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-canvas"
          >
            ⬇ {t.excel}
          </button>
        )}
        <span className="text-[11px] text-mute">{t.changeHint}</span>
      </div>
    </div>
  );
}
