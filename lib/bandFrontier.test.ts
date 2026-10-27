import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { buildFrontier, dominates, nondominated, pickPositions, verifyList } from "./bandFrontier";
import { candidatesOf } from "./coherentFrontier";
import { checkList, DEFAULT_POLICY } from "./coherence";
import { listLifeLoss } from "./expectedLoss";

const bond = (isin: string, issuer: string, ytm: number, rating: string, dur: number): PublicBond => ({
  isin, name: isin, issuer, country: isin.endsWith("1") ? "Italy" : "France", currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});
const NAMES = ["Axa", "Allianz", "Deutsche Zeta", "Engie", "Enel", "Snam", "Sanofi", "Roche", "Danone", "Heineken", "Eni", "Neste", "Stryker", "Orange", "Verizon", "Gecina", "Vonovia", "Iberdrola", "Telefonica", "Carrefour", "Michelin", "Siemens"];
const GRADES = ["AAA", "AA", "A", "BBB", "BBB", "BB", "B"];
function universe(seed: number): PublicBond[] {
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return NAMES.map((n, i) => { const g = Math.floor(rnd() * GRADES.length); return bond(`U${i}-${i % 2}`, n, Math.round((2.5 + g * 0.8 + rnd() * 1.2) * 100) / 100, GRADES[g], 3.6 + rnd() * 0.9); });
}

describe("revised 30-band frontier", () => {
  it("dominance and filtering work on unrounded values", () => {
    expect(dominates({ ret: 5.4500001, loss: 3.1 }, { ret: 5.45, loss: 3.2 })).toBe(true);
    expect(dominates({ ret: 5.45, loss: 3.2 }, { ret: 5.4500001, loss: 3.1 })).toBe(false);
    const kept = nondominated([{ ret: 4, loss: 1 }, { ret: 5, loss: 2 }, { ret: 4.5, loss: 3 }, { ret: 6, loss: 2.5 }]);
    expect(kept.map((p) => p.ret)).toEqual([4, 5, 6]);
  });

  it("finds exactly the true efficient frontier (full enumeration of all lists) and every displayed list verifies", { timeout: 600000 }, async () => {
    const bonds = universe(23);
    const f = await buildFrontier(bonds, 4, { noEnds: true, steps: 4, resolution: 1e-6 });
    const cs = candidatesOf(bonds, 4, false);
    const P = { ...DEFAULT_POLICY, maxDispersion: 9, minCore: 0, minWorst: 0 };
    const all: { ret: number; loss: number }[] = [];
    const pick: number[] = [];
    const go = (i: number) => {
      if (pick.length === 10) {
        const sel = pick.map((k) => cs[k]);
        const dur = sel.reduce((s, c) => s + c.dur, 0) / 10;
        if (Math.abs(dur - 4) > 4 * 0.05 + 1e-9) return;
        if (!checkList(sel, P, 10).every((c) => c.ok)) return;
        all.push({ ret: sel.reduce((s, c) => s + c.ret, 0) / 10, loss: sel.reduce((s, c) => s + c.pd, 0) });
        return;
      }
      if (cs.length - i < 10 - pick.length) return;
      pick.push(i); go(i + 1); pick.pop();
      go(i + 1);
    };
    go(0);
    const truth = nondominated(all);
    expect(truth.length).toBeGreaterThan(2);
    expect(f.efficient.length).toBe(truth.length);
    for (const t of truth) expect(f.efficient.some((p) => Math.abs(p.ret - t.ret) < 1e-5 && Math.abs(p.loss - t.loss) < 1e-5)).toBe(true);
    for (const p of f.efficient) {
      const v = verifyList(p.sel.map((c) => c.b.isin), bonds, 4, DEFAULT_POLICY, false);
      expect(v.problems).toEqual([]);
      expect(Math.abs(v.ret - p.ret)).toBeLessThan(1e-9);
      expect(Math.abs(v.el - listLifeLoss(p.sel.map((c) => c.pd)))).toBeLessThan(1e-9);
    }
    expect(f.efficient.every((p, i) => i === 0 || (p.ret > f.efficient[i - 1].ret && p.loss > f.efficient[i - 1].loss))).toBe(true);
  });

  it("picks at most 30 positions, both ends, strictly rising", () => {
    const eff = Array.from({ length: 80 }, (_, i) => ({ ret: 3 + i * 0.05, loss: 1 + i, el: 0, src: "", key: String(i), sel: [] }));
    const pos = pickPositions(eff, 30);
    expect(pos.length).toBeLessThanOrEqual(30);
    expect(pos[0]).toBe(eff[0]);
    expect(pos[pos.length - 1]).toBe(eff[79]);
    expect(pos.every((p, i) => i === 0 || p.ret > pos[i - 1].ret)).toBe(true);
  });
});
