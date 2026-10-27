import { describe, expect, it } from "vitest";
import { isExcludedRank, lgdOf, rankOfText } from "./seniority";

// Formula audit 27/10/2026, check 3: rank from the seniority FIELD (not the name); excluded ranks; loss given default by rank.
describe("seniority wording", () => {
  it.each([
    "Subordinated", "Senior Subordinated", "Junior Subordinated", "Lower Tier 2", "Upper Tier 2", "Tier 2", "Tier 3", "T2", "LT2",
    "Additional Tier 1", "AT1", "CoCo", "Contingent Convertible", "Hybrid", "Perpetual", "Perp NC5", "Subordinated Non-Preferred",
    "Nachrangig", "Mezzanine", "Deeply Subordinated", "Capital Note", "Preferred Stock",
  ])("%s is excluded (sub, 90% loss)", (s) => {
    expect(rankOfText(s)).toBe("sub");
    expect(isExcludedRank({ seniority: s })).toBe(true);
    expect(lgdOf({ seniority: s })).toBe(0.9);
  });
  it.each(["Senior Unsecured", "Senior Preferred", "Senior Secured", "Unsubordinated", "Senior Unsubordinated", "Non-subordinated", "Not subordinated", "Secured", "Sr Unsecured"])(
    "%s is senior (60% loss, kept)", (s) => {
      expect(rankOfText(s)).toBe("senior");
      expect(isExcludedRank({ seniority: s })).toBe(false);
      expect(lgdOf({ seniority: s })).toBe(0.6);
    },
  );
  it.each(["Senior Non-Preferred", "Senior Non Preferred", "SNP", "Non-Preferred Senior"])("%s is senior non-preferred (75% loss, kept)", (s) => {
    expect(rankOfText(s)).toBe("snp");
    expect(isExcludedRank({ seniority: s })).toBe(false);
    expect(lgdOf({ seniority: s })).toBe(0.75);
  });
  it("no seniority in the data counts as senior preferred", () => {
    expect(lgdOf({ seniority: null })).toBe(0.6);
    expect(lgdOf({ seniority: "  " })).toBe(0.6);
  });
});
