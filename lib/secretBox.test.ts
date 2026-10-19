import { describe, expect, it } from "vitest";
import { isSealed, open, seal } from "./secretBox";

describe("secret box", () => {
  it("round-trips and never stores the plain value", () => {
    const s = seal("JBSWY3DPEHPK3PXP");
    expect(isSealed(s)).toBe(true);
    expect(s).not.toContain("JBSWY3DPEHPK3PXP");
    expect(open(s)).toBe("JBSWY3DPEHPK3PXP");
    expect(seal("JBSWY3DPEHPK3PXP")).not.toBe(s); // fresh IV each time
  });

  it("reads older plain values as they are", () => {
    expect(open("JBSWY3DPEHPK3PXP")).toBe("JBSWY3DPEHPK3PXP");
  });

  it("refuses a tampered or foreign value", () => {
    const s = seal("JBSWY3DPEHPK3PXP");
    const flipped = s.slice(0, -2) + (s.at(-2) === "A" ? "B" : "A") + s.at(-1);
    expect(open(flipped)).toBeNull();
    expect(open("v1:not-base64-at-all")).toBeNull();
  });
});
