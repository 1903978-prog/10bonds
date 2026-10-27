import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { spreadVerdicts } from "./spreadDiagnostic";

const bond = (isin: string, issuer: string, ytm: number, rating: string, dur = 5): PublicBond => ({
  isin, name: isin, issuer, country: null, currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});

describe("spread adequacy diagnostic (paper 5.3 example)", () => {
  const aa = bond("AA1", "Sanofi", 4.0, "AA");
  const a1 = bond("A1", "Axa", 4.05, "A");
  const a2 = bond("A2", "Enel", 4.2, "A");
  const all = [aa, a1, a2];
  const v = spreadVerdicts(all, all);
  it("A at 4.05% is below the AA to A hurdle (15 bp at 5 years)", () => expect(v.get("A1")!.status).toBe("below_hurdle"));
  it("A at 4.20% passes at 5 years", () => expect(v.get("A2")!.status).toBe("adequate"));
  it("AA has nothing safer, so no verdict", () => expect(v.get("AA1")!.status).toBe("insufficient_data"));
  it("a diagnostic never changes the universe", () => expect(all).toHaveLength(3));
  it("B+ and below have no published step", () => expect(spreadVerdicts([bond("B1", "Orange", 9, "B+")], [...all, bond("B1", "Orange", 9, "B+")]).get("B1")!.status).toBe("insufficient_data"));
});
