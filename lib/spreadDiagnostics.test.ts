import { describe, expect, it } from "vitest";
import { absoluteFloorBp, spreadDiagnostic } from "./spreadDiagnostics";
import { DEFAULT_SPREAD_MATRIX } from "./stepGap";

const curve = [{ years: 1, ytm: 2 }, { years: 10, ytm: 3 }];
describe("absolute spread floors (diagnostic)", () => {
  it("reproduce the paper's 5-year references: AAA 35, AA 45, A 60, BBB+ 95, BBB 115, BBB- 165, BB 235", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((b) => absoluteFloorBp(b, 5, DEFAULT_SPREAD_MATRIX))).toEqual([35, 45, 60, 95, 115, 165, 235]);
  });
  it("are not invented at horizons without an anchor", () => {
    expect(absoluteFloorBp(2, 3, DEFAULT_SPREAD_MATRIX)).toBeNull();
  });
  it("label a bond and say 'not assessed' with a reason instead of guessing", () => {
    const at5 = (spread: number) => spreadDiagnostic({ notch: 5, currency: "EUR", years: 5, ytm: 2 + (3 - 2) * (4 / 9) + spread / 100 }, curve, DEFAULT_SPREAD_MATRIX);
    expect(at5(70)).toMatchObject({ assessed: true, floorBp: 60, meetsFloor: true });
    expect(at5(40)).toMatchObject({ assessed: true, meetsFloor: false, shortfallBp: 20 });
    const base = { notch: 5, currency: "EUR", years: 5, ytm: 3 };
    expect(spreadDiagnostic({ ...base, currency: "USD" }, curve)).toEqual({ assessed: false, reason: "usd_benchmark_missing" });
    expect(spreadDiagnostic({ ...base, notch: 13 }, curve)).toEqual({ assessed: false, reason: "below_bb" });
    expect(spreadDiagnostic({ ...base, years: 12 }, curve)).toEqual({ assessed: false, reason: "outside_1_10_years" });
    expect(spreadDiagnostic({ ...base, years: 3 }, curve)).toEqual({ assessed: false, reason: "no_aaa_anchor_for_horizon" });
    expect(spreadDiagnostic({ ...base, notch: null }, curve)).toEqual({ assessed: false, reason: "unrated" });
  });
});
