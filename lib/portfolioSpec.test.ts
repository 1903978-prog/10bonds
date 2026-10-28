import { describe, expect, it } from "vitest";
import { allowedFor, ceilingShare, newestQuote, PORTFOLIO_SPEC, priceStale, tradingDaysBetween } from "./portfolioSpec";
import { MATRIX_POSITIONS, matrixOk, RISK_MATRIX, windowOf } from "./riskMatrix";
import { windowsOfMatrix } from "./netSpread/build";
import { checkNsList } from "./netSpread/check";
import { specRules } from "./portfolioSpec";

describe("the 30-position risk matrix (owner's table, absolute)", () => {
  const TABLE: number[][] = [
    [1], [1, 2], [1, 2, 3], [2, 3], [2, 3, 4], [3, 4],
    [3, 4, 5], [3, 4, 5], [4, 5], [4, 5, 6], [4, 5, 6], [4, 5, 6],
    [5, 6], [5, 6, 7], [5, 6, 7], [5, 6, 7], [6, 7], [6, 7, 8],
    [6, 7, 8], [6, 7, 8], [7, 8], [7, 8, 9], [7, 8, 9], [7, 8, 9],
    [8, 9], [8, 9, 10], [8, 9, 10], [8, 9, 10], [9, 10], [10],
  ];
  it("is exactly this table", () => {
    expect(RISK_MATRIX.map((r) => [...r])).toEqual(TABLE);
    expect(MATRIX_POSITIONS).toBe(30);
    TABLE.forEach((row, i) => expect([...allowedFor(i + 1)]).toEqual(row));
  });
  it("no position spans more than two classes, and every list needs spread <= 2 on top of its classes", () => {
    for (const row of TABLE) expect(Math.max(...row) - Math.min(...row)).toBeLessThanOrEqual(PORTFOLIO_SPEC.maxRiskSpread);
    expect(PORTFOLIO_SPEC.maxRiskSpread).toBe(2);
    expect(matrixOk(10, [4, 5, 6, 6, 4])).toBe(true);
    expect(matrixOk(10, [4, 5, 7])).toBe(false); // class 7 is not allowed at position 10
    expect(matrixOk(9, [4, 5, 5])).toBe(true);
    expect(matrixOk(9, [3, 4])).toBe(false);
    const rules = specRules(4);
    const bond = (i: number, cls: number) => ({ isin: `B${i}`, group: `g${i}`, sector: `s${i % 5}`, cls, dur: 4 });
    // 10 bonds in classes 2..4 would pass a 3-class window; classes 1 and 4 together break spread <= 2 whatever the allowed set says.
    const mixed = Array.from({ length: 10 }, (_, i) => bond(i, i === 0 ? 1 : 4));
    expect(checkNsList(mixed, [1, 2, 3, 4], rules).find((c) => c.rule === "spread")?.ok).toBe(false);
  });
  it("repeated windows are the five triples the owner named, plus positions 7-8", () => {
    const repeated = windowsOfMatrix().filter((w) => w.length > 1);
    expect(repeated).toEqual([[7, 8], [10, 11, 12], [14, 15, 16], [18, 19, 20], [22, 23, 24], [26, 27, 28]]);
    expect(windowsOfMatrix().flat()).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect([windowOf(10), windowOf(11), windowOf(12)]).toEqual([{ i: 0, m: 3 }, { i: 1, m: 3 }, { i: 2, m: 3 }]);
  });
  it("expected-loss ceilings are terciles for three places, halves for two, and the top place reaches the full range", () => {
    expect([0, 1, 2].map((i) => ceilingShare(i, 3))).toEqual([1 / 3, 2 / 3, 1]);
    expect([0, 1].map((i) => ceilingShare(i, 2))).toEqual([0.5, 1]);
    expect(ceilingShare(0, 1)).toBe(1);
  });
});

describe("the spec's constants", () => {
  it("ten bonds at 10%, one per issuer group, three per sector, 5% average duration, 5 trading days", () => {
    expect([PORTFOLIO_SPEC.size, PORTFOLIO_SPEC.weight, PORTFOLIO_SPEC.perIssuerGroup, PORTFOLIO_SPEC.perSector, PORTFOLIO_SPEC.avgDurationTolerance, PORTFOLIO_SPEC.staleTradingDays]).toEqual([10, 0.1, 1, 3, 0.05, 5]);
    expect(PORTFOLIO_SPEC.bondDurationWindow.long).toBe(0.3);
    expect(PORTFOLIO_SPEC.readBudgetMs).toBe(300);
    expect(PORTFOLIO_SPEC.version).toMatch(/^ps1-/);
  });
});

describe("stale prices (more than 5 trading days behind the newest quote)", () => {
  it("counts Monday to Friday only", () => {
    expect(tradingDaysBetween("2026-10-23", "2026-10-26")).toBe(1); // Friday -> Monday
    expect(tradingDaysBetween("2026-10-19", "2026-10-26")).toBe(5); // Monday -> next Monday
    expect(tradingDaysBetween("2026-10-26", "2026-10-26")).toBe(0);
    expect(tradingDaysBetween("2026-10-28", "2026-10-26")).toBe(0);
  });
  it("five trading days is still fine, six is stale, a bond with no date is kept", () => {
    expect(priceStale("2026-10-19", "2026-10-26")).toBe(false);
    expect(priceStale("2026-10-16", "2026-10-26")).toBe(true);
    expect(priceStale("2026-10-15", "2026-10-26")).toBe(true);
    expect(priceStale(null, "2026-10-26")).toBe(false);
    expect(newestQuote([{ ytmAsOf: "2026-10-20" }, { ytmAsOf: "2026-10-26" }, { ytmAsOf: null }])).toBe("2026-10-26");
  });
});
