import { describe, expect, it } from "vitest";
import { rankBonds, averages, NOTCH_PENALTY, ytmCaps } from "./ranking";
import { shapeForTier, VISITOR_VISIBLE } from "./tiers";
import { notchOf, bondNotch } from "./ratings";
import { SAMPLE_BONDS } from "./sample-bonds";
import type { PublicBond } from "./types";

const bond = (isin: string, ytm: number, dur: number, rating: string | null): PublicBond => ({
  isin, name: isin, issuer: isin, country: null, currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});

describe("ratings", () => {
  it("reads S&P and Moody's grades", () => {
    expect(notchOf("AAA")).toBe(0);
    expect(notchOf("BBB-")).toBe(9);
    expect(notchOf("Baa3")).toBe(9);
    expect(notchOf("junk")).toBeNull();
    expect(bondNotch({ ratingResolved: null, ratingSp: null, ratingMoodys: "A2", ratingFitch: null })).toBe(5);
  });
});

describe("rankBonds", () => {
  it("keeps only bonds near the target duration", () => {
    const bonds = [bond("NEAR", 4, 5.2, "A"), bond("FAR", 4, 12, "A")];
    const { results } = rankBonds(bonds, 5, 4, 1);
    expect(results.map((r) => r.isin)).toEqual(["NEAR"]);
  });

  it("prefers the bond closest to the target yield", () => {
    const bonds = [bond("CLOSE", 4.05, 5, "A"), bond("OFF", 5.5, 5, "A")];
    expect(rankBonds(bonds, 5, 4).results[0].isin).toBe("CLOSE");
  });

  it("lets a better rating win when yields are equally close", () => {
    const bonds = [bond("BBB", 4.1, 5, "BBB"), bond("AA", 3.9, 5, "AA")];
    expect(rankBonds(bonds, 5, 4).results[0].isin).toBe("AA");
  });

  it("scores |yield gap| + penalty x notch, worked by hand", () => {
    const [r] = rankBonds([bond("X", 4.5, 5, "A-")], 5, 4).results;
    expect(r.score).toBeCloseTo(0.5 + NOTCH_PENALTY * 6, 10);
  });

  it("widens the duration band when fewer than 10 bonds are near", () => {
    const bonds = Array.from({ length: 10 }, (_, i) => bond(`B${i}`, 4, 5 + (i < 5 ? 0 : 2), "A"));
    const { results, band } = rankBonds(bonds, 5, 4);
    expect(results).toHaveLength(10);
    expect(band).toBe(2);
  });

  it("returns 10 sample bonds at the default settings", () => {
    expect(rankBonds(SAMPLE_BONDS, 5, 4).results).toHaveLength(10);
  });
});

describe("shapeForTier", () => {
  const ranked = rankBonds(SAMPLE_BONDS, 5, 4).results;

  it("visitors without an account get 3 rows with issuer and yield only", () => {
    const p = shapeForTier(ranked, "visitor");
    expect(p.rows).toHaveLength(VISITOR_VISIBLE);
    expect(p.lockedCount).toBe(7);
    expect(p.summary).toBeNull();
    for (const r of p.rows) expect(Object.keys(r).sort()).toEqual(["issuer", "rank", "ytm"]);
    expect(JSON.stringify(p)).not.toMatch(/SAMPLE\d/);
  });

  it("free accounts get all 10 rows, never an ISIN, bond name, coupon or maturity", () => {
    const p = shapeForTier(ranked, "free");
    expect(p.rows).toHaveLength(10);
    expect(p.lockedCount).toBe(0);
    expect(p.summary).toBeNull();
    for (const r of p.rows) expect(Object.keys(r).sort()).toEqual(["country", "duration", "issuer", "rank", "rating", "ytm"]);
    expect(JSON.stringify(p)).not.toMatch(/SAMPLE\d/);
  });

  it("Plus users get all 10 rows with ISIN and averages", () => {
    const p = shapeForTier(ranked, "plus");
    expect(p.rows).toHaveLength(10);
    expect(p.rows[0].isin).toBeTruthy();
    expect(p.summary?.avgYtm).toBeCloseTo(averages(ranked).ytm!, 10);
  });
});

describe("one bond per issuer", () => {
  const dz = (isin: string, ytm: number, issuer: string): PublicBond => ({ ...bond(isin, ytm, 7.7, "AA-"), issuer });
  it("keeps each issuer's best bond and fills the list with other issuers", () => {
    const bonds = [
      dz("DZ1", 4.61, "DZ BANK AG Deutsche Zentral-Genossenschaftsbank"),
      dz("DZ2", 4.60, "DZ BANK AG Deutsche Zentral-Genossenschaftsbank, Frankfurt am Main"),
      dz("DZ3", 4.62, "DZ BANK AG Deutsche Zentral-Genossenschaftsbank 4,27% 26/36"),
      dz("A", 4.50, "Issuer A"),
      dz("B", 4.40, "Issuer B"),
    ];
    const { results } = rankBonds(bonds, 7.7, 4.6, 3);
    expect(results.map((r) => r.isin)).toEqual(["DZ2", "A", "B"]);
  });
  it("widens the duration band until there are enough different issuers", () => {
    const bonds = [dz("DZ1", 4.6, "DZ Bank AG"), dz("DZ2", 4.6, "DZ BANK AG"), { ...bond("FAR", 4.6, 9.4, "AA-"), issuer: "Other" }];
    const { results } = rankBonds(bonds, 7.7, 4.6, 2);
    expect(results.map((r) => r.isin).sort()).toEqual(["DZ1", "FAR"].sort());
  });
  it("bonds with no issuer name count as separate issuers", () => {
    const bonds = [{ ...bond("N1", 4.6, 7.7, "A"), issuer: null }, { ...bond("N2", 4.6, 7.7, "A"), issuer: null }];
    expect(rankBonds(bonds, 7.7, 4.6, 2).results).toHaveLength(2);
  });
});

describe("ytmCaps", () => {
  it("follows the best yield near each duration, rounded up to the slider step", () => {
    const bonds = [bond("S", 3.04, 2, "A"), bond("L", 5.51, 10, "A")];
    const caps = ytmCaps(bonds, { min: 2, max: 10, step: 4 }, { min: 1, max: 12, step: 0.1 });
    expect(caps).toEqual({ "2": 3.1, "6": null, "10": 5.6 });
  });
  it("never goes above the slider's own maximum", () => {
    const caps = ytmCaps([bond("J", 40, 5, null)], { min: 5, max: 5, step: 1 }, { min: 1, max: 12, step: 0.1 });
    expect(caps["5"]).toBe(12);
  });
});

describe("closest yield first", () => {
  it("a bond nearer the target beats a better-rated one further away (Livio's 15-year case)", () => {
    const bonds = [{ ...bond("FR", 5.35, 15.5, "A+"), issuer: "France" }, { ...bond("BAY", 5.75, 14.1, "BBB"), issuer: "Bayer AG" }];
    expect(rankBonds(bonds, 15, 9.7, 2).results.map((r) => r.isin)).toEqual(["BAY", "FR"]);
  });
});
