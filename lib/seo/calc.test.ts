import { describe, expect, it } from "vitest";
import { bondYield, checkBond, solveYield } from "./calc";

describe("bond calculator", () => {
  it("a bond at par on a coupon date yields its coupon", () => {
    const r = bondYield({ price: 100, coupon: 4, frequency: 1, maturity: "2031-06-01", settlement: "2026-06-01", taxRate: 0 });
    expect(r.accrued).toBeCloseTo(0, 6);
    expect(r.grossYtm).toBeCloseTo(4, 1);
    expect(r.netYtm).toBeCloseTo(r.grossYtm, 6);
    expect(r.cashflows).toHaveLength(5);
  });
  it("tax at 12.5% on a par bond takes 12.5% of the yield", () => {
    const r = bondYield({ price: 100, coupon: 4, frequency: 1, maturity: "2031-06-01", settlement: "2026-06-01", taxRate: 12.5 });
    expect(r.netYtm).toBeCloseTo(3.5, 1);
  });
  it("a discount bond yields more than its coupon and the gain is taxed", () => {
    const g = bondYield({ price: 90, coupon: 2, frequency: 2, maturity: "2030-03-15", settlement: "2026-10-18", taxRate: 0 });
    const n12 = bondYield({ price: 90, coupon: 2, frequency: 2, maturity: "2030-03-15", settlement: "2026-10-18", taxRate: 12.5 });
    const n26 = bondYield({ price: 90, coupon: 2, frequency: 2, maturity: "2030-03-15", settlement: "2026-10-18", taxRate: 26 });
    expect(g.grossYtm).toBeGreaterThan(2);
    expect(g.accrued).toBeGreaterThan(0);
    expect(n12.netYtm).toBeLessThan(g.grossYtm);
    expect(n26.netYtm).toBeLessThan(n12.netYtm);
  });
  it("rejects impossible input", () => {
    expect(checkBond({ price: 0, coupon: 1, frequency: 1, maturity: "2030-01-01", settlement: "2026-01-01", taxRate: 0 })).toBe("price");
    expect(checkBond({ price: 100, coupon: 1, frequency: 1, maturity: "2025-01-01", settlement: "2026-01-01", taxRate: 0 })).toBe("maturity");
    expect(checkBond({ price: 100, coupon: 1, frequency: 1, maturity: "2030-01-01", settlement: "2026-01-01", taxRate: 0 })).toBeNull();
  });
  it("solves a simple yield", () => {
    expect(solveYield(100, [{ t: 1, amount: 105 }])).toBeCloseTo(0.05, 6);
  });
});
