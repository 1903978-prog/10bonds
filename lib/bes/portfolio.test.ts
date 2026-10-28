import { describe, expect, it } from "vitest";
import { besTileOf } from "./portfolio";

describe("besTileOf", () => {
  it("averages the scored bonds and counts them", () => {
    expect(besTileOf([80, 60, null, 70])).toEqual({ avg: 70, scored: 3, total: 4, netPct: null });
  });
  it("has no average when nothing is scored", () => {
    expect(besTileOf([null, null])).toEqual({ avg: null, scored: 0, total: 2, netPct: null });
  });
});
