import { cleanBp, pctToBp } from "./curve";
import type { Evaluation } from "./evaluate";

// Pairwise rule: a lower-rated bond is preferred only when its extra yield is strictly greater than the extra
// premium the curve requires for its lower rating. At exact equality the higher-rated bond is preferred.
// Bonds of nearly the same maturity are compared on their yields directly; otherwise only on their spreads over
// the maturity-matched Bund (the benchmark-adjusted version of the same rule). Anything else is not comparable.

/** Maturities within this many years of each other may be compared on raw yield. */
export const DIRECT_MATURITY_TOLERANCE = 0.5;

export type PairResult =
  | { comparable: false; reason: string }
  | {
      comparable: true;
      method: "direct" | "benchmark";
      higher: Evaluation; // the better-rated bond (or the first one when equally rated)
      lower: Evaluation;
      requiredBp: number; // extra yearly yield the lower-rated bond must beat
      actualBp: number; // extra yearly yield it offers (yield or spread difference)
      preferred: Evaluation;
      lowerPasses: boolean;
    };

const COMPARABLE = new Set(["eligible", "below_hurdle"]);

export function compareBonds(a: Evaluation, b: Evaluation, tolerance = DIRECT_MATURITY_TOLERANCE): PairResult {
  for (const e of [a, b]) if (!COMPARABLE.has(e.status)) return { comparable: false, reason: `${e.issuer}: ${e.reason ?? e.status}` };
  if (a.currency !== b.currency) return { comparable: false, reason: "Different currencies" };
  if (a.category !== b.category) return { comparable: false, reason: "Different issuer categories" };
  if (a.versionId !== b.versionId) return { comparable: false, reason: "Different methodology versions" };
  const [higher, lower] = a.notch! <= b.notch! ? [a, b] : [b, a];
  const requiredBp = cleanBp(lower.requiredBp! - higher.requiredBp!);
  let method: "direct" | "benchmark";
  let actualBp: number;
  if (Math.abs(a.maturityYears! - b.maturityYears!) <= tolerance + 1e-9) {
    method = "direct";
    actualBp = cleanBp(pctToBp(lower.ytm! - higher.ytm!));
  } else if (a.spreadBp !== null && b.spreadBp !== null) {
    method = "benchmark";
    actualBp = cleanBp(lower.spreadBp! - higher.spreadBp!);
  } else {
    return { comparable: false, reason: "Maturities too far apart and no Bund benchmark for both" };
  }
  // Same rating: no hurdle, more yield (or spread) wins; a tie keeps the first bond.
  const lowerPasses = a.notch === b.notch ? actualBp > 0 : actualBp > requiredBp;
  return { comparable: true, method, higher, lower, requiredBp, actualBp, preferred: lowerPasses ? lower : higher, lowerPasses };
}

const pct = (bp: number) => `${(bp / 100).toFixed(2)}%`;

/**
 * Plain-language reason for a pairwise result, for the bond details. Uses 10BONDS risk scores, never agency grades
 * (customers only ever see the score). Analytical wording only: it says how the comparison works, not what to buy.
 */
export function explainPair(r: PairResult, riskOf: (e: Evaluation) => number | null): string {
  if (!r.comparable) return `These two bonds are not compared directly: ${r.reason.toLowerCase()}.`;
  const { higher, lower, requiredBp, actualBp } = r;
  const what = r.method === "direct" ? "yield" : "spread over German government bonds";
  const h = `${higher.issuer} (risk ${riskOf(higher) ?? "–"}) yields ${higher.ytm!.toFixed(2)}%`;
  const l = `${lower.issuer} (risk ${riskOf(lower) ?? "–"}) yields ${lower.ytm!.toFixed(2)}%`;
  if (requiredBp === 0) return `${h}; ${l}. Same credit band, so the higher ${what} ranks first.`;
  const verdict = r.lowerPasses
    ? `is above the ${pct(requiredBp)} minimum our comparison methodology requires for the extra credit risk, so ${lower.issuer} ranks higher`
    : `is ${actualBp === requiredBp ? "equal to" : "below"} the ${pct(requiredBp)} minimum our comparison methodology requires for the extra credit risk, so ${higher.issuer} ranks higher`;
  return `${h}. ${l} but carries more credit risk. Its extra ${what} of ${pct(actualBp)} ${verdict}. This is a comparison measure, not a yield anyone earns.`;
}
