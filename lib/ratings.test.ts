import { describe, expect, it } from "vitest";
import { averageRisk, bondRisk, maxNotchOfRisk, riskOfNotch } from "./ratings";
import { RISK_LEVELS } from "./limits";

const b = (g: string | null) => ({ ratingSp: g, ratingMoodys: null, ratingFitch: null, ratingResolved: null });

describe("risk score 1-10", () => {
  it("maps grades as Livio set them", () => {
    const want: [string, number | null][] = [
      ["AAA", 1], ["AA+", 2], ["AA", 2], ["AA-", 2], ["A+", 3], ["A", 3], ["A-", 3],
      ["BBB+", 4], ["BBB", 5], ["BBB-", 6], ["BB+", 7], ["BB", 7], ["BB-", 7],
      ["B+", 8], ["B", 8], ["B-", 8], ["CCC+", 9], ["CCC", 9], ["CCC-", 9], ["CC", 10], ["C", 10], ["D", null],
    ];
    for (const [g, r] of want) expect([g, bondRisk(b(g))]).toEqual([g, r]);
    expect(bondRisk(b(null))).toBeNull();
    expect(riskOfNotch(null)).toBeNull();
  });
  it("the browser-side slider table matches the server mapping", () => {
    RISK_LEVELS.forEach((l, i) => expect(l.maxNotch).toBe(maxNotchOfRisk(i + 1)));
  });
  it("averages to one decimal, ignoring missing scores", () => {
    expect(averageRisk([1, 2, null, 4])).toBe(2.3);
    expect(averageRisk([null])).toBeNull();
  });
});
