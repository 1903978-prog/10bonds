import type { PublicBond } from "./types";

/**
 * Search filters (Livio, 19/10/2026): currency EUR / USD, and minimum order size.
 * "1k" = bonds whose minimum investment is 1,000 to 10,000 (small savers); "100k" = every bond.
 * A bond whose minimum is unknown is left out of "1k" (it may well be 100,000).
 */
export type BondFilter = { currency: "EUR" | "USD"; size: "1k" | "100k" };
export const DEFAULT_FILTER: BondFilter = { currency: "EUR", size: "100k" };
export const SMALL_ORDER_MAX = 10_000;

export function parseFilter(params: URLSearchParams): BondFilter {
  return {
    currency: params.get("currency") === "USD" ? "USD" : "EUR",
    size: params.get("size") === "1k" ? "1k" : "100k",
  };
}

export const isDefaultFilter = (f: BondFilter) => f.currency === DEFAULT_FILTER.currency && f.size === DEFAULT_FILTER.size;
export const filterKey = (f: BondFilter) => `${f.currency}:${f.size}`;

export function applyFilter(bonds: PublicBond[], f: BondFilter): PublicBond[] {
  return bonds.filter(
    (b) => b.currency === f.currency && (f.size === "100k" || (b.minInvestment != null && b.minInvestment <= SMALL_ORDER_MAX)),
  );
}

/**
 * The minimum a buyer must invest: the issuer's minimum denomination, else the venue lot when it is above 1.
 * USD bonds use the issuer denomination only: their venue lot (often 1,000) says nothing about the many dollar notes
 * sold in 200,000 pieces, so an unknown minimum stays unknown rather than landing in the small-order filter.
 */
export function minInvestmentOf(minDenomination: number | null, minLot: number | null, currency: string | null = "EUR"): number | null {
  if (minDenomination != null && minDenomination > 0) return minDenomination;
  if (currency !== "USD" && minLot != null && minLot > 1) return minLot;
  return null;
}
