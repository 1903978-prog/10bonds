import type { PublicBond } from "./types";

/**
 * Dormant bonds (the owner, 21/10/2026): a bond whose minimum investment is above 200,000 EUR or 200,000 USD is kept in
 * the database but never shown or used anywhere on the site (search, top 10, slider limits, charts, ISIN pages, sitemap).
 * Other currencies are not judged here (200,000 means very different amounts); they are left for review.
 */
export const DORMANT_MIN_ABOVE = 200_000;
export const DORMANT_REASON = "min_investment_over_200k";

/** Why a bond is dormant, or null when it may be shown. `flagged` is the copy's own dormant flag, when it has one. */
export function dormantReason(b: Pick<PublicBond, "currency" | "minInvestment">, flagged?: unknown): string | null {
  if (flagged === true) return DORMANT_REASON;
  if ((b.currency === "EUR" || b.currency === "USD") && b.minInvestment != null && b.minInvestment > DORMANT_MIN_ABOVE) return DORMANT_REASON;
  return null;
}
