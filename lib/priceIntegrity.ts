import { cleanPriceFromYield } from "./bondPrice";
import type { PublicBond } from "./types";

// Price sanity checks (the owner, 25/10/2026): a stored price that fails any check is not trusted. The bond is left out
// of every ranking and shown only to the admin (yellow list at /admin/data-quality). Customers never see prices or sources.

export const PRICE_MIN = 30;
export const PRICE_MAX = 150;
/** A price quote older than this (days, against the newest yield date) is stale. */
export const PRICE_STALE_DAYS = 7;
/** Stored yield and the yield recomputed from the stored price may differ by this much (percentage points). */
export const YIELD_TOLERANCE = 1;
/** The same price (other than par) on this many bonds or more is a feed fault, not a market. */
export const SAME_PRICE_BONDS = 10;

export type PriceReason = "price_zero" | "price_out_of_range" | "yield_mismatch" | "price_stale" | "price_unconfirmed" | "price_same_on_many";

export const REASON_TEXT: Record<PriceReason, string> = {
  price_zero: "price is 0 or negative",
  price_out_of_range: `price outside ${PRICE_MIN}-${PRICE_MAX}`,
  yield_mismatch: `stored yield differs from the yield worked out from the price by more than ${YIELD_TOLERANCE} pp`,
  price_stale: `price quote older than ${PRICE_STALE_DAYS} days`,
  price_unconfirmed: "price marked as not confirmed by its source",
  price_same_on_many: `the same price sits on ${SAME_PRICE_BONDS}+ bonds`,
};

/** Fields the nightly copy may carry about a price; every one optional. */
export type PriceMeta = { source?: string | null; asOf?: string | null; stale?: boolean | null; confirmed?: boolean | null };

/** Yield (percent) that gives this clean price; null when it cannot be solved. */
export function yieldFromPrice(coupon: number | null, maturity: string | null, price: number, today: Date): number | null {
  if (coupon === null || maturity === null || !(price > 0)) return null;
  let lo = -0.9 * 100;
  let hi = 100;
  const at = (y: number) => cleanPriceFromYield(coupon, maturity, y, today);
  const pLo = at(lo);
  const pHi = at(hi);
  if (pLo === null || pHi === null || price > pLo || price < pHi) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const p = at(mid);
    if (p === null) return null;
    if (p > price) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Why a bond's own price cannot be trusted (empty list = fine, or no price stored). Does not look across bonds. */
export function priceProblems(b: PublicBond, meta: PriceMeta = {}, newestDay: number = Date.now()): PriceReason[] {
  const out: PriceReason[] = [];
  const p = b.cleanPrice;
  if (p != null) {
    const fixed = !b.couponType || b.couponType === "fixed" || b.couponType === "zero";
    if (p <= 0) out.push("price_zero");
    else if (fixed && (p < PRICE_MIN || p > PRICE_MAX)) out.push("price_out_of_range");
    else if (fixed && b.grossYtm != null) {
      const y = yieldFromPrice(b.coupon, b.maturity, p, new Date(newestDay));
      if (y !== null && Math.abs(y - b.grossYtm) > YIELD_TOLERANCE) out.push("yield_mismatch");
    }
  }
  if (p != null || meta.source) {
    if (meta.stale === true) out.push("price_stale");
    else if (meta.asOf) {
      const t = Date.parse(meta.asOf);
      if (Number.isFinite(t) && newestDay - t > PRICE_STALE_DAYS * 86_400_000) out.push("price_stale");
    }
    if (meta.confirmed === false) out.push("price_unconfirmed");
  }
  return out;
}

/** Prices (other than par) that sit on many bonds at once. */
export function repeatedPrices(prices: (number | null | undefined)[]): Set<number> {
  const count = new Map<number, number>();
  for (const p of prices) if (p != null && p > 0 && p !== 100) count.set(p, (count.get(p) ?? 0) + 1);
  return new Set([...count].filter(([, n]) => n >= SAME_PRICE_BONDS).map(([p]) => p));
}

export type FlaggedBond = { isin: string; name: string; currency: string; price: number | null; ytm: number | null; source: string | null; asOf: string | null; reasons: PriceReason[] };

/** Splits bonds into the trusted ones and the flagged ones (with reasons). `meta` is keyed by ISIN. */
export function screenPrices(bonds: PublicBond[], meta: Map<string, PriceMeta>, newestDay: number): { ok: PublicBond[]; flagged: FlaggedBond[] } {
  const repeated = repeatedPrices(bonds.map((b) => b.cleanPrice));
  const ok: PublicBond[] = [];
  const flagged: FlaggedBond[] = [];
  for (const b of bonds) {
    const m = meta.get(b.isin) ?? {};
    const reasons = priceProblems(b, m, newestDay);
    if (b.cleanPrice != null && repeated.has(b.cleanPrice)) reasons.push("price_same_on_many");
    if (!reasons.length) { ok.push(b); continue; }
    flagged.push({ isin: b.isin, name: b.name, currency: b.currency, price: b.cleanPrice ?? null, ytm: b.grossYtm, source: m.source ?? null, asOf: m.asOf ?? null, reasons });
  }
  return { ok, flagged };
}
