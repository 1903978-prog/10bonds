import { describe, expect, it } from "vitest";
import { curveByLevel, levelOf, shapeCurve } from "./singleBond";
import type { PublicBond } from "./types";

const bond = (isin: string, ytm: number, dur: number, rating: string | null, issuer = isin): PublicBond => ({
  isin, name: isin, issuer, country: "DE", currency: "EUR", coupon: 3, maturity: "2031-01-01",
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});

describe("single bond curve", () => {
  it("puts each rating in its slider step", () => {
    expect(levelOf(bond("a", 1, 5, "AAA"))).toBe(1);
    expect(levelOf(bond("a", 1, 5, "BBB"))).toBe(9);
    expect(levelOf(bond("a", 1, 5, "BBB-"))).toBe(9);
    expect(levelOf(bond("a", 1, 5, "BB+"))).toBe(10);
    expect(levelOf(bond("a", 1, 5, null))).toBeNull();
    expect(levelOf(bond("a", 1, 5, "B"))).toBeNull();
  });
  it("orders each step by yield, one per issuer; Change walks down the list", () => {
    const c = curveByLevel([bond("A1", 3.1, 5, "A"), bond("A2", 3.4, 5, "A"), bond("A3", 3.6, 5, "A", "A2"), bond("X", 9, 5, "B")], 5);
    const a = c.find((p) => p.level === 6)!;
    expect(a.bonds.map((b) => b.isin)).toEqual(["A3", "A1"]);
    expect(c.find((p) => p.level === 1)!.bonds).toHaveLength(0);
  });
  it("visitors get one bond per step and no details; paid get the ISIN", () => {
    const c = curveByLevel([bond("A1", 3.1, 5, "A"), bond("A2", 3.4, 5, "A")], 5);
    const v = shapeCurve(c, "visitor").find((p) => p.level === 6)!;
    expect(v.options).toHaveLength(1);
    expect(v.options[0].isin).toBeUndefined();
    expect(v.more).toBe(1);
    expect(shapeCurve(c, "free").find((p) => p.level === 6)!.options[0].isin).toBeUndefined();
    expect(shapeCurve(c, "plus").find((p) => p.level === 6)!.options[0].isin).toBe("A2");
  });
});
