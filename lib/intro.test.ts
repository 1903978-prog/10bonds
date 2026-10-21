import { describe, it, expect } from "vitest";
import { introDots } from "./intro";

const bond = (isin: string, rating: string, ytm: number, dur: number) =>
  ({ isin, name: isin, issuer: isin, country: null, currency: "EUR", coupon: null, maturity: null, ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: rating, grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null }) as never;

describe("intro dots", () => {
  it("places each bond in its horizon and keeps unrated bonds out", () => {
    const { dots } = introDots([bond("A", "AAA", 2, 2.4), bond("B", "AA", 3, 5), bond("C", "A", 4, 9), bond("D", "BBB", 4, 14), bond("E", "", 5, 5)]);
    expect(dots.map((d) => d[2])).toEqual([1, 2, 3, 0]);
  });
  it("draws a frontier per horizon that rises towards higher risk", () => {
    const { dots, fronts } = introDots([bond("A", "AAA", 2, 5), bond("B", "AA", 3, 5), bond("C", "A", 2.5, 5), bond("D", "BBB", 4, 5)]);
    expect(fronts[1].map((i) => dots[i][1])).toEqual([2, 3, 4]);
    expect(fronts[0]).toEqual([]);
  });
});
