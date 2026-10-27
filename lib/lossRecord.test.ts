import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { discountedExpectedLossPct, lgdRange, lossRecordOf } from "./lossRecord";
import { listLifeLoss } from "./expectedLoss";
import { lossPdOf } from "./tiers";

const bond = (seniority: string | null, rating = "BBB", dur = 5): PublicBond => ({
  isin: "X1", name: "x", issuer: "Enel", country: null, currency: "EUR", coupon: null, maturity: "2031-10-26",
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: 4, modifiedDuration: dur, ytmAsOf: "2026-10-26", seniority,
});

describe("expected-loss record", () => {
  const r = lossRecordOf(bond("Senior preferred"));
  it("cumulative = PD x LGD and annualised = cumulative / years, never mixed", () => {
    expect(r.elCumulativePct).toBeCloseTo(r.pdCumulativePct * r.lgd, 12);
    expect(r.elAnnualisedPct).toBeCloseTo(r.elCumulativePct / Math.max(1, r.horizonYears), 12);
    expect(r.elAnnualisedPct).toBeLessThan(r.elCumulativePct);
  });
  it("matches what the optimiser and the list figure use", () => {
    // optimiser coefficient lossPd = PD x LGD / 0.6; list loss = mean(coefficient) x 0.6 = mean(PD x LGD)
    expect(listLifeLoss([lossPdOf(bond("Senior preferred"))])).toBeCloseTo(r.elCumulativePct, 2);
  });
  it("states what the data does not contain and never claims security-level precision", () => {
    expect(r.missingInputs).toEqual(expect.arrayContaining(["collateral / security", "guarantees", "governing law"]));
    expect(r.lgdConfidence).toBe("low");
    expect(r.discounting).toBe("none");
  });
  it("sensitivity range spans the neighbouring ranks of the same table", () => {
    expect(lgdRange("senior")).toEqual([0.6, 0.75]);
    expect(lgdRange("snp")).toEqual([0.6, 0.9]);
    expect(lgdRange("sub")).toEqual([0.75, 0.9]);
    expect(r.elRangePct[0]).toBeLessThanOrEqual(r.elCumulativePct);
    expect(r.elRangePct[1]).toBeGreaterThan(r.elCumulativePct);
  });
  it("a senior non-preferred bond is rated one notch lower and loses 75%", () => {
    const s = lossRecordOf(bond("Senior non-preferred"));
    expect(s.lgd).toBe(0.75);
    expect(s.notch).toBe(r.notch + 1);
  });
  it("discounting at 0% equals the undiscounted loss; positive rates give less", () => {
    const years = 6;
    expect(discountedExpectedLossPct(9, years, 0.6, 0)).toBeCloseTo(lossRecordOf({ ...bond(null, "BBB-"), maturity: null, modifiedDuration: years }).elCumulativePct, 6);
    expect(discountedExpectedLossPct(9, years, 0.6, 0.03)).toBeLessThan(discountedExpectedLossPct(9, years, 0.6, 0));
  });
});
