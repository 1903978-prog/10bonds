import { describe, expect, it } from "vitest";
import { priceProblems, screenPrices, yieldFromPrice } from "./priceIntegrity";
import { cleanPriceFromYield } from "./bondPrice";
import type { PublicBond } from "./types";

const NOW = Date.parse("2026-10-25T00:00:00Z");
const bond = (isin: string, o: Partial<PublicBond> = {}): PublicBond => ({
  isin, name: isin, issuer: isin, country: "DE", currency: "EUR", coupon: 4, maturity: "2030-12-31",
  ratingSp: "A", ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: 4, modifiedDuration: 4, ytmAsOf: "2026-10-24T00:00:00Z", cleanPrice: null, ...o,
});

describe("price integrity", () => {
  it("recomputes a yield from a price", () => {
    const p = cleanPriceFromYield(3, "2031-06-30", 4.2, new Date(NOW))!;
    expect(yieldFromPrice(3, "2031-06-30", p, new Date(NOW))).toBeCloseTo(4.2, 2);
  });
  it("accepts a consistent price and a bond with no price", () => {
    const p = cleanPriceFromYield(4, "2030-12-31", 4, new Date(NOW))!;
    expect(priceProblems(bond("A", { cleanPrice: p }), {}, NOW)).toEqual([]);
    expect(priceProblems(bond("B"), {}, NOW)).toEqual([]);
  });
  it("flags zero, out of range and yield mismatch", () => {
    expect(priceProblems(bond("A", { cleanPrice: 0 }), {}, NOW)).toContain("price_zero");
    expect(priceProblems(bond("A", { cleanPrice: 12 }), {}, NOW)).toContain("price_out_of_range");
    expect(priceProblems(bond("A", { cleanPrice: 91.36 }), {}, NOW)).toContain("yield_mismatch");
  });
  it("flags stale and unconfirmed prices", () => {
    const p = cleanPriceFromYield(4, "2030-12-31", 4, new Date(NOW))!;
    expect(priceProblems(bond("A", { cleanPrice: p }), { asOf: "2026-10-01T00:00:00Z" }, NOW)).toContain("price_stale");
    expect(priceProblems(bond("A", { cleanPrice: p }), { stale: true }, NOW)).toContain("price_stale");
    expect(priceProblems(bond("A", { cleanPrice: p }), { confirmed: false }, NOW)).toContain("price_unconfirmed");
  });
  it("flags one price repeated on many bonds, but not par", () => {
    const many = Array.from({ length: 12 }, (_, i) => bond(`S${i}`, { cleanPrice: 97.5, grossYtm: 4.8 }));
    const par = Array.from({ length: 12 }, (_, i) => bond(`P${i}`, { cleanPrice: 100, grossYtm: 4 }));
    const { ok, flagged } = screenPrices([...many, ...par], new Map(), NOW);
    expect(flagged.filter((f) => f.reasons.includes("price_same_on_many"))).toHaveLength(12);
    expect(ok.map((b) => b.isin)).toEqual(par.map((b) => b.isin));
  });
});
