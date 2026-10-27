import { DEFAULT_RATES, DEFAULT_YEARS } from "./seo/defaultRates";
import { activeEngine } from "./enginePolicy";
import { cumulativeDefaultV2, cumulativeDefaultHazard } from "./lossModel";
import { SOVEREIGN_YEARS, sovereignCumulative, sovereignRow } from "./sovereign";

// Yield after expected losses ("loss-adjusted yield"), the score both finder modes rank by:
// yield minus the yearly default rate for the bond's rating over its horizon times the share lost in a default.
// Default rates: 10BONDS combined long-run cumulative averages per notch (lib/seo/defaultRates.ts). Loss given default by debt rank: 60% senior preferred, 75% senior non-preferred, 90% subordinated (lib/seniority.ts).
export const LOSS_GIVEN_DEFAULT = 0.6;

/** The DEFAULT_RATES row for a notch (AAA = 0 .. B- = 15, CCC+ = 16, CCC and below = 17). */
function rowOf(notch: number): number[] {
  return DEFAULT_RATES[Math.min(Math.max(0, Math.round(notch)), DEFAULT_RATES.length - 1)][2];
}

// Sensitivity studies only (scripts/quant-stability.ts): all default chances times this factor. Production never sets it (1 = unchanged).
let pdScale = 1;
export const setPdScale = (x: number) => { pdScale = x > 0 ? x : 1; };

/** Cumulative default probability in % over `years` for a notch, read linearly between the published years. */
export function cumulativeDefault(notch: number, years: number, sovereign = false): number {
  const base = sovereign ? sovereignBase(notch, years) : cumulativeBase(notch, years);
  return pdScale === 1 ? base : Math.min(100, base * pdScale);
}

// National governments use their own table (lib/sovereign.ts), read the same way as the corporate one.
function sovereignBase(notch: number, years: number): number {
  if (activeEngine().loss === "v2_hazard") return cumulativeDefaultHazard(sovereignRow(notch), years, SOVEREIGN_YEARS).pct;
  return sovereignCumulative(notch, years);
}

function cumulativeBase(notch: number, years: number): number {
  // Engine policy "v2_hazard" (lib/lossModel.ts); the default "v1_linear" below is what runs in production today.
  if (activeEngine().loss === "v2_hazard") return cumulativeDefaultV2(notch, years).pct;
  const row = rowOf(notch);
  const ys = DEFAULT_YEARS as readonly number[];
  if (years <= ys[0]) return row[0];
  for (let i = 1; i < ys.length; i++) {
    if (years <= ys[i]) return row[i - 1] + ((row[i] - row[i - 1]) * (years - ys[i - 1])) / (ys[i] - ys[i - 1]);
  }
  return (row[row.length - 1] * years) / ys[ys.length - 1];
}

/** Expected loss in percentage points per year for a notch over a horizon. */
export function expectedLoss(notch: number, years: number, lgd = LOSS_GIVEN_DEFAULT, sovereign = false): number {
  const t = Math.max(1, years);
  return (cumulativeDefault(notch, t, sovereign) / t) * lgd;
}

/** Yield after expected losses, in %. */
export function lossAdjustedYield(ytm: number, notch: number, years: number, lgd = LOSS_GIVEN_DEFAULT, sovereign = false): number {
  return ytm - expectedLoss(notch, years, lgd, sovereign);
}

/**
 * Chance of a loss over a list's life (the owner 20/10): each bond's chance of defaulting year by year until it matures
 * (year t = cum(t) - cum(t-1) from the default table), so its chance of surviving every year is 1 - cum(years to
 * maturity). The list loses nothing only if every bond survives every year, so, treating bonds as independent:
 * chance of a loss = 1 - product over bonds of (1 - cum_i). In %.
 */
export function listLossChance(chances: number[]): number {
  return 100 * (1 - chances.reduce((p, c) => p * (1 - c / 100), 1));
}

/**
 * Expected loss over the list's life as % of the money invested (Livio 20/10: the chance of a loss alone looked too
 * high, since it counts any default among 10 bonds): the equal-weight average of each bond's default chance to
 * maturity times its loss in a default (`lgds`, by debt rank, lib/seniority.ts; 60% when not given).
 */
export function listLifeLoss(chances: number[], lgds?: number[]): number {
  return chances.length ? chances.reduce((s, c, i) => s + c * (lgds?.[i] ?? LOSS_GIVEN_DEFAULT), 0) / chances.length : 0;
}

/** One bond's chance of defaulting before it matures, in %. */
export function bondLossChance(notch: number, years: number, sovereign = false): number {
  return Math.min(100, cumulativeDefault(notch, Math.max(0, years), sovereign));
}
