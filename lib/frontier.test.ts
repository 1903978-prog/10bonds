import { describe, expect, it } from "vitest";
import { frontierOf } from "./frontier";
import { bondRisk } from "./ratings";
import { SAMPLE_BONDS } from "./sample-bonds";

describe("efficient frontier chart", () => {
  it("dots every rated bond, marks the 4-6 year ones and draws their rising frontier from risk 1 to 8", () => {
    const eur = SAMPLE_BONDS.filter((b) => b.currency === "EUR");
    const f = frontierOf(eur);
    expect(f.dots).toHaveLength(eur.filter((b) => bondRisk(b) !== null && b.grossYtm !== null).length);
    expect(f.picks.length).toBeGreaterThan(1);
    for (let k = 1; k < f.picks.length; k++) {
      expect(f.dots[f.picks[k]][0]).toBeGreaterThan(f.dots[f.picks[k - 1]][0]);
      expect(f.dots[f.picks[k]][1]).toBeGreaterThan(f.dots[f.picks[k - 1]][1]);
    }
    for (const i of f.picks) expect(f.dots[i][0]).toBeLessThanOrEqual(8);
    for (const i of f.picks) expect(f.dots[i][2]).toBe(1);
    const blue = eur.filter((b) => bondRisk(b) !== null && b.grossYtm !== null && b.modifiedDuration !== null && b.modifiedDuration >= 4 && b.modifiedDuration <= 6);
    expect(f.dots.filter((d) => d[2] === 1)).toHaveLength(blue.length);
  });
});

describe("monotonic red line", () => {
  it("keeps the longest rising run, dropping the outlier and the bonds that pay less than safer ones", async () => {
    const { monotonicRun } = await import("./frontier");
    // Safest first: the owner screenshot case.
    const y = [6.07, 5.89, 5.77, 6.8, 5.43, 6.05, 5.69, 5.33, 6.2, 5.5];
    const run = monotonicRun(y, (v) => v);
    for (let i = 1; i < run.length; i++) expect(run[i]).toBeGreaterThan(run[i - 1]);
    expect(run).not.toContain(6.8);
    expect(run.length).toBe(3);
    expect(monotonicRun([1, 2, 3], (v) => v)).toEqual([1, 2, 3]);
    expect(monotonicRun([], (v: number) => v)).toEqual([]);
  });
});
