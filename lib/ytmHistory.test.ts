import { describe, expect, it } from "vitest";
import { historyRows } from "./ytmHistory";
import type { PublicBond } from "./types";

const bond = (o: Partial<PublicBond>): PublicBond => ({
  isin: "X", name: "n", issuer: null, country: null, currency: "EUR", coupon: null, maturity: null,
  ratingSp: null, ratingMoodys: null, ratingFitch: null, ratingResolved: "A", grossYtm: 3, modifiedDuration: 4, ytmAsOf: "2026-10-19T00:00:00Z", ...o,
});

describe("ytm history rows", () => {
  it("keeps rated bonds with a yield, dated by their yield date", () => {
    const rows = historyRows({ source: "live", asOf: null, bonds: [bond({}), bond({ isin: "NR", ratingResolved: "NR" }), bond({ isin: "N", grossYtm: null }), bond({ isin: "D", ytmAsOf: null })] }, "2026-10-20");
    expect(rows.map((r) => [r.isin, r.as_of])).toEqual([["X", "2026-10-19"], ["D", "2026-10-20"]]);
  });
});
