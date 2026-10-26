import { describe, expect, it } from "vitest";
import { callableLabel, couponTypeLabel, couponTypeOf, seniorityLabel } from "./bondFacts";

describe("bond facts", () => {
  it("reads the coupon type from the copy, else from the coupon and structure", () => {
    expect(couponTypeOf("Fixed rate", 4, undefined)).toBe("fixed");
    expect(couponTypeOf("FRN", null, false)).toBe("floating");
    expect(couponTypeOf(null, 0, undefined)).toBe("zero");
    expect(couponTypeOf(null, 3.5, true)).toBe("fixed");
    expect(couponTypeOf(null, 3.5, undefined)).toBeNull();
  });
  it("shows a dash for what the data does not have", () => {
    expect(couponTypeLabel("it", "fixed")).toBe("Fissa");
    expect(couponTypeLabel("en", null)).toBe("–");
    expect(seniorityLabel("de", "Subordinated")).toBe("Nachrangig");
    expect(seniorityLabel("en", null)).toBe("–");
    expect(callableLabel("fr", true)).toBe("Oui");
    expect(callableLabel("en", undefined)).toBe("–");
  });
});
