import { describe, expect, it } from "vitest";
import { newestQuote, poolWindowOf, PORTFOLIO_SPEC, priceStale, specRules, tradingDaysBetween } from "./portfolioSpec";
import { checkNsList } from "./netSpread/check";

describe("the relaxation ladder (owner, 28/10/2026)", () => {
  it("step 0 is the strict spec; steps are cumulative; the issuer rule and the class spread are never relaxed", () => {
    const r = [0, 1, 2, 3].map((s) => specRules(4, s as 0 | 1 | 2 | 3));
    expect(r.map((x) => [x.perSector, x.sectorExempt, x.avgTol, x.lossShare])).toEqual([[3, false, 0.05, 0.25], [4, true, 0.05, 0.25], [4, true, 0.1, 0.25], [4, true, 0.1, 0.35]]);
    expect(r.every((x) => x.perIssuer === 1)).toBe(true);
    expect(PORTFOLIO_SPEC.maxRiskSpread).toBe(2);
  });
  it("bond duration window: 20% (Long 30%) strict, 35% (Long 50%) from step 2", () => {
    expect([2, 4, 10].map((d) => poolWindowOf(d, 0))).toEqual([0.2, 0.2, 0.3]);
    expect([2, 4, 10].map((d) => poolWindowOf(d, 1))).toEqual([0.2, 0.2, 0.3]);
    expect([2, 4, 10].map((d) => poolWindowOf(d, 2))).toEqual([0.35, 0.35, 0.5]);
    expect([1, 3, 5, 6, 12, 15].map((d) => poolWindowOf(d, 0))).toEqual([0.2, 0.2, 0.2, 0.3, 0.3, 0.3]);
  });
  it("a list that mixes classes more than 2 apart fails the spread check whatever the allowed set says", () => {
    const rules = specRules(4);
    const bond = (i: number, cls: number) => ({ isin: `B${i}`, group: `g${i}`, sector: `s${i % 5}`, cls, dur: 4 });
    const mixed = Array.from({ length: 10 }, (_, i) => bond(i, i === 0 ? 1 : 4));
    expect(checkNsList(mixed, [1, 2, 3, 4], rules).find((c) => c.rule === "spread")?.ok).toBe(false);
  });
});

describe("the spec's constants", () => {
  it("ten bonds at 10%, one per issuer group, three per sector, 5% average duration, loss share 25%, 5 trading days", () => {
    expect([PORTFOLIO_SPEC.size, PORTFOLIO_SPEC.weight, PORTFOLIO_SPEC.perIssuerGroup, PORTFOLIO_SPEC.perSector, PORTFOLIO_SPEC.avgDurationTolerance, PORTFOLIO_SPEC.lossShare, PORTFOLIO_SPEC.staleTradingDays]).toEqual([10, 0.1, 1, 3, 0.05, 0.25, 5]);
    expect(PORTFOLIO_SPEC.positions).toBe(30);
    expect(PORTFOLIO_SPEC.bondDurationWindow.long).toBe(0.3);
    expect(PORTFOLIO_SPEC.readBudgetMs).toBe(300);
    expect(PORTFOLIO_SPEC.version).toMatch(/^ps4-/);
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
    expect(priceStale("2026-10-02", "2026-10-26")).toBe(true);
    expect(priceStale(null, "2026-10-26")).toBe(false);
    expect(newestQuote([{ ytmAsOf: "2026-10-20" }, { ytmAsOf: "2026-10-26" }, { ytmAsOf: null }])).toBe("2026-10-26");
  });
});
