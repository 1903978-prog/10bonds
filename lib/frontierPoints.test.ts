import { describe, expect, it } from "vitest";
import { efficientPoints, gapsOf, pickEven, SAME_LOSS, SAME_YTM, strictlyUp, type FrontierPoint } from "./frontierPoints";

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
// A dense frontier: n lists from return lo to hi, loss = f(return).
const dense = (lo: number, hi: number, f: (x: number) => number, n = 400): FrontierPoint[] =>
  Array.from({ length: n }, (_, i) => { const y = lo + ((hi - lo) * i) / (n - 1); return { ytm: y, el: f(y), isins: [`p${i}`] }; });

function check(pts: FrontierPoint[]) {
  for (let i = 1; i < pts.length; i++) {
    expect(pts[i].ytm).toBeGreaterThan(pts[i - 1].ytm);
    expect(pts[i].el).toBeGreaterThan(pts[i - 1].el);
    expect(Math.abs(pts[i].ytm - pts[i - 1].ytm) >= SAME_YTM || Math.abs(pts[i].el - pts[i - 1].el) >= SAME_LOSS).toBe(true);
  }
  expect(new Set(pts.map((p) => p.isins.join())).size).toBe(pts.length);
  // No point is beaten by another (at least as much return for no more loss).
  for (const p of pts) for (const q of pts) if (p !== q) expect(q.ytm >= p.ytm && q.el <= p.el).toBe(false);
}

describe("frontier points", () => {
  const cases: [string, FrontierPoint[]][] = [
    ["convex, steep at the top (the medium EUR shape)", dense(3.3, 6.0, (x) => 0.05 + 0.02 * Math.exp(1.6 * (x - 3.3)))],
    ["almost flat loss", dense(2.0, 4.0, (x) => 0.1 + 0.01 * (x - 2))],
    ["kinked", dense(3.0, 7.0, (x) => (x < 5 ? 0.1 * (x - 3) + 0.01 : 0.21 + 1.2 * (x - 5)))],
  ];
  for (const [name, all] of cases) {
    it(`${name}: 30 distinct points, strictly up in both, no beaten points, max gap <= 2x median, true ends`, () => {
      const pts = pickEven(efficientPoints(all));
      check(pts);
      expect(pts).toHaveLength(30);
      expect(pts[0]).toBe(all[0]);
      expect(pts[pts.length - 1]).toBe(all[all.length - 1]);
      const g = gapsOf(pts);
      expect(Math.max(...g)).toBeLessThanOrEqual(2 * median(g));
    });
  }

  it("fills a big gap with the lists inside it (21 to 22 in the old chart)", () => {
    const all = [...dense(3.3, 4.6, (x) => 0.1 * (x - 3), 300), ...dense(4.62, 5.1, (x) => 0.13 + 0.3 * (x - 4.6), 40), ...dense(5.12, 6.0, (x) => 0.3 + 2 * (x - 5.1), 80)]
      .map((p, i) => ({ ...p, isins: [`q${i}`] }));
    const pts = pickEven(efficientPoints(all));
    check(pts);
    expect(pts.filter((p) => p.ytm > 4.6 && p.ytm < 5.1).length).toBeGreaterThanOrEqual(4);
  });

  it("never shows more points than distinct lists and never stacks the maximum", () => {
    const p = (ytm: number, el: number, id: string): FrontierPoint => ({ ytm, el, isins: [id] });
    const few = [p(3.3, 0.1, "a"), p(3.8, 0.2, "b"), p(4.6, 0.3, "c"), p(6, 1, "d"), p(6, 1, "d"), p(6, 1.2, "e")];
    const pts = pickEven(efficientPoints(few));
    expect(pts.map((x) => x.isins[0])).toEqual(["a", "b", "c", "d"]);
  });

  it("drops beaten and near-equal lists", () => {
    const p = (ytm: number, el: number, id: string): FrontierPoint => ({ ytm, el, isins: [id] });
    const out = efficientPoints([p(3, 0.1, "a"), p(3.02, 0.11, "b"), p(3.5, 0.3, "c"), p(3.4, 0.5, "beaten"), p(4, 0.6, "d"), p(4, 0.6, "d")]);
    expect(out.map((x) => x.isins[0])).toEqual(["a", "c", "d"]);
  });

  it("drops (and logs) a point that is not strictly higher in both", () => {
    const pts = strictlyUp([{ ytm: 3, el: 0.1 }, { ytm: 3.1, el: 0.1 }, { ytm: 3.2, el: 0.2 }, { ytm: 3.2, el: 0.3 }], "test");
    expect(pts).toEqual([{ ytm: 3, el: 0.1 }, { ytm: 3.2, el: 0.2 }]);
  });
});
