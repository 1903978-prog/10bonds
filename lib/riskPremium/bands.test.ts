import { describe, expect, it } from "vitest";
import { parseShifts, shiftPremiums } from "./bands";
import { V1_PREMIUMS } from "./curve";

describe("admin tuning shifts", () => {
  it("parses seven shifts and rejects anything else", () => {
    expect(parseShifts("0,-5,0,0,10,0,0")).toEqual([0, -5, 0, 0, 10, 0, 0]);
    expect(parseShifts("1,2")).toBeNull();
    expect(parseShifts("a,0,0,0,0,0,0")).toBeNull();
    expect(parseShifts(null)).toBeNull();
    expect(parseShifts("999,0,0,0,0,0,0")![0]).toBe(300);
  });
  it("moves every rating of a risk score together and never below zero", () => {
    const p = shiftPremiums(V1_PREMIUMS, [-50, -10, 0, 0, 0, 0, 20]);
    expect(p.AAA).toBe(0);
    expect([p["AA+"], p.AA, p["AA-"]]).toEqual([30, 35, 40]);
    expect(p.A).toBe(60);
    expect([p["BB+"], p.BB, p["BB-"]]).toEqual([215, 255, 320]);
  });
});
