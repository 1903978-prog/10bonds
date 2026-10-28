import { describe, expect, it } from "vitest";
import { extremeOf, solveNetSpread, solvePosition, type NsCand, type NsRules } from "./solve";
import { specRules } from "../portfolioSpec";
import { checkNsList } from "./check";
import { metricsOf } from "./metrics";
import { midRankPercentile, portfolioBes, REFERENCE_POLICY } from "./reference";
import { sampleFeasible } from "./sample";

const rules: NsRules = { ...specRules(5), lossShare: 1 };
let n = 0;
const bond = (o: Partial<NsCand> = {}): NsCand => { n++; return { isin: `X${String(n).padStart(4, "0")}`, group: `g${n}`, sector: `s${n % 6}`, cls: 4, dur: 5, ns: 100, grossBp: 120, lossBp: 20, ytm: 4, bes: 50, ...o }; };
const pool = (k: number, f: (i: number) => Partial<NsCand>) => Array.from({ length: k }, (_, i) => bond(f(i)));

describe("net-spread optimiser", () => {
  it("picks the ten highest net spreads, not the highest BES", async () => {
    n = 0;
    const c = pool(14, (i) => ({ ns: 100 + i * 10, bes: 100 - i * 5 }));
    const r = await solveNetSpread(c, 3, 5, { ...rules, perSector: 10 });
    expect(r.status).toBe("optimal");
    expect(r.sel.map((x) => x.ns).sort((a, b) => a - b)).toEqual([140, 150, 160, 170, 180, 190, 200, 210, 220, 230]);
    expect(r.objectiveBp).toBeCloseTo(185, 6);
  });
  it("respects allowed risk classes, issuer, sector and duration", async () => {
    n = 0;
    const c = [
      ...pool(12, (i) => ({ cls: 4, ns: 100 + i, sector: `s${i % 4}`, dur: 5 })),
      ...pool(3, () => ({ cls: 7, ns: 900 })),                      // outside the allowed classes
      bond({ cls: 4, ns: 800, group: "g1" }),                      // same issuer as g1: cannot be both
      bond({ cls: 4, ns: 700, dur: 12 }),                          // would break the duration window
    ];
    const r = await solveNetSpread(c, 3, 5, rules);
    expect(r.status).toBe("optimal");
    const bad = checkNsList(r.sel, [3, 4, 5], rules).filter((k) => !k.ok);
    expect(bad).toEqual([]);
    expect(r.sel.some((x) => x.cls === 7)).toBe(false);
  });
  it("matches brute force on a small random instance", async () => {
    n = 0;
    let seed = 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const c = pool(15, () => ({ ns: Math.round(rnd() * 300), dur: 3 + Math.round(rnd() * 4), group: `g${Math.floor(rnd() * 13)}`, sector: `s${Math.floor(rnd() * 3)}`, cls: 3 + Math.floor(rnd() * 3) }));
    let best = -Infinity;
    for (let m = 0; m < 1 << c.length; m++) {
      const sel = c.filter((_, i) => m >> i & 1);
      if (sel.length !== 10) continue;
      if (!checkNsList(sel, [3, 4, 5], rules).every((k) => k.ok)) continue;
      best = Math.max(best, sel.reduce((s, x) => s + x.ns, 0) / 10);
    }
    const r = await solveNetSpread(c, 3, 5, rules);
    if (best === -Infinity) expect(r.status).toBe("infeasible");
    else { expect(r.status).toBe("optimal"); expect(r.objectiveBp).toBeCloseTo(best, 4); }
  });
  it("ties go to the lowest credit loss, and the same input gives the same list", async () => {
    n = 0;
    const c = pool(12, (i) => ({ ns: 100, lossBp: 50 - i, sector: `s${i}` }));
    const a = await solveNetSpread(c, 4, 4, rules), b = await solveNetSpread([...c].reverse(), 4, 4, rules);
    expect(a.sel.map((x) => x.isin).sort()).toEqual(b.sel.map((x) => x.isin).sort());
    expect(Math.max(...a.sel.map((x) => x.lossBp))).toBe(48);
  });
  it("reports infeasible", async () => {
    n = 0;
    const r = await solveNetSpread(pool(9, () => ({})), 4, 4, rules);
    expect(r.status).toBe("infeasible");
    expect(r.sel).toEqual([]);
  });
  it("check rejects a class spread over 2 and a wrong count", () => {
    n = 0;
    const sel = [...pool(9, () => ({ cls: 4 })), bond({ cls: 7 })];
    expect(checkNsList(sel, [4, 5, 6, 7], rules).find((k) => k.rule === "spread")?.ok).toBe(false);
    expect(checkNsList(sel.slice(1), [4, 7], rules).find((k) => k.rule === "count")?.ok).toBe(false);
  });
});

describe("portfolio figures and Portfolio BES", () => {
  it("equal-weight aggregates; average bond BES only when all ten exist", () => {
    n = 0;
    const sel = pool(10, (i) => ({ ns: 100 + i, grossBp: 150 + i, lossBp: 50, ytm: 4 + i / 100, dur: 5, bes: 60 }));
    const m = metricsOf(sel);
    expect(m.netSpreadBp).toBeCloseTo(104.5, 6);
    expect(m.grossSpreadBp).toBeCloseTo(154.5, 6);
    expect(m.avgBondBes).toBe(60);
    sel[3].bes = null;
    expect(metricsOf(sel).avgBondBes).toBeNull();
  });
  it("mid-rank percentile is monotone, bounded, and handles ties", () => {
    const s = [10, 20, 30, 40];
    expect(midRankPercentile(5, s)).toBe(0);
    expect(midRankPercentile(50, s)).toBe(100);
    expect(midRankPercentile(20, s)).toBe(37.5);
    let last = -1;
    for (let v = 0; v <= 50; v += 5) { const p = midRankPercentile(v, s)!; expect(p).toBeGreaterThanOrEqual(last); last = p; }
  });
  it("is unavailable without enough independent history, never invented", () => {
    expect(portfolioBes(120, null).status).toBe("unavailable");
    expect(portfolioBes(120, null).score).toBeNull();
    expect(portfolioBes(120, { days: 3, samples: Array(5000).fill(100) }).status).toBe("unavailable");
    expect(portfolioBes(120, { days: 30, samples: Array(100).fill(100) }).status).toBe("unavailable");
  });
  it("is calibrated with enough history, within 0-100, and higher net spread never scores lower", () => {
    const samples = Array.from({ length: REFERENCE_POLICY.minSamples }, (_, i) => 50 + (i % 200));
    const ref = { days: REFERENCE_POLICY.minDays, samples };
    let last = -1;
    for (const v of [0, 60, 100, 150, 400]) { const r = portfolioBes(v, ref); expect(r.status).toBe("calibrated"); expect(r.score!).toBeGreaterThanOrEqual(last); expect(r.score!).toBeLessThanOrEqual(100); last = r.score!; }
    expect(portfolioBes(1000, ref).score).toBe(100);
  });
});

describe("reference sample", () => {
  it("draws only feasible lists, reproducibly", () => {
    n = 0;
    const c = pool(60, (i) => ({ cls: 3 + (i % 3), dur: 4 + (i % 3), ns: 50 + i, sector: `s${i % 8}` }));
    const a = sampleFeasible(c, [3, 4, 5], rules, 50, "k1"), b = sampleFeasible(c, [3, 4, 5], rules, 50, "k1");
    expect(a.length).toBeGreaterThan(10);
    expect(a).toEqual(b);
  });
});

describe("anchors: the riskiest and the safest list", () => {
  const ladder = () => { n = 0; return pool(40, (i) => ({ cls: 1 + (i % 6), ns: 100 + i * 3, lossBp: 5 + (i % 6) * 10, sector: `s${i % 14}` })); };
  it("the extreme sum is found over every 3-class window, and its list has the highest net spread among lists with that sum", async () => {
    const c = ladder();
    const hi = await extremeOf(c, "max", rules, { withList: true }), lo = await extremeOf(c, "min", rules, { withList: true });
    expect(hi.status).toBe("optimal");
    // Brute force over the cheap way: the largest sum of ten classes inside one 3-class window with at most one bond per issuer is bounded by the classes available.
    expect(hi.sum!).toBeGreaterThan(lo.sum!);
    expect(hi.sel.length).toBe(10);
    expect(hi.sel.reduce((t, x) => t + x.cls, 0)).toBe(hi.sum);
    expect(lo.sel.reduce((t, x) => t + x.cls, 0)).toBe(lo.sum);
    expect(checkNsList(hi.sel, [hi.classLo, hi.classLo + 1, hi.classHi], rules, { sum: { lo: hi.sum!, hi: hi.sum! } }).filter((k) => !k.ok)).toEqual([]);
    // The same sum without the list gives the same number (the cheap path).
    expect((await extremeOf(c, "max", rules)).sum).toBe(hi.sum);
  });
  it("no feasible list gives no extreme", async () => {
    n = 0;
    const r = await extremeOf(pool(8, () => ({})), "max", rules, { withList: true });
    expect(r.sum).toBeNull();
    expect(r.status).toBe("infeasible");
  });
  it("a position keeps the sum of its ten classes inside its band", async () => {
    const c = ladder();
    const r = await solvePosition(c, 2, 4, { lo: 28, hi: 31 }, rules);
    expect(r.status).toBe("optimal");
    const sum = r.sel.reduce((t, x) => t + x.cls, 0);
    expect(sum).toBeGreaterThanOrEqual(28);
    expect(sum).toBeLessThanOrEqual(31);
    expect(checkNsList(r.sel, [2, 3, 4], rules, { sum: { lo: 28, hi: 31 } }).filter((k) => !k.ok)).toEqual([]);
    expect((await solvePosition(c, 2, 4, { lo: 90, hi: 91 }, rules)).status).toBe("infeasible");
  });
  it("no bond carries more than the loss share of the list's expected loss", async () => {
    n = 0;
    const c = pool(24, (i) => ({ cls: 4, ns: i === 0 ? 900 : 100 + i, lossBp: i === 0 ? 400 : 10, sector: `s${i}` }));
    const free = await solveNetSpread(c, 3, 5, { ...rules, lossShare: 1 });
    expect(free.sel.some((x) => x.lossBp === 400)).toBe(true); // the high-spread, high-loss bond is wanted
    const capped = await solveNetSpread(c, 3, 5, { ...rules, lossShare: 0.25 });
    const total = capped.sel.reduce((t, x) => t + x.lossBp, 0);
    expect(Math.max(...capped.sel.map((x) => x.lossBp))).toBeLessThanOrEqual(0.25 * total + 1e-6);
    expect(checkNsList(capped.sel, [4], { ...rules, lossShare: 0.25 }).find((k) => k.rule === "share")?.ok).toBe(true);
  });
  it("ladder step 1: sovereigns and agencies are not counted in the sector cap, other sectors may hold 4", async () => {
    n = 0;
    const c = pool(14, (i) => ({ cls: 4, ns: 200 - i, sector: "Government", exempt: i < 6 }));
    expect((await solveNetSpread(c, 3, 5, specRules(5, 0))).status).toBe("infeasible");
    const r = await solveNetSpread(c, 3, 5, specRules(5, 1));
    expect(r.status).toBe("optimal");
    expect(r.sel.filter((x) => !x.exempt).length).toBeLessThanOrEqual(4);
  });
  it("ladder step 2 widens the average duration window to 10%", async () => {
    n = 0;
    const c = pool(14, (i) => ({ cls: 4, ns: 100 + i, dur: 5.4, sector: `s${i}` })); // 8% above the horizon
    expect((await solveNetSpread(c, 3, 5, specRules(5, 1))).status).toBe("infeasible");
    expect((await solveNetSpread(c, 3, 5, specRules(5, 2))).status).toBe("optimal");
  });
});

describe("the unified engine's wiring", async () => {
  const { specConfig } = await import("./config");
  const { configSignature } = await import("../riskBands");
  const { parseMethodology } = await import("../methodologyChoice");
  it("keeps its stored lists apart from every other band table, carries the spec version, and Methodology 5 is now 4", () => {
    expect(configSignature(specConfig())).toContain("ps3-");
    expect(specConfig().bands).toHaveLength(30);
    expect(parseMethodology("5")).toBe(4);
    expect(parseMethodology("6")).toBeNull();
  });
});
