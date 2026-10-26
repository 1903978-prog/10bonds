// The points shown on the efficient frontier (the owner, 24/10/2026): expected loss on your money against average
// return. Fixed return steps bunched most points at low returns and stacked the last ones on the maximum. Instead,
// from every efficient list (lib/exactFrontier.ts):
// 1. Both ends are the true lowest-loss and highest-return lists.
// 2. The points between sit at equal distances along the curve with both axes scaled 0-1 between the ends, so return
//    and loss count the same; where a gap has no list, the largest gap left gets the next one.
// 3. Duplicates (the same 10 bonds, or under 0.05 pt apart in return and 0.02 pt in loss) are kept once and lists
//    beaten by another are dropped, so there are never more points than distinct lists, at most `count`.

export type FrontierPoint = { ytm: number; el: number; isins: string[] };

export const FRONTIER_POINTS = 30;
export const SAME_YTM = 0.05;
export const SAME_LOSS = 0.02;

export const samePoint = (a: FrontierPoint, b: FrontierPoint) =>
  a.isins.join() === b.isins.join() || (Math.abs(a.ytm - b.ytm) < SAME_YTM && Math.abs(a.el - b.el) < SAME_LOSS);

/** The efficient, distinct points of a pool, by return: strictly more return and more loss from one to the next. */
export function efficientPoints<T extends FrontierPoint>(pool: T[]): T[] {
  const sorted = [...pool].sort((a, b) => b.ytm - a.ytm || a.el - b.el || a.isins.join().localeCompare(b.isins.join()));
  const kept: T[] = [];
  let minEl = Infinity;
  for (const p of sorted) if (p.el < minEl - 1e-12) { kept.push(p); minEl = p.el; }
  kept.reverse();
  const out: T[] = [];
  for (const p of kept) {
    const last = out[out.length - 1];
    if (!last || !samePoint(last, p)) out.push(p);
    else if (p === kept[kept.length - 1] && out.length > 1) out[out.length - 1] = p; // keep the true maximum
  }
  return out;
}

/** Distances between consecutive points with both axes scaled 0-1 between the ends. */
export function gapsOf(pts: { ytm: number; el: number }[]): number[] {
  if (pts.length < 2) return [];
  const a = pts[0], b = pts[pts.length - 1];
  const sx = b.ytm - a.ytm || 1, sy = b.el - a.el || 1;
  return pts.slice(1).map((p, i) => Math.hypot((p.ytm - pts[i].ytm) / sx, (p.el - pts[i].el) / sy));
}

/** Up to `count` points spread evenly along the curve (both axes scaled 0-1), ends included, from efficient points. */
export function pickEven<T extends { ytm: number; el: number }>(pts: T[], count = FRONTIER_POINTS): T[] {
  if (pts.length <= count) return pts;
  const g = gapsOf(pts);
  const s = [0];
  for (const x of g) s.push(s[s.length - 1] + x);
  const total = s[s.length - 1];
  const nearest = (want: number, from = 0, to = pts.length - 1) => {
    let k = from;
    for (let i = from; i <= to; i++) if (Math.abs(s[i] - want) < Math.abs(s[k] - want)) k = i;
    return k;
  };
  const chosen = new Set<number>([0, pts.length - 1]);
  for (let j = 1; j < count - 1; j++) chosen.add(nearest((total * j) / (count - 1)));
  // Where two targets landed on one point: add the point nearest the middle of the largest gap left.
  while (chosen.size < count) {
    const at = [...chosen].sort((a, b) => a - b);
    let k = -1;
    for (let i = 0; i < at.length - 1; i++) if (at[i + 1] - at[i] > 1 && (k < 0 || s[at[i + 1]] - s[at[i]] > s[at[k + 1]] - s[at[k]])) k = i;
    if (k < 0) break;
    chosen.add(nearest((s[at[k]] + s[at[k + 1]]) / 2, at[k] + 1, at[k + 1] - 1));
  }
  return [...chosen].sort((a, b) => a - b).map((i) => pts[i]);
}

/** Drops (and logs, with a label) any point that does not go strictly up in both return and loss from the one before. */
export function strictlyUp<T extends { ytm: number; el: number }>(pts: T[], label: string | null = "frontier"): T[] {
  const out: T[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && !(p.ytm > last.ytm && p.el > last.el)) {
      if (label) console.warn(`[${label}] dropped a point that is not strictly higher: ${p.ytm}/${p.el} after ${last.ytm}/${last.el}`);
      continue;
    }
    out.push(p);
  }
  return out;
}
