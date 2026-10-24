import { describe, expect, it } from "vitest";
import { etfPick } from "./etfPick";
import type { SliderPosition } from "./sliderPortfolios";

const pos = (position: number, ytm: number | null, avgRisk: number | null, extra: Partial<SliderPosition> = {}) =>
  ({ position, ceiling: 1, level: 1, target: null, query: null, ytm, expectedLoss: 0.1, avgRisk, worstRisk: null, isins: [], sameAs: null, unavailable: false, ...extra }) as SliderPosition;

describe("etfPick", () => {
  it("takes the lowest-risk list that returns more than the ETF", () => {
    const m = etfPick([pos(1, 3.9, 2), pos(2, 4.51, 3.2), pos(3, 4.6, 3), pos(4, 5.2, 6)], 4.39);
    expect(m).toEqual({ position: 3, ytm: 4.6, avgRisk: 3, beats: true });
  });
  it("shows the highest return honestly when nothing beats the ETF", () => {
    const m = etfPick([pos(1, 3.9, 2), pos(2, 4.2, 4), pos(3, 9, 9, { unavailable: true })], 4.39);
    expect(m).toEqual({ position: 2, ytm: 4.2, avgRisk: 4, beats: false });
  });
  it("skips repeated lists", () => {
    expect(etfPick([pos(1, 5, 2, { sameAs: 3 }), pos(3, 5, 4)], 4)?.position).toBe(3);
  });
});
