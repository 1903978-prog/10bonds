import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";
import { rankBonds } from "./ranking";

/** The red line (Livio, 20/10/2026): the efficient frontier of 5-year bonds from risk 1 to risk 8. */
export const FRONTIER_SEARCH = { duration: 5, minRisk: 1, maxRisk: 8 };

export type Frontier = {
  // Every rated bond with a yield: [risk 1..10, yield %], rounded so the payload stays small.
  dots: [number, number][];
  // The frontier bonds, safest first, as positions in `dots`.
  picks: number[];
};

/**
 * The landing chart: one grey dot per bond of every duration and, in red, the efficient frontier for a 5-year horizon.
 * For each risk level 1..8 the finder's own top-yield search at that level gives its 10 best bonds; the middle one of
 * those stands for the level, so a lone outlier never sets the curve. Levels that pay no more than a safer one are left
 * out, so the line rises at every step.
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
  const levels: number[] = [];
  for (let r = FRONTIER_SEARCH.minRisk; r <= FRONTIER_SEARCH.maxRisk; r++) {
    const { results } = rankBonds(bonds.filter((b) => bondRisk(b) === r), FRONTIER_SEARCH.duration, Number.MAX_VALUE, undefined, r);
    const ys = results.map((b) => at.get(b.isin)).filter((i): i is number => i !== undefined).sort((a, b) => dots[a][1] - dots[b][1]);
    if (ys.length) levels.push(ys[Math.floor(ys.length / 2)]);
  }
  return { dots, picks: monotonicRun(levels, (i) => dots[i][1]) };
}

/**
 * The red line must rise steadily towards higher risk (Livio, 20/10/2026): of the picked bonds, ordered from the safest
 * to the riskiest, keep the longest run whose yield goes up at every step. A bond that pays less than a safer one is
 * left out, and so is a lone outlier that would otherwise hide most of the others.
 */
export function monotonicRun<T>(items: T[], ytm: (t: T) => number): T[] {
  const n = items.length;
  const len = new Array<number>(n).fill(1);
  const prev = new Array<number>(n).fill(-1);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < i; j++)
      if (ytm(items[j]) < ytm(items[i]) && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
  let end = -1;
  // On a tie the run ending at the higher yield wins.
  for (let i = 0; i < n; i++) if (end < 0 || len[i] > len[end] || (len[i] === len[end] && ytm(items[i]) > ytm(items[end]))) end = i;
  const out: T[] = [];
  for (let i = end; i >= 0; i = prev[i]) out.unshift(items[i]);
  return out;
}
