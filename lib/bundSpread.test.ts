import { describe, expect, it } from "vitest";
import { spreadBp } from "./bundSpread";

const CURVE = [{ years: 2, ytm: 2 }, { years: 6, ytm: 3 }];

describe("spread over the Bund (admin)", () => {
  it("is the return minus the Bund read linearly at the duration, in bp", () => {
    expect(spreadBp(CURVE, 4.5, 4)).toBe(200); // Bund at 4y = 2.5
    expect(spreadBp(CURVE, 2, 2)).toBe(0);
  });
  it("is empty without a Bund point or input", () => {
    expect(spreadBp(CURVE, 4, 7)).toBeNull();
    expect(spreadBp(CURVE, 4, 1)).toBeNull();
    expect(spreadBp([], 4, 4)).toBeNull();
    expect(spreadBp(CURVE, null, 4)).toBeNull();
    expect(spreadBp(CURVE, 4, undefined)).toBeNull();
  });
});
