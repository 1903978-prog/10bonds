import { describe, expect, it } from "vitest";
import { compact, computeRows, listsFor, onePerIssuer, priceAgo, priceAtYield, sortedBy, weekOf, type History } from "./priceHistory";
import type { PublicBond } from "./types";

const bond = (isin: string, issuer: string, rating: string, price: number, currency = "EUR"): PublicBond => ({
  isin, name: `${issuer} bond`, issuer, country: "DE", currency, coupon: 3, maturity: "2030-06-01",
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: rating, grossYtm: 3, modifiedDuration: 3.5,
  ytmAsOf: "2026-10-20T00:00:00Z", cleanPrice: price,
});
const empty = (): History => ({ range: new Map(), daily: new Map() });

describe("price drops", () => {
  it("uses the copy's 52-week range and works out drop, distance from the low and the 1-year gain", () => {
    const b = { ...bond("A", "Alpha", "BBB", 95), low52w: 90, high52w: 100 };
    const [r] = computeRows([b], empty());
    expect(r.vsMax).toBeCloseTo(-5);
    expect(r.vsMin).toBeCloseTo(5.556, 2);
    expect(r.gain1y).toBeCloseTo(((100 - 95 + 3) / 95) * 100);
    expect(r.d1w).toBeNull(); // no history yet: shown as "–", never invented
    expect(r.d1m).toBeNull();
    expect(r.ytm).toBe(3);
  });

  it("without the copy's range, prices the recorded lowest and highest yields as of today", () => {
    const b = { ...bond("A", "Alpha", "BBB", 95), cleanPrice: undefined, grossYtm: 4 };
    const h = empty();
    h.range.set("A", { minYtm: 3, maxYtm: 4.5 });
    const [r] = computeRows([b], h);
    expect(r.max52w).toBeCloseTo(priceAtYield(b, 3)!);
    expect(r.max52w!).toBeCloseTo(100, 0); // coupon 3% at a 3% yield prices at par
    expect(r.min52w!).toBeLessThan(r.price);
    expect(r.vsMax!).toBeLessThan(-3);
  });

  it("takes the price about a week and a month back from the daily record", () => {
    const series = [{ day: "2026-09-18", price: 101 }, { day: "2026-10-12", price: 99 }, { day: "2026-10-13", price: 98 }];
    expect(priceAgo(series, "2026-10-20", 7)).toBe(98);
    expect(priceAgo(series, "2026-10-20", 30)).toBe(101);
    expect(priceAgo(series, "2026-10-20", 60)).toBeNull();
    const h = empty();
    h.daily.set("A", series);
    const [r] = computeRows([bond("A", "Alpha", "BBB", 95)], h);
    expect(r.d1w).toBeCloseTo(((95 - 98) / 98) * 100);
  });

  it("leaves out unrated bonds", () => {
    expect(computeRows([bond("A", "Alpha", "NR", 80)], empty())).toEqual([]);
  });

  it("sorts each column its own way and keeps one bond per issuer, by currency and risk", () => {
    const bonds = [
      { ...bond("A1", "Alpha", "BBB", 80), high52w: 100, low52w: 80 },
      { ...bond("A2", "Alpha", "BBB", 85), high52w: 100, low52w: 80 },
      { ...bond("B", "Beta", "BBB", 90), high52w: 100, low52w: 85 },
      { ...bond("U", "Usa", "BBB", 70, "USD"), high52w: 100, low52w: 70 },
    ];
    const rows = computeRows(bonds, empty());
    expect(onePerIssuer(sortedBy(rows, "vsMax"), 10).map((r) => r.isin)).toEqual(["U", "A1", "B"]);
    expect(sortedBy(rows, "gain1y")[0].isin).toBe("U"); // highest gain first
    expect(sortedBy([{ ...rows[0], ytm: 2 }, rows[1]], "ytm")[0].isin).toBe("A2"); // highest yield first
    expect(sortedBy(rows, "d1w")).toEqual([]); // no history: nothing to sort
    const eur = listsFor(rows, "EUR");
    expect(eur.vsMax.top.map((i) => rows[i].isin)).toEqual(["A1", "B"]);
    expect(eur.vsMax.byRisk[5].map((i) => rows[i].isin)).toEqual(["A1", "B"]);
    expect(eur.vsMax.byRisk[1]).toEqual([]);
    const small = compact(rows);
    expect(small.rows.map((r) => r.isin)).toEqual(["A1", "B", "U"]); // A2 is never shown, so it is not sent
    expect(small.USD.vsMax.top.map((i) => small.rows[i].isin)).toEqual(["U"]);
  });

  it("files a quote under the Monday of its week", () => {
    expect(weekOf("2026-10-20T10:00:00Z")).toBe("2026-10-19");
    expect(weekOf("2026-10-25T10:00:00Z")).toBe("2026-10-19");
    expect(weekOf("2026-10-19T00:00:00Z")).toBe("2026-10-19");
  });
});
