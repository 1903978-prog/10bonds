import { describe, expect, it } from "vitest";
import { DURATION_STEPS, nearHorizon, snapDuration } from "./limits";

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
