import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { isExcludedRank, lgdOf, rankOfText } from "./seniority";
import { bondNotch } from "./ratings";
import { bondLossChance, expectedLoss, lossAdjustedYield, listLifeLoss } from "./expectedLoss";
import { dropOutliers, findOutliers } from "./outliers";
import { rankBonds } from "./ranking";
import { lifeYears } from "./lifeYears";
import { pdOf } from "./tiers";

const bond = (isin: string, issuer: string, ytm: number, seniority: string | null, rating = "A", name = `${issuer} 3% 2031`): PublicBond => ({
  isin, name, issuer, country: "DE", currency: "EUR", coupon: 3, maturity: "2031-06-01",
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: 4.8, ytmAsOf: "2026-10-19", seniority,
});

describe("debt rank from the seniority field", () => {
  it("reads the ranks", () => {
    expect(rankOfText("Senior Non-Preferred")).toBe("snp");
    expect(rankOfText("Senior Preferred")).toBe("senior");
    expect(rankOfText("Senior Unsecured")).toBe("senior");
    expect(rankOfText("Senior Subordinated")).toBe("sub");
    for (const s of ["Subordinated", "Junior Subordinated", "Tier 2", "Lower Tier 2", "Additional Tier 1", "AT1", "CoCo", "Hybrid", "Perpetual"]) expect(rankOfText(s)).toBe("sub");
    expect(rankOfText(null)).toBeNull();
  });
  it("treats a bond with no seniority as senior preferred", () => {
    expect(lgdOf({ seniority: null })).toBe(0.6);
    expect(lgdOf({ seniority: "Senior Non-Preferred" })).toBe(0.75);
    expect(lgdOf({ seniority: "Subordinated" })).toBe(0.9);
  });
});

describe("exclusion", () => {
  const peers = Array.from({ length: 12 }, (_, i) => bond(`P${i}`, `Peer ${i}`, 3 + i * 0.05, i % 3 ? "Senior Unsecured" : null));
  const junior = ["Senior Subordinated", "Subordinated", "Junior Subordinated", "Tier 2", "AT1", "CoCo", "Hybrid", "Perpetual"].map((s, i) => bond(`J${i}`, `Bank J${i}`, 3.1, s));
  it("leaves out every junior rank by the field, whatever the name", () => {
    const out = findOutliers([...peers, ...junior]);
    expect(out.map((o) => o.bond.isin).sort()).toEqual(junior.map((b) => b.isin).sort());
    expect(out.every((o) => o.reason === "rank")).toBe(true);
    expect(junior.every(isExcludedRank)).toBe(true);
  });
  it("no excluded rank appears in any portfolio", () => {
    const pool = dropOutliers([...peers, ...junior, bond("SNP", "Bank S", 3.4, "Senior Non-Preferred")]);
    for (const [dur, target, risk] of [[5, 3.0, 10], [5, 3.3, 10], [5, 9, 10], [5, 3.2, 4]] as const) {
      const { results } = rankBonds(pool, dur, target, 10, risk);
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) expect(isExcludedRank(r)).toBe(false);
    }
  });
});

describe("senior non-preferred", () => {
  const senior = bond("SEN", "Bank X", 4, "Senior Preferred", "A");
  const snp = bond("SNP", "Bank X", 4, "Senior Non-Preferred", "A");
  it("sits one notch below the issuer rating", () => {
    expect(bondNotch(snp)).toBe(bondNotch(senior)! + 1);
  });
  it("has a higher expected loss than the same issuer's senior bond", () => {
    const loss = (b: PublicBond) => expectedLoss(bondNotch(b)!, b.modifiedDuration!, lgdOf(b));
    expect(loss(snp)).toBeGreaterThan(loss(senior));
    expect(lossAdjustedYield(4, bondNotch(snp)!, 4.8, lgdOf(snp))).toBeLessThan(lossAdjustedYield(4, bondNotch(senior)!, 4.8, lgdOf(senior)));
    const life = (b: PublicBond) => listLifeLoss([bondLossChance(bondNotch(b)!, lifeYears(b))], [lgdOf(b)]);
    expect(life(snp)).toBeGreaterThan(life(senior));
    expect(pdOf(snp)).toBeGreaterThan(pdOf(senior));
  });
});
