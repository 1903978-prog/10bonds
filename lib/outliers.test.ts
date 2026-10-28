import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { cleanSd, dropOutliers, findOutliers } from "./outliers";

const bond = (isin: string, ytm: number, duration = 5, name = `Bank ${isin} 3% 2031`, rating = "A"): PublicBond => ({
  isin, name, issuer: name, country: "DE", currency: "EUR", coupon: 3, maturity: "2031-06-01",
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: duration, ytmAsOf: "2026-10-19",
});
const peers = Array.from({ length: 12 }, (_, i) => bond(`P${i}`, 3 + i * 0.05, 4.5 + i * 0.1));

describe("outlier rule", () => {
  it("leaves out a bond yielding far above its peers", () => {
    const out = findOutliers([...peers, bond("HIGH", 6.8)]);
    expect(out.map((o) => [o.bond.isin, o.reason])).toEqual([["HIGH", "yield"]]);
  });
  it("keeps a bond within k standard deviations of its cohort's average", () => {
    // peers: average 3.275%, std dev about 0.173
    expect(findOutliers([...peers, bond("OK", 3.6)])).toEqual([]);
    expect(findOutliers([...peers, bond("OK", 3.6)], 1).map((o) => o.bond.isin)).toContain("OK");
    expect(findOutliers([...peers, bond("HIGH", 4.1)], 5)).toEqual([]);
    expect(findOutliers([...peers, bond("HIGH", 4.3)], 5).map((o) => o.bond.isin)).toEqual(["HIGH"]);
  });
  it("keeps k between 0.5 and 5", () => {
    expect([cleanSd(0.1), cleanSd(9), cleanSd("x"), cleanSd(2.34)]).toEqual([0.5, 5, 2, 2.3]);
  });
  it("leaves out subordinated, Tier 2, AT1 and perpetual names whatever the yield", () => {
    const named = ["Bank X 5% Sub 2031", "Bank Y T2 2032", "Bank Z AT1 Perp", "Corp Hybrid 2080", "Bank W Tier 2 2030"].map((n, i) => bond(`N${i}`, 3.2, 5, n));
    expect(findOutliers([...peers, ...named]).map((o) => o.reason)).toEqual(Array(5).fill("name"));
  });
  it("does not judge with too few peers, nor across risk scores or currencies", () => {
    expect(findOutliers([bond("A", 3), bond("B", 3.1), bond("HIGH", 7)])).toEqual([]);
    expect(findOutliers([...peers, bond("BB", 6.8, 5, "Corp BB 2031", "BB")])).toEqual([]);
    expect(findOutliers([...peers, { ...bond("USD", 6.8), currency: "USD" }])).toEqual([]);
  });
  it("judges a thin cohort against a wider one (risk 8, short bond, 10.77% like BCP V Modular Services Finance II)", () => {
    // Only three risk-8 bonds near 2 years, so the old rule did not judge; with the neighbouring risk scores and a wider duration window it does.
    const mk = (id: string, y: number, r: string, d: number) => bond(id, y, d, `Corp ${id} 2028`, r);
    const cohort = [
      ...Array.from({ length: 5 }, (_, i) => mk(`S${i}`, 6.2 + i * 0.1, "BB", 2 + i * 0.1)),
      ...Array.from({ length: 4 }, (_, i) => mk(`E${i}`, 6.8 + i * 0.1, "B", 2.2 + i * 0.1)),
    ];
    const high = mk("BCP", 10.77, "B", 2);
    expect(findOutliers([...cohort, high], 2, false)).toEqual([]);
    expect(findOutliers([...cohort, high]).map((o) => o.bond.isin)).toEqual(["BCP"]);
    expect(findOutliers([...cohort, mk("OK", 7.0, "B", 2)])).toEqual([]);
  });
  it("dropOutliers removes exactly those bonds", () => {
    expect(dropOutliers([...peers, bond("HIGH", 6.8)]).map((b) => b.isin)).toEqual(peers.map((b) => b.isin));
  });
});
