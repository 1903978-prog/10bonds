"use client";

import { spreadBp } from "@/lib/bundSpread";
import { riskPay } from "@/lib/riskPay";
import { useBund } from "@/lib/bundStore";
import { useGptRatings } from "@/lib/gptStore";
import { SCENARIO_CAVEAT, SCENARIO_SOURCE } from "@/lib/provisionalScenarios";

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
export const RISKPAY_NOTE = "Risk Pay metric = spread over the Bund ÷ expected default loss (annual default chance × loss given default by debt rank); Net = spread − expected loss";

/** Admin only: Risk Pay metric (spread ÷ expected loss, e.g. 9.2×), net bp on hover; "–" without a Bund point or a default chance. A stored provisional scenario range (orange, "stored" tag) is shown when one is saved for the ISIN; it is never used in any ranking. Fixed width. */
export function RiskPayCell({ isin, ytm, years, pd, life, lgd }: { isin?: string | null; ytm?: number | null; years?: number | null; pd?: number | null; life?: number | null; lgd?: number | null }) {
  const bund = useBund();
  const gpt = useGptRatings();
  const stored = isin ? gpt[isin] : undefined;
  const sv = stored?.riskPay ?? null;
  const sp = spreadBp(bund.points, ytm, years);
  const rp = riskPay(sp, pd, life, lgd ?? undefined);
  const base = "inline-block w-[6rem] whitespace-nowrap rounded px-1 text-center text-[11px] font-semibold tabular-nums";
  if (sv) {
    const text = sv.length <= 12 ? sv : "n/a";
    const title = [`Stored Risk Pay: ${sv}`, stored?.basis, stored?.basis?.includes(SCENARIO_SOURCE) ? SCENARIO_CAVEAT : null, rp?.ratio != null ? `Computed: ${rp.ratio.toFixed(1)}×` : null].filter(Boolean).join(" · ");
    return <span title={title} className={`${base} bg-orange-100 text-orange-900`} data-testid="risk-pay-stored"><span className="mr-1 text-[8px] font-bold uppercase tracking-wide">stored</span>{text}</span>;
  }
  const title = rp ? `${RISKPAY_NOTE} · spread ${sp} bp, expected loss ${rp.lossBp.toFixed(1)} bp, net ${rp.net >= 0 ? "+" : ""}${Math.round(rp.net)} bp` : undefined;
  return <span title={title} className={`${base} ${rp?.ratio != null ? "bg-amber-100 text-amber-900" : "text-mute"}`} data-testid="risk-pay">{rp?.ratio != null ? `${rp.ratio.toFixed(1)}×` : "–"}</span>;
}
