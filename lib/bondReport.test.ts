import { describe, expect, it } from "vitest";
import { buildReport, parseOutlook } from "./bondReport";
import { findCompany } from "./companiesInFocus";
import type { PublicBond } from "./types";

const base: PublicBond = {
  isin: "XS0000000001", name: "Test", issuer: "Test AG", country: "DE", currency: "EUR", coupon: 3, maturity: "2031-05-01",
  ratingSp: "A", ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: 3.5, modifiedDuration: 4, ytmAsOf: "2026-10-24T00:00:00Z",
};
const NOW = Date.parse("2026-10-25T00:00:00Z");

describe("buildReport", () => {
  it("returns null with no bond and no research", () => expect(buildReport("XS0000000001", null, null)).toBeNull());
  it("LVMH: curated research with a dated price", () => {
    const r = buildReport("FR0013482841", null, findCompany("FR0013482841")!, NOW)!;
    expect(r.free).toBe(true);
    expect(r.kpis.score.text).toBe("86/100");
    expect(r.conclusion.outlook).toBe(-2);
    expect(r.conclusion.strengths).toHaveLength(3);
    expect(r.kpis.wht.text).toBe("0%");
    expect(r.netReturn.status).toBe("provisional");
    expect(r.freshness.stale).toBe(true);
  });
  it("bond without research shows Not verified, never invented values", () => {
    const r = buildReport(base.isin, base, null, NOW)!;
    expect(r.kpis.score.status).toBe("not_verified");
    expect(r.kpis.wht.status).toBe("not_verified");
    expect(r.netReturn.status).toBe("not_verified");
    expect(r.kpis.ret).toMatchObject({ text: "3.50%", status: "verified" });
    expect(r.conclusion.strengths).toEqual([]);
    expect(r.unavailable).toContain("Return after withholding tax");
  });
  it("old price is flagged, not shown as current", () => {
    const r = buildReport(base.isin, { ...base, ytmAsOf: "2026-10-01T00:00:00Z" }, null, NOW)!;
    expect(r.kpis.ret.status).toBe("provisional");
    expect(r.freshness.stale).toBe(true);
  });
  it("floating bond lists the missing reset formula", () => {
    const r = buildReport(base.isin, { ...base, couponType: "floating" }, null, NOW)!;
    expect(r.couponType).toBe("Floating");
    expect(r.unavailable).toContain("Coupon reset formula and exact coupon periods");
  });
  it("incomplete bond (no coupon, maturity, price) does not throw", () => {
    const r = buildReport("XS0000000002", { ...base, coupon: null, maturity: null, grossYtm: null, ytmAsOf: null, issuer: null }, null, NOW)!;
    expect(r.kpis.ret.status).toBe("not_verified");
    expect(r.kpis.maturity.status).toBe("not_verified");
  });
  it("never shows agency grades", () => {
    expect(JSON.stringify(buildReport(base.isin, base, null, NOW))).not.toMatch(/S&P|Moody|Fitch/);
  });
});

describe("parseOutlook", () => {
  it("reads signed values", () => {
    expect(parseOutlook("−2/10")).toBe(-2);
    expect(parseOutlook("+3/10")).toBe(3);
    expect(parseOutlook("n/a")).toBeNull();
  });
});
