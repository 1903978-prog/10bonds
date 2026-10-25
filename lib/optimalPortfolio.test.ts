import { describe, expect, it } from "vitest";
import { balancedPick, curveAreaAdvantage, kneeOf, marginalEfficiency, nondominated } from "./optimalPortfolio";
import { simulatePortfolio } from "./monteCarlo";
import { globalPick } from "./optimalBuild";

// y = sqrt(x) style concave frontier: loss on x, return on y; the knee of 1-exp(-kx) is known to sit early.
const concave = Array.from({ length: 41 }, (_, i) => ({ el: i * 0.05, ytm: 3 + 4 * (1 - Math.exp(-i / 6)) }));

describe("knee (Kneedle)", () => {
  it("finds the bend of a smooth concave curve, where the slope equals the diagonal's", () => {
    const r = kneeOf(concave);
    expect(r.reason).toBe("ok");
    // normalised y = (1-exp(-6x'))/(1-exp(-40/6))... slope 1 at x' = ln(6/(1-e^-6.67... )) / 6 ≈ 0.3 in index terms
    const i = r.knee!.index;
    expect(i).toBeGreaterThan(5);
    expect(i).toBeLessThan(16);
    expect(r.knee!.strength).toBeGreaterThan(0.4);
    expect(r.knee!.stability).toBeGreaterThanOrEqual(2 / 3);
  });
  it("gives no knee for a straight line", () => {
    const line = Array.from({ length: 20 }, (_, i) => ({ el: i, ytm: 3 + i * 0.2 }));
    expect(kneeOf(line)).toEqual({ knee: null, reason: "near_linear" });
  });
  it("gives no knee for too few points or duplicate risk values collapsed to few", () => {
    expect(kneeOf([{ el: 1, ytm: 3 }, { el: 2, ytm: 4 }]).reason).toBe("too_few_points");
    expect(kneeOf([{ el: 1, ytm: 3 }, { el: 1, ytm: 3 }, { el: 1, ytm: 3 }, { el: 1, ytm: 3 }]).knee).toBeNull();
  });
  it("picks one actual point on a curve with two elbows, and the same one every time", () => {
    const two = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => ({ el: i, ytm: i < 4 ? 3 + i : i < 8 ? 7 + (i - 4) * 0.3 : 8.2 + (i - 8) * 0.9 }));
    const a = kneeOf(two), b = kneeOf(two);
    expect(a).toEqual(b);
    expect(a.knee!.index).toBeGreaterThanOrEqual(0);
    expect(a.knee!.index).toBeLessThan(two.length);
  });
  it("copes with a noisy frontier", () => {
    const noisy = concave.map((p, i) => ({ el: p.el, ytm: p.ytm + (i % 2 ? 0.01 : -0.01) }));
    expect(kneeOf(noisy).knee).not.toBeNull();
  });
});

describe("marginal efficiency", () => {
  it("is extra return per extra point of expected loss between neighbours", () => {
    const pts = [{ el: 0, ytm: 3 }, { el: 1, ytm: 5 }, { el: 3, ytm: 6 }];
    expect(marginalEfficiency(pts, 1)).toBeCloseTo(1);
    expect(marginalEfficiency(pts, 0)).toBeCloseTo(2);
    expect(marginalEfficiency([pts[0]], 0)).toBeNull();
  });
});

describe("dominance and the balanced pick", () => {
  const items = [
    { mu: 4, tail: 1 },
    { mu: 5, tail: 1.2 },
    { mu: 5.1, tail: 3 },
    { mu: 4.5, tail: 2 }, // beaten by {5, 1.2}
  ];
  it("drops dominated candidates (including across maturities)", () => {
    expect(nondominated(items)).toEqual([0, 1, 2]);
  });
  it("takes the best normalised return minus tail among the rest, deterministically", () => {
    expect(balancedPick(items)).toBe(1);
    expect(balancedPick(items)).toBe(balancedPick([...items]));
    expect(balancedPick([])).toBeNull();
  });
  it("ranks maturities after subtracting each one's risk-free rate", () => {
    const cands = [{ years: 3, mu: 5, es95: 4 }, { years: 8, mu: 5.4, es95: 4.4 }];
    // equal tails, 8y pays more return, but 8y's Bund is much higher: without rf 8y wins, with rf 3y wins
    expect(globalPick(cands, { 3: 2, 8: 3.5 }, false)).toBe(1);
    expect(globalPick(cands, { 3: 2, 8: 3.5 }, true)).toBe(0);
  });
});

describe("area advantage", () => {
  it("is the mean return gap over the common loss range, never extrapolated", () => {
    const a = [{ el: 0, ytm: 4 }, { el: 2, ytm: 6 }];
    const b = [{ el: 1, ytm: 3 }, { el: 4, ytm: 6 }];
    expect(curveAreaAdvantage(a, b)).toBeCloseTo(2, 5); // common range 1..2: a = 5..6, b = 3..4, gap 2 throughout
    expect(curveAreaAdvantage(a, [{ el: 3, ytm: 1 }, { el: 4, ytm: 2 }])).toBeNull();
  });
});

describe("Monte Carlo tail", () => {
  const bonds = [{ ytm: 6, risk: 7 }, { ytm: 5, risk: 6 }, { ytm: 4, risk: 4 }];
  it("ES95 is below the expected yield, deterministic, and stress lowers the return", () => {
    const a = simulatePortfolio(bonds, 5, 50_000), b = simulatePortfolio(bonds, 5, 50_000);
    expect(a.es5).toBe(b.es5);
    expect(a.es5!).toBeLessThan(a.p5! + 1e-9);
    expect(a.es5!).toBeLessThan(a.expYield!);
    const s = simulatePortfolio(bonds, 5, 50_000, 1, { pdMult: 2, lgdAdd: 0.15 });
    expect(s.expYield!).toBeLessThan(a.expYield!);
    expect(s.es5!).toBeLessThan(a.es5!);
  });
});
