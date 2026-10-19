import { describe, expect, it } from "vitest";
import { frontierOf } from "./frontier";
import type { PublicBond } from "./types";

const bond = (isin: string, rating: string | null, ytm: number | null, duration: number): PublicBond => ({
  isin, name: isin, issuer: isin, country: null, currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: rating, grossYtm: ytm, modifiedDuration: duration, ytmAsOf: null,
});

describe("efficient frontier", () => {
  it("dots every rated bond, red line only 5y ±20% and only where more risk pays more", () => {
    const f = frontierOf([
      bond("A", "AAA", 2.5, 5), bond("B", "AAA", 2.8, 9), bond("C", "BBB", 3.5, 4.5),
      bond("D", "BBB", 4.0, 6.5), bond("E", "BB", 3.0, 5), bond("F", null, 9, 5), bond("G", "A", null, 5),
    ]);
    expect(f.dots).toHaveLength(5);
    // D is outside 4-6 years; E pays less than the safer C, so it is off the line.
    expect(f.line.map((p) => p.ytm)).toEqual([2.5, 3.5]);
    expect(f.line[0].level).toBeLessThan(f.line[1].level);
  });
});
