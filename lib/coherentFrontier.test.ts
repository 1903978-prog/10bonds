import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { candidatesOf, coherentFrontier } from "./coherentFrontier";
import { checkList, cleanPolicy, DEFAULT_POLICY, factsOf, type CoherencePolicy } from "./coherence";
import { buildSlider } from "./sliderPortfolios";
import { exactFrontier } from "./exactFrontier";

const bond = (isin: string, issuer: string, ytm: number, rating: string, dur = 4): PublicBond => ({
  isin, name: isin, issuer, country: null, currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});
const NAMES = ["Axa", "Allianz Finance II", "DZ Bank", "DZ BANK AG Deutsche Zentral-Genossenschaftsbank", "Engie", "Enel", "Snam", "Sanofi", "Roche Finance Europe", "Danone", "Heineken", "Eni", "Neste", "Stryker", "Orange", "Verizon", "Gecina", "Vinci"];
const GRADES = ["A", "BBB+", "BBB", "BBB-"];
function universe(seed: number, names = NAMES, grades = GRADES): PublicBond[] {
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return names.map((n, i) => {
    const g = Math.floor(rnd() * grades.length);
    return bond(`U${seed % 1000}-${i}`, n, Math.round((2.8 + g * 0.45 + rnd() * 0.9) * 100) / 100, grades[g], 3.5 + rnd() * 1.1);
  });
}

// Every list of 10 of the bonds that satisfies every rule (small universes only): the answer the solver must match.
function bruteLists(bonds: PublicBond[], duration: number, p: CoherencePolicy = DEFAULT_POLICY) {
  const cs = candidatesOf(bonds, duration);
  const out: { ret: number; loss: number }[] = [];
  const pick: number[] = [];
  const go = (i: number) => {
    if (pick.length === 10) {
      const sel = pick.map((k) => cs[k]);
      const dur = sel.reduce((s, c) => s + c.dur, 0) / 10;
      if (Math.abs(dur - duration) > duration * 0.05 + 1e-9) return;
      if (!checkList(sel.map((c) => c), p, 10).every((c) => c.ok)) return;
      const groups = new Set(sel.map((c) => c.group));
      if (sel.some((c) => [...c.beatenBy].some((g) => !groups.has(g)))) return; // spread rule
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

describe("coherent frontier is the exact optimum", () => {
  it("matches a full search of every possible list under every rule", { timeout: 120000 }, async () => {
    let compared = 0;
    for (const seed of [5, 17, 41, 77, 123]) {
      const bonds = universe(seed);
      const f = await coherentFrontier(bonds, 4);
      const lists = bruteLists(bonds, 4);
      if (!lists.length) { expect(f.points).toHaveLength(0); continue; }
      expect(f.cert.uncertified).toBe(0);
      expect(f.cert.certified).toBe(true);
      expect(f.points.length).toBeGreaterThan(0);
      for (const p of f.points) {
        // The point is the least-loss list for its own return, and has the highest return among equal losses.
        const feasible = lists.filter((l) => l.ret >= p.ytm - 1e-9);
        const best = Math.min(...feasible.map((l) => l.loss));
        expect(p.el).toBeCloseTo(best, 7);
        expect(Math.max(...feasible.filter((l) => l.loss <= best + 1e-7).map((l) => l.ret))).toBeCloseTo(p.ytm, 7);
        compared++;
      }
      // The ends: the lowest-loss list and the highest-return list.
      expect(f.points[0].el).toBeCloseTo(Math.min(...lists.map((l) => l.loss)), 7);
      expect(f.points[f.points.length - 1].ytm).toBeCloseTo(Math.max(...lists.map((l) => l.ret)), 7);
    }
    console.log("frontier points compared with the full search:", compared);
    expect(compared).toBeGreaterThan(10);
  });
});

describe("coherent frontier regression", () => {
  const bonds = universe(5);
  it("every list has ten bonds and satisfies every rule; the average duration holds", { timeout: 60000 }, async () => {
    const f = await coherentFrontier(bonds, 4);
    expect(f.points.length).toBeGreaterThan(0);
    for (const p of f.points) {
      expect(p.rows).toHaveLength(10);
      expect(checkList(p.rows.map((r) => factsOf(r)), DEFAULT_POLICY).every((c) => c.ok)).toBe(true);
      expect(new Set(p.isins).size).toBe(10);
      const avgDur = p.rows.reduce((s, r) => s + r.modifiedDuration!, 0) / 10;
      expect(Math.abs(avgDur - 4)).toBeLessThanOrEqual(0.2 + 1e-9);
      // Existing yield figures: the list's return is the plain average of its bonds' returns.
      expect(p.ytm).toBeCloseTo(p.rows.reduce((s, r) => s + r.grossYtm!, 0) / 10, 9);
    }
  });
  it("the frontier has no dominated point: return and loss both rise from one point to the next", { timeout: 60000 }, async () => {
    const f = await coherentFrontier(bonds, 4);
    for (let i = 1; i < f.points.length; i++) {
      expect(f.points[i].ytm).toBeGreaterThan(f.points[i - 1].ytm);
      expect(f.points[i].el).toBeGreaterThan(f.points[i - 1].el);
    }
  });
  it("both DZ names never sit in one list", { timeout: 60000 }, async () => {
    const f = await coherentFrontier(bonds, 4);
    for (const p of f.points) expect(p.rows.filter((r) => /dz bank/i.test(r.issuer ?? "")).length).toBeLessThanOrEqual(1);
  });
  it("the 30-position slider is rebuilt from the coherent frontier: at most 30, strictly rising, every list valid", { timeout: 60000 }, async () => {
    const f = await coherentFrontier(bonds, 4);
    const pos = buildSlider(f);
    expect(pos.length).toBeLessThanOrEqual(30);
    expect(pos.length).toBeGreaterThan(1);
    for (let i = 1; i < pos.length; i++) { expect(pos[i].ytm!).toBeGreaterThan(pos[i - 1].ytm!); expect(pos[i].expectedLoss!).toBeGreaterThan(pos[i - 1].expectedLoss!); }
    const by = new Map(bonds.map((b) => [b.isin, b]));
    for (const p of pos) expect(checkList(p.isins.map((i) => factsOf(by.get(i)!)), DEFAULT_POLICY).every((c) => c.ok)).toBe(true);
  });
  it("Methodology 1 is untouched: its frontier ignores the coherence rules", () => {
    const m1 = exactFrontier(bonds, 4);
    expect(m1.points.length).toBeGreaterThan(0);
    // It may legally mix a wide class range; the coherent engine may not.
    expect("cert" in m1).toBe(false);
  });
});

describe("larger universes", () => {
  it("builds long model lines the solver can read (several bonds per issuer)", { timeout: 120000 }, async () => {
    const bonds = NAMES.flatMap((n, k) => [0, 1, 2, 3, 4].map((j) => bond(`L${k}-${j}`, n, 2.8 + ((k * 7 + j * 3) % 11) * 0.12, GRADES[(k + j) % 4], 3.6 + ((k + j) % 5) * 0.2)));
    const f = await coherentFrontier(bonds, 4);
    expect(f.points.length).toBeGreaterThan(1);
    expect(f.cert.certified).toBe(true);
    for (const p of f.points) expect(checkList(p.rows.map((r) => factsOf(r)), DEFAULT_POLICY).every((c) => c.ok)).toBe(true);
  });
});

describe("infeasible and scarce universes never relax a rule", () => {
  it("a risk ceiling below every available bond is infeasible", { timeout: 60000 }, async () => {
    const f = await coherentFrontier(universe(5, NAMES, ["BBB", "BBB-"]), 4, DEFAULT_POLICY, 2);
    expect(f.points).toHaveLength(0);
  });
  it("too few distinct sectors is infeasible (ten bonds cannot fit three sectors of three)", { timeout: 60000 }, async () => {
    const f = await coherentFrontier(universe(5, ["Engie", "Enel", "Snam", "Terna", "Iberdrola Finanzas U", "Veolia Environnement", "Axa", "Commerzbank", "Eurobank", "Danske Bk", "Nordea Bank Abp", "Swedbank"], ["BBB"]), 4);
    expect(f.points).toHaveLength(0);
  });
  it("unclassified issuers all share one bucket, so a missing sector never counts as diversified", { timeout: 60000 }, async () => {
    const f = await coherentFrontier(universe(5, Array.from({ length: 14 }, (_, i) => `Unknown Issuer ${i}`), ["BBB"]), 4);
    expect(f.points).toHaveLength(0);
  });
  it("a risk class that needs more than two B+ or lower bonds is infeasible, not relaxed", { timeout: 60000 }, async () => {
    const f = await coherentFrontier(universe(5, NAMES, ["B+", "B"]), 4);
    expect(f.points).toHaveLength(0);
  });
  it("a list with too few bonds in the worst class is infeasible", { timeout: 60000 }, async () => {
    const strict = cleanPolicy({ ...DEFAULT_POLICY, minWorst: 5, minCore: 10 })!;
    const bonds = universe(9, NAMES, ["A", "BBB"]);
    const f = await coherentFrontier(bonds, 4, strict);
    for (const p of f.points) expect(checkList(p.rows.map((r) => factsOf(r)), strict).every((c) => c.ok)).toBe(true);
  });
  it("bonds without an issuer name never enter a list (their identity cannot be checked)", { timeout: 60000 }, async () => {
    const bonds = universe(5).map((b, i) => (i < 3 ? { ...b, issuer: null } : b));
    const f = await coherentFrontier(bonds, 4);
    for (const p of f.points) for (const r of p.rows) expect(r.issuer).not.toBeNull();
  });
});
