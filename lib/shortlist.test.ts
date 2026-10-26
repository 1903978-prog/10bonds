import { describe, expect, it } from "vitest";
import { detailOf, summarize } from "./shortlist";
import { parseIsins } from "./shortlistDb";
import { listLifeLoss } from "./expectedLoss";
import { lgdOf } from "./seniority";
import { pdOf } from "./tiers";
import type { PublicBond } from "./types";

const bond = (isin: string, over: Partial<PublicBond> = {}): PublicBond => ({
  isin, name: isin, issuer: isin, country: "DE", currency: "EUR", coupon: 3, maturity: "2031-05-14",
  ratingSp: "BBB", ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: 4, modifiedDuration: 4, ytmAsOf: "2026-10-20T00:00:00.000Z", ...over,
});

describe("shortlist figures", () => {
  it("averages and expected loss follow the finder's portfolio method", () => {
    const a = bond("AA0000000001"), b = bond("BB0000000002", { grossYtm: 6, modifiedDuration: 6, ratingSp: "BB", seniority: "Senior non-preferred" });
    const s = summarize([a, b]);
    expect(s.count).toBe(2);
    expect(s.avgYtm).toBeCloseTo(5);
    expect(s.avgDuration).toBeCloseTo(5);
    expect(s.lifeLoss).toBeCloseTo(listLifeLoss([pdOf(a), pdOf(b)], [lgdOf(a), lgdOf(b)]));
    expect(lgdOf(b)).toBe(0.75);
  });
  it("keeps the order, reports bonds missing from the copy and flags hidden ones", () => {
    const d = detailOf(["AA0000000001", "ZZ0000000009", "BB0000000002"], [{ bond: bond("BB0000000002", { seniority: "Subordinated" }), why: "no rating" }, { bond: bond("AA0000000001"), why: null }]);
    expect(d.rows.map((r) => r.isin)).toEqual(["AA0000000001", "ZZ0000000009", "BB0000000002"]);
    expect(d.rows[1].inCopy).toBe(false);
    expect(d.rows[1].flags).toEqual(["not in the bond copy"]);
    expect(d.rows[2].flags.join()).toMatch(/subordinated/);
    expect(d.rows[0].flags).toEqual([]);
    expect(d.summary.count).toBe(2);
  });
});

describe("parseIsins", () => {
  it("splits on anything, removes duplicates and reports non-ISINs", () => {
    const r = parseIsins("xs2338570331, FR0013482841\nXS2338570331 nope");
    expect(r.isins).toEqual(["XS2338570331", "FR0013482841"]);
    expect(r.bad).toEqual(["NOPE"]);
  });
});

import { differences, verdictText, type PortfolioFigures } from "./shortlistCompare";
const fig = (avgYtm: number, lifeLoss: number): PortfolioFigures => ({ count: 10, avgYtm, avgDuration: 4, avgRisk: 5, lifeLoss, issuers: 10, avgSpreadBp: 150, riskPay: 5, netBp: 100 });
describe("comparison", () => {
  it("says which list pays more and at what loss", () => {
    expect(differences(fig(4.5, 0.3), fig(4.31, 0.23)).ytm).toBeCloseTo(0.19);
    expect(verdictText("LM #1", fig(4.5, 0.3), "the 4-year list", fig(4.31, 0.23))).toBe("LM #1 has the higher return: 0.19 pp more than the 4-year list at 0.07 pp more expected loss (LM #1 0.30%, the 4-year list 0.23%).");
    expect(verdictText("LM #1", fig(4.2, 0.3), "the 4-year list", fig(4.31, 0.23))).toMatch(/^the 4-year list has the higher return: 0.11 pp more than LM #1 and 0.07 pp less expected loss/);
  });
});

import { cleanPriceFromYield, yieldFromCleanPrice } from "./bondPrice";
describe("yield at a price", () => {
  it("inverts the price from yield", () => {
    const today = new Date("2026-10-26T00:00:00Z");
    const p = cleanPriceFromYield(3, "2031-05-14", 4.2, today)!;
    expect(yieldFromCleanPrice(3, "2031-05-14", p, today)).toBeCloseTo(4.2, 2);
    expect(yieldFromCleanPrice(3, "2031-05-14", 95, today)!).toBeGreaterThan(yieldFromCleanPrice(3, "2031-05-14", 98, today)!);
    expect(yieldFromCleanPrice(null, "2031-05-14", 95, today)).toBeNull();
  });
});
