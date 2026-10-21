import { describe, it, expect } from "vitest";
import { dormantReason } from "./dormant";

describe("dormant bonds", () => {
  const b = (currency: string, minInvestment: number | null) => ({ currency, minInvestment });
  it("hides EUR and USD bonds with a minimum above 200,000", () => {
    expect(dormantReason(b("EUR", 1_000_000))).toBe("min_investment_over_200k");
    expect(dormantReason(b("USD", 250_000))).toBe("min_investment_over_200k");
  });
  it("keeps 200,000 itself, smaller and unknown minimums", () => {
    expect(dormantReason(b("EUR", 200_000))).toBeNull();
    expect(dormantReason(b("USD", 1_000))).toBeNull();
    expect(dormantReason(b("EUR", null))).toBeNull();
  });
  it("leaves other currencies for review", () => expect(dormantReason(b("JPY", 100_000_000))).toBeNull());
  it("follows the copy's own flag", () => expect(dormantReason(b("EUR", 1_000), true)).toBe("min_investment_over_200k"));
});
