import { describe, expect, it } from "vitest";
import { applyFilters, parseFilters, SMALL_ORDER_MAX } from "./filters";
import { SAMPLE_BONDS } from "./sample-bonds";
import type { PublicBond } from "./types";

const bond = (over: Partial<PublicBond>): PublicBond => ({ ...SAMPLE_BONDS[0], ...over });

describe("search toggles", () => {
  it("defaults to EUR and every minimum order, and ignores unknown values", () => {
    expect(parseFilters(new URLSearchParams())).toEqual({ currency: "EUR", orderSize: "100k" });
    expect(parseFilters(new URLSearchParams("currency=GBP&order=5k"))).toEqual({ currency: "EUR", orderSize: "100k" });
    expect(parseFilters(new URLSearchParams("currency=usd&order=1K"))).toEqual({ currency: "USD", orderSize: "1k" });
  });

  it("keeps only the chosen currency", () => {
    const out = applyFilters(SAMPLE_BONDS, { currency: "USD", orderSize: "100k" });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((b) => b.currency === "USD")).toBe(true);
  });

  it("1k keeps minimum orders from 1 to 10,000 and drops 100,000 and up", () => {
    const bonds = [
      bond({ isin: "A", minOrder: 1_000 }),
      bond({ isin: "B", minOrder: SMALL_ORDER_MAX }),
      bond({ isin: "C", minOrder: 10_001 }),
      bond({ isin: "D", minOrder: 100_000 }),
      bond({ isin: "E", minOrder: 200_000 }),
    ];
    expect(applyFilters(bonds, { currency: "EUR", orderSize: "1k" }).map((b) => b.isin)).toEqual(["A", "B"]);
  });

  it("1k leaves out a bond whose minimum order is unknown; 100k keeps it", () => {
    const bonds = [bond({ isin: "N", minOrder: null }), bond({ isin: "U", minOrder: undefined })];
    expect(applyFilters(bonds, { currency: "EUR", orderSize: "1k" })).toEqual([]);
    expect(applyFilters(bonds, { currency: "EUR", orderSize: "100k" })).toHaveLength(2);
  });
});
