import { describe, expect, it } from "vitest";
import { bondLossChance, cumulativeDefault } from "./expectedLoss";
import { isSovereignBond, sovereignCumulative } from "./sovereign";

describe("sovereign default table", () => {
  it("reads the published points and interpolates between them", () => {
    expect(sovereignCumulative(8, 5)).toBeCloseTo(2.32, 9); // BBB, 5y
    expect(sovereignCumulative(8, 6)).toBeCloseTo((2.32 + 3.17) / 2, 9);
    expect(sovereignCumulative(0, 10)).toBe(0);
    expect(sovereignCumulative(17, 7)).toBeCloseTo(57.21, 9);
  });
  it("maps notches to the letter band", () => {
    expect(sovereignCumulative(1, 5)).toBe(0); // AA+
    expect(sovereignCumulative(4, 10)).toBeCloseTo(3.5, 9); // A+
    expect(sovereignCumulative(9, 5)).toBeCloseTo(2.32, 9); // BBB-
    expect(sovereignCumulative(12, 10)).toBeCloseTo(9.75, 9); // BB-
  });
  it("only governments by name use it; the corporate table is unchanged", () => {
    expect(isSovereignBond({ issuer: "Republic of Italy", isin: "IT1", country: "IT" })).toBe(true);
    expect(isSovereignBond({ issuer: "Enel SpA", isin: "XS1", country: "IT" })).toBe(false);
    expect(bondLossChance(8, 5, true)).toBeCloseTo(2.32, 9);
    expect(cumulativeDefault(8, 5)).toBeCloseTo(1.4, 9);
  });
});
