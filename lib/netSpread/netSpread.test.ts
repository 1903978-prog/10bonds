import { describe, expect, it } from "vitest";
import { solveNetSpread, solveWindow, type NsCand, type NsRules } from "./solve";
import { checkNsList } from "./check";
import { metricsOf } from "./metrics";
import { midRankPercentile, portfolioBes, REFERENCE_POLICY } from "./reference";
import { sampleFeasible } from "./sample";

const rules: NsRules = { perIssuer: 1, perSector: 3, duration: 5 };
let n = 0;
const bond = (o: Partial<NsCand> = {}): NsCand => { n++; return { isin: `X${String(n).padStart(4, "0")}`, group: `g${n}`, sector: `s${n % 6}`, cls: 4, dur: 5, ns: 100, grossBp: 120, lossBp: 20, ytm: 4, bes: 50, ...o }; };
const pool = (k: number, f: (i: number) => Partial<NsCand>) => Array.from({ length: k }, (_, i) => bond(f(i)));

describe("net-spread optimiser", () => {
  it("picks the ten highest net spreads, not the highest BES", async () => {
    n = 0;
    const c = pool(14, (i) => ({ ns: 100 + i * 10, bes: 100 - i * 5 }));
    const r = await solveNetSpread(c, [3, 4, 5], { ...rules, perSector: 10 });
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
    const r = await solveNetSpread(c, [3, 4, 5], rules);
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
    const r = await solveNetSpread(c, [3, 4, 5], rules);
    if (best === -Infinity) expect(r.status).toBe("infeasible");
    else { expect(r.status).toBe("optimal"); expect(r.objectiveBp).toBeCloseTo(best, 4); }
  });
  it("ties go to the lowest credit loss, and the same input gives the same list", async () => {
    n = 0;
    const c = pool(12, (i) => ({ ns: 100, lossBp: 50 - i, sector: `s${i}` }));
    const a = await solveNetSpread(c, [4], rules), b = await solveNetSpread([...c].reverse(), [4], rules);
    expect(a.sel.map((x) => x.isin).sort()).toEqual(b.sel.map((x) => x.isin).sort());
    expect(Math.max(...a.sel.map((x) => x.lossBp))).toBe(48);
  });
  it("reports infeasible", async () => {
    n = 0;
    const r = await solveNetSpread(pool(9, () => ({})), [4], rules);
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

describe("expected-loss terciles for positions that share their classes", () => {
  // Bonds trade return for loss: more net spread always comes with more annual expected loss, so the window has a real range.
  const ladder = () => { n = 0; return pool(40, (i) => ({ cls: 5, ns: 100 + i * 10, lossBp: 10 + i * 5, sector: `s${i % 14}` })); };
  it("each place maximises net spread under its own ceiling; net spread and loss rise from place to place; the top place is the unconstrained optimum", async () => {
    const c = ladder();
    const w = await solveWindow(c, [4, 5, 6], rules, 3);
    expect(w.results.map((r) => r.status)).toEqual(["optimal", "optimal", "optimal"]);
    const net = w.results.map((r) => r.objectiveBp!), loss = w.results.map((r) => r.sel.reduce((a, x) => a + x.lossBp, 0) / 10);
    expect(net[0]).toBeLessThan(net[1]);
    expect(net[1]).toBeLessThan(net[2]);
    expect(loss[0]).toBeLessThan(loss[1]);
    expect(loss[1]).toBeLessThan(loss[2]);
    const top = await solveNetSpread(c, [4, 5, 6], rules);
    expect(w.results[2].sel.map((x) => x.isin).sort()).toEqual(top.sel.map((x) => x.isin).sort());
    // Ceilings sit at 1/3 and 2/3 of [lowest loss, top-list loss].
    const { lowBp, highBp } = w.range!;
    expect(w.results[0].ceilingBp).toBeCloseTo(lowBp + (highBp - lowBp) / 3, 6);
    expect(w.results[1].ceilingBp).toBeCloseTo(lowBp + (2 * (highBp - lowBp)) / 3, 6);
    for (const r of w.results.slice(0, 2)) expect(loss[w.results.indexOf(r)]).toBeLessThanOrEqual(r.ceilingBp! + 1e-6);
    // Every list passes the independent check, ceiling included.
    for (const r of w.results) expect(checkNsList(r.sel, [4, 5, 6], rules, { ceilingBp: r.ceilingBp, lossBp: r.sel.map((x) => x.lossBp) }).filter((k) => !k.ok)).toEqual([]);
  });
  it("a window with no spread between loss and return gives the same list at every place (the caller flags the repeat)", async () => {
    n = 0;
    const c = pool(30, (i) => ({ cls: 5, ns: 100 + i, lossBp: 20, sector: `s${i % 10}` }));
    const w = await solveWindow(c, [4, 5, 6], rules, 3);
    const keys = w.results.map((r) => r.sel.map((x) => x.isin).sort().join());
    expect(new Set(keys).size).toBe(1);
  });
  it("an infeasible window is infeasible at every place, and a single place is the plain optimum", async () => {
    n = 0;
    const few = pool(8, () => ({ cls: 5 }));
    expect((await solveWindow(few, [5], rules, 3)).results.map((r) => r.status)).toEqual(["infeasible", "infeasible", "infeasible"]);
    const c = ladder();
    const one = await solveWindow(c, [5], rules, 1), plain = await solveNetSpread(c, [5], rules);
    expect(one.results[0].sel.map((x) => x.isin).sort()).toEqual(plain.sel.map((x) => x.isin).sort());
  });
  it("a live request can ask for one place only", async () => {
    const c = ladder();
    const all = await solveWindow(c, [4, 5, 6], rules, 3);
    const mid = await solveWindow(c, [4, 5, 6], rules, 3, { only: 1 });
    expect(mid.results[1].sel.map((x) => x.isin).sort()).toEqual(all.results[1].sel.map((x) => x.isin).sort());
    expect(mid.results[0].sel).toEqual([]);
  });
});

describe("the unified engine's wiring", async () => {
  const { specConfig } = await import("./config");
  const { riskClassConfig } = await import("../riskClassBands");
  const { configSignature } = await import("../riskBands");
  const { parseMethodology } = await import("../methodologyChoice");
  it("keeps its stored lists apart from every other band table, carries the spec version, and Methodology 5 is now 4", () => {
    expect(configSignature(specConfig())).not.toBe(configSignature(riskClassConfig()));
    expect(configSignature(specConfig())).toContain("ps1-");
    expect(specConfig().bands.map((b) => b.allowed)).toEqual(riskClassConfig().bands.map((b) => b.allowed));
    expect(parseMethodology("5")).toBe(4);
    expect(parseMethodology("6")).toBeNull();
  });
});
