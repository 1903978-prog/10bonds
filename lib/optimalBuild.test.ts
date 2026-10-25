import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import type { BondSource } from "./bonds";
import { parseFilter } from "./bondFilter";
import { buildOptimal, OPT_YEARS } from "./optimalBuild";
import { frontierFor } from "./frontierCache";
import { efficientPoints } from "./frontierPoints";

const GRADES = ["AAA", "AA", "A", "BBB+", "BBB", "BBB-", "BB", "B+", "B"];
function universe(): PublicBond[] {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: PublicBond[] = [];
  for (let d = 2; d <= 10; d++) for (let i = 0; i < 30; i++) {
    const r = Math.floor(rnd() * GRADES.length);
    out.push({
      isin: `T${d}-${i}`, name: `T${d}-${i}`, issuer: `Issuer ${d}-${i}`, country: null, currency: "EUR", coupon: null, maturity: null,
      ratingSp: GRADES[r], ratingMoodys: null, ratingFitch: null, ratingResolved: null,
      grossYtm: Math.round((2 + r * 0.45 + rnd() * 1.2) * 100) / 100, modifiedDuration: d * (0.9 + rnd() * 0.2), ytmAsOf: null,
    });
  }
  return out;
}
const src: BondSource = { bonds: universe(), source: "sample", asOf: "2026-10-25" };
const filter = parseFilter(new URLSearchParams());

describe("buildOptimal (end to end on a synthetic universe)", () => {
  it("returns real lists for every maturity, the same answer twice, and a winner among them", async () => {
    const a = await buildOptimal(src, filter, null);
    const b = await buildOptimal(src, filter, null);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.maturities.length).toBeGreaterThan(3);
    for (const m of a.maturities) {
      expect(OPT_YEARS).toContain(m.years);
      // The chosen list is one of the efficient lists of that maturity, with 10 distinct issuers' bonds.
      const pts = efficientPoints(frontierFor(src, filter, m.years).points);
      if (m.optimum) {
        expect(m.optimum.isins).toHaveLength(10);
        expect(pts.some((p) => p.isins.join() === m.optimum!.isins.join())).toBe(true);
        expect(m.optimum.es95).toBeLessThanOrEqual(m.optimum.mu);
        expect(m.optimum.mu).toBeLessThan(m.optimum.ytm + 0.5);
      }
      if (m.knee) expect(pts.some((p) => p.isins.join() === m.knee!.isins.join())).toBe(true);
    }
    expect(a.winner).not.toBeNull();
    expect(a.maturities.map((m) => m.years)).toContain(a.winner);
    // No Bund curve given: the comparison says so instead of inventing a risk-free rate.
    expect(a.provisional.join(" ")).toMatch(/Bund/);
    expect(a.stress!.sameWinner).toBeLessThanOrEqual(a.stress!.total);
  }, 120_000);
});
