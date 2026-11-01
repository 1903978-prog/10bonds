import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { candidatesOf } from "./coherentFrontier";
import { CREDIT_SEEDS, creditEligible, ratingText, withoutCreditExcluded } from "./creditOverlay";
import { irText, brText } from "./creditRow";
import { SPEC_VERSION } from "./portfolioSpec";

const bond = (isin: string, issuer: string, grade: string, creditGrade?: string): PublicBond => ({
  isin, name: isin, issuer, country: null, currency: "EUR", coupon: null, maturity: "2031-09-03",
  ratingSp: grade, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: 4.5, modifiedDuration: 4.2, ytmAsOf: null, creditGrade,
});

describe("stored credit analysis: IR / BR text", () => {
  it("shows ranges as stored, a single value, and nothing when missing", () => {
    expect(ratingText(66, 79, null)).toBe("66–79");
    expect(ratingText(null, null, 71)).toBe("71");
    expect(ratingText(null, null, null)).toBeNull();
  });
  it("IR only: BR is null; neither: both null", () => {
    const base = { issuerRatingMin: null, issuerRatingMax: null, issuerRating: null, bondRatingMin: null, bondRatingMax: null, bondRating: null };
    expect(irText({ ...base, issuerRating: 70 })).toBe("70");
    expect(brText({ ...base, issuerRating: 70 })).toBeNull();
    expect(irText(base)).toBeNull();
    expect(brText(base)).toBeNull();
  });
});

describe("Aareal DE000AAR0504 seed", () => {
  const s = CREDIT_SEEDS.DE000AAR0504;
  it("holds the supplied values, separately", () => {
    expect([s.independent.irMin, s.independent.irMax, s.independent.brMin, s.independent.brMax]).toEqual([66, 79, 59, 73]);
    expect(s.independent.recommendation).toBe(3.8);
    expect(s.independent.label).toBe("EXCLUDE");
    expect([s.market.grossYtmPct, s.market.spreadBundBp, s.market.riskPayWebsite]).toEqual([4.82, 169, 15.3]);
    expect(s.riskPayAdjusted).toBeNull();
    expect(s.structure.snp && !s.structure.at1 && !s.structure.tier2 && !s.structure.cln && !s.structure.coveredPfandbrief && !s.structure.seniorPreferred).toBe(true);
    expect(s.indicators.map((i) => i.color)).toEqual(["AMBER", "AMBER", "RED", "AMBER", "AMBER", "GREY"]);
    expect(s.status).toBe("provisional");
  });
});

describe("portfolio eligibility (backend)", () => {
  const aar = bond("DE000AAR0504", "Aareal Bank", "A-", "BBB");
  const other = bond("DE000AAR0999", "Aareal Bank", "A-"); // another Aareal bond, no stored grade
  it("excludes the bond below BBB+, keeps other Aareal bonds, allows it with a looser floor", () => {
    expect(creditEligible(aar)).toBe(false);
    expect(creditEligible(other)).toBe(true);
    expect(creditEligible(aar, "BBB")).toBe(true);
    expect(creditEligible(aar, "BBB-")).toBe(true);
    expect(withoutCreditExcluded([aar, other]).map((b) => b.isin)).toEqual(["DE000AAR0999"]);
  });
  it("candidatesOf (the one door every solver uses) drops it at BBB+, keeps it at BBB", () => {
    const pool = [aar, other, bond("X1", "Alpha", "A"), bond("X2", "Beta", "A")];
    expect(candidatesOf(pool, 4.2, false).map((c) => c.b.isin)).not.toContain("DE000AAR0504");
    expect(candidatesOf(pool, 4.2, false).map((c) => c.b.isin)).toContain("DE000AAR0999");
    expect(candidatesOf(pool, 4.2, false, undefined, "BBB").map((c) => c.b.isin)).toContain("DE000AAR0504");
  });
  it("the spec version carries the credit policy so stored lists rebuild", () => {
    expect(SPEC_VERSION).toContain("credit-");
  });
});
