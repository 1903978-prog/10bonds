import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { candidatesOf } from "./coherentFrontier";
import { atLeastAsGood, cleanConfig, defaultBands, defaultConfig, bestGreedy, improveSteps, inBand, listOk, nonMonotonic, pruneCandidates, statOf, sumRange, type Rules } from "./riskBands";
import { solveBand } from "./riskBandsSolve";

const bond = (isin: string, issuer: string, ytm: number, rating: string, dur = 4): PublicBond => ({
  isin, name: isin, issuer, country: isin.endsWith("1") ? "Italy" : "France", currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});
const NAMES = ["Axa", "Allianz", "Deutsche Zeta", "Engie", "Enel", "Snam", "Sanofi", "Roche", "Danone", "Heineken", "Eni", "Neste", "Stryker", "Orange", "Verizon", "Gecina", "Vonovia", "Iberdrola", "Telefonica", "Carrefour", "Michelin", "Siemens"];
const GRADES = ["AAA", "AA", "A", "BBB", "BBB", "BB", "B"];
function universe(seed: number): PublicBond[] {
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return NAMES.map((n, i) => { const g = Math.floor(rnd() * GRADES.length); return bond(`U${i}-${i % 2}`, n, Math.round((2.5 + g * 0.8 + rnd() * 1.2) * 100) / 100, GRADES[g], 3.6 + rnd() * 0.9); });
}
const rules: Rules = { perIssuer: 1, perSector: 3, duration: 4 };
const bands = defaultBands();

describe("risk band table", () => {
  it("is the specification: 1.0-1.2, 1.3-1.5 ... 9.4-9.6, 9.7-10.0", () => {
    expect(bands).toHaveLength(30);
    expect(bands[0]).toEqual({ k: 1, min: 1, max: 1.2 });
    expect(bands[1]).toEqual({ k: 2, min: 1.3, max: 1.5 });
    expect(bands[2]).toEqual({ k: 3, min: 1.6, max: 1.8 });
    expect(bands[28]).toEqual({ k: 29, min: 9.4, max: 9.6 });
    expect(bands[29]).toEqual({ k: 30, min: 9.7, max: 10 });
  });
  it("every band holds at least one whole-number sum of 10 scores (so a list can exist), and bands do not overlap", () => {
    for (const b of bands) expect(sumRange(b)).not.toBeNull();
    for (let i = 1; i < bands.length; i++) expect(bands[i].min).toBeGreaterThan(bands[i - 1].max);
  });
  it("accepts a clean edit and refuses a broken one", () => {
    const c = defaultConfig();
    expect(cleanConfig(c)).toEqual(c);
    expect(cleanConfig({ ...c, bands: c.bands.slice(1) })).toBeNull();
    expect(cleanConfig({ ...c, bands: c.bands.map((b, i) => (i === 3 ? { ...b, min: 5, max: 4 } : b)) })).toBeNull();
    expect(cleanConfig({ ...c, bands: c.bands.map((b, i) => (i === 3 ? { ...b, max: 11 } : b)) })).toBeNull();
    expect(cleanConfig({ ...c, perCell: 5 })).toBeNull();
  });
  it("flags a band that pays less than an earlier one", () => {
    expect(nonMonotonic([3, 3.5, null, 3.4, 4, 3.9])).toEqual([4, 6]);
    expect(nonMonotonic([3, 3, 3.1])).toEqual([]);
  });
});

describe("candidate set", () => {
  it("keeps per (duration year x risk score) the top bonds of different issuers", () => {
    const mk = (isin: string, group: string, ret: number, cls = 3, dur = 4.2) => ({ b: bond(isin, group, ret, "A"), group, ret, cls, dur, pd: 1, sector: "S", weak: false, ci: 0, u: 0, notch: 5, years: 4, beatenBy: new Set<string>() });
    const cs = [mk("a1", "A", 5), mk("a2", "A", 4.9), mk("b1", "B", 4.8), mk("c1", "C", 4.7), mk("d1", "D", 6, 4), mk("e1", "E", 6, 3, 5.2)];
    const kept = pruneCandidates(cs, 2).map((c) => c.b.isin).sort();
    expect(kept).toEqual(["a1", "b1", "d1", "e1"]);
  });
});

describe("exact band solve versus full enumeration", () => {
  it("returns the highest yield, then least loss, for every feasible band; none where no list exists", { timeout: 240000 }, async () => {
    const cs = candidatesOf(universe(23), 4, false);
    expect(cs.length).toBeGreaterThan(14);
    const best = new Map<number, { ytm: number; el: number }>();
    const pick: number[] = [];
    const go = (i: number) => {
      if (pick.length === 10) {
        const sel = pick.map((k) => cs[k]);
        for (const b of bands) if (listOk(sel, b, rules)) {
          const s = statOf(sel);
          const cur = best.get(b.k);
          if (!cur || s.ytm > cur.ytm + 1e-5 || (Math.abs(s.ytm - cur.ytm) <= 1e-5 && s.el < cur.el)) best.set(b.k, { ytm: s.ytm, el: s.el });
        }
        return;
      }
      if (cs.length - i < 10 - pick.length) return;
      pick.push(i); go(i + 1); pick.pop();
      go(i + 1);
    };
    go(0);
    expect(best.size).toBeGreaterThan(1);
    for (const b of bands) {
      const r = await solveBand(cs, b, rules);
      const t = best.get(b.k);
      if (!t) { expect(r.status).toBe("infeasible"); continue; }
      expect(r.status).toBe("optimal");
      const s = statOf(r.sel);
      expect(Math.abs(s.ytm - t.ytm)).toBeLessThan(1e-4);
      expect(s.el).toBeLessThanOrEqual(t.el + 1e-4);
      expect(inBand(s.avgRisk, b)).toBe(true);
      expect(new Set(r.sel.map((c) => c.group)).size).toBe(10);
      expect(listOk(r.sel, b, rules)).toBe(true);
    }
  });
});

describe("progressive fallback", () => {
  it("greedy start is valid, swaps never lower the yield or raise the loss, and the exact list is at least as good as the greedy one", { timeout: 120000 }, async () => {
    const cs = candidatesOf(universe(23), 4, false);
    let checked = 0;
    for (const b of bands) {
      const gg = bestGreedy(cs, b, rules);
      const g = gg?.sel ?? null;
      const exact = await solveBand(cs, b, rules);
      if (exact.status === "infeasible") { continue; }
      if (!g) continue; // a hard band can need the exact solve to start
      checked++;
      expect(listOk(g, b, rules)).toBe(true);
      const steps = improveSteps(g, gg!.pool, b, rules);
      let prev = statOf(g);
      for (const st of steps) {
        expect(listOk(st.sel, b, rules)).toBe(true);
        expect(st.stat.ytm).toBeGreaterThanOrEqual(prev.ytm - 1e-9);
        expect(st.stat.el).toBeLessThanOrEqual(prev.el + 1e-9);
        expect(st.stat.ytm > prev.ytm + 1e-9 || st.stat.el < prev.el - 1e-9).toBe(true);
        prev = st.stat;
      }
      expect(statOf(exact.sel).ytm).toBeGreaterThanOrEqual(statOf(g).ytm - 1e-6);
      expect(statOf(exact.sel).ytm).toBeGreaterThanOrEqual(prev.ytm - 1e-6);
      expect(atLeastAsGood(statOf(exact.sel), prev) || statOf(exact.sel).el > prev.el).toBe(true);
    }
    expect(checked).toBeGreaterThan(1);
  });
  it("greedy start takes under 300 ms on a large candidate set", () => {
    const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const cs = Array.from({ length: 2000 }, (_, i) => ({ b: bond(`X${i}`, `G${i}`, 2, "A"), group: `G${i}`, ret: 2 + rnd() * 6, cls: 1 + Math.floor(rnd() * 10), dur: 3.7 + rnd() * 0.6, pd: rnd() * 5, sector: `S${i % 12}`, weak: false, ci: i, u: 0, notch: 5, years: 4, beatenBy: new Set<string>() }));
    const t0 = Date.now();
    const g = bestGreedy(cs, bands[14], rules)?.sel ?? null;
    expect(Date.now() - t0).toBeLessThan(300);
    expect(g).not.toBeNull();
    expect(listOk(g!, bands[14], rules)).toBe(true);
  });
});
