import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { exactFrontier, targetOf } from "./exactFrontier";
import { isWeak, MAX_WEAK } from "./frontierGuard";
import { issuerKey, rankBonds } from "./ranking";
import { pdOf } from "./tiers";
import { bondNotch } from "./ratings";
import { stepGap } from "./stepGap";
import { lifeYears } from "./lifeYears";

const bond = (isin: string, issuer: string, ytm: number, dur: number, rating: string): PublicBond => ({
  isin, name: isin, issuer, country: null, currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});
const GRADES = ["AAA", "AA", "A", "BBB+", "BBB", "BBB-", "BB", "B+", "B", "CCC"];
function universe(seed: number, issuers: number, perIssuer: number, duration = 4): PublicBond[] {
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: issuers }, (_, i) => Array.from({ length: perIssuer }, (_, j) => {
    const r = Math.floor(rnd() * GRADES.length);
    return bond(`X${i}-${j}`, `Issuer ${i}`, Math.round((1.5 + r * 0.55 + rnd() * 1.5) * 100) / 100, duration * (0.85 + rnd() * 0.3), GRADES[r]);
  })).flat();
}

// Every list of 10 bonds from 10 different issuers (small universes only).
function bruteLists(bonds: PublicBond[]): [number, number][] {
  const by = new Map<string, PublicBond[]>();
  for (const b of bonds) by.set(issuerKey(b), [...(by.get(issuerKey(b)) ?? []), b]);
  const groups = [...by.values()];
  const out: [number, number][] = [];
  const go = (gi: number, n: number, ret: number, pd: number, weak: number) => {
    if (weak > MAX_WEAK) return;
    if (n === 10) { out.push([ret, pd]); return; }
    if (groups.length - gi < 10 - n) return;
    go(gi + 1, n, ret, pd, weak);
    for (const b of groups[gi]) go(gi + 1, n + 1, ret + b.grossYtm!, pd + pdOf(b), weak + (isWeak(b) ? 1 : 0));
  };
  go(0, 0, 0, 0, 0);
  return out;
}
function bruteLoss(lists: [number, number][], target: number): number | null {
  let best: number | null = null;
  for (const [ret, pd] of lists) if (ret >= target * 10 - 1e-9 && (best === null || pd < best)) best = pd;
  return best === null ? null : (best / 10) * 0.6;
}

describe("exact frontier", () => {
  it("matches a full search of every possible list", { timeout: 30000 }, () => {
    for (const seed of [3, 11, 29]) {
      const bonds = universe(seed, 13, 2);
      const f = exactFrontier(bonds, 4);
      const lists = bruteLists(bonds);
      expect(f.points.length).toBeGreaterThan(2);
      const lo = f.points[0].ytm, hi = f.points[f.points.length - 1].ytm;
      for (let k = 0; k <= 12; k++) {
        const t = Math.round((lo + ((hi - lo) * k) / 12) * 100) / 100;
        const got = f.at(t);
        const want = bruteLoss(lists, t);
        if (want === null) expect(got).toBeNull();
        else expect(got!.el).toBeCloseTo(want, 9);
      }
      expect(f.at(hi + 0.01)).toBeNull();
    }
  });

  it("every list: 10 bonds, 10 issuers, at most 2 at B+ or below, strictly up in return and loss", () => {
    const f = exactFrontier(universe(7, 60, 3), 4);
    const all = new Map(universe(7, 60, 3).map((b) => [b.isin, b]));
    expect(f.points.length).toBeGreaterThan(20);
    f.points.forEach((p, i) => {
      const rows = p.isins.map((x) => all.get(x)!);
      expect(rows).toHaveLength(10);
      expect(new Set(rows.map(issuerKey)).size).toBe(10);
      expect(rows.filter(isWeak).length).toBeLessThanOrEqual(MAX_WEAK);
      expect(p.ytm).toBeGreaterThanOrEqual(targetOf(p) - 1e-9);
      if (i) expect(p.el).toBeGreaterThan(f.points[i - 1].el);
      expect(f.at(targetOf(p))!.isins).toEqual(p.isins);
    });
  });

  it("is never worse than the old swap search for the same target", () => {
    const bonds = universe(5, 80, 3);
    const f = exactFrontier(bonds, 4);
    let compared = 0;
    for (let t = 2.5; t <= 5.5; t += 0.1) {
      const old = rankBonds(bonds, 4, t, 10, 10).results;
      const avg = old.reduce((s, b) => s + b.grossYtm!, 0) / old.length;
      if (old.length < 10 || avg < t - 1e-9 || old.filter(isWeak).length > MAX_WEAK) continue;
      const oldLoss = (old.reduce((s, b) => s + pdOf(b), 0) / 10) * 0.6;
      expect(f.at(t)!.el).toBeLessThanOrEqual(oldLoss + 1e-9);
      compared++;
    }
    expect(compared).toBeGreaterThan(10);
  });

  it("keeps the duration window and needs 10 issuers", () => {
    expect(exactFrontier(universe(1, 8, 3), 4).points).toEqual([]);
    const far = universe(2, 30, 2, 9);
    expect(exactFrontier(far, 4).points).toEqual([]);
  });

  it("is fast on a big universe", () => {
    const t0 = Date.now();
    const f = exactFrontier(universe(9, 600, 4), 4);
    expect(f.points.length).toBeGreaterThan(30);
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  it("never keeps a riskier bond when a safer one not in the list pays almost as much (minimum extra return per step)", () => {
    const bonds = universe(7, 60, 3);
    const f = exactFrontier(bonds, 4, stepGap);
    expect(f.points.length).toBeGreaterThan(10);
    const info = new Map(bonds.map((b) => [b.isin, { notch: bondNotch(b)!, pd: pdOf(b), issuer: issuerKey(b), years: lifeYears(b) }]));
    const pool = bonds.filter((d) => Math.abs(d.modifiedDuration! - 4) <= 0.8);
    let bad = 0;
    for (const p of f.points) {
      const used = new Set(p.rows.map(issuerKey));
      for (const b of p.rows) {
        const x = info.get(b.isin)!;
        for (const d of pool) {
          const y = info.get(d.isin)!;
          if (!used.has(y.issuer) && y.notch < x.notch && y.pd < x.pd && d.grossYtm! >= b.grossYtm! - stepGap(y.notch, x.notch, x.years) + 1e-9) bad++;
        }
      }
    }
    expect(bad).toBe(0);
  }, 30000);

  it("AA at 4.00% beats A at 4.05% (A needs 15 bp more), but not A at 4.20%", () => {
    const filler = Array.from({ length: 9 }, (_, i) => bond(`F${i}`, `Filler ${i}`, 5, 4, "AAA"));
    const pick = (aYtm: number) => exactFrontier([...filler, bond("AA1", "Safer", 4, 4, "AA"), bond("A1", "Riskier", aYtm, 4, "A")], 4, stepGap);
    expect(pick(4.05).points.map((p) => p.isins.includes("A1"))).not.toContain(true);
    expect(pick(4.2).points.at(-1)!.isins).toContain("A1");
    expect(stepGap(2, 5, 5)).toBeCloseTo(0.15, 9); // AA -> A at 5 years
    // Methodology 1 (no spread rules) does take the A bond at 4.05%.
    expect(exactFrontier([...filler, bond("AA1", "Safer", 4, 4, "AA"), bond("A1", "Riskier", 4.05, 4, "A")], 4).points.at(-1)!.isins).toContain("A1");
  });
});
