import { describe, expect, it } from "vitest";
import { rankBonds, issuerKey } from "./ranking";
import { bondRisk } from "./ratings";
import { LOSS_GIVEN_DEFAULT, listLifeLoss } from "./expectedLoss";
import type { PublicBond } from "./types";
import { buildSlider, ceilingOf, levelOf, moodOf, SLIDER_POSITIONS, type Ranker } from "./sliderPortfolios";

const bond = (isin: string, issuer: string, ytm: number, dur: number, rating: string): PublicBond => ({
  isin, name: isin, issuer, country: null, currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});

// One rating per risk score 1..10, 14 issuers each, yields rising with risk and spread within each score.
const GRADES = ["AAA", "AA", "A", "BBB+", "BBB", "BBB-", "BB", "B", "CCC", "CC"];
const universe = (grades = GRADES, perGrade = 14): PublicBond[] =>
  grades.flatMap((g, r) => Array.from({ length: perGrade }, (_, i) => bond(`${g}-${i}`, `${g} issuer ${i}`, 2 + r * 0.6 + i * 0.03, 3.6 + (i % 5) * 0.2, g)));

const rankerOf = (bonds: PublicBond[], duration = 4): Ranker => async (ytm, risk) => rankBonds(bonds, duration, ytm, 10, risk).results;
const byIsin = (bonds: PublicBond[]) => new Map(bonds.map((b) => [b.isin, b]));

describe("slider positions", () => {
  it("maps the 30 positions to 10 risk ceilings x low/medium/high", () => {
    expect(SLIDER_POSITIONS).toBe(30);
    expect([1, 2, 3, 4, 13, 15, 28, 30].map((s) => [ceilingOf(s), levelOf(s)])).toEqual([[1, 1], [1, 2], [1, 3], [2, 1], [5, 1], [5, 3], [10, 1], [10, 3]]);
    expect([1, 10, 22].map(moodOf)).toEqual(["conservative", "balanced", "higher"]);
  });

  it("keeps every bond within the ceiling, AAA only at 1-3, 10 different issuers, and figures that match the bonds", async () => {
    const bonds = universe();
    const all = byIsin(bonds);
    const pos = await buildSlider(rankerOf(bonds));
    expect(pos).toHaveLength(30);
    for (const p of pos) {
      expect(p.unavailable).toBe(false);
      const rows = p.isins.map((i) => all.get(i)!);
      expect(rows).toHaveLength(10);
      expect(new Set(rows.map(issuerKey)).size).toBe(10);
      const risks = rows.map((b) => bondRisk(b)!);
      expect(Math.max(...risks)).toBeLessThanOrEqual(p.ceiling);
      expect(p.worstRisk).toBe(Math.max(...risks));
      expect(p.avgRisk).toBeCloseTo(risks.reduce((s, x) => s + x, 0) / 10, 1);
      if (p.ceiling === 1) expect(rows.every((b) => b.ratingSp === "AAA")).toBe(true);
    }
  });

  it("never lowers the target or the achieved return from position 1 to 30", async () => {
    const pos = await buildSlider(rankerOf(universe()));
    for (let i = 1; i < pos.length; i++) {
      expect(pos[i].target!).toBeGreaterThanOrEqual(pos[i - 1].target! - 1e-9);
      expect(pos[i].ytm!).toBeGreaterThanOrEqual(pos[i - 1].ytm! - 1e-9);
    }
  });

  it("gives the highest-return list at position 30, and reaches the targets where it can", async () => {
    const bonds = universe();
    const pos = await buildSlider(rankerOf(bonds));
    const top = rankBonds(bonds, 4, 99, 10, 10).results;
    expect(pos[29].isins).toEqual(top.map((b) => b.isin).sort());
    for (const p of pos) if (!p.sameAs) expect(p.ytm!).toBeGreaterThanOrEqual(p.target! - 0.01);
  });

  it("starts at the AAA list with the lowest expected loss", async () => {
    const bonds = universe();
    const pos = await buildSlider(rankerOf(bonds));
    const safest = rankBonds(bonds, 4, 1, 10, 1).results;
    expect(pos[0].isins).toEqual(safest.map((b) => b.isin).sort());
    expect(pos[0].target).toBe(pos[0].ytm);
  });

  it("reuses a list instead of inventing a new one when a ceiling adds nothing", async () => {
    // No bonds at risk 2 (AA) or 3 (A): ceilings 2 and 3 can only repeat the AAA high list.
    const bonds = universe(["AAA", "BBB+", "BBB"]);
    const pos = await buildSlider(rankerOf(bonds));
    for (const p of pos.slice(3, 9)) {
      expect(p.sameAs).toBe(3);
      expect(p.isins).toEqual(pos[2].isins);
      expect(p.ytm).toBe(pos[2].ytm);
    }
  });

  it("marks positions unavailable without relaxing the rules when no AAA list exists", async () => {
    const pos = await buildSlider(rankerOf(universe(["AA", "A"])));
    expect(pos.slice(0, 3).every((p) => p.unavailable && p.query === null)).toBe(true);
    expect(pos[3].unavailable).toBe(false);
    expect(pos[3].target).toBe(pos[3].ytm); // the first feasible ceiling starts at its safest list
  });

  it("marks everything unavailable in a universe of fewer than 10 issuers", async () => {
    const pos = await buildSlider(rankerOf(universe(GRADES.slice(0, 1), 6)));
    expect(pos.every((p) => p.unavailable)).toBe(true);
  });

  it("is deterministic and uses a 60% loss in a default (40% recovered)", async () => {
    const bonds = universe();
    const a = await buildSlider(rankerOf(bonds));
    const b = await buildSlider(rankerOf(bonds));
    expect(a).toEqual(b);
    expect(LOSS_GIVEN_DEFAULT).toBe(0.6);
    expect(listLifeLoss([10, 10])).toBeCloseTo(6);
  });

  it("each position's query reproduces its list", async () => {
    const bonds = universe();
    const pos = await buildSlider(rankerOf(bonds));
    for (const p of pos) {
      const rows = rankBonds(bonds, 4, p.query!.ytm, 10, p.query!.risk).results;
      expect(rows.map((r) => r.isin).sort()).toEqual(p.isins);
    }
  });
});
