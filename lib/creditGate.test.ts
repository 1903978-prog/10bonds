import { describe, expect, it } from "vitest";
import { canPublishBR, canPublishIR, evaluate, publicationState, sourceKey } from "./creditGate";
import { RISK_KEYS, scoreResearch, type Evidence, type ResearchFacts } from "./creditScoring";

const NOW = new Date("2026-11-02T00:00:00Z");
const ev = (url: string, publisher: string, primary: boolean, verification: Evidence["verification"] = "verified"): Evidence => ({ url, title: "t", publisher, publishedAt: "2026-08-28", period: "H1 2026", retrievedAt: "2026-11-02T00:00:00Z", location: "p. 3", method: "pdf-text", verification, primary });
const EVIDENCE = [ev("https://www.lbbw.de/h1.pdf", "LBBW", true), ev("https://www.ecb.europa.eu/x", "ECB", true), ev("https://www.boerse-stuttgart.de/p", "Boerse Stuttgart", false), ev("https://api.gleif.org/api/v1/lei-records/B81CK4ESI35472RHJ606", "GLEIF", true)];

/** A bank with everything the gate asks for. `independent` is set by hand: the v0.1 scorer cannot set it (see the last test). */
const good = (over: Partial<ResearchFacts> = {}): ResearchFacts => ({
  isin: "DE000LB2CW16", issuerType: "bank", seniority: "senior_preferred", guaranteed: false,
  agencyRatings: [{ agency: "Moody's", rating: "Aa2", scope: "issuer", date: "2026-01-01" }],
  metrics: { cet1Pct: 16.1, nplPct: 0.9 }, metricPeriods: { cet1Pct: "2026-06-30", nplPct: "2026-06-30" },
  risks: RISK_KEYS.map((key) => ({ key, color: "AMBER" as const, explanation: "x", evidence: ["https://www.lbbw.de/h1.pdf"], verifiedOn: "2026-11-02" })),
  conflicts: [], evidence: EVIDENCE,
  issuer: { canonicalId: "LBBW", legalName: "Landesbank Baden-Württemberg", lei: "B81CK4ESI35472RHJ606", identityVerified: false, typeVerified: true },
  bond: { legalIssuerMatchesIsin: true, seniorityVerified: true, guaranteeStatus: "none_confirmed", bondType: "senior unsecured MTN", resolutionTreatment: "senior preferred", callable: false, embeddedRisksAssessed: true, evidence: ["https://www.lbbw.de/h1.pdf"] },
  ...over,
});
const indep = (f: ResearchFacts) => ({ ...scoreResearch(f), independent: true });
const ir = (f: ResearchFacts) => canPublishIR(f, indep(f), NOW);
const br = (f: ResearchFacts) => canPublishBR(f, ir(f), indep(f), NOW);

describe("publication gate", () => {
  it("1. one agency rating only: IR and BR blocked", () => {
    const f: ResearchFacts = { isin: "XS1", issuerType: "bank", seniority: "unknown", guaranteed: null, agencyRatings: [{ agency: "S&P", rating: "A", scope: "issuer", date: null }], metrics: {}, risks: [], conflicts: [], evidence: [] };
    const g = evaluate(f, indep(f), NOW);
    expect(g.ir.allowed).toBe(false); expect(g.br.allowed).toBe(false);
    expect(g.publishIr || g.publishBr).toBe(false);
    expect(g.state).toBe("insufficient_evidence");
    expect(g.ir.reasons.join(" ")).toMatch(/parameters verified/);
  });
  it("2. one source and seniority only: both blocked", () => {
    const f = good({ metrics: {}, metricPeriods: {}, risks: [], evidence: [EVIDENCE[0]], agencyRatings: [], bond: undefined });
    expect(ir(f).allowed).toBe(false); expect(br(f).allowed).toBe(false);
  });
  it("3. 11/12 parameters but CET1 missing: bank IR blocked", () => {
    const f = good({ metrics: { nplPct: 0.9 } });
    const r = ir(f);
    expect(r.allowed).toBe(false);
    expect(r.missingCritical).toContain("cet1Pct");
  });
  it("4. everything present and passing: eligible", () => {
    const r = ir(good());
    expect(r.reasons).toEqual([]);
    expect(r.allowed).toBe(true);
    expect(r.coverage.found).toBeGreaterThanOrEqual(10);
    expect(r.sourceQuality.primary).toBeGreaterThanOrEqual(2);
  });
  it("5. IR eligible but seniority unknown: BR blocked, IR still allowed", () => {
    const f = good({ seniority: "unknown", bond: { ...good().bond!, seniorityVerified: false } });
    // seniority is one of the 12 parameters; 11 of 12 still pass the 10 needed
    expect(ir(f).allowed).toBe(true);
    const b = br(f);
    expect(b.allowed).toBe(false);
    expect(b.reasons.join(" ")).toMatch(/seniority/);
  });
  it("9. a corporate classified as a bank is blocked", () => {
    // by its inputs (corporate ratios, no capital ratio)
    const byInputs = good({ metrics: { netDebtToEbitda: 2, interestCover: 6 }, metricPeriods: { netDebtToEbitda: "2026-06-30", interestCover: "2026-06-30" } });
    expect(ir(byInputs).reasons.join(" ")).toMatch(/classification contradicts/);
    // by its name: a bank name filed as a corporate
    const byName = good({ issuerType: "corporate", metrics: { netDebtToEbitda: 2, interestCover: 6 }, metricPeriods: { netDebtToEbitda: "2026-06-30", interestCover: "2026-06-30" } });
    expect(ir(byName).reasons.join(" ")).toMatch(/contradicts the legal name/);
  });
  it("10. a bond rating above the issuer rating needs recorded structural adjustments", () => {
    const f = good({ guaranteed: true, bond: { ...good().bond!, guaranteeStatus: "guaranteed" } });
    const s = indep(f);
    expect(s.brMax).toBeGreaterThanOrEqual(s.irMax); // guarantee / security lifts BR
    expect(canPublishBR(f, canPublishIR(f, s, NOW), s, NOW).allowed).toBe(true); // the adjustment is recorded in the steps
    const none = { ...s, steps: s.steps.filter((x) => !x.label.startsWith("Bond structure")) };
    expect(canPublishBR(f, canPublishIR(f, s, NOW), none, NOW).allowed).toBe(false);
  });
  it("11. stale or undated financials are blocked", () => {
    expect(ir(good({ metricPeriods: { cet1Pct: "2024-06-30", nplPct: "2026-06-30" } })).reasons.join(" ")).toMatch(/too old/);
    expect(ir(good({ metricPeriods: {} })).reasons.join(" ")).toMatch(/no reporting period/);
  });
  it("12. conflicting source values: review required, not publishable", () => {
    const f = good({ conflicts: ["CET1 16.1% vs 15.2%"] });
    const r = ir(f);
    expect(r.allowed).toBe(false);
    expect(publicationState(r, null)).not.toBe("publishable");
  });
  it("13. a risk category without evidence cannot count as green", () => {
    const f = good({ risks: RISK_KEYS.map((key) => ({ key, color: "GREEN" as const, explanation: "ok", evidence: [], verifiedOn: null })) });
    const r = ir(f);
    expect(r.allowed).toBe(false);
    expect(r.missingCritical.some((m) => m.startsWith("risk:"))).toBe(true);
  });
  it("14. unsupported issuer types and the v0.1 scorer cannot publish (no default metrics, no invented method)", () => {
    expect(ir(good({ issuerType: "insurer" })).reasons.join(" ")).toMatch(/No approved scoring method/);
    const f = good();
    const r = canPublishIR(f, scoreResearch(f), NOW); // the real scorer: agency grade is still its starting point
    expect(r.allowed).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/agency grade is still its starting point/);
  });
  it("sources: pages of one report, and the site's own copy, are not independent sources", () => {
    expect(sourceKey("https://www.lbbw.de/a.pdf")).toBe(sourceKey("https://investor.lbbw.de/b"));
    const f = good({ evidence: [ev("https://www.lbbw.de/a.pdf", "LBBW", true), ev("https://www.lbbw.de/b.pdf", "LBBW", true), ev("https://10bonds.com/", "10BONDS", true)] });
    const r = ir(f);
    expect(r.sourceQuality.primary).toBe(1);
    expect(r.sourceQuality.reliable).toBe(1);
  });
  it("a source marked as conflicting blocks and an unverified one does not count", () => {
    const f = good({ evidence: [...EVIDENCE, ev("https://other.example/x", "Other", false, "conflict")] });
    expect(ir(f).conflicts.length).toBeGreaterThan(0);
    const g = good({ evidence: EVIDENCE.map((e) => ({ ...e, verification: "unverified" as const })) });
    expect(ir(g).sourceQuality.reliable).toBe(0);
  });
  it("sovereigns need 9 of 11 and their debt ratio", () => {
    const f = good({ issuerType: "sovereign", metrics: {}, metricPeriods: {}, bond: undefined });
    expect(ir(f).missingCritical).toContain("debtToGdpPct");
  });
});
