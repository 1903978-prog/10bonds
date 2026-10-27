import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { exactFrontier } from "./exactFrontier";
import { efficientPoints, gapsOf, pickEven, FRONTIER_POINTS } from "./frontierPoints";
import { dropOutliers, findOutliers, OUTLIER_SD } from "./outliers";
import { bondRisk, hasRealRating } from "./ratings";
import { isExcludedRank } from "./seniority";
import { isWeak, MAX_WEAK } from "./frontierGuard";
import { issuerKey, portfolioPool, DURATION_WINDOW } from "./ranking";

// Formula audit 27/10/2026, checks 5 and 7: the production path from a raw feed (with junk in it) to the frontier, and the outlier rule.
const GRADES = ["AAA", "AA", "A", "BBB+", "BBB", "BBB-", "BB", "B+", "B", "CCC"];
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
const mk = (isin: string, issuer: string, ytm: number, dur: number, rating: string | null, extra: Partial<PublicBond> = {}): PublicBond => ({
  isin, name: `${issuer} 3% 2031`, issuer, country: "DE", currency: "EUR", coupon: 3, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null, ...extra,
});

function feed(): PublicBond[] {
  const r = rng(77);
  const out: PublicBond[] = [];
  for (let i = 0; i < 160; i++) for (let j = 0; j < 2; j++) {
    const g = Math.floor(r() * GRADES.length);
    out.push(mk(`B${i}-${j}`, `Issuer ${i}`, Math.round((1.5 + g * 0.5 + r() * 1.2) * 100) / 100, 4 * (0.85 + r() * 0.3), GRADES[g]));
  }
  // junk the site must never show: subordinated by field, hybrid by name, unrated, defaulted, price outlier
  out.push(mk("J1", "Junk Bank 1", 14, 4, "A", { seniority: "Subordinated" }));
  out.push(mk("J2", "Junk Bank 2", 13, 4, "A", { seniority: "Additional Tier 1" }));
  out.push(mk("J3", "Junk Corp 3", 12, 4, "BBB", { name: "Junk Corp 3 Perpetual Hybrid" }));
  out.push(mk("J4", "Junk Corp 4", 11, 4, null));
  out.push(mk("J5", "Junk Corp 5", 15, 4, "D"));
  out.push(mk("J6", "Junk Corp 6", 16, 4, "NR"));
  return out;
}

describe("frontier built from a raw feed", () => {
  const bonds = dropOutliers(feed().filter(hasRealRating));
  const f = exactFrontier(bonds, 4);
  it("has points, and none of the junk is in the universe", () => {
    expect(f.points.length).toBeGreaterThan(10);
    const used = new Set(f.points.flatMap((p) => p.isins));
    for (const isin of ["J1", "J2", "J3", "J4", "J5", "J6"]) expect(used.has(isin), isin).toBe(false);
  });
  it("every list: 10 bonds, 10 issuers, at most 2 at risk 8 or more, all rated, none subordinated, inside the duration window", () => {
    const { band } = portfolioPool(bonds, 4);
    for (const p of f.points) {
      expect(p.rows).toHaveLength(10);
      expect(new Set(p.rows.map(issuerKey)).size).toBe(10);
      expect(p.rows.filter(isWeak).length).toBeLessThanOrEqual(MAX_WEAK);
      for (const b of p.rows) {
        expect(bondRisk(b)).not.toBeNull();
        expect(isExcludedRank(b)).toBe(false);
        expect(Math.abs(b.modifiedDuration! - 4)).toBeLessThanOrEqual(band + 1e-9);
      }
      expect(p.ytm).toBeCloseTo(p.rows.reduce((s, b) => s + b.grossYtm!, 0) / 10, 9);
    }
    expect(DURATION_WINDOW).toBe(0.2);
  });
  it("strictly rising in return and in expected loss, no duplicate list, no dominated point", () => {
    f.points.forEach((p, i) => {
      if (!i) return;
      expect(p.ytm, `point ${i}`).toBeGreaterThan(f.points[i - 1].ytm);
      expect(p.el, `point ${i}`).toBeGreaterThan(f.points[i - 1].el);
    });
    expect(new Set(f.points.map((p) => p.isins.join())).size).toBe(f.points.length);
    for (const a of f.points) for (const b of f.points) if (a !== b) expect(a.ytm >= b.ytm && a.el <= b.el, "dominated").toBe(false);
  });
  it("the 30 shown positions are evenly spread along the curve (no gap beyond twice the median except where the curve itself jumps) and keep both ends", () => {
    const pts = pickEven(efficientPoints(f.points), FRONTIER_POINTS);
    expect(pts[0]).toBe(f.points[0]);
    expect(pts[pts.length - 1]).toBe(f.points[f.points.length - 1]);
    expect(pts.length).toBeLessThanOrEqual(FRONTIER_POINTS);
    // Where the efficient curve itself jumps (a tiny extra return that costs a very different list) no point can lie inside the jump.
    const rawMax = Math.max(...gapsOf(efficientPoints(f.points)));
    const g = gapsOf(pts).sort((a, b) => a - b);
    expect(g[g.length - 1]).toBeLessThanOrEqual(Math.max(2 * g[Math.floor(g.length / 2)], rawMax) + 1e-9);
    expect(g.filter((x) => x > 2 * g[Math.floor(g.length / 2)]).length).toBeLessThanOrEqual(3);
  });
  it("at(target) is the lowest-loss list that reaches the target", () => {
    for (const t of [3, 4, 5]) {
      const hit = f.at(t);
      if (hit) { expect(hit.ytm).toBeGreaterThanOrEqual(t - 1e-9); for (const p of f.points) if (p.ytm >= t - 1e-9) expect(p.el).toBeGreaterThanOrEqual(hit.el - 1e-12); }
    }
  });
});

describe("outlier rule (methodology: return > mean + k sd of comparable bonds)", () => {
  const peers = (n: number, dur = 4) => Array.from({ length: n }, (_, i) => mk(`P${i}`, `Peer ${i}`, 3 + (i % 5) * 0.1, dur, "A"));
  const sd = (xs: number[]) => { const m = xs.reduce((s, x) => s + x, 0) / xs.length; return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length); };
  it("default k is 2 and the cut is mean + k x population standard deviation of the peers, the bond itself excluded", () => {
    expect(OUTLIER_SD.default).toBe(2);
    const p = peers(10);
    const ys = p.map((b) => b.grossYtm!);
    const cut = ys.reduce((s, x) => s + x, 0) / 10 + 2 * sd(ys);
    expect(findOutliers([...p, mk("HI", "Hi", cut + 0.01, 4, "A")]).map((o) => o.bond.isin)).toEqual(["HI"]);
    expect(findOutliers([...p, mk("OK", "Ok", cut - 0.01, 4, "A")])).toHaveLength(0);
  });
  it("needs 8 comparable bonds, same currency and risk score, duration within +-20% (at least +-1 year)", () => {
    expect(findOutliers([...peers(7), mk("HI", "Hi", 9, 4, "A")])).toHaveLength(0);
    expect(findOutliers([...peers(8), mk("HI", "Hi", 9, 4, "A")]).map((o) => o.bond.isin)).toEqual(["HI"]);
    expect(findOutliers([...peers(12), mk("HI", "Hi", 9, 4, "A", { currency: "USD" })])).toHaveLength(0); // other currency: no peers
    expect(findOutliers([...peers(12), mk("HI", "Hi", 9, 4, "BBB")])).toHaveLength(0); // other risk score: no peers
    expect(findOutliers([...peers(12, 4), mk("HI", "Hi", 9, 4.9, "A")]).map((o) => o.bond.isin)).toEqual(["HI"]); // 1 year apart: still peers (max(1, 20% of 4.9) = 1)
    expect(findOutliers([...peers(12, 4), mk("HI", "Hi", 9, 5.2, "A")])).toHaveLength(0); // 1.2 years apart: not peers
    expect(findOutliers([...peers(12, 20), mk("HI", "Hi", 9, 23.9, "A")]).map((o) => o.bond.isin)).toEqual(["HI"]); // 20% of 23.9 = 4.78 > 3.9
  });
  it("seniority field and name both leave a bond out before any statistics", () => {
    const o = findOutliers([mk("S", "S", 3, 4, "A", { seniority: "Tier 2" }), mk("N", "N Perpetual", 3, 4, "A"), mk("U", "U", 3, 4, "A", { seniority: "Senior Unsubordinated" })]);
    expect(o.map((x) => [x.bond.isin, x.reason]).sort()).toEqual([["N", "name"], ["S", "rank"]]);
  });
});
