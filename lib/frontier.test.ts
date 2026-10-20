import { describe, expect, it } from "vitest";
import { frontierOf } from "./frontier";
import { rankBonds } from "./ranking";
import { bondRisk } from "./ratings";
import { SAMPLE_BONDS } from "./sample-bonds";

describe("efficient frontier chart", () => {
  it("dots every rated bond and marks exactly the bonds of the 5-year, risk-5 search", () => {
    const eur = SAMPLE_BONDS.filter((b) => b.currency === "EUR");
    const f = frontierOf(eur);
    expect(f.dots).toHaveLength(eur.filter((b) => bondRisk(b) !== null && b.grossYtm !== null).length);
    const want = rankBonds(eur, 5, Number.MAX_VALUE, undefined, 5).results;
    expect(f.picks).toHaveLength(want.length);
    for (const i of f.picks) expect(f.dots[i][0]).toBeLessThanOrEqual(5);
  });
});

describe("monotonic red line", () => {
  it("keeps the longest rising run, dropping the outlier and the bonds that pay less than safer ones", async () => {
    const { monotonicRun } = await import("./frontier");
    // Safest first: the Livio screenshot case.
    const y = [6.07, 5.89, 5.77, 6.8, 5.43, 6.05, 5.69, 5.33, 6.2, 5.5];
    const run = monotonicRun(y, (v) => v);
    for (let i = 1; i < run.length; i++) expect(run[i]).toBeGreaterThan(run[i - 1]);
    expect(run).not.toContain(6.8);
    expect(run.length).toBe(3);
    expect(monotonicRun([1, 2, 3], (v) => v)).toEqual([1, 2, 3]);
    expect(monotonicRun([], (v: number) => v)).toEqual([]);
  });
});
