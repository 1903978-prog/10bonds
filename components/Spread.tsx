"use client";

import { spreadBp } from "@/lib/bundSpread";
import { riskPay } from "@/lib/riskPay";
import { useBund } from "@/lib/bundStore";

/** Admin only: the "Spread" column header (return minus the German Bund of the same duration, in bp). */
export const SPREAD_HEAD = "Spread";
export const SPREAD_NOTE = "Return minus the German Bund yield of the same duration, in bp";

/** One bond's spread over the Bund in bp (yellow admin style, Bund date on hover), "–" when there is no Bund point. Fixed width. */
export function Spread({ ytm, years }: { ytm?: number | null; years?: number | null }) {
  const bund = useBund();
  const v = spreadBp(bund.points, ytm, years);
  const title = v === null ? undefined : `${SPREAD_NOTE}${bund.asOf ? ` · Bund curve ${bund.asOf.slice(0, 10)}` : ""}`;
  return <span title={title} className={`inline-block min-w-[2.75rem] rounded px-1 text-center text-[11px] font-semibold tabular-nums ${v === null ? "text-mute" : "bg-amber-100 text-amber-900"}`} data-testid="bund-spread">{v === null ? "–" : `${v} bp`}</span>;
}

export const RISKPAY_HEAD = "Risk Pay";
export const RISKPAY_NOTE = "Risk Pay metric = spread over the Bund ÷ expected default loss (annual default chance × 60% loss); Net = spread − expected loss";

/** Admin only: Risk Pay metric (spread ÷ expected loss, e.g. 9.2×), net bp on hover; "–" without a Bund point or a default chance. Fixed width. */
export function RiskPayCell({ ytm, years, pd, life }: { ytm?: number | null; years?: number | null; pd?: number | null; life?: number | null }) {
  const bund = useBund();
  const sp = spreadBp(bund.points, ytm, years);
  const rp = riskPay(sp, pd, life);
  const title = rp ? `${RISKPAY_NOTE} · spread ${sp} bp, expected loss ${rp.lossBp.toFixed(1)} bp, net ${rp.net >= 0 ? "+" : ""}${Math.round(rp.net)} bp` : undefined;
  return <span title={title} className={`inline-block min-w-[2.75rem] rounded px-1 text-center text-[11px] font-semibold tabular-nums ${rp?.ratio != null ? "bg-amber-100 text-amber-900" : "text-mute"}`} data-testid="risk-pay">{rp?.ratio != null ? `${rp.ratio.toFixed(1)}×` : "–"}</span>;
}
