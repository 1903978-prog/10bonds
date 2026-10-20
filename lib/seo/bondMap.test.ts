import { describe, expect, it } from "vitest";
import { bondMap } from "./bondMap";
import type { PublicBond } from "../types";

const bond = (o: Partial<PublicBond>): PublicBond => ({
  isin: "X", name: "X", issuer: null, country: null, currency: "EUR", coupon: 1, maturity: "2030-06-01",
  ratingSp: "AAA", ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: 3, modifiedDuration: 4, ytmAsOf: null, ...o,
});
const now = new Date("2026-10-19");

describe("bondMap", () => {
  it("counts each bond in its maturity bucket and risk, with max and median yield", () => {
    const m = bondMap([
      bond({ grossYtm: 3 }), bond({ grossYtm: 4 }), bond({ grossYtm: 8 }), // 3.6 years, AAA -> 3-5 / risk 1
      bond({ maturity: "2050-01-01", ratingSp: "BB-", grossYtm: 6 }), // 15+ / risk 7
      bond({ ratingSp: null }), // unrated: left out
      bond({ maturity: null }), // perpetual
    ], now);
    expect(m.bonds).toBe(4);
    expect(m.noMaturity).toBe(1);
    expect(m.rows[3][0]).toEqual({ bonds: 3, max: 8, median: 4 });
    expect(m.rows[7][6]).toEqual({ bonds: 1, max: 6, median: 6 });
    expect(m.rows[0][0]).toEqual({ bonds: 0, max: null, median: null });
  });
});
