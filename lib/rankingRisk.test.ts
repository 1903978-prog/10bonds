import { describe, it, expect } from "vitest";
import { rankBonds, averages, ytmCapsByRisk } from "./ranking";
import type { PublicBond } from "./types";
import { riskOfNotch } from "./ratings";
// Realistic synthetic market: 400 issuers, yield rises with duration and rating notch, plus noise.
const grades = ["AAA","AA+","AA","AA-","A+","A","A-","BBB+","BBB","BBB-","BB+","BB","BB-","B+","B","B-"];
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const bonds: PublicBond[] = [];
for (let i = 0; i < 400; i++) { const g = Math.floor(rnd() * 14); for (let k = 0; k < 3; k++) { const d = 0.5 + rnd() * 15;
  bonds.push({ isin: `X${i}_${k}`, name: "", issuer: `Issuer ${i}`, country: null, currency: "EUR", coupon: null, maturity: null, ratingSp: grades[g], ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: 2 + 0.12 * d + 0.12 * g + (rnd() - 0.5) * 0.8, modifiedDuration: d, ytmAsOf: null }); } }
describe("more risk accepted", () => it("at the maximum never gives a lower average yield; below it the target is always met (the owner's risk 4 -> 5 case)", () => {
  const caps = ytmCapsByRisk(bonds, Array.from({ length: 15 }, (_, i) => i + 1), { min: 1, max: 12, step: 0.01 });
  for (const d of [2, 5, 10, 13]) for (const mode of ["fixed", "atMax", "keptAtRisk3Max"]) {
    let prev = -1;
    for (let r = 3; r <= 7; r++) {
      const target = mode === "fixed" ? 3.5 : mode === "keptAtRisk3Max" ? caps["3"][String(d)]! : caps[String(r)][String(d)]!;
      const a = averages(rankBonds(bonds, d, target, undefined, r).results);
      if (mode === "atMax") { expect(a.ytm!).toBeGreaterThanOrEqual(prev - 1e-9); prev = a.ytm!; }
      else if (target <= caps[String(r)][String(d)]!) expect(a.ytm!).toBeGreaterThanOrEqual(target - 1e-9);
    }
  }
}, 30_000)); // the caps check reaches each maximum by running the ranking a few times per cell

describe("lower target yield", () => it("gives a safer list: average risk never rises as the target falls", () => {
  for (const d of [2, 5, 10]) {
    const cap = ytmCapsByRisk(bonds, [d], { min: 1, max: 12, step: 0.01 })["7"][String(d)]!;
    let prevRisk = Infinity;
    for (let t = cap; t >= cap - 1.5; t -= 0.1) {
      const res = rankBonds(bonds, d, Math.round(t * 100) / 100, undefined, 7).results;
      const avgRisk = res.reduce((s, r) => s + riskOfNotch(r.ratingNotch)!, 0) / res.length;
      expect(avgRisk).toBeLessThanOrEqual(prevRisk + 0.11);
      prevRisk = Math.min(prevRisk, avgRisk);
    }
    const safe = rankBonds(bonds, d, 1, undefined, 7).results, hot = rankBonds(bonds, d, cap, undefined, 7).results;
    const avg = (rs: typeof safe) => rs.reduce((s, r) => s + riskOfNotch(r.ratingNotch)!, 0) / rs.length;
    expect(avg(safe)).toBeLessThan(avg(hot) - 1);
  }
}));
