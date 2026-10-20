import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { dropOutliers, findOutliers } from "./outliers";

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
  it("keeps a bond only a little above its peers", () => {
    expect(findOutliers([...peers, bond("OK", 4.2)])).toEqual([]);
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
  it("dropOutliers removes exactly those bonds", () => {
    expect(dropOutliers([...peers, bond("HIGH", 6.8)]).map((b) => b.isin)).toEqual(peers.map((b) => b.isin));
  });
});
