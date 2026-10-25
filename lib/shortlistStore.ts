"use client";

import { useEffect, useState } from "react";

// Admin only: the shortlists' names and averages, for the dots on the Multi-year chart and the Heat map.
export type ShortlistDot = { id: number; name: string; requested: number; count: number; avgYtm: number | null; avgDuration: number | null; avgRisk: number | null; lifeLoss: number | null };

/** The dots of every shortlist that has figures; loaded once the chart is shown (`on` false: nothing is fetched). */
export function useShortlistDots(on: boolean): ShortlistDot[] {
  const [dots, setDots] = useState<ShortlistDot[]>([]);
  useEffect(() => {
    if (!on) return;
    let stop = false;
    fetch("/api/admin/shortlists?brief=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!stop && Array.isArray(j?.lists)) setDots((j.lists as ShortlistDot[]).filter((d) => d.avgYtm != null && d.lifeLoss != null)); })
      .catch(() => {});
    return () => { stop = true; };
  }, [on]);
  return dots;
}

/** Text for a dot's hover. */
export const dotTitle = (d: ShortlistDot, note = "") =>
  `${d.name} · avg return ${d.avgYtm!.toFixed(2)}% · avg duration ${d.avgDuration!.toFixed(1)} yrs · expected loss ${d.lifeLoss!.toFixed(2)}% · ${d.count === d.requested ? `${d.count} bonds` : `${d.count} of ${d.requested} bonds`}${note}`;
