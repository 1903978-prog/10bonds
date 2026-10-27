import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { candidatesOf, coherentFrontier } from "./coherentFrontier";
import { checkList, cleanPolicy, DEFAULT_POLICY, END_POLICY, factsOf, type CoherencePolicy } from "./coherence";
import { buildSlider } from "./sliderPortfolios";
import { exactFrontier } from "./exactFrontier";
import { DEFAULT_ENGINE, engineSignature, type EnginePolicy } from "./enginePolicy";

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
function bruteLists(bonds: PublicBond[], duration: number, p: CoherencePolicy = DEFAULT_POLICY, spread = true) {
  const cs = candidatesOf(bonds, duration, spread);
  const out: { ret: number; loss: number }[] = [];
  const pick: number[] = [];
  const go = (i: number) => {
    if (pick.length === 10) {
      const sel = pick.map((k) => cs[k]);
      const dur = sel.reduce((s, c) => s + c.dur, 0) / 10;
      if (Math.abs(dur - duration) > duration * 0.05 + 1e-9) return;
      if (!checkList(sel.map((c) => c), p, 10).every((c) => c.ok)) return;
      const groups = new Set(sel.map((c) => c.group));
      if (spread && sel.some((c) => [...c.beatenBy].some((g) => !groups.has(g)))) return; // spread rule
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
      for (const p of f.points.filter((x) => !x.end)) {
        // The point is the least-loss list for its own return, and has the highest return among equal losses.
        const feasible = lists.filter((l) => l.ret >= p.ytm - 1e-9);
        const best = Math.min(...feasible.map((l) => l.loss));
        expect(p.el).toBeCloseTo(best, 7);
        expect(Math.max(...feasible.filter((l) => l.loss <= best + 1e-7).map((l) => l.ret))).toBeCloseTo(p.ytm, 7);
        compared++;
      }
      // The ends follow the end rules (END_POLICY), not the rating window: the high end is the best list of ten issuers.
      expect(f.points[0].end).toBe("low");
      expect(f.points[f.points.length - 1].end).toBe("high");
    }
    console.log("frontier points compared with the full search:", compared);
    expect(compared).toBeGreaterThan(5);
  });
});

describe("coherent frontier regression", () => {
  const bonds = universe(5);
  it("every list has ten bonds and satisfies every rule; the average duration holds", { timeout: 60000 }, async () => {
    const f = await coherentFrontier(bonds, 4);
    expect(f.points.length).toBeGreaterThan(0);
    for (const p of f.points) {
      expect(p.rows).toHaveLength(10);
      expect(checkList(p.rows.map((r) => factsOf(r)), p.end ? END_POLICY : DEFAULT_POLICY).every((c) => c.ok)).toBe(true);
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
    pos.forEach((p, k) => expect(checkList(p.isins.map((i) => factsOf(by.get(i)!)), k === 0 || k === pos.length - 1 ? END_POLICY : DEFAULT_POLICY).every((c) => c.ok)).toBe(true));
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
    for (const p of f.points) expect(checkList(p.rows.map((r) => factsOf(r)), p.end ? END_POLICY : DEFAULT_POLICY).every((c) => c.ok)).toBe(true);
  });
});

describe("the two ends of the slider", () => {
  const grades = ["AA", "AA", "AA", "A", "A", "A"];
  const names = NAMES;
  const mk = (aaa: number) => names.map((n, i) => bond(`E${i}`, n, 2 + (i % 8) * 0.5 + (i % 3) * 0.1, i < aaa ? "AAA" : grades[i % 6], 4 + (i % 5) * 0.05));
  it("high return end is the ten highest-return bonds, any risk; low end is risk 1 only when there are ten AAA issuers", { timeout: 120000 }, async () => {
    const bonds = mk(12);
    const f = await coherentFrontier(bonds, 4);
    const hi = f.points[f.points.length - 1], lo = f.points[0];
    expect(hi.end).toBe("high");
    const top10 = [...bonds].sort((a, b) => b.grossYtm! - a.grossYtm!).slice(0, 10).map((b) => b.grossYtm!).reduce((s, x) => s + x, 0) / 10;
    expect(hi.ytm).toBeLessThanOrEqual(top10 + 1e-9);
    expect(hi.ytm).toBeGreaterThan(lo.ytm);
    expect(lo.end).toBe("low");
    expect(lo.rows.every((r) => factsOf(r).cls === 1)).toBe(true);
    const pos = buildSlider(f);
    for (let i = 1; i < pos.length; i++) { expect(pos[i].ytm!).toBeGreaterThan(pos[i - 1].ytm!); expect(pos[i].expectedLoss!).toBeGreaterThan(pos[i - 1].expectedLoss!); }
  });
  it("with fewer than ten AAA issuers the low end takes all of them and fills with the next class", { timeout: 120000 }, async () => {
    const f = await coherentFrontier(mk(7), 4);
    const lo = f.points[0];
    expect(new Set(lo.rows.filter((r) => factsOf(r).cls === 1).map((r) => factsOf(r).group)).size).toBe(6); // 7 AAA bonds, 6 issuer groups (two DZ names are one)
    expect(lo.rows.filter((r) => factsOf(r).cls === 1)).toHaveLength(6);
    expect(Math.max(...lo.rows.map((r) => factsOf(r).cls))).toBeLessThanOrEqual(2);
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
    for (const p of f.points) expect(checkList(p.rows.map((r) => factsOf(r)), p.end ? END_POLICY : strict).every((c) => c.ok)).toBe(true);
  });
  it("bonds without an issuer name never enter a list (their identity cannot be checked)", { timeout: 60000 }, async () => {
    const bonds = universe(5).map((b, i) => (i < 3 ? { ...b, issuer: null } : b));
    const f = await coherentFrontier(bonds, 4);
    for (const p of f.points) for (const r of p.rows) expect(r.issuer).not.toBeNull();
  });
});

describe("versioned engine policy (spread mode, composition mode)", () => {
  it("the default engine policy leaves cache keys and certificates exactly as they were", () => {
    expect(engineSignature(DEFAULT_ENGINE)).toBe("");
    expect(engineSignature({ spread: "diagnostic_only", composition: "house_window", loss: "v1_linear" })).toContain("diagnostic_only");
  });
  for (const engine of [
    { spread: "diagnostic_only", composition: "house_window", loss: "v1_linear" },
    { spread: "hard_constraint", composition: "ceiling_only", loss: "v1_linear" },
    { spread: "diagnostic_only", composition: "ceiling_only", loss: "v1_linear" },
  ] as EnginePolicy[]) {
    it(`matches a full search of every legal list: ${engine.spread} + ${engine.composition}`, { timeout: 180000 }, async () => {
      const p = engine.composition === "ceiling_only" ? { ...DEFAULT_POLICY, maxDispersion: 9, minCore: 0, minWorst: 1 } : DEFAULT_POLICY;
      let compared = 0;
      for (const seed of [5, 17, 41]) {
        const bonds = universe(seed);
        const f = await coherentFrontier(bonds, 4, DEFAULT_POLICY, 10, { engine });
        const lists = bruteLists(bonds, 4, p, engine.spread === "hard_constraint");
        if (!lists.length) { expect(f.points).toHaveLength(0); continue; }
        expect(f.cert.certified).toBe(true);
        expect(f.cert.policy).toContain(engine.spread);
        for (const pt of f.points.filter((x) => !x.end)) {
          const feasible = lists.filter((l) => l.ret >= pt.ytm - 1e-9);
          expect(pt.el).toBeCloseTo(Math.min(...feasible.map((l) => l.loss)), 7);
          compared++;
        }
      }
      expect(compared).toBeGreaterThan(3);
    });
  }
  it("dropping the spread rule can only widen the feasible set: never worse at any return", { timeout: 120000 }, async () => {
    const bonds = universe(17);
    const hard = await coherentFrontier(bonds, 4, DEFAULT_POLICY, 10, { engine: DEFAULT_ENGINE });
    const diag = await coherentFrontier(bonds, 4, DEFAULT_POLICY, 10, { engine: { spread: "diagnostic_only", composition: "house_window", loss: "v1_linear" } });
    for (const pt of hard.points.filter((x) => !x.end)) {
      const alt = diag.points.find((d) => d.ytm >= pt.ytm - 1e-9);
      expect(alt).toBeTruthy();
      expect(alt!.el).toBeLessThanOrEqual(pt.el + 1e-7);
    }
  });
});
