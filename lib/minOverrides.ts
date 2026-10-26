/**
 * Minimum investments we know are wrong in the nightly copy, fixed on our side (the LM op model export is not ours to change).
 * The copy often has no issuer denomination and falls back to the trading venue's lot (e.g. 1,000), which is not
 * what the issuer requires. The owner, 19/10/2026: a 100k bond was listed under 1k–10k.
 */

/** By ISIN, from the issuer's terms. */
export const MIN_BY_ISIN: Record<string, number> = {
  // Republic of Chile 4% 2034 (EUR): Chile issues its euro notes "in denominations of €100,000" (prospectus, hacienda.cl).
  XS3459013960: 100_000,
};

/** Issuers whose EUR bonds are all sold in pieces of at least this size (matched on the start of the issuer name). */
const MIN_BY_ISSUER_EUR: { prefix: RegExp; min: number }[] = [
  // Chile's euro notes: €100,000 minimum denomination.
  { prefix: /^chile\b/i, min: 100_000 },
];

/** The minimum to show and filter on: the known value when we have one and it is higher than the copy's. */
export function correctedMin(isin: string, issuer: string | null, currency: string | null, fromCopy: number | null): number | null {
  let known = MIN_BY_ISIN[isin] ?? null;
  if (currency === "EUR" && issuer) for (const r of MIN_BY_ISSUER_EUR) if (r.prefix.test(issuer.trim())) known = Math.max(known ?? 0, r.min);
  if (known == null) return fromCopy;
  return Math.max(known, fromCopy ?? 0);
}
