import { describe, expect, it } from "vitest";
import { BENCHMARK, LANXESS_FIGURES, LANXESS_JUDGMENT, runSelfTest } from "./bondsBenchmark";
import { calculate, calculateIssuerRating, evaluatePublicationEligibility, ENGINE_VERSION, buildTrace, SKILL_HASH } from "./bondsEngine";
import { CAPITAL_STRUCTURE_RANGES, computeBondLR, computeIssuerLR, origFactorFromAccounts as o, origSovereignRating } from "./testSupport/lmopOriginal";

const f = (p: string) => LANXESS_FIGURES.find((x) => x.parameter === p)!.value;
const J = (k: string) => (LANXESS_JUDGMENT as Record<string, { value: number }>)[k].value;
const get = (name: string) => BENCHMARK.find((c) => c.name.startsWith(name))!;

describe("five-bond benchmark: the engine equals the owner's original code on identical frozen inputs", () => {
  it("LANXESS: every factor score, the weighted IR and the BR equal the original (exact)", () => {
    const factors = {
      leverage: o.leverage(f("netDebt"), f("ebitda")),
      interestCoverage: o.coverage(f("ebitda"), f("netInterestExpense"), f("netDebt"))!,
      freeCashFlow: o.fcf(f("cfo"), f("capex"), f("totalDebt"), f("positiveFcfYears"))!,
      liquidity: o.liquidity(f("cashPlusUndrawn"), f("debtDue24m"))!,
      earningsTrend: o.earnings(f("ebitdaCagrPct"), f("ebitdaYoyPct")),
      businessQuality: J("businessQuality"), industryRisk: J("industryRisk"), financialPolicy: J("financialPolicy"),
    };
    const macro = { recessionSensitivity: 60, oilEnergyShock: 60, warGeopolitical: 60, inflationRateShock: 60, chinaCompetition: 60, pandemicDisruption: 60 };
    const origIr = computeIssuerLR({ ...factors, macro });
    const r = calculate(get("LANXESS").facts);
    expect(r.issuer.irMin).toBeCloseTo(origIr, 9);
    expect(r.issuer.irMax).toBeCloseTo(origIr, 9);
    const [c0, c1] = CAPITAL_STRUCTURE_RANGES["senior-unsecured-opco"];
    expect(r.bond.brMin).toBeCloseTo(computeBondLR(origIr, c0, 0), 9);
    expect(r.bond.brMax).toBeCloseTo(computeBondLR(origIr, c1, 0), 9);
    // the engine's own factor scores equal the original mapper's
    const byKey = Object.fromEntries(r.issuer.terms.map((t) => [t.key, t.min]));
    for (const k of ["leverage", "interestCoverage", "freeCashFlow", "liquidity", "earningsTrend"] as const) expect(byKey[k]).toBeCloseTo(factors[k], 9);
  });
  it("Chile: sovereign table method equals the original (74)", () => {
    const r = calculate(get("Republic of Chile").facts);
    expect(origSovereignRating("Chile")).toBe(74);
    expect(r.issuer.irMin).toBe(74); expect(r.bond.brMin).toBe(74);
  });
  it("LBBW, Groupama, SMFG: no approved numerical method, so no number (never invented)", () => {
    for (const n of ["LBBW", "Groupama", "SMFG"]) {
      const r = calculate(get(n).facts);
      expect(r.issuer.approved).toBe(false); expect(r.issuer.irMin).toBeNull(); expect(r.bond.brMin).toBeNull();
      expect(r.issuer.reason).toMatch(/Unverified - insufficient data/);
    }
  });
  it("missing mandatory inputs keep bounds wide: a corporate with no figures gets 0..100, not a guess", () => {
    const r = calculateIssuerRating({ ...get("LANXESS").facts, figures: [], factors: {} });
    expect(r.irMin).toBe(0); expect(r.irMax).toBe(100);
  });
  it("same-issuer bonds share the issuer IR; different issuers are independent", () => {
    const a = calculate({ ...get("LANXESS").facts, isin: "XS0000000001" });
    const b = calculate({ ...get("LANXESS").facts, isin: "XS0000000002" });
    expect(a.issuer.irMin).toBe(b.issuer.irMin);
    expect(calculate(get("Republic of Chile").facts).issuer.irMin).not.toBe(a.issuer.irMin);
  });
  it("a subordinated tier gets the original's capital-structure adjustment", () => {
    const base = get("LANXESS").facts;
    const sub = calculate({ ...base, structural: { tier: "tier2-bank", flags: {} } });
    const ir = sub.issuer.irMin!;
    expect(sub.bond.brMin).toBeCloseTo(computeBondLR(ir, CAPITAL_STRUCTURE_RANGES["tier2-bank"][0], 0), 9);
    expect(sub.bond.brMax).toBeCloseTo(computeBondLR(ir, CAPITAL_STRUCTURE_RANGES["tier2-bank"][1], 0), 9);
    expect(sub.bond.brMax!).toBeLessThan(ir);
  });
  it("the live self-test passes, and the trace carries the required fields", () => {
    const t = runSelfTest();
    expect(t.pass).toBe(true); expect(t.deterministic).toBe(true);
    const tr = buildTrace(get("Republic of Chile").facts) as Record<string, unknown>;
    for (const k of ["isin", "canonicalIssuerId", "methodologyVersion", "skillHash", "engineVersion", "verifiedInputs", "reportingDates", "factorScores", "weights", "riskAdjustments", "bondAdjustments", "ir", "br", "publicationEligibility", "evidence"]) expect(tr, k).toHaveProperty(k);
    expect(tr.skillHash).toBe(SKILL_HASH); expect(tr.engineVersion).toBe(ENGINE_VERSION);
  });
  it("eligibility blocks a different engine version and a result that cannot be reproduced", () => {
    const facts = get("Republic of Chile").facts;
    const base = { f: facts, storedIr: [74, 74] as [number, number], storedBr: [74, 74] as [number, number], storedEngineVersion: ENGINE_VERSION, conflicts: [], evidenceCoverageOk: true, mandatoryOk: true, bondFactsOk: true };
    expect(evaluatePublicationEligibility(base).allowed).toBe(true);
    expect(evaluatePublicationEligibility({ ...base, storedEngineVersion: "old" }).allowed).toBe(false);
    expect(evaluatePublicationEligibility({ ...base, storedIr: [80, 80] }).allowed).toBe(false);
    expect(evaluatePublicationEligibility({ ...base, mandatoryOk: false }).allowed).toBe(false);
  });
});
