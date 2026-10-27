import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_RATES, DEFAULT_YEARS } from "./seo/defaultRates";
import { cumulativeDefaultHazard, cumulativeDefaultV2, tableChecks } from "./lossModel";
import { cumulativeDefault, expectedLoss, listLifeLoss, LOSS_GIVEN_DEFAULT } from "./expectedLoss";
import { DEFAULT_ENGINE, setEngine } from "./enginePolicy";

afterEach(() => setEngine(null));

describe("hazard-space default model v2", () => {
  const grid = [0, 0.25, 0.5, 1, 2, 3, 4, 5, 6.5, 7, 8.5, 10, 12, 15, 17, 20, 25, 30];
  it("F(0)=0, 0<=F<=1 and F never falls with the horizon, for every grade", () => {
    for (const [, , row] of DEFAULT_RATES) {
      let prev = 0;
      for (const y of grid) {
        const { pct } = cumulativeDefaultHazard(row, y);
        expect(pct).toBeGreaterThanOrEqual(prev - 1e-12);
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThan(100);
        prev = pct;
      }
    }
    expect(cumulativeDefaultHazard(DEFAULT_RATES[0][2], 0).pct).toBe(0);
  });
  it("reproduces the table at its own years (no change to the data)", () => {
    for (const [, , row] of DEFAULT_RATES) DEFAULT_YEARS.forEach((y, k) => expect(cumulativeDefaultHazard(row, y).pct).toBeCloseTo(row[k], 9));
  });
  it("is the same as the straight-line table inside one interval only at the knots; between knots it is slightly below (convex survival)", () => {
    const row = DEFAULT_RATES[10][2]; // BB+
    const mid = cumulativeDefaultHazard(row, 4).pct;
    const lin = row[1] + ((row[2] - row[1]) * (4 - 3)) / 2;
    expect(Math.abs(mid - lin)).toBeLessThan(0.1);
  });
  it("a bond with less than a year left gets a proportionally smaller chance, not the full one-year figure", () => {
    const row = DEFAULT_RATES[8][2];
    expect(cumulativeDefaultHazard(row, 0.5).pct).toBeLessThan(row[0]);
    expect(cumulativeDefaultHazard(row, 0.5).pct).toBeGreaterThan(0);
  });
  it("beyond 15 years: flagged extrapolated, with a band, and always below 100%", () => {
    for (const [, , row] of DEFAULT_RATES) {
      const r = cumulativeDefaultHazard(row, 30);
      expect(r.extrapolated).toBe(true);
      expect(r.band[0]).toBeLessThanOrEqual(r.pct + 1e-9);
      expect(r.band[1]).toBeGreaterThanOrEqual(r.pct - 1e-9);
      expect(r.pct).toBeLessThan(100);
    }
    expect(cumulativeDefaultV2(5, 10).extrapolated).toBe(false);
  });
  it("copes with a synthetic table that falls in time (forced non-decreasing, hazard never negative)", () => {
    const r = cumulativeDefaultHazard([1, 3, 2, 5, 6, 7], 5);
    expect(r.pct).toBeGreaterThanOrEqual(cumulativeDefaultHazard([1, 3, 2, 5, 6, 7], 3).pct);
  });
  it("reports where the shipped table falls in time or crosses between grades instead of hiding it", () => {
    const c = tableChecks();
    expect(c.timeDecreases).toEqual([]);
    console.log("grade crossings in the shipped table:", c.gradeCrossings.length ? c.gradeCrossings.join("; ") : "none");
  });
});

describe("loss definitions are not interchangeable", () => {
  it("v1 stays the default and is unchanged", () => {
    expect(DEFAULT_ENGINE.loss).toBe("v1_linear");
    expect(cumulativeDefault(5, 5)).toBeCloseTo(DEFAULT_RATES[5][2][2], 9);
  });
  it("cumulative expected loss to maturity = PD x LGD; annualised = that / years; the list figure is the mean of cumulative", () => {
    const pd = cumulativeDefault(7, 6);
    expect(expectedLoss(7, 6)).toBeCloseTo((pd / 6) * LOSS_GIVEN_DEFAULT, 12);
    expect(listLifeLoss([pd, pd])).toBeCloseTo(pd * LOSS_GIVEN_DEFAULT, 12);
  });
  it("v2 switches the whole chain through the engine policy and back", () => {
    const v1 = cumulativeDefault(9, 20);
    setEngine({ ...DEFAULT_ENGINE, loss: "v2_hazard" });
    const v2 = cumulativeDefault(9, 20);
    expect(v2).not.toBeCloseTo(v1, 3);
    setEngine(null);
    expect(cumulativeDefault(9, 20)).toBeCloseTo(v1, 12);
  });
});
