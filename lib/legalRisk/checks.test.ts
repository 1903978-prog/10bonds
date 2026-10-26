import { describe, expect, it } from "vitest";
import { SOURCE_CHECKS, benchmarkCheck, contentChecks, scanClaims } from "./checks";
import { enforceEvidence, evidenceProblems, figProblem } from "./evidence";
import { fingerprint, currentFingerprints, MODEL_VERSIONS } from "./modelVersions";
import { CRITERIA, initialRisk, residualRisk, summarise } from "./register";
import { buildReport } from "../bondReport";
import type { PublicBond } from "../types";

// Release gate for the legal-risk safeguards. A pass means "no known-bad pattern", never "legally compliant".
describe("legal risk content checks", () => {
  it("no content check fails (warnings are open questions, shown on /admin/legal-risk)", () => {
    const failed = contentChecks().filter((c) => c.level === "fail");
    expect(failed.map((c) => `${c.id}: ${c.detail}`)).toEqual([]);
  });
  it("every check id referenced by the register exists", () => {
    const known = new Set([...contentChecks().map((c) => c.id), ...SOURCE_CHECKS.map((c) => c.id), "benchmark-fresh"]);
    for (const c of CRITERIA) for (const id of c.checks) expect(known.has(id), `${c.id}: ${id}`).toBe(true);
  });
});

describe("claim scanner", () => {
  it("catches banned claims", () => {
    expect(scanClaims(["Risk-free returns"])).toHaveLength(1);
    expect(scanClaims(["A guaranteed return of 5%"])).toHaveLength(1);
    expect(scanClaims(["There is a 3.2% chance of default"])).toHaveLength(1);
    expect(scanClaims(["No fees at all"])).toHaveLength(1);
    expect(scanClaims(["The best bonds for you"])).toHaveLength(1);
    expect(scanClaims(["Build my portfolio"])).toHaveLength(1);
    expect(scanClaims(["Highest risk accepted"])).toHaveLength(1);
    expect(scanClaims(["Find the best return/risk portfolio"])).toHaveLength(1);
    expect(scanClaims(["Crea il mio portafoglio"])).toHaveLength(1);
  });
  it("lets honest wording through", () => {
    expect(scanClaims(["Returns are gross and not guaranteed."])).toEqual([]);
    expect(scanClaims(["No fund management fee; broker costs apply."])).toEqual([]);
    expect(scanClaims(["Maximum risk level", "Show selected bonds", "Efficient frontier"])).toEqual([]);
  });
});

describe("model version register", () => {
  it("a changed input changes the fingerprint", () => {
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
    expect(Object.keys(currentFingerprints()).every((id) => MODEL_VERSIONS.some((m) => m.id === id))).toBe(true);
  });
});

describe("evidence gate", () => {
  const bond: PublicBond = {
    isin: "XS0000000001", name: "Test", issuer: "Test AG", country: "DE", currency: "EUR", coupon: 3, maturity: "2031-05-01",
    ratingSp: "A", ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: 3.5, modifiedDuration: 4, ytmAsOf: "2026-10-24T00:00:00Z",
  };
  it("a dated market figure passes, an undated one does not", () => {
    expect(figProblem({ text: "3.5%", status: "verified", kind: "observed", source: "Exchange / broker data", asOf: "24 Oct 2026" })).toBeNull();
    expect(figProblem({ text: "3.5%", status: "verified", kind: "observed", source: "Exchange / broker data" })).not.toBeNull();
  });
  it("model figures need a stated basis", () => {
    expect(figProblem({ text: "86/100", status: "provisional", kind: "model" })).not.toBeNull();
    expect(figProblem({ text: "86/100", status: "provisional", kind: "model", source: "10bonds internal score" })).toBeNull();
  });
  it("enforceEvidence turns an undated yield into Not verified and keeps the rest", () => {
    const r = buildReport(bond.isin, bond, null, Date.parse("2026-10-25T00:00:00Z"))!;
    r.kpis.ret = { text: "3.50%", status: "verified", kind: "observed", source: "Exchange / broker data" };
    expect(evidenceProblems(r).map((p) => p.path)).toContain("kpis.ret");
    const fixed = enforceEvidence(r);
    expect(fixed.kpis.ret.status).toBe("not_verified");
    expect(fixed.isin).toBe(r.isin);
    expect(evidenceProblems(fixed)).toEqual([]);
  });
});

describe("benchmark check", () => {
  const now = Date.parse("2026-10-25T00:00:00Z");
  it("warns when provisional or old, passes when verified and fresh", () => {
    expect(benchmarkCheck({ verified: false, asOf: "2026-10-20", on: true }, now).level).toBe("warn");
    expect(benchmarkCheck({ verified: true, asOf: "2026-08-01", on: true }, now).level).toBe("warn");
    expect(benchmarkCheck({ verified: true, asOf: "2026-10-20", on: true }, now).level).toBe("pass");
    expect(benchmarkCheck({ verified: false, asOf: "2026-01-01", on: false }, now).level).toBe("pass");
  });
});

describe("risk register", () => {
  it("has the 20 criteria with unique ids 1..20", () => {
    expect(CRITERIA.map((c) => c.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
  it("every score is 0-100 and residual risk never exceeds initial risk", () => {
    for (const c of CRITERIA) {
      for (const v of [c.probability, c.impact, c.residualProbability, c.residualImpact]) expect(v >= 0 && v <= 100).toBe(true);
      expect(residualRisk(c), `criterion ${c.id}`).toBeLessThanOrEqual(initialRisk(c));
    }
  });
  it("every criterion cites evidence, a law, a mitigation and an owner", () => {
    for (const c of CRITERIA) {
      expect(c.evidence.length, `criterion ${c.id}`).toBeGreaterThan(0);
      expect(c.law && c.mitigation && c.owner).toBeTruthy();
    }
  });
  it("never claims zero risk or legal compliance", () => {
    for (const c of CRITERIA) expect(residualRisk(c)).toBeGreaterThan(0);
    const text = JSON.stringify(CRITERIA);
    expect(/legally compliant|zero (legal )?risk|fully compliant/i.test(text)).toBe(false);
  });
  it("flags every possible authorisation question as critical regardless of score", () => {
    const ids = summarise().critical.map((c) => c.id);
    for (const c of CRITERIA.filter((x) => x.authorisationQuestion)) expect(ids).toContain(c.id);
  });
});
