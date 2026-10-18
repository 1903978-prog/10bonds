import { describe, expect, it } from "vitest";
import { rankBonds, averages, NOTCH_PENALTY } from "./ranking";
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
