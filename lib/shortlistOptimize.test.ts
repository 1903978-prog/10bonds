import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { eligibleBonds, lossCap, solveSet } from "./shortlistOptimize";
import { bondRisk } from "./ratings";
import { issuerKey } from "./ranking";

const GRADES = ["AAA", "AA", "A", "BBB+", "BBB", "BB"];
function universe(): PublicBond[] {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 90 }, (_, i) => {
    const g = i % GRADES.length;
    return {
      isin: `T${String(i).padStart(10, "0")}`.slice(0, 12), name: i === 5 ? "Some credit-linked note" : `Bond ${i}`, issuer: `Issuer ${i}`, country: null, currency: "EUR", coupon: null,
      maturity: `2030-${String((i % 12) + 1).padStart(2, "0")}-15`, ratingSp: GRADES[g], ratingMoodys: null, ratingFitch: null, ratingResolved: null,
      grossYtm: Math.round((3 + g * 0.35 + rnd() * 1.2) * 100) / 100, modifiedDuration: 3.4 + rnd() * 1.2, ytmAsOf: "2026-10-20T00:00:00.000Z",
    } as PublicBond;
  });
}

describe("shortlist alternative set", () => {
  const pool = eligibleBonds(universe());
  it("leaves out structured names and risk above BBB+", () => {
    expect(pool.dropped.structure).toBe(1);
    expect(pool.bonds.every((b) => (bondRisk(b) ?? 99) <= 4 && !/linked/.test(b.name))).toBe(true);
  });
  it("max return under a loss cap obeys every rule, and the min-loss list for that return is no riskier", async () => {
    const cap = lossCap(0.3);
    const best = await solveSet(pool.bonds, { horizon: 4, perSector: 2, objective: "ret", lossMax: cap });
    expect(best.status).toBe("optimal");
    expect(best.bonds).toHaveLength(10);
    expect(new Set(best.bonds.map(issuerKey)).size).toBe(10);
    const dur = best.bonds.reduce((s, b) => s + b.modifiedDuration!, 0) / 10;
    expect(dur).toBeGreaterThanOrEqual(3.8 - 1e-6);
    expect(dur).toBeLessThanOrEqual(4.2 + 1e-6);
    expect(best.el).toBeLessThanOrEqual(0.3 + 1e-6);
    const low = await solveSet(pool.bonds, { horizon: 4, perSector: 2, objective: "loss", retMin: best.ytm - 1e-6 });
    expect(low.el).toBeLessThanOrEqual(best.el + 1e-6);
  }, 60_000);
  it("reports an unreachable return as infeasible", async () => {
    const r = await solveSet(pool.bonds, { horizon: 4, perSector: 2, objective: "loss", retMin: 12 });
    expect(r.status).toBe("infeasible");
  }, 60_000);
});
