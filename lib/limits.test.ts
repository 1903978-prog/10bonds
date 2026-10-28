import { describe, expect, it } from "vitest";
import { DURATION_STEPS, nearHorizon, selectedTerm, snapDuration } from "./limits";

describe("horizon slider stops", () => {
  it("runs every year to 15, then 20, 25 and 30+", () => {
    expect(DURATION_STEPS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30]);
    expect(snapDuration(17)).toBe(15);
    expect(snapDuration(40)).toBe(30);
  });
  it("lets every longer bond into 30+, but not into 25", () => {
    expect(nearHorizon(45, 30, 6)).toBe(true);
    expect(nearHorizon(23, 30, 6)).toBe(false);
    expect(nearHorizon(45, 25, 5)).toBe(false);
  });
});

describe("exact-year horizon", () => {
  it("offers years 1 to 15, and the three terms are among them", async () => {
    const { EXACT_YEARS, TERMS, isExactYear, isTermHorizon } = await import("./limits");
    expect(EXACT_YEARS).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    for (const t of TERMS) expect(isExactYear(t.duration) && isTermHorizon(t.duration)).toBe(true);
    expect(isExactYear(16)).toBe(false);
    expect(isTermHorizon(3)).toBe(false);
  });
});

describe("exact year versus horizon buttons", () => {
  it("shows no horizon button while an exact year is in use, even at 2, 4 or 10 years", () => {
    for (const y of [2, 4, 10]) expect(selectedTerm(true, y)).toBeNull();
  });
  it("clicking a horizon drops the exact year and selects that term", () => {
    expect([2, 4, 10].map((d) => selectedTerm(false, d))).toEqual(["short", "mid", "long"]);
  });
});
