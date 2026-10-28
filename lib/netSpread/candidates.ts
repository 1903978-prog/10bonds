import type { PublicBond } from "../types";
import { candidatesOf } from "../coherentFrontier";
import { isExcludedRank } from "../seniority";
import { issuerClass } from "../seo/classify";
import { newestQuote, poolWindowOf, priceStale, type LadderStep } from "../portfolioSpec";

/** Why a bond cannot be in any portfolio (null = it can). The one place the spec's two data exclusions are written. */
export function specExclusion(b: Pick<PublicBond, "seniority" | "ytmAsOf">, newest: string | null): "subordinated" | "stale price" | null {
  if (isExcludedRank(b)) return "subordinated";
  if (priceStale(b.ytmAsOf, newest)) return "stale price";
  return null;
}

/** Sovereigns and agencies (and supranationals, which the agency list holds) do not count towards the sector cap from ladder step 1. */
export const sectorExempt = (b: Pick<PublicBond, "issuer" | "isin" | "country">): boolean => issuerClass(b) !== "corporate";

/** Candidates of one horizon under the spec: subordinated / AT1 / Tier 2 / hybrid / perpetual (seniority field) and prices more than 10 trading days stale are out; the bond duration window is the ladder step's (Long wider). */
export function specCandidates(bonds: PublicBond[], duration: number, step: LadderStep = 0) {
  const newest = newestQuote(bonds);
  return candidatesOf(bonds.filter((b) => !specExclusion(b, newest)), duration, false, poolWindowOf(duration, step));
}
