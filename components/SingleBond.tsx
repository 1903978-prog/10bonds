"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFinderText } from "@/lib/finderText";
import type { CurvePoint } from "@/lib/singleBond";
import type { Tier } from "@/lib/types";
import { LimitReached, QuotaNote, type Quota } from "./SearchQuota";

type Payload = { tier: Tier; points: CurvePoint[]; quota?: Quota | null; source: "live" | "sample"; asOf: string | null };

const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(2)}%`);

/** One-bond mode: best yield per rating step for the chosen duration; click a dot to see that bond, "Change" for the next one. */
export default function SingleBond({ duration, preview }: { duration: number; preview: string | null }) {
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
        const qs = new URLSearchParams({ duration: String(duration) });
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
  }, [duration, preview]);

  const tier = data?.tier ?? "visitor";
  const points = data?.points ?? [];
  const point = level === null ? null : points[level - 1];
  const bond = point?.options[index] ?? null;

  if (limit) return <LimitReached quota={limit} />;
  if (error) return <p className="rounded-2xl bg-canvas p-6 text-center text-sm text-mute">{error}</p>;

  return (
    <div className={`transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">{t.bestByRating}</h2>
        <span className="text-xs text-mute">{t.tapDot}</span>
      </div>
      <Chart points={points} selected={level} onPick={(l) => { setLevel(l); setIndex(0); }} />

      {point && bond ? (
        <BondBox
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
        <p className="mt-4 rounded-2xl bg-canvas p-5 text-center text-sm text-mute">
          {points.some((p) => p.ytm !== null) ? t.pickRating : t.noneSingle}
        </p>
      )}
      <QuotaNote quota={data?.quota} />
    </div>
  );
}

function Chart({ points, selected, onPick }: { points: CurvePoint[]; selected: number | null; onPick: (l: number) => void }) {
  const t = useFinderText();
  const W = 420, H = 260, L = 56, R = 22, T = 22, B = 46;
  const ys = points.map((p) => p.ytm).filter((y): y is number => y !== null);
  const lo = ys.length ? Math.floor(Math.min(...ys) * 2) / 2 - 0.5 : 0;
  const hi = ys.length ? Math.ceil(Math.max(...ys) * 2) / 2 + 0.5 : 5;
  // AAA always on the right: level 1 (AAA) at the right edge, level 10 (BB) at the left.
  const x = (level: number) => L + ((10 - level) / 9) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const ticks: number[] = [];
  const step = hi - lo > 4 ? 1 : 0.5;
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  const drawn = points.filter((p) => p.ytm !== null);
  const path = drawn.map((p, i) => `${i ? "L" : "M"}${x(p.level).toFixed(1)},${y(p.ytm!).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={t.chartLabel}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e5e5ea" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#86868b">{v.toFixed(step < 1 ? 1 : 0)}%</text>
        </g>
      ))}
      {points.map((p) => (
        <text key={p.level} x={x(p.level)} y={H - B + 20} textAnchor="middle" fontSize="12" fill="#86868b">
          {p.label === "BBB / BBB-" ? "BBB" : p.label === "BB and above" ? "BB" : p.label}
        </text>
      ))}
      <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="#86868b">{t.riskAxis}</text>
      <path d={path} fill="none" stroke="#0071e3" strokeWidth="2.5" strokeLinejoin="round" />
      {drawn.map((p) => (
        <g key={p.level} onClick={() => onPick(p.level)} style={{ cursor: "pointer" }} data-testid={`dot-${p.level}`}>
          <circle cx={x(p.level)} cy={y(p.ytm!)} r="16" fill="transparent" />
          <circle cx={x(p.level)} cy={y(p.ytm!)} r={selected === p.level ? 7 : 5} fill={selected === p.level ? "#0071e3" : "#fff"} stroke="#0071e3" strokeWidth="2.5" />
          <text x={x(p.level)} y={y(p.ytm!) - 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1d1d1f">{p.ytm!.toFixed(1)}%</text>
        </g>
      ))}
    </svg>
  );
}

function BondBox(props: {
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
    <div className="flex justify-between gap-4 border-b border-line/60 py-2 text-sm last:border-0">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right font-medium tabular-nums">{v}</dd>
    </div>
  );
  return (
    <div className="mt-4 rounded-2xl border border-line/70 p-5" data-testid="bond-box">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-mute">{t.ratingStep} {props.label === "BB and above" ? t.bbAbove : props.label}{props.bond.rank > 1 ? ` · ${t.option} ${props.bond.rank}` : ""}</div>
          <div className="mt-0.5 truncate text-[19px] font-semibold">{bond.issuer}</div>
          {paid && <div className="truncate text-sm text-mute">{bond.name}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">{pct(bond.ytm)}</div>
          <div className="text-xs text-mute">{t.yieldLower}</div>
        </div>
      </div>
      <dl className="mt-3">
        {row("ISIN", paid ? bond.isin : lock)}
        {row(t.rating, signedIn ? bond.rating ?? "NR" : lock)}
        {row(t.duration, signedIn ? `${bond.duration?.toFixed(1)} ${t.yrs}` : lock)}
        {row(t.coupon, paid ? (bond.coupon === null || bond.coupon === undefined ? "—" : `${bond.coupon}%`) : lock)}
        {row(t.maturity, paid ? bond.maturity ?? "—" : lock)}
        {row(t.country, signedIn ? bond.country ?? "—" : lock)}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {props.canChange ? (
          <button onClick={props.onChange} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0077ed]">
            {t.change}
          </button>
        ) : props.lockedMore ? (
          <Link href="/signup" className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">{t.signUpOthers}</Link>
        ) : (
          <span className="text-sm text-mute">{props.isLast ? t.noOther : ""}</span>
        )}
        {props.onBack && <button onClick={props.onBack} className="text-sm text-accent">{t.backBest}</button>}
        <span className="text-xs text-mute">{t.changeHint}</span>
      </div>
    </div>
  );
}
