import { describe, expect, it } from "vitest";
import { issuerKey } from "./ranking";
import { bondRisk } from "./ratings";
import type { PublicBond } from "./types";
import { buildSlider, moodOf, SLIDER_POSITIONS, tileFigures, tilesFromPosition } from "./sliderPortfolios";
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
    // The live boxes under the slider show the same figures as the list the button gives for this position.
    const hit = f.at(p.query!.ytm)!;
    expect(tileFigures(p)).toEqual({ ret: `${(Math.round(hit.ytm * 100) / 100).toFixed(2)}%`, loss: `${(Math.round(hit.el * 1000) / 1000).toFixed(2)}%` });
  });
  expect(new Set(pos.map((p) => p.isins.join())).size).toBe(pos.length);
  // No position is beaten by another one.
  for (const p of pos) for (const q of pos) if (p !== q) expect(q.ytm! >= p.ytm! && q.expectedLoss! <= p.expectedLoss!).toBe(false);
  // True ends: the lowest-loss and the highest-return lists.
  expect(pos[0].isins).toEqual(f.points[0].isins);
  expect(pos[pos.length - 1].isins).toEqual(f.points[f.points.length - 1].isins);
  return pos;
}

describe("slider ends", () => {
  for (const t of TERMS) it(`${t.key}: the high-return end has clearly more return and more loss than the low-return end`, () => {
    const pos = buildSlider(exactFrontier(universe(7, t.duration, 6), t.duration));
    const lo = tileFigures(pos[0])!, hi = tileFigures(pos[pos.length - 1])!;
    expect(pos[pos.length - 1].ytm!).toBeGreaterThan(pos[0].ytm! + 0.5);
    expect(pos[pos.length - 1].expectedLoss!).toBeGreaterThan(pos[0].expectedLoss!);
    expect(hi.ret).not.toBe(lo.ret);
    expect(hi.loss).not.toBe(lo.loss);
  });
});

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

describe("tilesFromPosition", () => {
  it("follows the stored position unless a live list for this position is on screen", () => {
    expect(tilesFromPosition(null, 14)).toBe(true);
    expect(tilesFromPosition({ band: { k: 26, source: "live" } }, 14)).toBe(true);
    expect(tilesFromPosition({ band: { k: 14, source: "stored" } }, 14)).toBe(true);
    expect(tilesFromPosition({ band: { k: 14, source: "live" } }, 14)).toBe(false);
  });
});
