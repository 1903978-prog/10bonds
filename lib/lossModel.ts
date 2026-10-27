import { DEFAULT_RATES, DEFAULT_YEARS } from "./seo/defaultRates";

// Default-probability model v2 (quant correction, paper section 3.1): interpolation in cumulative-hazard space.
// Λ(t) = -ln(1 - F(t)); between the table's years Λ is a straight line (a constant default intensity per interval), from 0 at
// t = 0 to the first year likewise. That keeps F between 0 and 1, never decreasing, and every hazard rate >= 0, which a straight
// line in F does not guarantee beyond the table (v1 clipped it at 100% only at the very end).
// Beyond the last observed year (15) the model continues the LAST observed hazard rate (years 10-15). That is a
// regularisation, not a calibrated long-horizon estimate: results past 15 years are flagged `extrapolated`, and `band` gives
// the range between the two defensible choices (last-interval hazard, average hazard over 0-15 years). No claim of precision
// is made for them. Corporate default table only: no sovereign table exists in the repository (needs data and licence
// decisions), so a government bond is priced from the corporate table and is NOT a separately estimated population.
// Pure functions of the table passed in, so they can be tested on synthetic tables.

export type Pd = { /** cumulative default chance to the horizon, in % */ pct: number; /** true beyond the last observed year */ extrapolated: boolean; /** pct under the two tail choices (equal to pct inside the data) */ band: [number, number] };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Cumulative hazard at each knot (0 at t = 0), from cumulative default fractions that are first forced to be non-decreasing. */
export function hazardKnots(pctRow: readonly number[], years: readonly number[] = DEFAULT_YEARS): { t: number[]; L: number[] } {
  const t = [0, ...years];
  const L = [0];
  let prev = 0;
  for (const p of pctRow) {
    const f = Math.min(0.999999, Math.max(prev, clamp01(p / 100)));
    L.push(-Math.log(1 - f));
    prev = f;
  }
  return { t, L };
}

export function cumulativeDefaultHazard(pctRow: readonly number[], years: number, knots = DEFAULT_YEARS as readonly number[]): Pd {
  if (!(years > 0)) return { pct: 0, extrapolated: false, band: [0, 0] };
  const { t, L } = hazardKnots(pctRow, knots);
  const n = t.length - 1;
  const at = (lam: number) => 100 * (1 - Math.exp(-lam));
  if (years <= t[n]) {
    let i = 1;
    while (years > t[i]) i++;
    const lam = L[i - 1] + ((L[i] - L[i - 1]) * (years - t[i - 1])) / (t[i] - t[i - 1]);
    const pct = at(lam);
    return { pct, extrapolated: false, band: [pct, pct] };
  }
  const last = (L[n] - L[n - 1]) / (t[n] - t[n - 1]);
  const mean = L[n] / t[n];
  const central = at(L[n] + last * (years - t[n]));
  const other = at(L[n] + mean * (years - t[n]));
  return { pct: central, extrapolated: true, band: [Math.min(central, other), Math.max(central, other)] };
}

const rowOf = (notch: number) => DEFAULT_RATES[Math.min(Math.max(0, Math.round(notch)), DEFAULT_RATES.length - 1)][2];
export const cumulativeDefaultV2 = (notch: number, years: number): Pd => cumulativeDefaultHazard(rowOf(notch), years);

/** Sanity report on a table (paper appendix B, checks 1 and ordering): where cumulative rates fall in time or cross between grades. */
export function tableChecks(rows: readonly (readonly number[])[] = DEFAULT_RATES.map((r) => r[2])): { timeDecreases: string[]; gradeCrossings: string[] } {
  const timeDecreases: string[] = [];
  const gradeCrossings: string[] = [];
  rows.forEach((r, i) => r.forEach((v, k) => { if (k > 0 && v < r[k - 1]) timeDecreases.push(`row ${i} year ${DEFAULT_YEARS[k]}`); }));
  for (let i = 1; i < rows.length; i++) rows[i].forEach((v, k) => { if (v < rows[i - 1][k]) gradeCrossings.push(`row ${i} vs ${i - 1} year ${DEFAULT_YEARS[k]}`); });
  return { timeDecreases, gradeCrossings };
}
