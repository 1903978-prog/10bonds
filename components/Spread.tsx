"use client";

import { spreadBp } from "@/lib/bundSpread";
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
