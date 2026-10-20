import { DEFAULT_RATES, DEFAULT_YEARS } from "./seo/defaultRates";

// Yield after expected losses ("loss-adjusted yield"), the score both finder modes rank by:
// yield minus the yearly default rate for the bond's rating over its horizon times the share lost in a default.
// Default rates: 10BONDS combined long-run cumulative averages per notch (lib/seo/defaultRates.ts). Loss given default: 60%.
export const LOSS_GIVEN_DEFAULT = 0.6;

/** The DEFAULT_RATES row for a notch (AAA = 0 .. B- = 15, CCC+ = 16, CCC and below = 17). */
function rowOf(notch: number): number[] {
  return DEFAULT_RATES[Math.min(Math.max(0, Math.round(notch)), DEFAULT_RATES.length - 1)][2];
}

/** Cumulative default probability in % over `years` for a notch, read linearly between the published years. */
export function cumulativeDefault(notch: number, years: number): number {
  const row = rowOf(notch);
  const ys = DEFAULT_YEARS as readonly number[];
  if (years <= ys[0]) return row[0];
  for (let i = 1; i < ys.length; i++) {
    if (years <= ys[i]) return row[i - 1] + ((row[i] - row[i - 1]) * (years - ys[i - 1])) / (ys[i] - ys[i - 1]);
  }
  return (row[row.length - 1] * years) / ys[ys.length - 1];
}

/** Expected loss in percentage points per year for a notch over a horizon. */
export function expectedLoss(notch: number, years: number): number {
  const t = Math.max(1, years);
  return (cumulativeDefault(notch, t) / t) * LOSS_GIVEN_DEFAULT;
}

/** Yield after expected losses, in %. */
export function lossAdjustedYield(ytm: number, notch: number, years: number): number {
  return ytm - expectedLoss(notch, years);
}
