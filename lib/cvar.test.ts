import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { candidatesOf, coherentFrontier, cvarContext, listCvar, type CvarSetting } from "./coherentFrontier";
import { checkList, DEFAULT_POLICY } from "./coherence";

const bond = (isin: string, issuer: string, ytm: number, rating: string, dur = 4): PublicBond => ({
  isin, name: isin, issuer, country: isin.endsWith("1") ? "Italy" : "France", currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});
const NAMES = ["Axa", "Allianz Finance II", "DZ Bank", "Engie", "Enel", "Snam", "Sanofi", "Roche Finance Europe", "Danone", "Heineken", "Eni", "Neste", "Stryker", "Orange", "Verizon", "Gecina", "Vinci"];
const GRADES = ["A", "BBB+", "BBB", "BBB-"];
function universe(seed: number): PublicBond[] {
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return NAMES.map((n, i) => { const g = Math.floor(rnd() * 4); return bond(`U${i}-${i % 2}`, n, Math.round((2.8 + g * 0.45 + rnd() * 0.9) * 100) / 100, GRADES[g], 3.5 + rnd() * 1.1); });
}
const SETTING = (C: number): CvarSetting => ({ C, scenarios: 600, seed: 5, preset: "severe", validationScenarios: 20_000 });

function bruteLists(bonds: PublicBond[], duration: number, setting: CvarSetting) {
  const cs = candidatesOf(bonds, duration, false);
  const ctx = cvarContext(cs, setting);
  const out: { ret: number; loss: number }[] = [];
  const pick: number[] = [];
  const go = (i: number) => {
    if (pick.length === 10) {
      const sel = pick.map((k) => cs[k]);
      const dur = sel.reduce((s, c) => s + c.dur, 0) / 10;
      if (Math.abs(dur - duration) > duration * 0.05 + 1e-9) return;
      if (!checkList(sel, DEFAULT_POLICY, 10).every((c) => c.ok)) return;
      if (listCvar(ctx, new Set(sel.map((c) => c.ci))) > setting.C + 1e-9) return;
      out.push({ ret: sel.reduce((s, c) => s + c.ret, 0) / 10, loss: (sel.reduce((s, c) => s + c.pd, 0) / 10) * 0.6 });
      return;
    }
    if (cs.length - i < 10 - pick.length) return;
    pick.push(i); go(i + 1); pick.pop();
    go(i + 1);
  };
  go(0);
  return out;
}

const engine = { spread: "diagnostic_only", composition: "house_window", loss: "v1_linear" } as const;

describe("experimental CVaR constraint", () => {
  const bonds = universe(17);
  it("a budget nobody reaches changes nothing", { timeout: 120000 }, async () => {
    const free = await coherentFrontier(bonds, 4, DEFAULT_POLICY, 10, { engine });
    const loose = await coherentFrontier(bonds, 4, DEFAULT_POLICY, 10, { engine, cvar: SETTING(1e6) });
    expect(loose.points.map((p) => p.isins)).toEqual(free.points.map((p) => p.isins));
    expect(loose.cert.cvar?.calibrated).toBe(false);
  });
  it("a binding budget: every list meets it on the optimiser's scenarios, and the answer is the true optimum under it", { timeout: 240000 }, async () => {
    const free = await coherentFrontier(bonds, 4, DEFAULT_POLICY, 10, { engine, cvar: SETTING(1e6) });
    const cs = candidatesOf(bonds, 4, false);
    const ctx = cvarContext(cs, SETTING(1e6));
    const byIsin = new Map(cs.map((c) => [c.b.isin, c.ci]));
    // The two slider ends follow their own rules; the budget is set inside the range of the coherent lists so it binds without being impossible.
    const tails = free.points.filter((p) => !p.end).map((p) => listCvar(ctx, new Set(p.isins.map((i) => byIsin.get(i)!))));
    const worst = Math.max(...tails);
    const C = (worst + Math.min(...tails)) / 2 + 1e-3;
    const f = await coherentFrontier(bonds, 4, DEFAULT_POLICY, 10, { engine, cvar: SETTING(C) });
    expect(f.cert.certified).toBe(true);
    expect(f.points.length).toBeGreaterThan(0);
    for (const p of f.points) {
      expect(p.cvar!.training).toBeLessThanOrEqual(C + 1e-6);
      expect(p.cvar!.validation).toBeGreaterThan(0);
    }
    const lists = bruteLists(bonds, 4, SETTING(C));
    let compared = 0;
    for (const p of f.points.filter((x) => !x.end)) {
      const feasible = lists.filter((l) => l.ret >= p.ytm - 1e-9);
      expect(p.el).toBeCloseTo(Math.min(...feasible.map((l) => l.loss)), 7);
      compared++;
    }
    expect(compared).toBeGreaterThan(0);
    // The tail budget removes risk that the unconstrained frontier carried.
    expect(Math.max(...f.points.map((p) => p.cvar!.training))).toBeLessThan(worst);
  });
  it("an impossible budget gives no list rather than a broken one", { timeout: 120000 }, async () => {
    const f = await coherentFrontier(bonds, 4, DEFAULT_POLICY, 10, { engine, cvar: SETTING(0.0001) });
    expect(f.points).toHaveLength(0);
  });
});
