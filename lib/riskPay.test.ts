import { describe, expect, it } from "vitest";
import { riskPay } from "./riskPay";

describe("Risk Pay metric (admin)", () => {
  it("matches the Renault example: 77 bp spread, 0.14% yearly default, 60% loss = 8.4 bp, 9.2x, net +69", () => {
    const r = riskPay(77, 0.14 * 5, 5)!; // 0.14% a year over 5 years
    expect(r.lossBp).toBeCloseTo(8.4, 6);
    expect(r.ratio).toBeCloseTo(9.17, 2);
    expect(r.net).toBeCloseTo(68.6, 1);
  });
  it("is empty without a spread, a default chance or years; zero expected loss has no ratio", () => {
    expect(riskPay(null, 1, 5)).toBeNull();
    expect(riskPay(50, null, 5)).toBeNull();
    expect(riskPay(50, 1, 0)).toBeNull();
    expect(riskPay(50, 0, 5)!.ratio).toBeNull();
  });
});
