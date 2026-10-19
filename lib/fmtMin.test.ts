import { describe, expect, it } from "vitest";
import { fmtMin } from "./fmtMin";
describe("fmtMin", () => {
  it("short units with currency", () => {
    expect(fmtMin(1000)).toBe("€1k");
    expect(fmtMin(100000)).toBe("€100k");
    expect(fmtMin(1)).toBe("€1");
    expect(fmtMin(1500)).toBe("€1.5k");
    expect(fmtMin(2000000, "USD")).toBe("US$2m");
    expect(fmtMin(null)).toBe("—");
  });
});
