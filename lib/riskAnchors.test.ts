import { describe, expect, it } from "vitest";
import { anchoredBands, bandLabel, POSITIONS, windowAround } from "./riskAnchors";

describe("anchored risk bands (owner, 28/10/2026)", () => {
  it("30 contiguous bands from R1 to R30: no gap, no overlap, in order", () => {
    const t = anchoredBands(18, 78); // R1 1.8, R30 7.8
    expect(t.bands).toHaveLength(POSITIONS);
    expect(t.bands[0].sumLo).toBe(18);
    expect(t.bands[29].sumHi).toBe(78);
    for (let i = 1; i < 30; i++) {
      expect(t.bands[i].sumLo).toBe(t.bands[i - 1].sumHi + 1);
      expect(t.bands[i].sumHi).toBeGreaterThanOrEqual(t.bands[i].sumLo);
      expect(t.bands[i].target).toBeGreaterThanOrEqual(t.bands[i - 1].target);
    }
  });
  it("the target is R1 + (R30 - R1)(n - 1)/29 and each band holds its own target", () => {
    const t = anchoredBands(20, 90);
    expect(t.bands[0].target).toBe(20);
    expect(t.bands[29].target).toBe(90);
    expect(t.bands[14].target).toBeCloseTo(20 + (70 * 14) / 29, 1);
    for (const b of t.bands) { expect(b.sumLo - 1).toBeLessThanOrEqual(b.target); expect(b.sumHi + 1).toBeGreaterThanOrEqual(b.target); }
  });
  it("the class window is three consecutive classes around the target, never above 10 or below 1", () => {
    expect([windowAround(10), windowAround(24), windowAround(35), windowAround(60), windowAround(96), windowAround(100)]).toEqual([
      { lo: 1, hi: 3 }, { lo: 1, hi: 3 }, { lo: 3, hi: 5 }, { lo: 5, hi: 7 }, { lo: 8, hi: 10 }, { lo: 8, hi: 10 },
    ]);
    for (const b of anchoredBands(15, 95).bands) expect(b.classHi - b.classLo).toBe(2);
  });
  it("a range too narrow for 30 distinct tenths keeps all 30 bands, repeating single tenths in order", () => {
    const t = anchoredBands(40, 43);
    expect(t.bands).toHaveLength(30);
    const singles = t.bands.filter((b) => b.sumLo === b.sumHi);
    expect(singles.length).toBeGreaterThan(20);
    for (let i = 1; i < 30; i++) expect(t.bands[i].sumLo).toBeGreaterThanOrEqual(t.bands[i - 1].sumLo);
    expect(t.bands.every((b) => b.sumLo >= 40 && b.sumHi <= 43)).toBe(true);
  });
  it("one single value gives 30 identical one-tenth bands", () => {
    const t = anchoredBands(50, 50);
    expect(t.bands.every((b) => b.sumLo === 50 && b.sumHi === 50)).toBe(true);
    expect(bandLabel(t.bands[0])).toBe("5.0");
    expect(bandLabel({ sumLo: 34, sumHi: 37 })).toBe("3.4 - 3.7");
  });
});
