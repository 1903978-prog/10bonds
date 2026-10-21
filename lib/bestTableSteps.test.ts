import { describe, expect, it } from "vitest";
import { SAMPLE_BONDS } from "./sample-bonds";
import { capsInSteps, computeBestTable, computeGrid } from "./bestTable";
import type { BondSource } from "./bonds";

// A larger copy than the sample, so the slider maximums take real time.
const RATINGS = ["AAA", "AA", "A", "BBB+", "BBB", "BBB-", "BB", "B"];
const bonds = Array.from({ length: 120 }, (_, i) => {
  const b = SAMPLE_BONDS[i % SAMPLE_BONDS.length];
  return { ...b, isin: `XS${String(i).padStart(10, "0")}`, issuer: `Issuer ${i % 60}`, currency: "EUR", rating: RATINGS[i % 8], spRating: RATINGS[i % 8], modifiedDuration: 0.5 + ((i * 7919) % 2900) / 100, grossYtm: 2 + ((i * 31) % 400) / 100 };
});
const src = { bonds, source: "live", asOf: "test" } as unknown as BondSource;

// Regression: the slider maximums once ran in one go on the request, holding up the one-bond chart (empty USD chart).
describe("best table in steps", () => {
  it("gives the same slider maximums and bond grid as the one-go table", async () => {
    const full = computeBestTable(src);
    expect(await capsInSteps(src.bonds)).toEqual(full.caps);
    expect(computeGrid(src)).toEqual(full.grid);
  }, 60_000);

  it("lets other requests run while the maximums are computed", async () => {
    let ticks = 0;
    const timer = setInterval(() => ticks++, 0);
    await capsInSteps(src.bonds);
    clearInterval(timer);
    expect(ticks).toBeGreaterThan(10);
  }, 60_000);
});
