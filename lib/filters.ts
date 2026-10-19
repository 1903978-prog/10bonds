import type { PublicBond } from "./types";

// The two search toggles: the bond's currency, and the size of its minimum order.
export const CURRENCIES = ["EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const ORDER_SIZES = ["1k", "100k"] as const;
export type OrderSize = (typeof ORDER_SIZES)[number];

// "1k" keeps only bonds you can buy with a few thousand: a minimum order of at most 10,000 (Livio, 19/10/2026).
// "100k" keeps every bond (nothing is too large for that budget's purpose here).
export const SMALL_ORDER_MAX = 10_000;

export type SearchFilters = { currency: Currency; orderSize: OrderSize };
export const DEFAULT_FILTERS: SearchFilters = { currency: "EUR", orderSize: "100k" };

/** Read the toggles from a query string; anything unknown falls back to the default (EUR, any minimum order). */
export function parseFilters(params: URLSearchParams): SearchFilters {
  const c = (params.get("currency") ?? "").toUpperCase();
  const o = (params.get("order") ?? "").toLowerCase();
  return {
    currency: (CURRENCIES as readonly string[]).includes(c) ? (c as Currency) : DEFAULT_FILTERS.currency,
    orderSize: (ORDER_SIZES as readonly string[]).includes(o) ? (o as OrderSize) : DEFAULT_FILTERS.orderSize,
  };
}

export const isDefault = (f: SearchFilters) => f.currency === DEFAULT_FILTERS.currency && f.orderSize === DEFAULT_FILTERS.orderSize;
export const filterKey = (f: SearchFilters) => `${f.currency}:${f.orderSize}`;

/**
 * Bonds that pass both toggles. With "1k" a bond whose minimum order is not known is left out:
 * a small investor must never be shown a bond that may need 100,000.
 */
export function applyFilters(bonds: PublicBond[], f: SearchFilters): PublicBond[] {
  return bonds.filter((b) => {
    if (b.currency.toUpperCase() !== f.currency) return false;
    if (f.orderSize === "1k") return b.minOrder != null && b.minOrder > 0 && b.minOrder <= SMALL_ORDER_MAX;
    return true;
  });
}
