import { describe, expect, it } from "vitest";
import { defaultProbability, simulatePortfolio } from "./monteCarlo";

describe("monte carlo", () => {
  it("riskier scores default more often", () => {
    expect(defaultProbability(1, 5)).toBeLessThan(defaultProbability(5, 5));
    expect(defaultProbability(5, 5)).toBeLessThan(defaultProbability(9, 5));
    expect(defaultProbability(5, 5)).toBeCloseTo(0.0144, 4);
  });

  it("runs every path and lowers the yield by the expected loss", () => {
    const safe = simulatePortfolio([{ ytm: 3, risk: 1 }], 5, 100_000);
    expect(safe.paths).toBe(100_000);
    expect(safe.expYield!).toBeGreaterThan(2.95);
    const junk = simulatePortfolio(Array.from({ length: 10 }, () => ({ ytm: 9, risk: 9 })), 5, 100_000);
    expect(junk.expYield!).toBeLessThan(9);
    expect(junk.p5!).toBeLessThan(junk.expYield!);
  });

  it("is fast enough for a million paths", () => {
    const t = performance.now();
    simulatePortfolio(Array.from({ length: 10 }, (_, i) => ({ ytm: 4 + i / 3, risk: 1 + (i % 8) })), 7);
    expect(performance.now() - t).toBeLessThan(1500);
  });
});
