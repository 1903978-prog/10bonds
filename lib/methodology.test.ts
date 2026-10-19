import { describe, expect, it } from "vitest";
import { FACTORS, L, METHOD, METHOD_LANGS, SOLVENCY_COUNT, U, historyDeduction } from "./methodology";

describe("rating methodology", () => {
  it("weights add to 100, split 70 solvency / 30 repayment", () => {
    expect(FACTORS.reduce((s, f) => s + f.weight, 0)).toBe(100);
    expect(FACTORS.slice(0, SOLVENCY_COUNT).reduce((s, f) => s + f.weight, 0)).toBe(70);
  });
  it("matches the manual's arithmetic checks", () => {
    expect(L(31, 30, 130)).toBeCloseTo(99);
    expect(L(0, -10, 20)).toBeCloseTo(66.6667, 3);
    expect(U(3, -2, 6)).toBeCloseTo(62.5);
    expect(historyDeduction([20])).toBe(1);
    expect(historyDeduction([10, 40])).toBe(2);
    expect(historyDeduction([0, 0, 0, 0, 0, 0])).toBe(10);
  });
  it("every example score is inside 0..100", () => {
    for (const f of FACTORS) for (const v of Object.values(f.examples)) {
      expect(f.score(v)).toBeGreaterThanOrEqual(0);
      expect(f.score(v)).toBeLessThanOrEqual(100);
    }
  });
  it("has all 16 parameters in every language", () => {
    for (const l of METHOD_LANGS) expect(METHOD[l].factors).toHaveLength(16);
  });
});
