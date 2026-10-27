import { describe, expect, it } from "vitest";
import { DEFAULT_RATES, DEFAULT_YEARS } from "./seo/defaultRates";
import { SOVEREIGN_RATES, SOVEREIGN_YEARS } from "./sovereign";
import { bondLossChance, cumulativeDefault, expectedLoss, listLifeLoss, listLossChance, lossAdjustedYield } from "./expectedLoss";
import { linearCumulative } from "./linearCumulative";

// Formula audit 27/10/2026, check 2 and 4: cumulative default table, interpolation, yearly p(t) = PD(t) - PD(t-1) >= 0,
// extrapolation beyond 15 years, the sovereign table (PR #347), and the expected-loss formulas of the methodology page.
const GRID = Array.from({ length: 121 }, (_, i) => i / 4); // 0 .. 30 years in quarter steps

describe("default table", () => {
  it("every corporate row rises with time and every grade is at least as risky as the one above", () => {
    DEFAULT_RATES.forEach(([, , row], i) => {
      row.forEach((v, k) => { if (k) expect(v, `row ${i} year ${DEFAULT_YEARS[k]}`).toBeGreaterThanOrEqual(row[k - 1]); });
      if (i) row.forEach((v, k) => expect(v, `row ${i} vs ${i - 1} year ${DEFAULT_YEARS[k]}`).toBeGreaterThanOrEqual(DEFAULT_RATES[i - 1][2][k]));
    });
  });
  it("every sovereign row rises with time and every band is at least as risky as the one above", () => {
    SOVEREIGN_RATES.forEach(([band, row], i) => {
      row.forEach((v, k) => { if (k) expect(v, `${band} year ${SOVEREIGN_YEARS[k]}`).toBeGreaterThanOrEqual(row[k - 1]); });
      if (i) row.forEach((v, k) => expect(v, `${band} vs previous, year ${SOVEREIGN_YEARS[k]}`).toBeGreaterThanOrEqual(SOVEREIGN_RATES[i - 1][1][k]));
    });
  });
  it("reads the published figures exactly at the published years", () => {
    DEFAULT_RATES.forEach((_, n) => DEFAULT_YEARS.forEach((y, k) => expect(cumulativeDefault(Math.min(n, 17), y)).toBeCloseTo(DEFAULT_RATES[Math.min(n, 17)][2][k], 10)));
    SOVEREIGN_RATES.forEach(([, row]) => SOVEREIGN_YEARS.forEach((y, k) => expect(linearCumulative(row, SOVEREIGN_YEARS, y)).toBeCloseTo(row[k], 10)));
  });
  it("interpolates in straight lines between published years, from 0 at t = 0", () => {
    expect(cumulativeDefault(8, 2)).toBeCloseTo((DEFAULT_RATES[8][2][0] + DEFAULT_RATES[8][2][1]) / 2, 10); // BBB, halfway between years 1 and 3
    expect(cumulativeDefault(8, 0.5)).toBeCloseTo(DEFAULT_RATES[8][2][0] / 2, 10);
    expect(cumulativeDefault(8, 0)).toBe(0);
  });
  it("the yearly chance p(t) = PD(t) - PD(t-1) is never negative, for every notch, both tables, 0 to 30 years", () => {
    for (let n = 0; n <= 21; n++) for (const sov of [false, true]) {
      let prev = 0;
      for (const y of GRID) {
        const v = cumulativeDefault(n, y, sov);
        expect(v, `notch ${n} sov ${sov} year ${y}`).toBeGreaterThanOrEqual(prev - 1e-12);
        expect(v).toBeLessThanOrEqual(100);
        prev = v;
      }
    }
  });
  it("beyond 15 years the last figure is stretched in proportion, and never above 100%", () => {
    expect(cumulativeDefault(8, 30)).toBeCloseTo(DEFAULT_RATES[8][2][5] * 2, 10);
    expect(cumulativeDefault(17, 30)).toBe(100); // 58% at 15 years would be 116% at 30
    expect(cumulativeDefault(17, 60, true)).toBe(100);
    expect(bondLossChance(17, 45)).toBe(100);
  });
  it("sovereign governments read their own table: AAA/AA never default, BBB at 5 years is 2.32%", () => {
    expect(cumulativeDefault(0, 10, true)).toBe(0);
    expect(cumulativeDefault(2, 15, true)).toBe(0);
    expect(cumulativeDefault(8, 5, true)).toBeCloseTo(2.32, 10);
    expect(cumulativeDefault(8, 5, false)).not.toBeCloseTo(2.32, 2);
  });
});

describe("expected loss formulas (methodology page)", () => {
  it("bond survival S = 1 - PD(T) and chance of at least one default P = 1 - prod S", () => {
    const pds = [0.5, 2, 3.4, 10];
    const expected = 100 * (1 - pds.reduce((p, x) => p * (1 - x / 100), 1));
    expect(listLossChance(pds)).toBeCloseTo(expected, 10);
    expect(listLossChance([])).toBe(0);
    expect(listLossChance([100, 1])).toBe(100);
    // never below the largest single chance, never above the plain sum
    expect(listLossChance(pds)).toBeGreaterThanOrEqual(10);
    expect(listLossChance(pds)).toBeLessThanOrEqual(pds.reduce((s, x) => s + x, 0));
  });
  it("expected loss on your money = (PD1 x LGD1 + ... + PD10 x LGD10) / 10, over the life of the bonds, in % of the money", () => {
    const pds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(listLifeLoss(pds)).toBeCloseTo((55 * 0.6) / 10, 10);
    const lgds = [0.6, 0.6, 0.6, 0.6, 0.6, 0.75, 0.75, 0.75, 0.9, 0.9];
    expect(listLifeLoss(pds, lgds)).toBeCloseTo(pds.reduce((s, p, i) => s + p * lgds[i], 0) / 10, 10);
    expect(listLifeLoss([])).toBe(0);
  });
  it("return after expected losses = y - PD(D)/D x LGD, per year, with D at least one year", () => {
    expect(lossAdjustedYield(5, 8, 4)).toBeCloseTo(5 - (cumulativeDefault(8, 4) / 4) * 0.6, 10);
    expect(expectedLoss(8, 0.4)).toBeCloseTo(cumulativeDefault(8, 1) * 0.6, 10);
    expect(lossAdjustedYield(5, 8, 4, 0.9)).toBeLessThan(lossAdjustedYield(5, 8, 4, 0.6));
  });
  it("units: life loss is % of money over the life, adjusted return is % a year, so life loss / years is the yearly figure", () => {
    const pd = bondLossChance(10, 5);
    expect(listLifeLoss([pd] )).toBeCloseTo(pd * 0.6, 10);
    expect(listLifeLoss([pd]) / 5).toBeCloseTo(cumulativeDefault(10, 5) / 5 * 0.6, 10);
  });
});

describe("the closed-form list figures use the same default table as every other figure", () => {
  it("a government is read from the government table, a company from the company table", () => {
    expect(bondLossChance(8, 5, true)).toBeCloseTo(2.32, 8);
    expect(bondLossChance(8, 5)).toBeCloseTo(cumulativeDefault(8, 5), 8);
  });
  it("the chance of at least one default is 1 - prod(1 - PD), bounded by the largest chance and the sum", () => {
    const pds = [0.1, 0.5, 1.2, 3, 4.1, 6, 2, 0.8, 5, 0.3];
    const any = listLossChance(pds);
    expect(any).toBeGreaterThanOrEqual(Math.max(...pds));
    expect(any).toBeLessThanOrEqual(pds.reduce((s, x) => s + x, 0));
    expect(any).toBeCloseTo(100 * (1 - pds.reduce((p, x) => p * (1 - x / 100), 1)), 10);
  });
});
