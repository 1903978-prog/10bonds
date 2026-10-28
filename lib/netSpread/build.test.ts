import { describe, expect, it, vi } from "vitest";
import type { PublicBond } from "../types";

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

describe("buildAll (anchored bands)", () => {
  it("covers all 90 configurations; every list obeys every rule and its own band; position 1 is the safest, 30 the riskiest; a rerun gives the same result", { timeout: 300000 }, async () => {
    const run = () => buildAll({ bonds: [] as PublicBond[], bes: allBes(), seedKey: "t1" });
    const a = await run();
    expect(a).toHaveLength(90);
    expect(new Set(a.map((r) => `${r.horizon}:${r.position}`)).size).toBe(90);
    for (const h of ["SHORT", "MEDIUM", "LONG"]) {
      const rows = a.filter((r) => r.horizon === h);
      const ok = rows.filter((r) => r.metrics);
      expect(ok.length).toBeGreaterThan(20);
      for (const r of ok) {
        expect(r.isins).toHaveLength(10);
        expect(new Set(r.isins).size).toBe(10);
        expect(r.checks.every((c) => c.ok)).toBe(true);
        const sum = r.bonds.reduce((t, b) => t + b.cls, 0);
        expect(sum).toBeGreaterThanOrEqual(r.band.sumLo);
        expect(sum).toBeLessThanOrEqual(r.band.sumHi);
        expect(r.bonds.every((b) => b.cls >= r.band.classLo && b.cls <= r.band.classHi)).toBe(true);
        expect(r.portfolioBes.status).toBe("unavailable"); // no earlier price batches: never a made-up score
      }
      // The anchors: no list has a lower average risk than position 1 or a higher one than position 30, and every key stores R1 and R30.
      const p1 = rows[0], p30 = rows[29];
      expect(p1.r1).not.toBeNull();
      expect(p1.metrics!.avgRisk).toBeCloseTo(p1.r1! / 10, 5);
      expect(p30.metrics!.avgRisk).toBeCloseTo(p30.r30! / 10, 5);
      for (const r of ok) { expect(r.metrics!.avgRisk).toBeGreaterThanOrEqual(p1.r1! / 10 - 1e-9); expect(r.metrics!.avgRisk).toBeLessThanOrEqual(p30.r30! / 10 + 1e-9); }
      // Average risk never falls from position to position.
      for (let i = 1; i < ok.length; i++) expect(ok[i].metrics!.avgRisk).toBeGreaterThanOrEqual(ok[i - 1].metrics!.avgRisk - 1e-9);
    }
    const b = await run();
    expect(b.map((r) => r.isins.join())).toEqual(a.map((r) => r.isins.join()));
  });
  it("the previous list is compared on one basis, never silently accepted when worse", { timeout: 300000 }, async () => {
    const poor = nsCandidates([] as PublicBond[], 2, allBes()).filter((c) => [3, 4, 5].includes(c.cls)).sort((x, y) => x.ns - y.ns).slice(0, 40);
    const picked: string[] = [], seen = new Set<string>(), sec = new Map<string, number>();
    for (const c of poor) { if (seen.has(c.group) || (sec.get(c.sector) ?? 0) >= 3) continue; seen.add(c.group); sec.set(c.sector, (sec.get(c.sector) ?? 0) + 1); picked.push(c.isin); if (picked.length === 10) break; }
    const b = await buildAll({ bonds: [] as PublicBond[], bes: allBes(), seedKey: "t2", previous: new Map([["SHORT:12", { isins: picked, source: "test" }]]) });
    const q = b.find((r) => r.horizon === "SHORT" && r.position === 12)!;
    expect(q.previous?.reproducible).toBe(true);
    expect(q.previous?.regression).toBe(false);
  });
  it("uses the reference only from earlier batches and then gives a calibrated, bounded score", { timeout: 300000 }, async () => {
    const ref = { days: 25, samples: Array.from({ length: 3000 }, (_, i) => i % 300) };
    const a = await buildAll({ bonds: [] as PublicBond[], bes: allBes(), seedKey: "t3", reference: () => ref });
    const ok = a.filter((r) => r.metrics);
    expect(ok.every((r) => r.portfolioBes.status === "calibrated" && r.portfolioBes.score! >= 0 && r.portfolioBes.score! <= 100)).toBe(true);
  });
});
