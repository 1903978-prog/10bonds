import { describe, expect, it } from "vitest";
import { MIX_START, MIX_STEPS, mixTarget } from "./mixSteps";

const caps: Record<number, number> = { 1: 2.4, 2: 2.7, 3: 3.0, 4: 3.3, 5: 3.6, 6: 3.9, 7: 4.5 };
const capAt = (r: number) => caps[r];

describe("mixTarget", () => {
  it("has 30 steps and starts at risk 5, high", () => {
    expect(MIX_STEPS).toBe(30);
    expect(mixTarget(MIX_START, capAt, 7)).toEqual({ risk: 5, ytm: 3.6 });
  });
  it("high is the maximum at each risk, low and medium between the previous maximum and it", () => {
    expect(mixTarget(0, capAt, 7)).toEqual({ risk: 1, ytm: 1.46 });
    expect(mixTarget(2, capAt, 7)).toEqual({ risk: 1, ytm: 2.4 });
    expect(mixTarget(3, capAt, 7)).toEqual({ risk: 2, ytm: 2.5 });
    expect(mixTarget(4, capAt, 7)).toEqual({ risk: 2, ytm: 2.6 });
  });
  it("never lowers the return from one step to the next", () => {
    let last = 0;
    for (let s = 0; s < MIX_STEPS; s++) {
      const { ytm } = mixTarget(s, capAt, 7);
      expect(ytm).toBeGreaterThanOrEqual(last);
      last = ytm;
    }
  });
  it("stops at the highest risk with bonds", () => {
    expect(mixTarget(29, capAt, 7)).toEqual({ risk: 7, ytm: 4.5 });
  });
});
