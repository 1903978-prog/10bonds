// "Find Optimal Portfolio" on the admin Multi-year chart: pure maths, no data access (see docs/optimal-portfolio.md).
// Every candidate is a real efficient 10-bond list from lib/exactFrontier.ts; nothing is interpolated into a list.
// x = expected loss on your money (cumulative, %), y = average gross YTM (%): the chart's own axes.

export type FPoint = { ytm: number; el: number };

export type Knee = {
  /** Index of the knee in the points given (an actual list). */
  index: number;
  /** Height above the end-to-end diagonal, 0-1 (normalised): how pronounced the bend is. */
  strength: number;
  /** Normalised geometric curvature at the knee (diagnostic). */
  curvature: number;
  /** Share of the 3 checks (all points, two thinned copies) that land within 0.15 (normalised loss) of this knee. */
  stability: number;
};
export type KneeResult = { knee: Knee | null; reason: "ok" | "too_few_points" | "near_linear" };

export const MIN_KNEE_POINTS = 4;
export const MIN_KNEE_STRENGTH = 0.05;

const norm = (v: number[]) => {
  const lo = Math.min(...v), hi = Math.max(...v);
  return v.map((x) => (hi - lo > 1e-12 ? (x - lo) / (hi - lo) : 0));
};

/** Index of the point furthest above the diagonal in the normalised plane (Kneedle), with its height. */
function kneedle(pts: FPoint[]): { i: number; h: number; r: number[]; y: number[] } {
  const r = norm(pts.map((p) => p.el)), y = norm(pts.map((p) => p.ytm));
  let i = 0, h = -Infinity;
  for (let k = 0; k < pts.length; k++) if (y[k] - r[k] > h + 1e-12) { h = y[k] - r[k]; i = k; }
  return { i, h, r, y };
}

/** Discrete curvature |y''| / (1 + y'^2)^1.5 on the normalised points at index i (neighbours on a non-uniform grid). */
function curvatureAt(r: number[], y: number[], i: number): number {
  const a = Math.max(1, Math.min(i, r.length - 2));
  const h1 = r[a] - r[a - 1], h2 = r[a + 1] - r[a];
  if (h1 <= 0 || h2 <= 0) return 0;
  const s1 = (y[a] - y[a - 1]) / h1, s2 = (y[a + 1] - y[a]) / h2;
  const d1 = (s1 * h2 + s2 * h1) / (h1 + h2);
  const d2 = (2 * (s2 - s1)) / (h1 + h2);
  return Math.abs(d2) / Math.pow(1 + d1 * d1, 1.5);
}

/**
 * Geometric knee of an efficient frontier (points by increasing loss and return): the list with the largest normalised
 * gain over the straight line from the lowest-loss end to the highest-return end. Gives none for too few points or a
 * near-linear curve (no real interior bend), never a forced answer.
 */
export function kneeOf(points: FPoint[]): KneeResult {
  if (points.length < MIN_KNEE_POINTS) return { knee: null, reason: "too_few_points" };
  const k = kneedle(points);
  if (k.h < MIN_KNEE_STRENGTH) return { knee: null, reason: "near_linear" };
  // Stability: the same search on two thinned copies (every other point, ends kept) must land close by.
  const at = (idx: number[]) => {
    const sub = idx.map((j) => points[j]);
    const kk = kneedle(sub);
    return k.r[idx[kk.i]];
  };
  const even = points.map((_, j) => j).filter((j) => j % 2 === 0 || j === points.length - 1);
  const odd = points.map((_, j) => j).filter((j) => j % 2 === 1 || j === 0 || j === points.length - 1);
  const agree = [k.r[k.i], at(even), at(odd)].filter((x) => Math.abs(x - k.r[k.i]) <= 0.15).length;
  return { knee: { index: k.i, strength: k.h, curvature: curvatureAt(k.r, k.y, k.i), stability: agree / 3 }, reason: "ok" };
}

/**
 * Marginal efficiency at point i: extra YTM (percentage points) bought per extra 1 pp of expected loss, by central
 * difference between the neighbouring efficient lists (one-sided at the ends). Null with fewer than 2 points.
 */
export function marginalEfficiency(points: FPoint[], i: number): number | null {
  if (points.length < 2) return null;
  const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
  const dx = b.el - a.el;
  return dx > 1e-12 ? (b.ytm - a.ytm) / dx : null;
}

export type Scored = { mu: number; tail: number };

/** Indices not dominated by another (return at least as high, tail risk no higher, one strictly better). */
export function nondominated(items: Scored[]): number[] {
  const out: number[] = [];
  items.forEach((a, i) => {
    const beaten = items.some((b, j) => j !== i && b.mu >= a.mu - 1e-12 && b.tail <= a.tail + 1e-12 && (b.mu > a.mu + 1e-12 || b.tail < a.tail - 1e-12));
    if (!beaten) out.push(i);
  });
  return out;
}

/**
 * Balanced Pareto compromise: among the non-dominated candidates, scale expected net return and tail risk each to 0-1
 * over those candidates and take the largest (return - tail). This is U = (mu - rf) - lambda*T with lambda set by the
 * candidates' own ranges, so no risk-aversion number is invented. Ties go to the lower tail risk, then the lower index.
 * Returns the index into `items`, or null when empty.
 */
export function balancedPick(items: Scored[]): number | null {
  const nd = nondominated(items);
  if (!nd.length) return null;
  const mu = norm(nd.map((i) => items[i].mu)), t = norm(nd.map((i) => items[i].tail));
  let best = 0;
  for (let k = 1; k < nd.length; k++) {
    const u = mu[k] - t[k], ub = mu[best] - t[best];
    if (u > ub + 1e-12 || (Math.abs(u - ub) <= 1e-12 && items[nd[k]].tail < items[nd[best]].tail - 1e-12)) best = k;
  }
  return nd[best];
}

/** Area advantage (pp of YTM) of curve A over curve B: mean of YTM_A - YTM_B over their common loss range [a, b], trapezoid rule on A's and B's points; null when they share no range. */
export function curveAreaAdvantage(a: FPoint[], b: FPoint[]): number | null {
  if (a.length < 2 || b.length < 2) return null;
  const lo = Math.max(a[0].el, b[0].el), hi = Math.min(a[a.length - 1].el, b[b.length - 1].el);
  if (!(hi - lo > 1e-9)) return null;
  const at = (pts: FPoint[], x: number) => {
    let k = 1;
    while (k < pts.length - 1 && pts[k].el < x) k++;
    const p = pts[k - 1], q = pts[k];
    return q.el === p.el ? p.ytm : p.ytm + ((q.ytm - p.ytm) * (x - p.el)) / (q.el - p.el);
  };
  const xs = [...new Set([...a, ...b].map((p) => p.el).filter((x) => x >= lo && x <= hi).concat([lo, hi]))].sort((p, q) => p - q);
  let area = 0;
  for (let k = 1; k < xs.length; k++) area += ((at(a, xs[k - 1]) - at(b, xs[k - 1]) + at(a, xs[k]) - at(b, xs[k])) / 2) * (xs[k] - xs[k - 1]);
  return area / (hi - lo);
}
