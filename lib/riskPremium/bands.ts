import { CURVE_RATINGS, type CurveRating } from "./curve";

// The curve's ratings grouped by 10BONDS risk score (lib/ratings.ts): what the admin tuning panel on the search page
// moves together. Kept free of server code: the panel runs in the browser.
export const RISK_BANDS: Readonly<Record<number, readonly CurveRating[]>> = {
  1: ["AAA"],
  2: ["AA+", "AA", "AA-"],
  3: ["A+", "A", "A-"],
  4: ["BBB+"],
  5: ["BBB"],
  6: ["BBB-"],
  7: ["BB+", "BB", "BB-"],
};
export const BAND_RISKS = [1, 2, 3, 4, 5, 6, 7] as const;
export const SHIFT_LIMIT = 300; // bp either way

/** "s1,...,s7" (bp per risk score) from the search request; null when absent or malformed. */
export function parseShifts(raw: string | null): number[] | null {
  if (!raw) return null;
  const xs = raw.split(",").map(Number);
  if (xs.length !== BAND_RISKS.length || xs.some((x) => !Number.isFinite(x))) return null;
  return xs.map((x) => Math.max(-SHIFT_LIMIT, Math.min(SHIFT_LIMIT, Math.round(x))));
}

/** The premiums with each risk band moved by its shift, never below 0 bp. */
export function shiftPremiums(premiums: Readonly<Record<CurveRating, number>>, shifts: readonly number[]): Record<CurveRating, number> {
  const out = { ...premiums } as Record<CurveRating, number>;
  BAND_RISKS.forEach((risk, i) => {
    for (const r of RISK_BANDS[risk]) out[r] = Math.max(0, premiums[r] + (shifts[i] ?? 0));
  });
  for (const r of CURVE_RATINGS) out[r] ??= premiums[r];
  return out;
}

/** Weight from the search request ("rw"), 0..3; null when absent or malformed. */
export function parseWeight(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const w = Number(raw);
  return Number.isFinite(w) ? Math.min(3, Math.max(0, Math.round(w * 100) / 100)) : null;
}

/** The premiums scaled by the weight (1 = as stored), then each risk band moved by its shift; never below 0 bp. */
export function tunedPremiums(premiums: Readonly<Record<CurveRating, number>>, weight: number, shifts?: readonly number[] | null): Record<CurveRating, number> {
  const scaled = Object.fromEntries(CURVE_RATINGS.map((r) => [r, Math.round(premiums[r] * weight)])) as Record<CurveRating, number>;
  return shifts ? shiftPremiums(scaled, shifts) : scaled;
}
