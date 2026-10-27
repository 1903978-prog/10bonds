import { DEFAULT_RATES, DEFAULT_YEARS } from "./seo/defaultRates";

/** Simulated paths per search (a real run, not a display number). */
export const MC_PATHS = 1_000_000;
/** Share of the investment recovered when an issuer defaults (long-run average for senior unsecured bonds). */
export const MC_RECOVERY = 0.4;

/** `samples`: the first MC_SAMPLES simulated paths, as the portfolio's value (100 at the start) at MC_STEPS+1 even points of the horizon, drawn while the search runs. */
/** `es5`: the average yield (annual, %) of the worst 5% of paths (Expected Shortfall 95%). */
/** `defaults`: share of paths with at least one default, and the share with exactly k defaults (index k, 0..n). `quantiles`: annual yield (%) that this share of paths falls below. */
export type McDefaultStats = { anyDefault: number; countShare: number[]; quantiles: { p1: number | null; p5: number | null; p25: number | null; p50: number | null } };
export type MonteCarloResult = { paths: number; expYield: number | null; p5: number | null; es5?: number | null; samples: number[][]; defaults?: McDefaultStats };
/** Optional stress for a run: default chances times `pdMult` (capped at 1), loss given default plus `lgdAdd` (capped at 1). */
export type McStress = { pdMult?: number; lgdAdd?: number };
/** One bond of a simulated list. `pd`: its chance (fraction) of defaulting within the horizon, from the same table as every other figure (lib/expectedLoss.ts); without it the average curve of its risk score is used. */
export type McBond = { ytm: number; risk: number | null | undefined; lgd?: number; pd?: number };
export const MC_SAMPLES = 60;
export const MC_STEPS = 40;

// Cumulative default rate (fraction) per 10BONDS risk score: the average of the rating notches mapped to it.
const CURVES: Record<number, number[]> = (() => {
  const out: Record<number, number[][]> = {};
  for (const [, risk, pct] of DEFAULT_RATES) for (const r of risk.split("–").map(Number)) (out[r] ??= []).push(pct);
  const avg: Record<number, number[]> = {};
  for (const [r, list] of Object.entries(out)) avg[+r] = DEFAULT_YEARS.map((_, i) => list.reduce((s, p) => s + p[i], 0) / list.length / 100);
  return avg;
})();

/** Probability that a bond with this risk score defaults within `years` (linear between the table's points). */
export function defaultProbability(risk: number | null | undefined, years: number): number {
  const curve = CURVES[Math.min(10, Math.max(1, Math.round(risk ?? 10)))];
  if (years <= 0) return 0;
  if (years <= DEFAULT_YEARS[0]) return (curve[0] * years) / DEFAULT_YEARS[0];
  for (let i = 1; i < DEFAULT_YEARS.length; i++) {
    if (years <= DEFAULT_YEARS[i]) {
      const a = DEFAULT_YEARS[i - 1], b = DEFAULT_YEARS[i];
      return curve[i - 1] + ((curve[i] - curve[i - 1]) * (years - a)) / (b - a);
    }
  }
  return curve[curve.length - 1];
}

// Small fast seeded generator, so the same search always gives the same answer.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BIN = 0.00001; // ending value per 1 invested, in steps fine enough for 0.01% yield precision
const TOP = 4;

/**
 * Equal-weight portfolio held for `years`: in each path every issuer may default (historical default rates for its
 * risk score), at a random time within the horizon, returning MC_RECOVERY of its value then. Gives the average yield after
 * defaults and the yield that 95% of the paths beat.
 */
export function simulatePortfolio(bonds: McBond[], years: number, paths = MC_PATHS, seed = 1, stress: McStress = {}): MonteCarloResult {
  if (!bonds.length || years <= 0) return { paths: 0, expYield: null, p5: null, samples: [] };
  const n = bonds.length;
  const y = bonds.map((b) => b.ytm / 100);
  const pd = bonds.map((b) => Math.min(1, (b.pd ?? defaultProbability(b.risk, years)) * (stress.pdMult ?? 1)));
  const rec = bonds.map((b) => 1 - Math.min(1, (b.lgd ?? 1 - MC_RECOVERY) + (stress.lgdAdd ?? 0))); // share recovered in a default: follows the loss given default by debt rank
  const full = y.map((r) => Math.pow(1 + r, years));
  const rand = mulberry32(seed);
  // Paths are counted by ending value; the yield of each value is worked out once per step, not once per path.
  const bins = new Uint32Array(Math.ceil(TOP / BIN));
  const last = bins.length - 1;
  const samples: number[][] = [];
  const counts = new Uint32Array(n + 1);
  const at = new Float64Array(n); // default time per bond in the path being sampled (Infinity: no default)
  for (let p = 0; p < paths; p++) {
    let v = 0, nd = 0;
    for (let i = 0; i < n; i++) {
      const u = rand();
      if (u < pd[i]) {
        v += Math.pow(1 + y[i], (years * u) / pd[i]) * rec[i];
        at[i] = (years * u) / pd[i];
        nd++;
      } else {
        v += full[i];
        at[i] = Infinity;
      }
    }
    counts[nd]++;
    if (p < MC_SAMPLES) samples.push(samplePath(y, at, years, rec));
    const k = Math.floor(v / n / BIN);
    bins[k > last ? last : k]++;
  }
  const yieldOf = (k: number) => Math.pow((k + 0.5) * BIN, 1 / years) - 1;
  let sum = 0, seen = 0, p5: number | null = null, tail = 0;
  const tailN = paths * 0.05;
  const qAt: Record<"p1" | "p25" | "p50", number | null> = { p1: null, p25: null, p50: null };
  const qShare = { p1: 0.01, p25: 0.25, p50: 0.5 } as const;
  for (let k = 0; k <= last; k++) {
    if (!bins[k]) continue;
    sum += bins[k] * yieldOf(k);
    if (seen < tailN) tail += Math.min(bins[k], tailN - seen) * yieldOf(k);
    seen += bins[k];
    if (p5 === null && seen >= tailN) p5 = yieldOf(k) * 100;
    for (const q of ["p1", "p25", "p50"] as const) if (qAt[q] === null && seen >= paths * qShare[q]) qAt[q] = yieldOf(k) * 100;
  }
  const countShare = Array.from(counts, (c) => c / paths);
  const defaults: McDefaultStats = { anyDefault: 1 - countShare[0], countShare, quantiles: { ...qAt, p5 } };
  return { paths, expYield: (sum / paths) * 100, p5, es5: (tail / tailN) * 100, samples, defaults };
}

/** One simulated path as portfolio value over time: each bond grows at its yield until it defaults, then keeps MC_RECOVERY of its value. */
function samplePath(y: number[], at: Float64Array, years: number, rec: number[]): number[] {
  const out: number[] = [];
  for (let k = 0; k <= MC_STEPS; k++) {
    const x = (years * k) / MC_STEPS;
    let v = 0;
    for (let i = 0; i < y.length; i++) v += x < at[i] ? Math.pow(1 + y[i], x) : Math.pow(1 + y[i], at[i]) * rec[i];
    out.push(Math.round((v / y.length) * 1000) / 10);
  }
  return out;
}

// Same top 10 and horizon give the same answer, so repeated searches (slider back and forth) are not re-run.
const cache = new Map<string, MonteCarloResult>();

/** simulatePortfolio for a ranked list, remembered for the last few hundred lists. */
export function simulateCached(key: string, bonds: McBond[], years: number): MonteCarloResult {
  const hit = cache.get(key);
  if (hit) return hit;
  const res = simulatePortfolio(bonds, years);
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  cache.set(key, res);
  return res;
}
