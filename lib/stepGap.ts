import { V1_PREMIUMS, CURVE_RATINGS, type CurveRating } from "./riskPremium/curve";

// Minimum extra return per risk step (the owner, 24/10/2026: "the whole logic of building an efficient portfolio"):
// a bond of a worse rating only earns its place over a better-rated one if it pays at least the difference between
// their premiums on the active risk premium curve (lib/riskPremium/curve.ts, edited as versions at /admin/risk-premium).
// Version 1.0: AA +10 bp over AAA, A +15, BBB+ +35, BBB +20, BBB- +50, BB +70 (one notch at a time inside each band).
// The curve stops at BB-; below it the steps keep widening (provisional, only B+ and lower, at most 2 per list).
const BELOW_CURVE = [375, 450, 550, 700, 850, 1000, 1200, 1400, 1600]; // B+, B, B-, CCC+, CCC, CCC-, CC, C, D

let premiums: number[] = ladder(V1_PREMIUMS);

function ladder(p: Readonly<Record<CurveRating, number>>): number[] {
  const top = CURVE_RATINGS.map((r) => p[r]);
  const lift = Math.max(0, top[top.length - 1] - V1_PREMIUMS["BB-"]);
  // Keep the ladder rising whatever the stored curve says, so a riskier step never needs less than a safer one.
  return [...top, ...BELOW_CURVE.map((x) => x + lift)].reduce<number[]>((a, x) => [...a, Math.max(x, a[a.length - 1] ?? 0)], []);
}

/** Use the active curve's premiums (called whenever the live risk settings load; null keeps Version 1.0). */
export function setStepPremiums(p: Readonly<Record<CurveRating, number>> | null | undefined): void {
  premiums = ladder(p ?? V1_PREMIUMS);
}

/** Changes whenever the premiums do: part of the frontier cache key. */
export const stepSignature = () => premiums.join(",");

/** The extra return (in %) a bond of notch `riskier` must pay over one of notch `safer` (0 when it is not riskier). */
export function stepGap(safer: number, riskier: number): number {
  if (riskier <= safer) return 0;
  const at = (n: number) => premiums[Math.max(0, Math.min(premiums.length - 1, n))];
  return (at(riskier) - at(safer)) / 100;
}
