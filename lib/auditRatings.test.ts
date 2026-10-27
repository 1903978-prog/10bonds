import { describe, expect, it } from "vitest";
import { bondNotch, bondRisk, hasRealRating, maxNotchOfRisk, notchOf, riskOfLr, riskOfNotch, spGradeOf } from "./ratings";
import { RISK_LEVELS } from "./limits";
import { DEFAULT_RATES } from "./seo/defaultRates";

// Formula audit 27/10/2026, check 6: the 1-10 risk score mapping is one table, used the same way everywhere; unscored bonds never shown.
const base = { ratingResolved: null, ratingSp: null, ratingMoodys: null, ratingFitch: null };

describe("risk score 1-10", () => {
  const S = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-", "B+", "B", "B-", "CCC+", "CCC", "CCC-", "CC", "C"];
  const expected = [1, 2, 2, 2, 3, 3, 3, 4, 5, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10];
  it("maps every S&P-scale notch as documented (AAA 1, AA 2, A 3, BBB+ 4, BBB 5, BBB- 6, BB 7, B 8, CCC 9, CC/C 10)", () => {
    S.forEach((g, i) => expect(bondRisk({ ...base, ratingSp: g }), g).toBe(expected[i]));
  });
  it("maps the Moody's scale to the same scores", () => {
    const M = ["Aaa", "Aa1", "Aa2", "Aa3", "A1", "A2", "A3", "Baa1", "Baa2", "Baa3", "Ba1", "Ba2", "Ba3", "B1", "B2", "B3", "Caa1", "Caa2", "Caa3", "Ca", "C"];
    M.forEach((g, i) => expect(bondRisk({ ...base, ratingMoodys: g }), g).toBe(expected[i]));
  });
  it("uses the WORST of the three agencies", () => {
    expect(bondRisk({ ...base, ratingSp: "A", ratingMoodys: "Baa2", ratingFitch: "A-" })).toBe(5);
  });
  it("default grades (D, SD, RD, DDD, DD) and unrated (NR, WR, blank) have no score and are never shown", () => {
    for (const g of ["D", "SD", "RD", "DDD", "DD", "NR", "WR", "", "n.a."]) {
      expect(bondRisk({ ...base, ratingSp: g }), g).toBeNull();
      expect(hasRealRating({ ...base, ratingSp: g }), g).toBe(false);
    }
    expect(hasRealRating({ ...base, ratingSp: "BB", ratingFitch: "RD" })).toBe(false);
    expect(hasRealRating({ ...base, ratingResolved: "AAA" })).toBe(false); // an inferred "resolved" rating never counts
  });
  it("reads minus signs and letter case the way feeds write them", () => {
    expect(notchOf("BBB−")).toBe(notchOf("BBB-"));
    expect(notchOf("bbb+")).toBe(7);
    expect(notchOf("BAA2")).toBe(8);
  });
  it("10bonds.com rating (0-100, higher = safer) maps to 1-10 in bands of ten and back to the same score", () => {
    const cases: [number, number][] = [[99.9, 1], [90, 1], [89.99, 2], [80, 2], [79, 3], [50, 5], [10, 9], [9.99, 10], [0, 10]];
    for (const [lr, risk] of cases) {
      expect(riskOfLr(lr), String(lr)).toBe(risk);
      expect(bondRisk({ ...base, lrScore: lr }), String(lr)).toBe(risk);
    }
    expect(riskOfLr(null)).toBeNull();
    expect(riskOfLr(NaN)).toBeNull();
  });
  it("senior non-preferred sits one notch lower, never below C, and a default stays a default", () => {
    expect(bondNotch({ ...base, ratingSp: "A", seniority: "Senior Non-Preferred" })).toBe(notchOf("A")! + 1);
    expect(bondNotch({ ...base, ratingSp: "C", seniority: "Senior Non-Preferred" })).toBe(20);
    expect(bondRisk({ ...base, ratingSp: "D", seniority: "Senior Non-Preferred" })).toBeNull();
  });
  it("the slider's highest-risk-accepted table is the same mapping", () => {
    RISK_LEVELS.forEach((l, i) => {
      expect(l.maxNotch, `level ${i + 1}`).toBe(maxNotchOfRisk(i + 1));
      expect(riskOfNotch(l.maxNotch)).toBe(i + 1);
      expect(riskOfNotch(l.maxNotch + 1) ?? 99).toBeGreaterThan(i + 1);
    });
  });
  it("the default table rows carry the same risk score as the mapping", () => {
    DEFAULT_RATES.forEach(([grade, risk], n) => {
      if (n >= 17) return; // last row stands for CCC and below
      expect(String(riskOfNotch(n)), `${grade} (notch ${n}, ${spGradeOf(n)})`).toBe(risk);
    });
  });
});
