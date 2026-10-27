import { describe, expect, it } from "vitest";
import { generateScenarios, normInv, portfolioRisk, PRESETS, type Exposure } from "./correlatedLoss";

const book = (pd: number, n = 10): Exposure[] => Array.from({ length: n }, (_, i) => ({ pd, lgd: 0.6, sector: i % 2 ? "Industrials" : "Utilities", country: i % 3 ? "France" : "Italy" }));

describe("normal inverse", () => {
  it("matches known quantiles", () => {
    expect(normInv(0.5)).toBeCloseTo(0, 9);
    expect(normInv(0.975)).toBeCloseTo(1.959964, 5);
    expect(normInv(0.05)).toBeCloseTo(-1.644854, 5);
    expect(normInv(0.001)).toBeCloseTo(-3.090232, 5);
  });
});

describe("factor scenarios keep the marginal default chances for any loadings", () => {
  for (const id of ["independent", "moderate", "severe"] as const) {
    it(`${id}: simulated default frequency equals PD within sampling error`, () => {
      const items = [0.01, 0.03, 0.08, 0.2].flatMap((pd) => book(pd, 3));
      const S = 100_000;
      const sc = generateScenarios(items, PRESETS[id], S, 7);
      const hits = new Array(items.length).fill(0);
      for (const e of sc.events) hits[e.i]++;
      items.forEach((x, i) => {
        const se = Math.sqrt((x.pd * (1 - x.pd)) / S);
        expect(Math.abs(hits[i] / S - x.pd)).toBeLessThan(5 * se + 0.001);
      });
    });
  }
  it("the same seed gives the same scenarios", () => {
    const a = generateScenarios(book(0.05), PRESETS.moderate, 5000, 3), b = generateScenarios(book(0.05), PRESETS.moderate, 5000, 3);
    expect(a.events).toEqual(b.events);
  });
  it("rejects loadings that leave no own-issuer risk", () => {
    expect(() => generateScenarios(book(0.05), { ...PRESETS.severe, rhoGlobal: 0.9, rhoSector: 0.1 }, 10)).toThrow();
  });
});

describe("what dependence changes", () => {
  const items = book(0.03);
  const ind = portfolioRisk(items, PRESETS.independent, 300_000, 11);
  const mod = portfolioRisk(items, PRESETS.moderate, 300_000, 11);
  const sev = portfolioRisk(items, PRESETS.severe, 300_000, 11);
  it("independent baseline: joint default of a pair is about PD squared; expected loss equals the marginal figure", () => {
    expect(ind.jointDefaultPairPct / 100).toBeCloseTo(0.03 * 0.03, 3);
    expect(ind.expectedLossPct).toBeCloseTo(0.03 * 0.6 * 100, 1);
  });
  it("expected loss is unchanged by dependence (same marginals), joint defaults and the tail are not", () => {
    expect(Math.abs(mod.expectedLossPct - ind.expectedLossPct)).toBeLessThan(4 * (ind.expectedLossSePct + mod.expectedLossSePct));
    expect(Math.abs(sev.expectedLossPct - ind.expectedLossPct)).toBeLessThan(4 * (ind.expectedLossSePct + sev.expectedLossSePct));
    expect(mod.jointDefaultPairPct).toBeGreaterThan(ind.jointDefaultPairPct * 1.5);
    expect(sev.jointDefaultPairPct).toBeGreaterThan(mod.jointDefaultPairPct);
    expect(sev.cvar95Pct).toBeGreaterThan(mod.cvar95Pct);
    expect(mod.cvar95Pct).toBeGreaterThan(ind.cvar95Pct);
  });
  it("dependence lowers the chance of ANY default (defaults bunch together) but fattens the many-defaults tail", () => {
    expect(sev.anyDefaultPct).toBeLessThan(ind.anyDefaultPct);
    const many = (r: typeof ind) => r.defaultCountPct.slice(3).reduce((a, b) => a + b, 0);
    expect(many(sev)).toBeGreaterThan(many(ind));
  });
  it("CVaR is at least the mean loss and at least VaR", () => {
    for (const r of [ind, mod, sev]) { expect(r.cvar95Pct).toBeGreaterThanOrEqual(r.expectedLossPct - 1e-9); expect(r.cvar95Pct).toBeGreaterThanOrEqual(r.var95Pct - 1e-9); }
  });
  it("recoveries worsening in bad cycles raises loss without touching default chances", () => {
    const stressed = portfolioRisk(items, { ...PRESETS.severe, lgdStress: 0.2 }, 300_000, 11);
    expect(stressed.expectedLossPct).toBeGreaterThan(sev.expectedLossPct);
    expect(stressed.anyDefaultPct).toBeCloseTo(sev.anyDefaultPct, 6);
  });
  it("no preset claims to be calibrated", () => { for (const p of Object.values(PRESETS)) expect(p.calibrated).toBe(false); });
});
