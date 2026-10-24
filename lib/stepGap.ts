// Methodology with spread rules (the owner, 24/10/2026; admin only, customers keep Methodology 1): a minimum extra return
// a bond must pay over a better-rated one before it may take its place, by rating category and maturity. The 5-year
// column equals the earlier risk premium curve 1.0 differences (AA +10 bp over AAA, A +15, BBB+ +35, BBB +20, BBB- +50,
// BB +70), so it replaces them and is never added on top of them. Edited at /admin/risk-premium ("Spread rules" tab),
// stored in app.settings (lib/riskPremium/store.ts). Illustrative policy hurdles, not market or default-study figures.
// Between columns: straight line; before 1 year and after 10 years: the nearest column (until better data).
// Below BB (B+ and lower, at most 2 per list) no step is defined yet: they count as BB.

export const SPREAD_YEARS = [1, 3, 5, 7, 10] as const;
export const SPREAD_STEPS = ["AAA → AA", "AA → A", "A → BBB+", "BBB+ → BBB", "BBB → BBB-", "BBB- → BB"] as const;
export type SpreadMatrix = number[][]; // [step][year column], bp

export const DEFAULT_SPREAD_MATRIX: SpreadMatrix = [
  [5, 8, 10, 12, 15],
  [10, 12, 15, 20, 25],
  [20, 28, 35, 47, 60],
  [12, 16, 20, 29, 40],
  [25, 37, 50, 70, 95],
  [40, 55, 70, 100, 140],
];

/** A clean copy of a matrix sent by the admin, or null if it is not 6 rows of 5 numbers from 0 to 1000 bp. */
export function cleanMatrix(raw: unknown): SpreadMatrix | null {
  if (!Array.isArray(raw) || raw.length !== SPREAD_STEPS.length) return null;
  const m = raw.map((row) => (Array.isArray(row) && row.length === SPREAD_YEARS.length ? row.map(Number) : null));
  if (m.some((row) => !row || row.some((x) => !Number.isFinite(x) || x < 0 || x > 1000))) return null;
  return (m as number[][]).map((row) => row.map((x) => Math.round(x * 10) / 10));
}

let matrix: SpreadMatrix = DEFAULT_SPREAD_MATRIX;

/** Use the saved matrix (called whenever the live risk settings load; null keeps the defaults). */
export function setSpreadMatrix(m: SpreadMatrix | null | undefined): void {
  matrix = (m && cleanMatrix(m)) ?? DEFAULT_SPREAD_MATRIX;
}
export const spreadMatrix = () => matrix;

/** Changes whenever the matrix does: part of the frontier cache key. */
export const stepSignature = () => matrix.map((r) => r.join(",")).join(";");

/** Rating category on the site's notch scale (0 = AAA): 0 AAA, 1 AA, 2 A, 3 BBB+, 4 BBB, 5 BBB-, 6 BB and below. */
export function bandOf(notch: number): number {
  if (notch <= 0) return 0;
  if (notch <= 3) return 1;
  if (notch <= 6) return 2;
  if (notch <= 9) return notch - 4;
  return 6;
}

/** One step's minimum (bp) at this maturity: straight line between the columns, the nearest column outside them. */
export function stepAt(m: SpreadMatrix, step: number, years: number): number {
  const ys = SPREAD_YEARS;
  const row = m[step];
  if (years <= ys[0]) return row[0];
  for (let i = 1; i < ys.length; i++) if (years <= ys[i]) return row[i - 1] + ((row[i] - row[i - 1]) * (years - ys[i - 1])) / (ys[i] - ys[i - 1]);
  return row[ys.length - 1];
}

/** Minimum extra return (bp) from category `from` to the riskier category `to` at this maturity: the steps between, added. */
export function hurdleBp(from: number, to: number, years: number, m: SpreadMatrix = matrix): number {
  let s = 0;
  for (let k = from; k < to; k++) s += stepAt(m, k, years);
  return s;
}

/** The extra return (in %) a bond of notch `riskier` and `years` to maturity must pay over one of notch `safer` (0 when not riskier). */
export function stepGap(safer: number, riskier: number, years: number): number {
  return hurdleBp(bandOf(safer), bandOf(riskier), years) / 100;
}
