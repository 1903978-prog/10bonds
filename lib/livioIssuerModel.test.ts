import { describe, expect, it } from "vitest";
import { bondLrBounds, CORE_KEYS, factorFromAccounts, ISSUER_LR_WEIGHTS, issuerLrBounds, MACRO_FACTOR_WEIGHTS, MACRO_KEYS, sfaOf, type FactorMap } from "./livioIssuerModel";

const all = (v: number, origin: "typed" | "accounts" | "estimated" = "typed"): FactorMap => Object.fromEntries([...CORE_KEYS, ...MACRO_KEYS].map((k) => [k, { value: v, origin }]));

describe("the owner's issuer model", () => {
  it("weights add up to 100% and macro weights to 100% of the macro block", () => {
    const core = CORE_KEYS.reduce((s, k) => s + ISSUER_LR_WEIGHTS[k], 0);
    expect(core + ISSUER_LR_WEIGHTS.macro).toBeCloseTo(1, 10);
    expect(Object.values(MACRO_FACTOR_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it("all factors known: the range collapses to the owner's exact weighted sum", () => {
    const b = issuerLrBounds(all(70));
    expect(b.min).toBeCloseTo(70, 9); expect(b.max).toBeCloseTo(70, 9); expect(b.unknown).toEqual([]);
  });
  it("missing factors widen the range through their weights; nothing is filled in", () => {
    const f = all(70); f.businessQuality = null;
    const b = issuerLrBounds(f);
    expect(b.unknown).toEqual(["businessQuality"]);
    expect(b.max - b.min).toBeCloseTo(8.5, 9); // 8.5% weight x 100 points
    expect(issuerLrBounds({}).max - issuerLrBounds({}).min).toBeCloseTo(100, 9);
  });
  it("estimated and rating-implied values count as unknown (no default scores, no agency anchor)", () => {
    expect(issuerLrBounds(all(70, "estimated")).max - issuerLrBounds(all(70, "estimated")).min).toBeCloseTo(100, 9);
    const f = all(70); f.leverage = { value: 90, origin: "rating-implied" };
    expect(issuerLrBounds(f).unknown).toContain("leverage");
  });
  it("account bands are the owner's", () => {
    expect(factorFromAccounts.leverage(150, 100)).toBe(75);      // 1.5x -> band up to 2x
    expect(factorFromAccounts.leverage(10, -5)).toBe(0);
    expect(factorFromAccounts.coverage(100, 20, 50)).toBe(75);   // 5x clears the 4x band but not 6x
  });
  it("BR = IR range + tier CSA range + flags; subordination lowers it, a guarantee raises it", () => {
    const ir = { min: 70, max: 76 };
    expect(bondLrBounds(ir, "senior-unsecured-opco", {})).toMatchObject({ min: 70, max: 76 });
    expect(bondLrBounds(ir, "senior-non-preferred-bank", {})).toMatchObject({ min: 65, max: 73 });
    expect(bondLrBounds(ir, "senior-secured", { strongerParentGuarantee: true }).min).toBeGreaterThan(70);
    expect(sfaOf({ callableAtIssuerDiscretion: true, perpetualHybrid: true })).toBe(-6.5);
  });
});
