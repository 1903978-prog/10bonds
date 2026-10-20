import { describe, expect, it } from "vitest";
import { rankBonds, issuerKey } from "./ranking";
import { alternativesFor } from "./alternatives";
import { shapeForTier } from "./tiers";
import { SAMPLE_BONDS } from "./sample-bonds";

describe("alternativesFor", () => {
  const { results } = rankBonds(SAMPLE_BONDS, 5, 4, undefined, 7);

  it("offers only bonds whose issuer is not already in the list", () => {
    const alts = alternativesFor(SAMPLE_BONDS, results, 5, 7, false);
    const inList = new Set(results.map(issuerKey));
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) expect(inList.has(issuerKey({ issuer: a.issuer, isin: a.isin }))).toBe(false);
    expect(new Set(alts.map((a) => a.isin)).size).toBe(alts.length);
  });

  it("gives the yield after losses only when asked (Premium)", () => {
    expect(alternativesFor(SAMPLE_BONDS, results, 5, 7, false).every((a) => a.adjYtm === undefined)).toBe(true);
    expect(alternativesFor(SAMPLE_BONDS, results, 5, 7, true).every((a) => typeof a.adjYtm === "number")).toBe(true);
  });

  it("keeps the yield after losses out of Plus results", () => {
    expect(shapeForTier(results, "plus").rows.every((r) => r.lossAdj === undefined)).toBe(true);
    expect(shapeForTier(results, "premium").rows.every((r) => typeof r.lossAdj === "number")).toBe(true);
  });
});
