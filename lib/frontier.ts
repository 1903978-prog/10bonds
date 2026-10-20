import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";

/** The red line (Livio, 20/10/2026): the efficient frontier of the 4-6 year bonds (shown in blue), risk 1 to 8. */
export const FRONTIER_SEARCH = { minDuration: 4, maxDuration: 6, minRisk: 1, maxRisk: 8 };

export type Frontier = {
  // Every rated bond with a yield: [risk 1..10, yield %, 1 when its duration is 4-6 years else 0], rounded so the payload stays small.
  dots: [number, number, number][];
  // The frontier bonds, safest first, as positions in `dots`.
  picks: number[];
};

/** Which share of a level's blue bonds yield less than the one that stands for it: near the top, but not a lone outlier. */
const FRONTIER_QUANTILE = 0.95;

/**
 * The landing chart: one grey dot per bond of every duration, the 4-6 year bonds in blue and, in red, their efficient
 * frontier. For each risk level 1..8 the blue bond at the top 5% of that level's yields stands for it, so the line runs
 * along the top of the blue cloud without being set by a single outlier. Levels that pay no more than a safer one are
 * left out, so the line rises at every step.
 */
export function frontierOf(bonds: PublicBond[]): Frontier {
  const dots: [number, number, number][] = [];
  const blue = new Map<number, number[]>();
  for (const b of bonds) {
    const risk = bondRisk(b);
    if (risk === null || b.grossYtm === null || !Number.isFinite(b.grossYtm)) continue;
    const d = b.modifiedDuration;
    const inBracket = d !== null && d >= FRONTIER_SEARCH.minDuration && d <= FRONTIER_SEARCH.maxDuration;
    if (inBracket) blue.set(risk, [...(blue.get(risk) ?? []), dots.length]);
    dots.push([risk, Math.round(b.grossYtm * 100) / 100, inBracket ? 1 : 0]);
  }
  const levels: number[] = [];
  for (let r = FRONTIER_SEARCH.minRisk; r <= FRONTIER_SEARCH.maxRisk; r++) {
    const ys = (blue.get(r) ?? []).sort((a, b) => dots[a][1] - dots[b][1]);
    if (ys.length) levels.push(ys[Math.min(ys.length - 1, Math.floor(FRONTIER_QUANTILE * ys.length))]);
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
