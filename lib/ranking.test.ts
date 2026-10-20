import { describe, expect, it } from "vitest";
import { rankBonds, averages, ytmCaps, withinRisk, ytmCapsByRisk } from "./ranking";
import { shapeForTier, VISITOR_VISIBLE } from "./tiers";
import { notchOf, bondNotch } from "./ratings";
import { SAMPLE_BONDS } from "./sample-bonds";
import type { PublicBond } from "./types";
import { expectedLoss, bondLossChance, listLossChance } from "./expectedLoss";

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

  it("puts the higher yield first at the same risk, even below the target", () => {
    const bonds = [bond("LOW", 4.05, 5, "A"), bond("HIGH", 5.5, 5, "A")];
    expect(rankBonds(bonds, 5, 4).results[0].isin).toBe("HIGH");
  });

  it("keeps durations within ±20% of the target (13 years: 10.4 to 15.6)", () => {
    const bonds = [10.3, 10.5, 13, 15.5, 15.7].map((d, i) => ({ ...bond(`D${d}`, 4, d, "A"), issuer: `I${i}` }));
    const { results, band } = rankBonds([...bonds, ...Array.from({ length: 10 }, (_, i) => ({ ...bond(`F${i}`, 4, 13, "A"), issuer: `F${i}` }))], 13, 3);
    expect(band).toBeCloseTo(2.6, 10);
    expect(results.map((r) => r.isin)).not.toContain("D10.3");
    expect(results.map((r) => r.isin)).not.toContain("D15.7");
  });

  it("lets a better rating win when yields are equally close", () => {
    const bonds = [bond("BBB", 3.95, 5, "BBB"), bond("AA", 3.9, 5, "AA")];
    expect(rankBonds(bonds, 5, 4).results[0].isin).toBe("AA");
  });

  it("scores yield after expected losses, worked by hand", () => {
    // A- over 5 years: 0.59% cumulative default -> 0.118% a year x 60% loss = 0.0708 points.
    const [r] = rankBonds([bond("X", 4.5, 5, "A-")], 5, 4).results;
    expect(r.score).toBeCloseTo(4.5 - 0.0708, 10);
    expect(expectedLoss(6, 5)).toBeCloseTo(0.0708, 10);
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
    for (const r of p.rows) expect(Object.keys(r).sort()).toEqual(["country", "duration", "issuer", "minInvestment", "rank", "risk", "ytm"]);
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
    // 4.6 is above what 3 issuers can average (4.5), so the list is the 3 best issuers, DZ BANK once with its best bond.
    expect(results.map((r) => r.isin).sort()).toEqual(["A", "B", "DZ3"]);
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
  it("follows the yields near each duration, rounded down to 0.01", () => {
    const bonds = [bond("S", 3.04, 2, "A"), bond("L", 5.51, 10, "A")];
    const caps = ytmCaps(bonds, [2, 6, 10], { min: 1, max: 12, step: 0.1 });
    expect(caps).toEqual({ "2": 3.04, "6": null, "10": 5.51 });
  });
  it("is the average of the 10 best issuers, not the single best bond (the owner's 5.8% vs 4.72% case)", () => {
    const bonds = [{ ...bond("SA", 5.76, 5, "A-"), issuer: "Saudi" }, { ...bond("SA2", 5.9, 5.2, "A-"), issuer: "Saudi" }, ...Array.from({ length: 11 }, (_, i) => bond(`X${i}`, 4.6, 5, "A-"))];
    const caps = ytmCaps(bonds, [5], { min: 1, max: 12, step: 0.1 });
    expect(caps["5"]).toBe(4.73); // (5.9 + 9 x 4.6) / 10 = 4.73
  });
  it("never goes above the slider's own maximum", () => {
    const caps = ytmCaps([bond("J", 40, 5, null)], [5], { min: 1, max: 12, step: 0.1 });
    expect(caps["5"]).toBe(12);
  });
});

describe("highest yield with the lowest risk", () => {
  it("the target sets the risk: a low target picks the safer bond, a high one the riskier", () => {
    const bonds = [{ ...bond("R4", 4.30, 5, "BBB+"), issuer: "Four" }, { ...bond("R5", 4.60, 5, "BBB"), issuer: "Five" }];
    expect(rankBonds(bonds, 5, 3, 1).results[0].isin).toBe("R4");
    expect(rankBonds(bonds, 5, 4.5, 1).results[0].isin).toBe("R5");
  });
  it("same rating: the higher yield after losses wins", () => {
    const bonds = [{ ...bond("LO", 4.0, 5, "A"), issuer: "Lo" }, { ...bond("HI", 4.4, 5, "A"), issuer: "Hi" }];
    expect(rankBonds(bonds, 5, 3, 1).results[0].isin).toBe("HI");
  });
  it("takes on more risk only when that is needed to reach the target yield", () => {
    const bonds = [{ ...bond("BBB", 4.8, 13, "BBB-"), issuer: "Risky" }, { ...bond("AA", 4.6, 13, "AA"), issuer: "Safe" }, { ...bond("A", 4.5, 13, "A"), issuer: "Mid" }];
    expect(rankBonds(bonds, 13, 4.6, 2).results.map((r) => r.isin).sort()).toEqual(["AA", "BBB"]);
  });
  it("keeps the average duration near the target", () => {
    // Long bonds yield more, but the list should not drift to the long end of the window.
    const bonds = Array.from({ length: 30 }, (_, i) => ({ ...bond(`L${i}`, 3 + (i % 10) * 0.1 + (i >= 20 ? 0.5 : 0), i >= 20 ? 15.5 : i >= 10 ? 13 : 10.5, "A"), issuer: `L${i}` }));
    const { results } = rankBonds(bonds, 13, 3);
    const avgDur = results.reduce((s, r) => s + r.modifiedDuration!, 0) / results.length;
    expect(Math.abs(avgDur - 13)).toBeLessThanOrEqual(13 * 0.05 + 1e-9);
  });
});

describe("risk slider", () => {
  const bonds = [bond("AAA1", 3.0, 5, "AAA"), bond("A1", 3.5, 5, "A"), bond("BBBm", 4.0, 5, "BBB-"), bond("BB1", 4.6, 5, "BB"), bond("B1", 6.0, 5, "B"), bond("NR", 5.0, 5, null)];
  it("keeps only bonds with a risk score equal or lower than the level", () => {
    expect(withinRisk(bonds, 1).map((b) => b.isin)).toEqual(["AAA1"]);
    expect(withinRisk(bonds, 3).map((b) => b.isin)).toEqual(["AAA1", "A1"]);
    expect(withinRisk(bonds, 5).map((b) => b.isin)).toEqual(["AAA1", "A1"]);
    expect(withinRisk(bonds, 6).map((b) => b.isin)).toEqual(["AAA1", "A1", "BBBm"]);
    expect(withinRisk(bonds, 7).map((b) => b.isin)).toEqual(["AAA1", "A1", "BBBm", "BB1"]);
  });
  it("level 10 includes B, never unrated", () => {
    expect(withinRisk(bonds, 10).map((b) => b.isin)).toEqual(["AAA1", "A1", "BBBm", "BB1", "B1"]);
  });
  it("ranking respects the level", () => {
    expect(rankBonds(bonds, 5, 5, 10, 5).results.map((r) => r.isin).sort()).toEqual(["A1", "AAA1"]);
  });
  it("yield caps follow the level", () => {
    const caps = ytmCapsByRisk(bonds, [5], { min: 1, max: 12, step: 0.1 });
    expect(caps["1"]["5"]).toBe(3.0);
    expect(caps["6"]["5"]).toBe(3.5);
    expect(caps["7"]["5"]).toBe(3.77); // (3 + 3.5 + 4 + 4.6) / 4, unrated left out
    expect(caps["10"]["5"]).toBe(4.22);
  });
});

describe("the list's average matches the target and the maximum", () => {
  // 30 issuers at 5 years, yields 2.0 .. 7.8, ratings mixed.
  const grades = ["AAA", "AA", "A", "BBB+", "BBB", "BB+"];
  const many = Array.from({ length: 30 }, (_, i) => ({ ...bond(`I${i}`, 2 + i * 0.2, 4.5 + (i % 3) * 0.4, grades[i % 6]), issuer: `Issuer ${i}` }));
  const mean = (rs: { grossYtm: number | null }[]) => rs.reduce((s, r) => s + r.grossYtm!, 0) / rs.length;
  it("at the slider maximum the 10 shown are the 10 the maximum is computed from", () => {
    const cap = ytmCaps(many, [5], { min: 1, max: 12, step: 0.1 })["5"]!;
    const { results } = rankBonds(many, 5, cap);
    const top10 = [...many].sort((a, b) => b.grossYtm! - a.grossYtm!).slice(0, 10).map((b) => b.isin).sort();
    expect(results.map((r) => r.isin).sort()).toEqual(top10);
    expect(Math.abs(mean(results) - cap)).toBeLessThan(0.011);
  });
  it("for any lower target the average reaches it", () => {
    for (let t = 1.0; t <= 6.8; t += 0.1) {
      const { results } = rankBonds(many, 5, t);
      expect(results).toHaveLength(10);
      expect(mean(results)).toBeGreaterThanOrEqual(t - 1e-9);
      expect(new Set(results.map((r) => r.issuer)).size).toBe(10);
    }
  });
});

describe("chance of a loss, not average risk (the owner 20/10)", () => {
  it("prefers mid-risk bonds to a barbell of very safe and limit-risk bonds with the same average yield", () => {
    const safe = Array.from({ length: 5 }, (_, i) => ({ ...bond(`S${i}`, 3.0, 5, "AAA"), issuer: `Safe ${i}` }));
    const risky = Array.from({ length: 5 }, (_, i) => ({ ...bond(`R${i}`, 5.0, 5, "BBB-"), issuer: `Risky ${i}` }));
    const mid = Array.from({ length: 10 }, (_, i) => ({ ...bond(`M${i}`, 4.0, 5, i < 5 ? "A" : "BBB+"), issuer: `Mid ${i}` }));
    const isins = rankBonds([...safe, ...risky, ...mid], 5, 4.0).results.map((r) => r.isin);
    expect(isins.filter((x) => x.startsWith("M"))).toHaveLength(10);
  });
  it("accepting more risk never gives a list with a higher chance of a loss for the same target", () => {
    const pool = [
      ...Array.from({ length: 6 }, (_, i) => ({ ...bond(`S${i}`, 3.5, 5, "AAA"), issuer: `Safe ${i}` })),
      ...Array.from({ length: 6 }, (_, i) => ({ ...bond(`M${i}`, 5.3 + i * 0.05, 5, "A"), issuer: `Mid ${i}` })),
      ...Array.from({ length: 6 }, (_, i) => ({ ...bond(`R${i}`, 6.0, 5, "BBB-"), issuer: `Risky ${i}` })),
    ];
    const loss = (risk: number) => listLossChance(rankBonds(pool, 5, 4.4, 10, risk).results.map((r) => bondLossChance(bondNotch(r)!, r.modifiedDuration!)));
    expect(loss(6)).toBeLessThanOrEqual(loss(3) + 1e-9);
  });
});

describe("listLossChance", () => {
  it("is 1 minus the chance every bond survives", () => {
    expect(listLossChance([0, 0])).toBe(0);
    expect(listLossChance([10, 10])).toBeCloseTo(19, 9);
    expect(listLossChance([100, 0])).toBe(100);
  });
});
