import { describe, expect, it, vi } from "vitest";
import type { PublicBond } from "../types";
import { allowedClasses, matrixOk } from "../riskMatrix";

// Synthetic universe: 25 issuers per risk class 1..10, durations spread around every horizon.
vi.mock("../coherentFrontier", () => ({
  candidatesOf: (_bonds: unknown, duration: number) => {
    const out: unknown[] = [];
    for (let cls = 1; cls <= 10; cls++) for (let k = 0; k < 25; k++) {
      const n = cls * 100 + k;
      out.push({ b: { isin: `T${n}-${duration}` }, group: `grp${n}`, sector: `sec${(n * 7) % 9}`, cls, dur: duration * (0.85 + (k % 7) * 0.05), ret: 2 + cls * 0.5 + k * 0.01, pd: cls });
    }
    return out;
  },
}));
const { buildAll, nsCandidates } = await import("./build");

const bes = (duration: number) => {
  const m = new Map<string, import("./build").BesBond>();
  for (let cls = 1; cls <= 10; cls++) for (let k = 0; k < 25; k++) { const n = cls * 100 + k; const net = ((n * 37) % 211) + cls * 5; m.set(`T${n}-${duration}`, { isin: `T${n}-${duration}`, netSpreadBp: net, grossSpreadBp: net + 20, annualLossBp: 20, bes: (n * 13) % 100, status: "valid" }); }
  return m;
};
const allBes = () => { const m = new Map<string, import("./build").BesBond>(); for (const d of [2, 4, 10]) for (const [k, v] of bes(d)) m.set(k, v); return m; };

describe("buildAll", () => {
  it("covers all 90 configurations, each list obeys the matrix and every rule, and a rerun gives the same result", { timeout: 120000 }, async () => {
    const run = () => buildAll({ bonds: [] as PublicBond[], bes: allBes(), seedKey: "t1" });
    const a = await run();
    expect(a).toHaveLength(90);
    expect(new Set(a.map((r) => `${r.horizon}:${r.position}`)).size).toBe(90);
    for (const r of a) {
      expect(["optimal", "infeasible"]).toContain(r.status);
      if (r.status !== "optimal") continue;
      expect(r.isins).toHaveLength(10);
      expect(new Set(r.isins).size).toBe(10);
      expect(r.checks.every((c) => c.ok)).toBe(true);
      expect(matrixOk(r.position, r.bonds.map((b) => b.cls))).toBe(true);
      expect(r.bonds.every((b) => allowedClasses(r.position).includes(b.cls))).toBe(true);
      expect(r.portfolioBes.status).toBe("unavailable"); // no earlier price batches: never a made-up score
      expect(r.portfolioBes.score).toBeNull();
    }
    expect(a.filter((r) => r.status === "optimal").length).toBeGreaterThan(60);
    const b = await run();
    expect(b.map((r) => r.isins.join())).toEqual(a.map((r) => r.isins.join()));
  });
  it("positions with the same allowed classes repeat one exact answer; the previous list is compared on one basis, never silently accepted when worse", { timeout: 120000 }, async () => {
    const a = await buildAll({ bonds: [] as PublicBond[], bes: allBes(), seedKey: "t2" });
    const p7 = a.find((r) => r.horizon === "SHORT" && r.position === 7)!, p8 = a.find((r) => r.horizon === "SHORT" && r.position === 8)!;
    expect(p8.repeatOf).toBe(7);
    expect(p8.isins).toEqual(p7.isins);
    // A deliberately poor but feasible earlier list: the new one must be at least as good.
    const poor = nsCandidates([] as PublicBond[], 2, allBes()).filter((c) => [3, 4, 5].includes(c.cls)).sort((x, y) => x.ns - y.ns).slice(0, 40);
    const picked: string[] = [], seen = new Set<string>(), sec = new Map<string, number>();
    for (const c of poor) { if (seen.has(c.group) || (sec.get(c.sector) ?? 0) >= 3) continue; seen.add(c.group); sec.set(c.sector, (sec.get(c.sector) ?? 0) + 1); picked.push(c.isin); if (picked.length === 10) break; }
    const b = await buildAll({ bonds: [] as PublicBond[], bes: allBes(), seedKey: "t2", previous: new Map([["SHORT:7", { isins: picked, source: "test" }]]) });
    const q = b.find((r) => r.horizon === "SHORT" && r.position === 7)!;
    expect(q.previous?.reproducible).toBe(true);
    expect(q.previous?.regression).toBe(false);
    if (q.previous?.feasibleUnderSameRules) expect(q.previous.improvementBp!).toBeGreaterThanOrEqual(0);
  });
  it("uses the reference only from earlier batches and then gives a calibrated, bounded score", { timeout: 120000 }, async () => {
    const ref = { days: 25, samples: Array.from({ length: 3000 }, (_, i) => i % 300) };
    const a = await buildAll({ bonds: [] as PublicBond[], bes: allBes(), seedKey: "t3", reference: () => ref });
    const ok = a.filter((r) => r.status === "optimal");
    expect(ok.every((r) => r.portfolioBes.status === "calibrated" && r.portfolioBes.score! >= 0 && r.portfolioBes.score! <= 100)).toBe(true);
  });
});
