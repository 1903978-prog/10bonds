import { describe, expect, it } from "vitest";
import { canPublishBR, canPublishIR, evaluate } from "./creditGate";
import { MACRO_KEYS, type FactorMap } from "./livioIssuerModel";
import { RISK_KEYS, scoreResearch, type Evidence, type ResearchFacts } from "./creditScoring";

const NOW = new Date("2026-11-02T00:00:00Z");
const ev = (url: string, publisher: string, primary: boolean): Evidence => ({ url, title: "t", publisher, publishedAt: "2026-03-01", period: "FY2025", retrievedAt: "2026-11-02T00:00:00Z", location: "p. 10", method: "pdf-text", verification: "verified", primary });
const factors = (acc: number, typed: number): FactorMap => Object.fromEntries([
  ...(["leverage", "interestCoverage", "freeCashFlow", "liquidity", "earningsTrend"] as const).map((k) => [k, { value: acc, origin: "accounts" as const, period: "2025-12-31" }]),
  ...(["businessQuality", "industryRisk", "financialPolicy", ...MACRO_KEYS] as const).map((k) => [k, { value: typed, origin: "typed" as const }]),
]);
const corp = (isin: string, name: string, lei: string, host: string, over: Partial<ResearchFacts> = {}): ResearchFacts => ({
  isin, issuerType: "corporate", seniority: "senior_unsecured", guaranteed: false, agencyRatings: [],
  metrics: { netDebtToEbitda: 2, interestCover: 6 }, metricPeriods: { netDebtToEbitda: "2025-12-31", interestCover: "2025-12-31" },
  risks: RISK_KEYS.map((key) => ({ key, color: "AMBER" as const, explanation: "x", evidence: [`https://${host}/ar.pdf`], verifiedOn: "2026-11-02" })),
  conflicts: [], evidence: [ev(`https://${host}/ar.pdf`, name, true), ev("https://www.sec.example.org/f", "Regulator", true), ev("https://data.example.net/x", "Data", false), ev(`https://api.gleif.org/api/v1/lei-records/${lei}`, "GLEIF", true)],
  issuer: { canonicalId: name, legalName: name, lei, identityVerified: false, typeVerified: true },
  factors: factors(75, 70),
  structural: { tier: "senior-unsecured-opco", flags: {} },
  bond: { legalIssuerMatchesIsin: true, seniorityVerified: true, guaranteeStatus: "none_confirmed", bondType: "senior unsecured", resolutionTreatment: "not applicable", callable: false, embeddedRisksAssessed: true, evidence: [`https://${host}/ar.pdf`] },
  ...over,
});
const A = () => corp("XS0000000101", "Alpha Industrial plc", "AAAAAAAAAAAAAAAAAA11", "alpha.example.com");

describe("owner's corporate model through the gate", () => {
  it("fully evidenced corporate: IR and BR are computed from the owner's factors and may publish", () => {
    const f = A(); const s = scoreResearch(f);
    expect(s.version).toMatch(/bonds-engine/);
    expect(s.irMin).toBe(s.irMax); // everything known: the range collapses
    const g = evaluate(f, s, NOW);
    expect(g.ir.reasons).toEqual([]);
    expect(g.br.reasons).toEqual([]);
    expect(g.publishIr && g.publishBr).toBe(true);
  });
  it("an agency rating is not an input: adding or removing it changes nothing", () => {
    const a = scoreResearch(A()), b = scoreResearch({ ...A(), agencyRatings: [{ agency: "S&P", rating: "AAA", scope: "issuer", date: null }] });
    expect([a.irMin, a.irMax, a.brMin, a.brMax]).toEqual([b.irMin, b.irMax, b.brMin, b.brMax]);
  });
  it("6/missing financials: sector defaults and estimates leave the range too wide, so nothing publishes", () => {
    const f = A(); f.factors = Object.fromEntries(Object.entries(factors(75, 70)).map(([k, v]) => [k, { ...v!, origin: "estimated" as const }]));
    const g = evaluate(f, scoreResearch(f), NOW);
    expect(g.publishIr).toBe(false);
    expect(g.ir.reasons.join(" ")).toMatch(/wide/);
    expect(g.ir.missingCritical.length).toBe(5);
  });
  it("judgment factors left unknown widen IR beyond 15 points", () => {
    const f = A(); const fx = factors(75, 70); for (const k of ["businessQuality", "industryRisk", "financialPolicy"] as const) delete fx[k]; f.factors = fx;
    const s = scoreResearch(f);
    expect(s.irMax - s.irMin).toBeGreaterThan(15);
    expect(canPublishIR(f, s, NOW).allowed).toBe(false);
  });
  it("7. same issuer, two ISINs: same IR, separate BR calculation", () => {
    const x = A(), y = { ...A(), isin: "XS0000000102", structural: { tier: "senior-secured" as const, flags: { strongCollateralPackage: true } } };
    const sx = scoreResearch(x), sy = scoreResearch(y);
    expect([sx.irMin, sx.irMax]).toEqual([sy.irMin, sy.irMax]);
    expect(sy.brMin).toBeGreaterThan(sx.brMin);
    expect(canPublishBR(y, canPublishIR(y, sy, NOW), sy, NOW).allowed).toBe(true);
  });
  it("8. two different issuers with identical valid scores are both allowed", () => {
    const b = corp("XS0000000103", "Beta Services SA", "BBBBBBBBBBBBBBBBBB22", "beta.example.fr");
    const ga = evaluate(A(), scoreResearch(A()), NOW), gb = evaluate(b, scoreResearch(b), NOW);
    expect(scoreResearch(A()).irMin).toBe(scoreResearch(b).irMin);
    expect(ga.publishIr && gb.publishIr).toBe(true);
  });
  it("11. stale account factors block", () => {
    const f = A(); f.factors = { ...f.factors, leverage: { value: 75, origin: "accounts", period: "2023-12-31" } };
    expect(canPublishIR(f, scoreResearch(f), NOW).reasons.join(" ")).toMatch(/too old/);
  });
  it("10. bond above issuer only with a recorded structural reason", () => {
    const f = { ...A(), structural: { tier: "senior-secured" as const, flags: { strongerParentGuarantee: true } } };
    const s = scoreResearch(f);
    expect(s.brMin).toBeGreaterThan(s.irMax);
    expect(s.steps.some((x) => x.label.startsWith("Bond structure"))).toBe(true);
  });
});
