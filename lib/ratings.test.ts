import { describe, expect, it } from "vitest";
import { averageRisk, bondRisk, maxNotchOfRisk, ratingSourceLabel, riskOfLr, riskOfNotch } from "./ratings";
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

describe("Livio Rating (LR) takes over the risk score", () => {
  const lr = (score: number | null, g: string | null = "BBB") => ({ ...b(g), lrScore: score });
  it("maps LR 0..100 to risk 10..1 in steps of 10", () => {
    expect([100, 95, 90, 89.9, 80, 55, 30, 10, 9.9, 0].map(riskOfLr)).toEqual([1, 1, 1, 2, 2, 5, 7, 9, 10, 10]);
    expect(riskOfLr(null)).toBeNull();
    expect(riskOfLr(undefined)).toBeNull();
  });
  it("uses LR over any agency grade, and agency grades only when LR is missing", () => {
    expect(bondRisk(lr(92, "BB-"))).toBe(1);
    expect(bondRisk(lr(45, "AAA"))).toBe(6);
    expect(bondRisk(lr(null, "BBB"))).toBe(5);
    expect(bondRisk(lr(65, null))).toBe(4); // a bond with no agency rating still shows once it has an LR
  });
  it("every LR risk level lands on a notch of that same level", () => {
    for (let r = 1; r <= 10; r++) expect(bondRisk(lr(100 - r * 10 + 5, null))).toBe(r);
  });
  it("admin label names the LR", () => {
    expect(ratingSourceLabel(lr(72.46))).toBe("LR 72.5");
    expect(ratingSourceLabel(lr(null, "BBB"))).toBe("S&P BBB");
  });
});
