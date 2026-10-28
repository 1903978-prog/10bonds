import type { PublicBond } from "../types";
import { candidatesOf } from "../coherentFrontier";
import { isExcludedRank } from "../seniority";
import { newestQuote, poolWindowOf, priceStale } from "../portfolioSpec";

/** Why a bond cannot be in any portfolio (null = it can). The one place the spec's two data exclusions are written. */
export function specExclusion(b: Pick<PublicBond, "seniority" | "ytmAsOf">, newest: string | null): "subordinated" | "stale price" | null {
  if (isExcludedRank(b)) return "subordinated";
  if (priceStale(b.ytmAsOf, newest)) return "stale price";
  return null;
}

/** Candidates of one horizon under the spec: subordinated / AT1 / Tier 2 / hybrid / perpetual (seniority field) and prices more than 5 trading days stale are out; the bond duration window is the spec's (Long wider). */
export function specCandidates(bonds: PublicBond[], duration: number) {
  const newest = newestQuote(bonds);
  return candidatesOf(bonds.filter((b) => !specExclusion(b, newest)), duration, false, poolWindowOf(duration));
}
