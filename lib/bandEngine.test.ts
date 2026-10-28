import { riskConsistent } from "./riskWindow";
import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { BANDS, markDominated, runBands, type BandResult } from "./bandEngine";
import { candidatesOf } from "./coherentFrontier";
import { checkList, DEFAULT_POLICY } from "./coherence";
import { listLifeLoss } from "./expectedLoss";

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

describe("30 bands", () => {
  it("are generated from the specification: 1.0-1.2, 1.3-1.5 ... 9.7-10.0", () => {
    expect(BANDS).toHaveLength(30);
    expect(BANDS[0]).toMatchObject({ k: 1, lo: 1, hi: 1.2 });
    expect(BANDS[1]).toMatchObject({ lo: 1.3, hi: 1.5 });
    expect(BANDS[3]).toMatchObject({ lo: 1.9, hi: 2.1 });
    expect(BANDS[28]).toMatchObject({ lo: 9.4, hi: 9.6 });
    expect(BANDS[29]).toMatchObject({ k: 30, lo: 9.7, hi: 10 });
  });

  it("the solver's list per band is the true optimum: highest yield, least loss among ties, versus full enumeration", { timeout: 240000 }, async () => {
    const bonds = universe(23);
    const { results } = await runBands(bonds, 4, { diagnose: false, endpoints: false });
    const cs = candidatesOf(bonds, 4, false);
    const P = { ...DEFAULT_POLICY, maxDispersion: 9, minCore: 0, minWorst: 0 };
    const best = new Map<number, { ytm: number; el: number }>();
    const pick: number[] = [];
    const go = (i: number) => {
      if (pick.length === 10) {
        const sel = pick.map((k) => cs[k]);
        const dur = sel.reduce((s, c) => s + c.dur, 0) / 10;
        if (Math.abs(dur - 4) > 4 * 0.05 + 1e-9) return;
        if (!checkList(sel, P, 10).every((c) => c.ok)) return;
        if (!riskConsistent(sel.map((c) => c.cls))) return; // risk window: scores at most 2 apart
        const risk = sel.reduce((s, c) => s + c.cls, 0) / 10;
        const ytm = sel.reduce((s, c) => s + c.ret, 0) / 10;
        const el = listLifeLoss(sel.map((c) => c.pd));
        for (const b of BANDS) if (risk >= b.lo - 1e-9 && risk <= b.hi + 1e-9) {
          const cur = best.get(b.k);
          if (!cur || ytm > cur.ytm + 1e-7 || (Math.abs(ytm - cur.ytm) <= 1e-7 && el < cur.el)) best.set(b.k, { ytm, el });
        }
        return;
      }
      if (cs.length - i < 10 - pick.length) return;
      pick.push(i); go(i + 1); pick.pop();
      go(i + 1);
    };
    go(0);
    expect(best.size).toBeGreaterThan(0);
    for (const r of results) {
      const t = best.get(r.k);
      if (!t) { expect(r.ytm).toBeNull(); expect(r.status).toBe("unavailable"); continue; }
      const raw = r.ytm!;
      expect(Math.abs(raw - t.ytm)).toBeLessThan(1e-4);
      expect(r.avgRisk!).toBeGreaterThanOrEqual(r.lo - 1e-9);
      expect(r.avgRisk!).toBeLessThanOrEqual(r.hi + 1e-9);
      expect(r.isins).toHaveLength(10);
    }
  });

  it("flags a riskier band that pays no more, and a band beaten on both yield and expected loss; keeps the real steps", () => {
    const mk = (k: number, risk: number, ytm: number, el: number): BandResult => ({ k, lo: 0, hi: 0, status: "feasible", policy: "regular", avgRisk: risk, ytm, el, avgDuration: 4, isins: [], reason: null });
    const rs = [mk(1, 1.1, 3.0, 0.1), mk(2, 1.4, 3.5, 0.3), mk(3, 1.7, 3.4, 0.5), mk(4, 2.0, 4.0, 0.2), mk(5, 2.3, 4.5, 0.9)];
    markDominated(rs);
    expect(rs.map((r) => r.status)).toEqual(["feasible", "dominated", "dominated", "feasible", "feasible"]);
    const shown = rs.filter((r) => r.status === "feasible");
    for (let i = 1; i < shown.length; i++) { expect(shown[i].ytm!).toBeGreaterThan(shown[i - 1].ytm!); expect(shown[i].el!).toBeGreaterThan(shown[i - 1].el!); }
  });
});
