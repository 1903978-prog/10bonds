import { notchOf, spGradeOf } from "../ratings";

// 10BONDS Risk Premium Curve: the minimum yearly yield premium over a maturity-matched German government (Bund) yield
// that a bond of each rating must offer before the risk-adjusted ranking counts it as paid for its credit risk.
// Internal screening hurdles set by 10BONDS (Livio, 20/10/2026), not observed market spreads or expected losses.
//
// Units: premiums are stored and computed in basis points (1 bp = 0.01 percentage point = 0.0001 in decimal).
// Yields on the site are in percent (4.12 = 4.12%). Convert only with bpToPct / pctToBp below.
//
// The authoritative numbers live in app.risk_premium_versions (lib/riskPremium/store.ts). V1_PREMIUMS is the seed
// for that table and the "Restore Version 1.0 defaults" button; the ranking always reads the active stored version.

export const CURVE_RATINGS = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-"] as const;
export type CurveRating = (typeof CURVE_RATINGS)[number];

export const V1_PREMIUMS: Readonly<Record<CurveRating, number>> = {
  AAA: 35, "AA+": 40, AA: 45, "AA-": 50, "A+": 55, A: 60, "A-": 70,
  "BBB+": 95, BBB: 115, "BBB-": 165, "BB+": 195, BB: 235, "BB-": 300,
};

export type CurveConfig = {
  /** Version label, e.g. "1.0". */
  version: string;
  /** Database id of the stored version (0 for an unsaved curve, e.g. in tests). */
  id: number;
  currency: "EUR";
  issuerCategory: "corporate";
  /** Remaining maturity in years the curve applies to (Version 1.0: about five years, 4 to 6). */
  minMaturity: number;
  maxMaturity: number;
  /** Weakest rating accepted in the standard retail mode (default BBB-, investment grade). */
  floor: CurveRating;
  /** Risk compensation surplus (bp) at or above which a bond needs an admin review before it can rank. */
  exceptionalBp: number;
  premiums: Record<CurveRating, number>;
};

export const V1_CURVE: CurveConfig = {
  version: "1.0",
  id: 0,
  currency: "EUR",
  issuerCategory: "corporate",
  minMaturity: 4,
  maxMaturity: 6,
  floor: "BBB-",
  exceptionalBp: 200,
  premiums: { ...V1_PREMIUMS },
};

export const bpToPct = (bp: number) => bp / 100;
export const pctToBp = (pct: number) => pct * 100;
/** Round away binary noise (4.45 - 4.00 = 0.4500000000000002) so equality tests are exact. */
export const cleanBp = (bp: number) => Math.round(bp * 1e6) / 1e6;

/** The curve's rating symbol for an agency grade (S&P, Moody's or Fitch spelling), or null when outside the curve. */
export function curveRatingOf(grade: string | number | null | undefined): CurveRating | null {
  const n = typeof grade === "number" ? grade : notchOf(grade ?? null);
  const sp = spGradeOf(n);
  return (CURVE_RATINGS as readonly string[]).includes(sp ?? "") ? (sp as CurveRating) : null;
}

export const notchOfCurve = (r: CurveRating) => CURVE_RATINGS.indexOf(r);

/** Minimum required spread over the Bund for a rating, in bp; null when the rating is not on the curve. */
export function getRequiredSpread(rating: string | number | null, curve: CurveConfig): number | null {
  const r = curveRatingOf(rating);
  return r ? curve.premiums[r] : null;
}

/**
 * Extra yearly yield (bp) a lower-rated bond must beat to be preferred over a higher-rated one:
 * Required spread(lower rating) - Required spread(higher rating). Order of the arguments does not matter.
 * Always derived from the stored curve; there are no hand-entered pairwise thresholds.
 */
export function getRequiredYieldDifference(ratingA: string, ratingB: string, curve: CurveConfig): number {
  const a = getRequiredSpread(ratingA, curve);
  const b = getRequiredSpread(ratingB, curve);
  if (a === null || b === null) throw new Error(`Rating not on curve ${curve.version}: ${a === null ? ratingA : ratingB}`);
  return cleanBp(Math.abs(b - a));
}

/** Problems that block saving or activating a curve (empty = valid). */
export function curveProblems(c: Partial<CurveConfig> | null | undefined): string[] {
  const p: string[] = [];
  if (!c || typeof c !== "object") return ["No curve"];
  if (typeof c.version !== "string" || !/^\d{1,3}(\.\d{1,3}){1,2}$/.test(c.version)) p.push("Version must look like 1.1");
  const prem = c.premiums as Record<string, unknown> | undefined;
  let last = -Infinity;
  for (const r of CURVE_RATINGS) {
    const v = prem?.[r];
    if (typeof v !== "number" || !Number.isFinite(v)) { p.push(`${r}: premium missing`); continue; }
    if (v < 0 || v > 2000) p.push(`${r}: premium must be between 0 and 2000 bp`);
    if (v <= last) p.push(`${r}: premium must be higher than the rating above it`);
    last = v;
  }
  if (prem && Object.keys(prem).some((k) => !(CURVE_RATINGS as readonly string[]).includes(k))) p.push("Unknown rating in the curve");
  const lo = c.minMaturity, hi = c.maxMaturity;
  if (typeof lo !== "number" || typeof hi !== "number" || !(lo >= 0.5 && hi <= 40 && lo < hi)) p.push("Maturity range must be like 4 to 6 years");
  if (!c.floor || !(CURVE_RATINGS as readonly string[]).includes(c.floor)) p.push("Credit floor must be a rating on the curve");
  if (typeof c.exceptionalBp !== "number" || !(c.exceptionalBp >= 25 && c.exceptionalBp <= 2000)) p.push("Exceptional spread threshold must be 25 to 2000 bp");
  if (c.currency !== "EUR") p.push("Version 1 curves are EUR only");
  if (c.issuerCategory !== "corporate") p.push("Version 1 curves are for corporate bonds only");
  return p;
}

/** The same curve with every premium moved by `bp` (parallel), or only some ratings, for sensitivity checks. */
export function shiftedCurve(c: CurveConfig, bp: number, only?: readonly CurveRating[]): CurveConfig {
  const premiums = { ...c.premiums };
  for (const r of CURVE_RATINGS) if (!only || only.includes(r)) premiums[r] = Math.max(0, premiums[r] + bp);
  return { ...c, premiums };
}
