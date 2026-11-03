import { describe, expect, it } from "vitest";
import { canPublishIR, evaluate } from "./creditGate";
import { MACRO_KEYS } from "./livioIssuerModel";
import { interp, SCORE_TABLES, type FinFactorMap } from "./financialIssuerModel";
import { calculate } from "./bondsEngine";
import { extractBankFigures } from "./creditExtract";
import { RISK_KEYS, scoreResearch, type Evidence, type IssuerType, type ResearchFacts, type Seniority } from "./creditScoring";

// Bank and insurer method (owner approved the draft, 3/11/2026). The three issuers below are TEST FIXTURES: names are real issuers' names, the LEIs of
// Groupama and SMFG and every LCR / NSFR / insurer figure are made up for the test (LBBW's CET1, NPE, ROE, total capital are the owner's H1 2026 numbers).
// What is proved: the same engine scores them, a missing, stale or uncited input blocks publication, nothing is guessed.
const NOW = new Date("2026-11-02T00:00:00Z");
const ev = (url: string, publisher: string, primary: boolean): Evidence => ({ url, title: "t", publisher, publishedAt: "2026-08-28", period: "H1 2026", retrievedAt: "2026-11-02T00:00:00Z", location: "p. 4", method: "pdf-text", verification: "verified", primary });
const fig = (parameter: string, value: number, host: string, reportingDate = "2026-06-30") => ({ parameter, value, unit: "%", quote: `${parameter} ${value}`, url: `https://${host}/report.pdf`, period: "H1 2026", reportingDate });
const typed = (judgment: string[], v = 70): FinFactorMap => Object.fromEntries([...judgment, ...MACRO_KEYS].map((k) => [k, { value: v, origin: "typed" as const }]));

function make(over: Partial<ResearchFacts> & { name: string; lei: string; host: string; isin: string; issuerType: IssuerType; seniority: Seniority }): ResearchFacts {
  const { name, lei, host, ...rest } = over;
  return {
    guaranteed: false, agencyRatings: [], metrics: {},
    risks: RISK_KEYS.map((key) => ({ key, color: "AMBER" as const, explanation: "x", evidence: [`https://${host}/report.pdf`], verifiedOn: "2026-11-02" })),
    conflicts: [], notes: [],
    evidence: [ev(`https://${host}/report.pdf`, name!, true), ev("https://www.regulator.example.org/f", "Regulator", true), ev("https://data.example.net/x", "Data", false), ev(`https://api.gleif.org/api/v1/lei-records/${lei}`, "GLEIF", true)],
    issuer: { canonicalId: name!, legalName: name!, lei: lei!, identityVerified: false, typeVerified: true },
    bond: { legalIssuerMatchesIsin: true, seniorityVerified: true, guaranteeStatus: "none_confirmed", bondType: "senior notes", resolutionTreatment: "bail-in eligible", callable: false, embeddedRisksAssessed: true, evidence: [`https://${host}/report.pdf`] },
    ...rest,
  } as ResearchFacts;
}
const lbbwFigs = (host = "lbbw.de") => [fig("cet1Pct", 16.1, host), fig("npePct", 0.9, host), fig("roePct", 8.3, host), fig("totalCapitalPct", 19.9, host), fig("costIncomePct", 60.4, host), { ...fig("pretaxProfitEurM", 708, host), unit: "EUR m" }, fig("lcrPct", 140, host), fig("nsfrPct", 118, host)];
const lbbw = (over: Partial<ResearchFacts> = {}) => make({ isin: "DE000LB2CW16", name: "Landesbank Baden-Württemberg", lei: "B81CK4ESI35472RHJ606", host: "lbbw.de", issuerType: "bank", seniority: "senior_preferred", figures: lbbwFigs(), factors: typed(["businessModel", "support"]), ...over });

describe("score tables", () => {
  it("the three anchors of the approved draft hold", () => {
    expect(interp(10, SCORE_TABLES.cet1Pct)).toBe(20); expect(interp(14, SCORE_TABLES.cet1Pct)).toBe(60); expect(interp(18, SCORE_TABLES.cet1Pct)).toBe(90);
    expect(interp(6, SCORE_TABLES.npePct)).toBe(20); expect(interp(2, SCORE_TABLES.npePct)).toBe(70); expect(interp(1, SCORE_TABLES.npePct)).toBe(90);
    expect(interp(110, SCORE_TABLES.lcrPct)).toBe(30); expect(interp(150, SCORE_TABLES.lcrPct)).toBe(80);
    expect(interp(25, SCORE_TABLES.cet1Pct)).toBe(90); expect(interp(0.1, SCORE_TABLES.npePct)).toBe(90); // flat beyond the anchors
  });
});

describe("LBBW DE000LB2CW16 (bank, senior preferred)", () => {
  it("fully cited and current: IR is the weighted sum, BR = IR (senior preferred, tier 0), both may publish", () => {
    const f = lbbw(); const s = scoreResearch(f);
    expect(s.version).toMatch(/bonds-engine/);
    expect(s.independent).toBe(true);
    const r = calculate(f);
    expect(r.issuer.method).toBe("livio-bank-7-factor");
    expect(r.issuer.irMin).toBeCloseTo(75.67, 1); // by hand: .25x75.15 + .20x90 + .15x67.8 + .15x74.75 + .10x70 + .05x70 + .10x70 (macro) = 75.67
    expect(s.irMin).toBe(s.irMax);
    expect(s.brMin).toBe(s.irMin);
    const g = evaluate(f, s, NOW);
    expect(g.ir.reasons).toEqual([]); expect(g.br.reasons).toEqual([]);
    expect(g.publishIr && g.publishBr).toBe(true);
  });
  it("agency grades are not an input", () => {
    const a = scoreResearch(lbbw()), b = scoreResearch(lbbw({ agencyRatings: [{ agency: "Moody's", rating: "Aa2", scope: "issuer", date: null }, { agency: "Fitch", rating: "AA-", scope: "issuer", date: null }] }));
    expect([a.irMin, a.irMax, a.brMin, a.brMax]).toEqual([b.irMin, b.irMax, b.brMin, b.brMax]);
  });
  it("LCR / NSFR from 2024 are stale: no publication until current ones are cited", () => {
    const figs = lbbwFigs().map((x) => (x.parameter === "lcrPct" || x.parameter === "nsfrPct" ? { ...x, reportingDate: "2024-12-31", period: "FY2024" } : x));
    const g = canPublishIR(lbbw({ figures: figs }), undefined, NOW);
    expect(g.allowed).toBe(false);
    expect(g.reasons.join(" ")).toMatch(/lcrPct.*older than 18 months/);
  });
  it("a missing mandatory figure is never guessed: the range widens, the gate names the figure", () => {
    const f = lbbw({ figures: lbbwFigs().filter((x) => x.parameter !== "nsfrPct") });
    const s = scoreResearch(f); const g = canPublishIR(f, s, NOW);
    expect(s.irMax - s.irMin).toBeGreaterThan(0);
    expect(g.allowed).toBe(false); expect(g.missingCritical).toContain("nsfrPct");
  });
  it("NPE counts for asset quality but is never relabelled as NPL", () => {
    const f = lbbw(); expect(f.figures!.some((x) => x.parameter === "nplPct")).toBe(false);
    expect(canPublishIR(f, undefined, NOW).missingCritical).toEqual([]);
    expect(extractBankFigures("The non-performing exposures ratio (NPE) was 0.9 per cent.").found[0].parameter).toBe("npePct");
  });
  it("judgment factors nobody typed leave 25 points of weight unknown: too wide to publish", () => {
    const f = lbbw({ factors: {} }); const s = scoreResearch(f);
    expect(s.irMax - s.irMin).toBeGreaterThan(15);
    expect(evaluate(f, s, NOW).publishIr).toBe(false);
  });
  it("estimated values do not count as known", () => {
    const f = lbbw({ factors: Object.fromEntries(Object.entries(typed(["businessModel", "support"])).map(([k, v]) => [k, { ...v!, origin: "estimated" as const }])) });
    expect(scoreResearch(f).irMax - scoreResearch(f).irMin).toBeGreaterThan(15);
  });
  it("seniority not verified blocks BR but not IR", () => {
    const f = lbbw({ bond: { ...lbbw().bond!, seniorityVerified: false } });
    const g = evaluate(f, scoreResearch(f), NOW);
    expect(g.publishIr).toBe(true); expect(g.publishBr).toBe(false);
  });
  it("a different seniority changes BR by the approved tier, not IR", () => {
    const nonPref = scoreResearch(lbbw({ seniority: "senior_non_preferred" })), pref = scoreResearch(lbbw());
    expect(nonPref.irMin).toBe(pref.irMin);
    expect(nonPref.brMin).toBe(Math.round(pref.irMin - 5)); expect(nonPref.brMax).toBe(Math.round(pref.irMax - 3));
  });
});

describe("SMFG (bank holding company, senior preferred)", () => {
  const smfg = () => make({ isin: "XS0000000SM1", name: "Sumitomo Mitsui Financial Group, Inc.", lei: "SMFGTESTLEI0000000" + "11", host: "smfg.example.jp", issuerType: "financial_holding", seniority: "senior_preferred", figures: lbbwFigs("smfg.example.jp"), factors: typed(["businessModel", "support"]) });
  it("same bank factors; the holding-company tier lowers BR by 2 to 4 points", () => {
    const s = scoreResearch(smfg());
    expect(calculate(smfg()).issuer.method).toBe("livio-bank-7-factor");
    expect(s.brMin).toBe(Math.round(s.irMin - 4)); expect(s.brMax).toBe(Math.round(s.irMax - 2));
    const g = evaluate(smfg(), s, NOW);
    expect(g.publishIr).toBe(true); expect(g.br.reasons).toEqual([]);
  });
});

describe("Groupama (insurer)", () => {
  const figs = (host: string) => [fig("solvencyIIPct", 215, host), fig("combinedRatioPct", 94, host)];
  const gro = (over: Partial<ResearchFacts> = {}) => make({ isin: "FR0000000GR1", name: "Groupama Assurances Mutuelles", lei: "GROUPAMATESTLEI000" + "11", host: "groupama.example.fr", issuerType: "insurer", seniority: "senior_unsecured", figures: figs("groupama.example.fr"), factors: typed(["investments", "reserves", "businessMix", "capitalQuality"]), ...over });
  it("Solvency II and combined ratio from cited figures; judgment factors typed: IR 78, publishable", () => {
    const s = scoreResearch(gro());
    expect(calculate(gro()).issuer.method).toBe("livio-insurer-7-factor");
    expect(s.irMin).toBe(78); expect(s.irMax).toBe(78); expect(s.brMin).toBe(78);
    const g = evaluate(gro(), s, NOW);
    expect(g.ir.reasons).toEqual([]); expect(g.publishIr && g.publishBr).toBe(true);
  });
  it("a subordinated insurer bond uses the insurance Tier 2 range (-10 to -6)", () => {
    const s = scoreResearch(gro({ seniority: "tier2" }));
    expect(s.brMin).toBe(68); expect(s.brMax).toBe(72);
  });
  it("without a cited Solvency II ratio nothing is published and nothing is guessed", () => {
    const f = gro({ figures: [fig("combinedRatioPct", 94, "groupama.example.fr")] });
    const g = canPublishIR(f, scoreResearch(f), NOW);
    expect(g.allowed).toBe(false); expect(g.missingCritical).toContain("solvencyIIPct");
  });
  it("corporate ratios do not make an insurer: no factors from them", () => {
    const f = gro({ figures: [], metrics: { netDebtToEbitda: 2, interestCover: 6 } });
    expect(scoreResearch(f).irMax - scoreResearch(f).irMin).toBeGreaterThan(15);
  });
  it("the extractor reads both figures from a sentence and keeps the quote", () => {
    const r = extractBankFigures("The Solvency II ratio stood at 215 per cent at year end. The combined ratio was 94.0 per cent.");
    expect(r.found.map((x) => [x.parameter, x.value])).toEqual(expect.arrayContaining([["solvencyIIPct", 215], ["combinedRatioPct", 94]]));
  });
});

describe("types without an approved method stay blocked", () => {
  it("a structured issuer gets no number", () => {
    const f = lbbw({ issuerType: "structured" });
    const g = evaluate(f, scoreResearch(f), NOW);
    expect(g.publishIr).toBe(false); expect(g.ir.reasons.join(" ")).toMatch(/No approved scoring method/);
  });
});
