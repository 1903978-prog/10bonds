import { bandOf, hurdleBp, spreadMatrix, type SpreadMatrix } from "./stepGap";
import { spreadBp, type BundPt } from "./bundSpread";

// Paper 5.2 (eq. 19): absolute spread floors over the EUR benchmark = AAA anchor + the relative steps added up. DIAGNOSTIC ONLY (owner 27/10, 1B):
// it labels a bond, it never removes one and never feeds the optimiser, and no default chance is inferred from a spread.
// The paper gives the AAA anchor only at 5 years (35 bp). Other horizons are "not assessed" until an anchor is approved: nothing is invented.
export const AAA_ANCHOR_BP: Record<number, number> = { 5: 35 };
/** BB+ / BB / BB- is notch 10 to 12 on the site scale; B+ and lower (13+) are below BB. */
export const LAST_BB_NOTCH = 12;
export const FIRST_YEAR = 1, LAST_YEAR = 10;

export type NotAssessed = "usd_benchmark_missing" | "currency_not_supported" | "below_bb" | "outside_1_10_years" | "no_aaa_anchor_for_horizon" | "no_benchmark_spread" | "unrated";
export type SpreadDiagnostic = { assessed: true; floorBp: number; spreadBp: number; shortfallBp: number; meetsFloor: boolean } | { assessed: false; reason: NotAssessed };

/** Absolute floor (bp) for a rating category (0 AAA .. 6 BB) at a horizon, or null if the paper defines no anchor there. */
export function absoluteFloorBp(band: number, years: number, m: SpreadMatrix = spreadMatrix()): number | null {
  const anchor = AAA_ANCHOR_BP[Math.round(years * 1000) / 1000];
  return anchor === undefined ? null : anchor + hurdleBp(0, band, years, m);
}

/** Label for one bond. `curve` is the EUR Bund curve; USD bonds are never compared with it (paper 5.2). */
export function spreadDiagnostic(b: { notch: number | null; currency: string; years: number | null; ytm: number | null }, curve: BundPt[], m: SpreadMatrix = spreadMatrix()): SpreadDiagnostic {
  if (b.notch === null) return { assessed: false, reason: "unrated" };
  if (b.currency === "USD") return { assessed: false, reason: "usd_benchmark_missing" };
  if (b.currency !== "EUR") return { assessed: false, reason: "currency_not_supported" };
  if (b.notch > LAST_BB_NOTCH) return { assessed: false, reason: "below_bb" };
  if (b.years === null || b.years < FIRST_YEAR || b.years > LAST_YEAR) return { assessed: false, reason: "outside_1_10_years" };
  // The anchor applies within half a year of its horizon (5y +- 0.5): an approximation, recorded here, not an extension of the paper.
  const anchorYears = Object.keys(AAA_ANCHOR_BP).map(Number).find((y) => Math.abs(y - b.years!) < 0.5);
  if (anchorYears === undefined) return { assessed: false, reason: "no_aaa_anchor_for_horizon" };
  const sp = spreadBp(curve, b.ytm, b.years);
  if (sp === null) return { assessed: false, reason: "no_benchmark_spread" };
  const floor = AAA_ANCHOR_BP[anchorYears] + hurdleBp(0, bandOf(b.notch), anchorYears, m);
  return { assessed: true, floorBp: floor, spreadBp: sp, shortfallBp: Math.max(0, floor - sp), meetsFloor: sp >= floor };
}
