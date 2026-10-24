import { describe, expect, it } from "vitest";
import { bondRisk, hasRealRating } from "./ratings";
import { rankBonds } from "./ranking";
import { curveByLevel } from "./singleBond";
import { frontierOf } from "./frontier";
import { computeRows } from "./priceHistory";
import { yieldGrid } from "./seo/widget";
import { relatedBonds } from "./seo/bondPages";
import { SAMPLE_BONDS } from "./sample-bonds";
import type { PublicBond } from "./types";

// The owner, 24/10/2026: "no rating -> never show". Only S&P, Moody's, Fitch or a 10bonds.com score count.
const bond = (isin: string, ytm: number, o: Partial<PublicBond> = {}): PublicBond => ({
  isin, name: isin, issuer: isin, country: "DE", currency: "EUR", coupon: 4, maturity: "2030-12-31",
  ratingSp: null, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: 4, ytmAsOf: "2026-10-20T00:00:00Z", cleanPrice: 100, ...o,
});

// Very high yields, so any of them would top every list if it got through.
const UNRATED = [
  bond("ONLY_RESOLVED", 12, { ratingResolved: "BBB-" }),
  bond("NR_SP", 12.5, { ratingSp: "NR", ratingResolved: "A" }),
  bond("WR_MOODYS", 13, { ratingMoodys: "WR" }),
  bond("NOTHING", 13.5),
  bond("DEFAULT", 14, { ratingSp: "D" }),
];
const RATED = Array.from({ length: 30 }, (_, i) =>
  bond(`R${i}`, 3 + i * 0.1, { ratingSp: i % 3 === 0 ? "BBB-" : null, ratingMoodys: i % 3 === 1 ? "Baa2" : null, ratingFitch: i % 3 === 2 ? "A-" : null }));
const ALL = [...UNRATED, ...RATED];
const bad = new Set(UNRATED.map((b) => b.isin));

describe("a bond without a real rating never reaches any list", () => {
  it("has no risk score and is not shown", () => {
    for (const b of UNRATED) {
      expect(bondRisk(b)).toBeNull();
      expect(hasRealRating(b)).toBe(false);
    }
    expect(RATED.every(hasRealRating)).toBe(true);
    expect(hasRealRating(bond("LR", 5, { lrScore: 70 }))).toBe(true);
  });
  it("sample data holds no unrated bond", () => {
    expect(SAMPLE_BONDS.filter(hasRealRating).length).toBe(SAMPLE_BONDS.length);
  });
  it("top 10 at every risk limit and target", () => {
    for (let risk = 1; risk <= 10; risk++) {
      for (const ytm of [0, 3, 5, 15]) {
        expect(rankBonds(ALL, 4, ytm, 10, risk).results.filter((r) => bad.has(r.isin))).toEqual([]);
      }
    }
  });
  it("one-bond search, frontier, price drops, widget and ISIN page links", () => {
    expect(curveByLevel(ALL, 4).flatMap((p) => p.bonds).filter((b) => bad.has(b.isin))).toEqual([]);
    expect(JSON.stringify(frontierOf(ALL))).not.toMatch(/ONLY_RESOLVED|NR_SP|WR_MOODYS|NOTHING|DEFAULT/);
    expect(computeRows(ALL, { range: new Map(), daily: new Map() }).filter((r) => bad.has(r.isin))).toEqual([]);
    const only = yieldGrid(UNRATED, new Date("2026-10-24"));
    expect(only.bonds).toBe(0);
    const rel = relatedBonds(RATED[0], ALL);
    expect([...rel.sameIssuer, ...rel.similar].filter((b) => bad.has(b.isin))).toEqual([]);
  });
});
