import { describe, expect, it } from "vitest";
import { accrued, dirtyPrice, modifiedDuration, yieldFromClean, yieldToWorst } from "./yieldCalc";

const bond = (coupon: number, maturity: string, freq: 1 | 2 | 4 = 1) => ({ coupon, freq, maturity });
describe("yield arithmetic", () => {
  it("a par bond at a coupon date yields its coupon", () => {
    expect(yieldFromClean(bond(5, "2031-01-15"), "2026-01-15", 100)!).toBeCloseTo(0.05, 8);
    expect(yieldFromClean(bond(4, "2031-01-15", 2), "2026-01-15", 100)!).toBeCloseTo(0.04, 8);
  });
  it("matches closed forms: zero coupon and a two-year annual bond", () => {
    expect(yieldFromClean(bond(0, "2028-01-15"), "2026-01-15", 90)!).toBeCloseTo(Math.pow(100 / 90, 1 / 2) - 1, 7);
    // 3% annual, 2 years, price 98.5: solve 98.5 = 3/(1+y) + 103/(1+y)^2 by the quadratic formula in v = 1/(1+y)
    const v = (-3 + Math.sqrt(9 + 4 * 103 * 98.5)) / (2 * 103);
    expect(yieldFromClean(bond(3, "2028-01-15"), "2026-01-15", 98.5)!).toBeCloseTo(1 / v - 1, 7);
  });
  it("price and yield invert each other away from a coupon date, and accrued interest is part of the dirty price", () => {
    const b = bond(4.25, "2033-06-30", 2);
    const settle = "2026-10-27";
    const y = 0.041;
    const dirty = dirtyPrice(b, settle, y);
    expect(yieldFromClean(b, settle, dirty - accrued(b, settle))!).toBeCloseTo(y, 9);
    expect(accrued(b, settle)).toBeGreaterThan(0);
    expect(accrued(b, settle)).toBeLessThan(2.125);
  });
  it("yield to worst is the call yield for a premium bond and the maturity yield for a discount bond", () => {
    const b = bond(6, "2034-01-15");
    const premium = yieldToWorst(b, "2026-01-15", 108, [{ date: "2029-01-15", price: 100 }])!;
    expect(premium.to).toBe("2029-01-15");
    expect(premium.ytw).toBeLessThan(premium.ytm);
    const discount = yieldToWorst(b, "2026-01-15", 95, [{ date: "2029-01-15", price: 100 }])!;
    expect(discount.to).toBe("maturity");
    expect(discount.ytw).toBe(discount.ytm);
    expect(yieldToWorst(b, "2026-01-15", 100)!.to).toBe("maturity");
  });
  it("duration of a zero coupon is its maturity (modified: maturity / (1+y))", () => {
    expect(modifiedDuration(bond(0, "2031-01-15"), "2026-01-15", 0.03)).toBeCloseTo(5 / 1.03, 4);
  });
});
