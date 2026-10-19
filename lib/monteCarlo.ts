import { DEFAULT_RATES, DEFAULT_YEARS } from "./seo/defaultRates";

/** Simulated paths per search (a real run, not a display number). */
export const MC_PATHS = 1_000_000;
/** Share of the investment recovered when an issuer defaults (long-run average for senior unsecured bonds). */
export const MC_RECOVERY = 0.4;

export type MonteCarloResult = { paths: number; expYield: number | null; p5: number | null };

// Cumulative default rate (fraction) per 10BONDS risk score: the average of the S&P notches mapped to it.
const CURVES: Record<number, number[]> = (() => {
  const out: Record<number, number[][]> = {};
  for (const [, risk, pct] of DEFAULT_RATES) for (const r of risk.split("–").map(Number)) (out[r] ??= []).push(pct);
  const avg: Record<number, number[]> = {};
  for (const [r, list] of Object.entries(out)) avg[+r] = DEFAULT_YEARS.map((_, i) => list.reduce((s, p) => s + p[i], 0) / list.length / 100);
  return avg;
})();

/** Probability that a bond with this risk score defaults within `years` (linear between the S&P points). */
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
 * Equal-weight portfolio held for `years`: in each path every issuer may default (S&P historical rates for its risk
 * score), at a random time within the horizon, returning MC_RECOVERY of its value then. Gives the average yield after
 * defaults and the yield that 95% of the paths beat.
 */
export function simulatePortfolio(bonds: { ytm: number; risk: number | null | undefined }[], years: number, paths = MC_PATHS, seed = 1): MonteCarloResult {
  if (!bonds.length || years <= 0) return { paths: 0, expYield: null, p5: null };
  const n = bonds.length;
  const y = bonds.map((b) => b.ytm / 100);
  const pd = bonds.map((b) => defaultProbability(b.risk, years));
  const full = y.map((r) => Math.pow(1 + r, years));
  const rand = mulberry32(seed);
  // Paths are counted by ending value; the yield of each value is worked out once per step, not once per path.
  const bins = new Uint32Array(Math.ceil(TOP / BIN));
  const last = bins.length - 1;
  for (let p = 0; p < paths; p++) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const u = rand();
      v += u < pd[i] ? Math.pow(1 + y[i], (years * u) / pd[i]) * MC_RECOVERY : full[i];
    }
    const k = Math.floor(v / n / BIN);
    bins[k > last ? last : k]++;
  }
  const yieldOf = (k: number) => Math.pow((k + 0.5) * BIN, 1 / years) - 1;
  let sum = 0, seen = 0, p5: number | null = null;
  for (let k = 0; k <= last; k++) {
    if (!bins[k]) continue;
    sum += bins[k] * yieldOf(k);
    seen += bins[k];
    if (p5 === null && seen >= paths * 0.05) p5 = yieldOf(k) * 100;
  }
  return { paths, expYield: (sum / paths) * 100, p5 };
}

// Same top 10 and horizon give the same answer, so repeated searches (slider back and forth) are not re-run.
const cache = new Map<string, MonteCarloResult>();

/** simulatePortfolio for a ranked list, remembered for the last few hundred lists. */
export function simulateCached(key: string, bonds: { ytm: number; risk: number | null | undefined }[], years: number): MonteCarloResult {
  const hit = cache.get(key);
  if (hit) return hit;
  const res = simulatePortfolio(bonds, years);
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  cache.set(key, res);
  return res;
}
