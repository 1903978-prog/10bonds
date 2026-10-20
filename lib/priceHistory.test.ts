import { describe, expect, it } from "vitest";
import { computeDrops, highFromYield, listsFor, onePerIssuer, weekOf } from "./priceHistory";
import type { PublicBond } from "./types";

const bond = (isin: string, issuer: string, rating: string, price: number, currency = "EUR"): PublicBond => ({
  isin, name: `${issuer} bond`, issuer, country: "DE", currency, coupon: 3, maturity: "2030-06-01",
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: rating, grossYtm: 3, modifiedDuration: 3.5,
  ytmAsOf: "2026-10-20T00:00:00Z", cleanPrice: price,
});

describe("price drops", () => {
  it("measures the drop from the highest price and sorts the biggest first", () => {
    const rows = computeDrops([bond("A", "Alpha", "BBB", 95), bond("B", "Beta", "AA", 90), bond("C", "Gamma", "A", 100)], new Map([["A", 100], ["B", 100], ["C", 100.2]]));
    expect(rows.map((r) => r.isin)).toEqual(["B", "A"]); // C moved less than 0.5%
    expect(rows[0].dropPct).toBeCloseTo(-10);
    expect(rows[1].risk).toBe(5);
  });

  it("uses the copy's own 52-week high when it is higher", () => {
    const b = { ...bond("A", "Alpha", "BBB", 95), high52w: 110 };
    expect(computeDrops([b], new Map([["A", 100]]))[0].high).toBe(110);
  });

  it("leaves out unrated bonds and bonds without history", () => {
    expect(computeDrops([bond("A", "Alpha", "NR", 80), bond("B", "Beta", "A", 80)], new Map([["A", 100]]))).toEqual([]);
  });

  it("keeps one bond per issuer and splits by currency and risk", () => {
    const bonds = [bond("A1", "Alpha", "BBB", 80), bond("A2", "Alpha", "BBB", 85), bond("B", "Beta", "BBB", 90), bond("U", "Usa", "BBB", 70, "USD")];
    const rows = computeDrops(bonds, new Map(bonds.map((b) => [b.isin, 100])));
    expect(onePerIssuer(rows, 10).map((r) => r.isin)).toEqual(["U", "A1", "B"]);
    const eur = listsFor(rows, "EUR");
    expect(eur.top.map((r) => r.isin)).toEqual(["A1", "B"]);
    expect(eur.byRisk[5].map((r) => r.isin)).toEqual(["A1", "B"]);
    expect(eur.byRisk[1]).toEqual([]);
  });

  it("prices the lowest yield as of today, so a higher yield shows as a lower price", () => {
    const b = { ...bond("A", "Alpha", "BBB", 95), cleanPrice: undefined, grossYtm: 4 };
    const high = highFromYield(b, 3)!;
    expect(high).toBeCloseTo(100, 0); // coupon 3% at a 3% yield prices at par
    expect(computeDrops([b], new Map([["A", high]]))[0].dropPct).toBeLessThan(-3);
  });

  it("files a quote under the Monday of its week", () => {
    expect(weekOf("2026-10-20T10:00:00Z")).toBe("2026-10-19");
    expect(weekOf("2026-10-25T10:00:00Z")).toBe("2026-10-19");
    expect(weekOf("2026-10-19T00:00:00Z")).toBe("2026-10-19");
  });
});
