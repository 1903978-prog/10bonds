import { describe, expect, it } from "vitest";
import { bandOf, cleanMatrix, DEFAULT_SPREAD_MATRIX, hurdleBp, stepAt, stepGap } from "./stepGap";
import { notchOf } from "./ratings";

const n = (g: string) => notchOf(g)!;

describe("spread rules matrix", () => {
  it("5-year column equals the earlier curve differences", () => {
    expect(DEFAULT_SPREAD_MATRIX.map((r) => r[2])).toEqual([10, 15, 35, 20, 50, 70]);
    expect(hurdleBp(0, 6, 5)).toBe(200); // AAA -> BB: 235 - 35
  });
  it("interpolates between columns and stays flat outside them", () => {
    expect(stepAt(DEFAULT_SPREAD_MATRIX, 1, 4)).toBeCloseTo(13.5, 9);
    expect(stepAt(DEFAULT_SPREAD_MATRIX, 1, 0.5)).toBe(10);
    expect(stepAt(DEFAULT_SPREAD_MATRIX, 1, 25)).toBe(25);
  });
  it("works by rating category: notches inside a category need nothing extra, B and below count as BB", () => {
    expect(bandOf(n("AA+"))).toBe(bandOf(n("AA-")));
    expect(stepGap(n("AA+"), n("AA-"), 5)).toBe(0);
    expect(stepGap(n("BB"), n("B"), 5)).toBe(0);
    expect(stepGap(n("AA"), n("A"), 3) * 100).toBeCloseTo(12, 9);
    expect(stepGap(n("AA"), n("A"), 10) * 100).toBeCloseTo(25, 9);
  });
  it("worked example: AA 4.00% against A 4.05% and A 4.20%", () => {
    const meets = (aYtm: number, years: number) => aYtm - 4 > stepGap(n("AA"), n("A"), years) + 1e-9;
    expect([3, 5, 10].map((y) => meets(4.05, y))).toEqual([false, false, false]);
    expect([3, 5, 10].map((y) => meets(4.2, y))).toEqual([true, true, false]);
  });
  it("rejects a bad matrix", () => {
    expect(cleanMatrix([[1, 2, 3]])).toBeNull();
    expect(cleanMatrix(DEFAULT_SPREAD_MATRIX.map((r, i) => (i ? r : [-1, 2, 3, 4, 5])))).toBeNull();
    expect(cleanMatrix(DEFAULT_SPREAD_MATRIX)).toEqual(DEFAULT_SPREAD_MATRIX);
  });
});
