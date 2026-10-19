import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";
import { rankBonds } from "./ranking";

/** The search the landing chart shows in red: 5-year horizon, risk up to 5, highest yield (slider at its maximum). */
export const FRONTIER_SEARCH = { duration: 5, risk: 5 };

export type Frontier = {
  // Every rated bond with a yield: [risk 1..10, yield %], rounded so the payload stays small.
  dots: [number, number][];
  // The bonds of that search, as positions in `dots`.
  picks: number[];
};

/**
 * The landing chart (Livio, 19/10/2026): one grey dot per bond of every duration, and in red the 10 bonds a real
 * search for 5 years and risk up to 5 returns, to show the efficient frontier the finder works on.
 */
export function frontierOf(bonds: PublicBond[]): Frontier {
  const dots: [number, number][] = [];
  const at = new Map<string, number>();
  for (const b of bonds) {
    const risk = bondRisk(b);
    if (risk === null || b.grossYtm === null || !Number.isFinite(b.grossYtm)) continue;
    at.set(b.isin, dots.length);
    dots.push([risk, Math.round(b.grossYtm * 100) / 100]);
  }
  const { results } = rankBonds(bonds, FRONTIER_SEARCH.duration, Number.MAX_VALUE, undefined, FRONTIER_SEARCH.risk);
  const picks = results.map((b) => at.get(b.isin)).filter((i): i is number => i !== undefined);
  return { dots, picks };
}
