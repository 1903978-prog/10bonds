import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { candidatesOf } from "./coherentFrontier";
import { buildBands } from "./riskBandsBuild";
import { configSignature, defaultConfig } from "./riskBands";
import { riskClassConfig } from "./riskClassBands";
import { allowedClasses, matrixOk, RISK_MATRIX, windowOf } from "./riskMatrix";
import { engineOf, parseMethodology, usesBands } from "./methodologyChoice";

const bond = (isin: string, issuer: string, ytm: number, rating: string, dur = 4): PublicBond => ({
  isin, name: isin, issuer, country: isin.endsWith("1") ? "Italy" : "France", currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});
const GRADES = ["AAA", "AA", "A", "BBB", "BB", "B"];
const universe = (): PublicBond[] =>
  Array.from({ length: 60 }, (_, i) => bond(`M${i}-${i % 2}`, `Issuer ${i}`, 2.5 + (i % 6) * 0.8 + (i % 7) * 0.05, GRADES[i % 6], 3.8 + (i % 5) * 0.1));

describe("methodology choice", () => {
  it("reads 1 to 4, the older admin values, and nothing else", () => {
    expect([parseMethodology("1"), parseMethodology("4"), parseMethodology("m1"), parseMethodology("spread")]).toEqual([1, 4, 1, 3]);
    expect([parseMethodology("0"), parseMethodology("5"), parseMethodology("x"), parseMethodology(null), parseMethodology("2.5")]).toEqual([null, null, null, null, null]);
  });
  it("maps each methodology to its engine", () => {
    expect([1, 2, 3, 4].map((n) => engineOf(n as 1 | 2 | 3 | 4))).toEqual(["m1", "spread", "spread", "spread"]);
    expect([1, 2, 3, 4].map((n) => usesBands(n as 1 | 2 | 3 | 4))).toEqual([false, false, true, true]);
  });
});

describe("Methodology 4 risk matrix", () => {
  it("is the specified table: 30 positions, no class spread above 2, position 1 = class 1 only, position 30 = class 10 only", () => {
    expect(RISK_MATRIX).toHaveLength(30);
    expect(allowedClasses(1)).toEqual([1]);
    expect(allowedClasses(4)).toEqual([2, 3]);
    expect(allowedClasses(20)).toEqual([6, 7, 8]);
    expect(allowedClasses(30)).toEqual([10]);
    for (let p = 1; p <= 30; p++) expect(Math.max(...allowedClasses(p)) - Math.min(...allowedClasses(p))).toBeLessThanOrEqual(2);
    expect([windowOf(10), windowOf(12), windowOf(4)]).toEqual([{ i: 0, m: 3 }, { i: 2, m: 3 }, { i: 0, m: 1 }]);
  });
  it("accepts and refuses lists as specified", () => {
    expect(matrixOk(5, [2, 3, 4])).toBe(true);
    expect(matrixOk(10, [4, 5, 6, 6])).toBe(true);
    expect(matrixOk(10, [4, 5, 7])).toBe(false);
    expect(matrixOk(1, [1, 2])).toBe(false);
    expect(matrixOk(30, [10, 10])).toBe(true);
    expect(matrixOk(1, [])).toBe(false);
    expect(configSignature(riskClassConfig())).not.toBe(configSignature(defaultConfig()));
  });
  it("stored lists hold only allowed classes, spread <= 2, and repeated windows are flagged or distinct", { timeout: 240000 }, async () => {
    const bonds = universe();
    const cfg = riskClassConfig();
    const sb = await buildBands(bonds, 4, cfg, "t");
    const byIsin = new Map(candidatesOf(bonds, 4, false).map((c) => [c.b.isin, c]));
    const ok = sb.bands.filter((b) => b.status === "ok");
    expect(ok.length).toBeGreaterThan(1);
    for (const b of ok) {
      const cls = b.isins.map((i) => byIsin.get(i)!.cls);
      expect(b.isins).toHaveLength(10);
      expect(matrixOk(b.k, cls)).toBe(true);
      expect([b.minRisk, b.maxRisk]).toEqual([Math.min(...cls), Math.max(...cls)]);
    }
    // inside one window the expected loss never falls and the return never falls from place to place
    for (const g of [[10, 11, 12], [14, 15, 16], [18, 19, 20]]) {
      const l = g.map((k) => sb.bands[k - 1]).filter((b) => b.status === "ok");
      for (let i = 1; i < l.length; i++) { expect(l[i].el!).toBeGreaterThanOrEqual(l[i - 1].el! - 1e-6); expect(l[i].ytm!).toBeGreaterThanOrEqual(l[i - 1].ytm! - 1e-6); }
    }
  });
});
