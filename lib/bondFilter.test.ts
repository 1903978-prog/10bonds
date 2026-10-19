import { describe, expect, it } from "vitest";
import { applyFilter, minInvestmentOf, parseFilter } from "./bondFilter";
import type { PublicBond } from "./types";

const b = (isin: string, currency: string, minInvestment: number | null) => ({ isin, currency, minInvestment }) as PublicBond;
const bonds = [b("A", "EUR", 1000), b("B", "EUR", 10000), b("C", "EUR", 50000), b("D", "EUR", 100000), b("E", "EUR", null), b("F", "USD", 1000)];

describe("bond filters", () => {
  it("1k keeps minimums from 1k to 10k only; unknown is left out", () => {
    expect(applyFilter(bonds, { currency: "EUR", size: "1k" }).map((x) => x.isin)).toEqual(["A", "B"]);
  });
  it("100k keeps every bond of the currency", () => {
    expect(applyFilter(bonds, { currency: "EUR", size: "100k" }).map((x) => x.isin)).toEqual(["A", "B", "C", "D", "E"]);
    expect(applyFilter(bonds, { currency: "USD", size: "100k" }).map((x) => x.isin)).toEqual(["F"]);
  });
  it("reads only the known values from the URL", () => {
    expect(parseFilter(new URLSearchParams("currency=USD&size=1k"))).toEqual({ currency: "USD", size: "1k" });
    expect(parseFilter(new URLSearchParams("currency=GBP&size=x"))).toEqual({ currency: "EUR", size: "100k" });
  });
  it("minimum = denomination, else a lot above 1", () => {
    expect(minInvestmentOf(100000, 1000)).toBe(100000);
    expect(minInvestmentOf(null, 1000)).toBe(1000);
    expect(minInvestmentOf(null, 1)).toBeNull();
  });
});
