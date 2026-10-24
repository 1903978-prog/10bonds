import { describe, expect, it } from "vitest";
import { issuerKey } from "./ranking";
import { bondRisk } from "./ratings";
import type { PublicBond } from "./types";
import { buildSlider, moodOf, SLIDER_POSITIONS } from "./sliderPortfolios";
import { exactFrontier } from "./exactFrontier";
import { isWeak, MAX_WEAK } from "./frontierGuard";
import { TERMS } from "./limits";

const bond = (isin: string, issuer: string, ytm: number, dur: number, rating: string, currency = "EUR"): PublicBond => ({
  isin, name: isin, issuer, country: null, currency, coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});
const GRADES = ["AAA", "AA", "A", "BBB+", "BBB", "BBB-", "BB", "B", "CCC", "CC"];
function universe(seed: number, duration: number, perGrade: number, currency = "EUR"): PublicBond[] {
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return GRADES.flatMap((g, r) => Array.from({ length: perGrade }, (_, i) =>
    bond(`${currency}${g}-${i}`, `${g} ${i}`, Math.round((1.5 + r * 0.5 + rnd() * 1.2) * 1000) / 1000, duration * (0.85 + rnd() * 0.3), g, currency)));
}

function checkPositions(bonds: PublicBond[], duration: number) {
  const f = exactFrontier(bonds, duration);
  const pos = buildSlider(f);
  const all = new Map(bonds.map((b) => [b.isin, b]));
  expect(pos.length).toBeGreaterThan(3);
  expect(pos.length).toBeLessThanOrEqual(SLIDER_POSITIONS);
  pos.forEach((p, i) => {
    expect(p.position).toBe(i + 1);
    expect(p.sameAs).toBeNull();
    const rows = p.isins.map((x) => all.get(x)!);
    expect(rows).toHaveLength(10);
    expect(new Set(rows.map(issuerKey)).size).toBe(10);
    expect(rows.filter(isWeak).length).toBeLessThanOrEqual(MAX_WEAK);
    expect(p.worstRisk).toBe(Math.max(...rows.map((b) => bondRisk(b)!)));
    // Strictly up in return and in loss; no repeated list; the query gives back the same list.
    if (i) {
      expect(p.ytm!).toBeGreaterThan(pos[i - 1].ytm!);
      expect(p.expectedLoss!).toBeGreaterThan(pos[i - 1].expectedLoss!);
    }
    expect(f.at(p.query!.ytm)!.isins).toEqual(p.isins);
  });
  expect(new Set(pos.map((p) => p.isins.join())).size).toBe(pos.length);
  // No position is beaten by another one.
  for (const p of pos) for (const q of pos) if (p !== q) expect(q.ytm! >= p.ytm! && q.expectedLoss! <= p.expectedLoss!).toBe(false);
  // True ends: the lowest-loss and the highest-return lists.
  expect(pos[0].isins).toEqual(f.points[0].isins);
  expect(pos[pos.length - 1].isins).toEqual(f.points[f.points.length - 1].isins);
  return pos;
}

describe("slider positions (exact efficient frontier)", () => {
  it("has at most 30 positions and words by the riskiest bond", () => {
    expect(SLIDER_POSITIONS).toBe(30);
    expect([1, 5, 8].map((w) => moodOf({ worstRisk: w }, 1, 30))).toEqual(["conservative", "balanced", "higher"]);
    expect([1, 15, 30].map((s) => moodOf(null, s, 30))).toEqual(["conservative", "balanced", "higher"]);
  });

  // Every horizon, both currencies, all orders and small orders only (fewer bonds).
  for (const t of TERMS) for (const currency of ["EUR", "USD"]) for (const size of ["all", "small"]) {
    it(`${t.key} ${currency} ${size}: strictly monotonic, no beaten or repeated lists, guard kept`, () => {
      const seed = t.duration * 7 + (currency === "USD" ? 3 : 0) + (size === "small" ? 1 : 0);
      const pos = checkPositions(universe(seed, t.duration, size === "small" ? 8 : 30, currency), t.duration);
      if (size === "all") expect(pos).toHaveLength(30);
    });
  }

  it("is empty in a universe of fewer than 10 issuers", () => {
    expect(buildSlider(exactFrontier(universe(1, 4, 1).slice(0, 6), 4))).toEqual([]);
  });

  it("is deterministic", () => {
    const bonds = universe(5, 4, 20);
    expect(buildSlider(exactFrontier(bonds, 4))).toEqual(buildSlider(exactFrontier(bonds, 4)));
  });
});
