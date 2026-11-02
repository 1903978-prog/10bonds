import { describe, expect, it } from "vitest";
import { extractBankFigures, quoteSupports } from "./creditExtract";
import { reconcileSeniority } from "./creditFeedFacts";
import { evaluate } from "./creditGate";
import { LBBW_CASE } from "./creditReferenceCases";
import { RISK_KEYS, scoreResearch, type ResearchFacts } from "./creditScoring";

// End-to-end regression case DE000LB2CW16 (LBBW). The text below is a TEST FIXTURE written from the figures in the owner's external analysis (2 Nov 2026);
// it is NOT LBBW's wording. The real citations come from the Lenovo worker reading LBBW's own H1 2026 page. These tests prove the pipeline logic:
// exact figures are recovered with quotes, absent figures stay missing, seniority is not taken from the data copy, and nothing becomes public early.
const URL_H1 = "https://www.lbbw.de/article/press-release/lbbw-firmly-on-track_ancu4bx2g2_e.html";
const FIXTURE = [
  "Group results for the first half of 2026.",
  "The CET1 ratio stood at 16.1 percent at the end of June.",
  "The non-performing exposures ratio (NPE) was 0.9 per cent.",
  "Return on equity reached 8.3 %.",
  "Pre-tax profit amounted to EUR 708 million.",
  "The total capital ratio was 19.9 %.",
  "The cost/income ratio was 60.4 %.",
].join("\n");

describe("LBBW DE000LB2CW16 regression", () => {
  it("recovers the figures with quotes and leaves anything absent as missing", () => {
    const r = extractBankFigures(FIXTURE);
    const get = (p: string) => r.found.find((f) => f.parameter === p);
    expect(get("cet1Pct")?.value).toBe(16.1);
    expect(get("npePct")?.value).toBe(0.9);
    expect(get("nplPct")).toBeUndefined(); // NPE is never relabelled as NPL
    expect(get("roePct")?.value).toBe(8.3);
    expect(get("pretaxProfitEurM")?.value).toBe(708);
    expect(get("totalCapitalPct")?.value).toBe(19.9);
    expect(get("costIncomePct")?.value).toBe(60.4);
    for (const f of r.found) expect(quoteSupports(FIXTURE, f.quote, f.value)).toBe(true); // every value cites a sentence of the document
    // a figure that is not in the text is never inferred
    const partial = extractBankFigures(FIXTURE.split("\n").filter((l) => !/non-performing/.test(l)).join("\n"));
    expect(partial.missing).toContain("npePct");
    expect(partial.found.find((f) => f.parameter === "npePct")).toBeUndefined();
  });
  it("rejects a value whose quote is not in the document or does not contain the number", () => {
    expect(quoteSupports(FIXTURE, "The CET1 ratio stood at 17.9 percent.", 17.9)).toBe(false); // not in the text
    expect(quoteSupports(FIXTURE, "The CET1 ratio stood at 16.1 percent at the end of June.", 18.2)).toBe(false); // number not in the quote
  });
  it("seniority: the site's data copy (non-preferred) cannot override regulatory data (preferred); final terms are needed to verify", () => {
    const a = reconcileSeniority({ dataCopy: "Senior Non-Preferred", regulatory: "Senior Preferred" });
    expect(a.seniority).toBe("senior_preferred");
    expect(a.verified).toBe(false);
    expect(a.conflicts.join(" ")).toMatch(/disagree/);
    const b = reconcileSeniority({ dataCopy: "Senior Non-Preferred" });
    expect(b.verified).toBe(false);
    expect(b.basis).toMatch(/hint/);
    const c = reconcileSeniority({ regulatory: "Senior Preferred", finalTerms: "senior preferred notes" });
    expect(c).toMatchObject({ seniority: "senior_preferred", verified: true, conflicts: [] });
  });
  it("with these facts the IR/BR cannot be public yet (final terms, liquidity, approved bank method, evidence rules)", () => {
    const f: ResearchFacts = {
      isin: LBBW_CASE.isin, issuerType: "bank", seniority: "senior_preferred", guaranteed: null,
      agencyRatings: [{ agency: "Moody's", rating: "Aa2", scope: "instrument", date: null }, { agency: "Fitch", rating: "AA-", scope: "instrument", date: null }],
      metrics: { cet1Pct: 16.1, nplPct: 0.9 }, metricPeriods: { cet1Pct: "2026-06-30", nplPct: "2026-06-30" },
      risks: RISK_KEYS.map((key) => ({ key, color: "GREY" as const, explanation: "", evidence: [], verifiedOn: null })),
      conflicts: [], notes: [],
      evidence: [{ url: URL_H1, title: "LBBW H1 2026", publisher: "LBBW", publishedAt: "2026-08-28", period: "H1 2026", retrievedAt: "2026-11-02T00:00:00Z", location: null, method: "text", verification: "verified", primary: true }],
      issuer: { canonicalId: "LBBW", legalName: "Landesbank Baden-Württemberg", lei: LBBW_CASE.lei, identityVerified: false, typeVerified: true },
      bond: { legalIssuerMatchesIsin: true, seniorityVerified: false, guaranteeStatus: "unknown", bondType: null, resolutionTreatment: null, callable: null, embeddedRisksAssessed: false, evidence: [] },
    };
    const g = evaluate(f, scoreResearch(f), new Date("2026-11-02T00:00:00Z"));
    expect(g.publishIr).toBe(false);
    expect(g.publishBr).toBe(false);
    expect(g.ir.reasons.join(" ")).toMatch(/Risk categories not assessed/);
    expect(g.ir.reasons.join(" ")).toMatch(/primary source/);
    expect(g.br.reasons.join(" ")).toMatch(/seniority not verified/i);
    expect(g.br.reasons.join(" ")).toMatch(/Guarantee status/);
    // the bond-level agency grades alone never feed the issuer anchor
    expect(scoreResearch(f).steps[0].label).toMatch(/Bond-level grade/);
  });
  it("the reference case is labelled internal, not validated, and states what is unverified", () => {
    expect(LBBW_CASE.status).toBe("internal_provisional");
    expect(LBBW_CASE.seniority.value).toBe("senior_preferred");
    expect(LBBW_CASE.seniority.finalTermsChecked).toBe(false);
    expect(LBBW_CASE.inputs.filter((i) => i.period === "H1 2026")).toHaveLength(9);
    expect(LBBW_CASE.caveats.join(" ")).toMatch(/LCR and NSFR are from year-end 2024/);
    expect(LBBW_CASE.caveats.join(" ")).toMatch(/Final terms have NOT been checked/);
  });
});

// ---- end to end: worker pure steps -> website validation -> scoring -> gate (all with fixture documents, no network) ----
import { parseResult } from "./creditResearchSchema";
import { enrichFromFeed } from "./creditFeedFacts";

type Doc = { url: string; title: string; publisher: string; period: string | null; primary: boolean; method: string; text: string; retrievedAt: string; verified?: boolean };
async function worker() {
  process.env.WORKER_TOKEN = "crw_test"; process.env.OLLAMA_MODEL = "test";
  const path = "../scripts/credit-worker/worker.mjs";
  return (await import(/* @vite-ignore */ path)) as Record<string, (...a: never[]) => unknown>;
}
const NOWISO = "2026-11-02T10:00:00Z";
const docs = (): Doc[] => [
  { url: "https://api.gleif.org/api/v1/lei-records/B81CK4ESI35472RHJ606", title: "GLEIF record Landesbank Baden-Württemberg", publisher: "gleif.org", period: null, primary: true, method: "api", verified: true, text: '{"lei":"B81CK4ESI35472RHJ606","legalName":"Landesbank Baden-Württemberg"}', retrievedAt: NOWISO },
  { url: URL_H1, title: "LBBW H1 2026 results", publisher: "lbbw.de", period: null, primary: true, method: "html", text: "Half-year results 2026: first half of 2026.\n" + FIXTURE, retrievedAt: NOWISO },
  { url: "https://bankingresolution.com/instruments/DE000LB2CW16", title: "Instrument", publisher: "bankingresolution.com", period: null, primary: false, method: "html", text: "DE000LB2CW16 Landesbank Baden-Württemberg 0.375% 2031 Senior Preferred unsecured", retrievedAt: NOWISO },
];

describe("LBBW end to end through the worker steps (fixture documents)", () => {
  it("figures come with citations, NPE is not NPL, seniority is preferred but unverified, a data-copy conflict is recorded, and nothing publishes", async () => {
    const w = await worker();
    const job = { isin: LBBW_CASE.isin, known: { issuer: "Landesbank Baden-Württemberg", seniority: "Senior Non-Preferred", ratingSp: "AA" }, identity: { lei: LBBW_CASE.lei, legalName: "Landesbank Baden-Württemberg" } };
    const d = docs();
    const { figures, conflicts } = (await (w.gatherFigures as unknown as (j: unknown, d: unknown, f: null) => Promise<{ figures: { parameter: string; value: number; quote: string; url: string; reportingDate: string | null }[]; conflicts: string[] }>)(job, d, null));
    expect(figures.find((f) => f.parameter === "cet1Pct")).toMatchObject({ value: 16.1, url: URL_H1, reportingDate: "2026-06-30" });
    expect(figures.find((f) => f.parameter === "cet1Pct")!.quote).toMatch(/16\.1/);
    const built = (w.buildExtra as unknown as (j: unknown, d: unknown, f: unknown, c: unknown) => { evidence: unknown[]; metrics: Record<string, number>; extra: Record<string, unknown> })(job, d, figures, conflicts);
    expect(built.metrics).toEqual({ cet1Pct: 16.1 }); // NPE 0.9 is NOT written into nplPct
    // what the website receives from the worker (the model contributes only risk text here)
    const parsed = parseResult(LBBW_CASE.isin, { issuerType: "bank", seniority: "senior_non_preferred", agencyRatings: [], risks: [], ...built.extra, metrics: built.metrics, evidence: built.evidence });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const f = parsed.facts;
    expect(f.seniority).toBe("senior_preferred");                      // not the senior non-preferred the engine used before
    expect(f.metrics.cet1Pct).toBe(16.1);
    expect(f.metrics.nplPct ?? null).toBeNull();
    expect(f.figures?.map((x) => x.parameter)).toEqual(expect.arrayContaining(["cet1Pct", "npePct", "roePct", "pretaxProfitEurM", "totalCapitalPct"]));
    expect(f.bond?.seniorityVerified ?? false).toBe(false);          // final terms not checked
    expect(f.issuer?.lei).toBe(LBBW_CASE.lei);
    expect(f.evidence.find((e) => e.url === URL_H1)?.verification).toBe("verified");
    expect(f.evidence.find((e) => e.publisher === "bankingresolution.com")?.verification).toBe("unverified");
    // the site's data copy (senior non-preferred) disagrees: recorded as a conflict, never silently used
    const enriched = enrichFromFeed(f, { issuer: "Landesbank Baden-Württemberg", name: "LBBW 0.375% 2031", ratingSp: "AA", ratingMoodys: null, ratingFitch: null, seniority: "Senior Non-Preferred" });
    expect(enriched.seniority).toBe("senior_preferred");
    expect(enriched.conflicts.join(" ")).toMatch(/data copy says senior_non_preferred/);
    const g = evaluate(enriched, scoreResearch(enriched), new Date(NOWISO));
    expect(g.publishIr).toBe(false);
    expect(g.publishBr).toBe(false);
    expect(g.br.reasons.join(" ")).toMatch(/seniority not verified/i);
  });
  it("a figure with a made-up quote is rejected by the website", () => {
    const r = parseResult(LBBW_CASE.isin, { issuerType: "bank", evidence: [{ url: URL_H1, verification: "verified", primary: true, publisher: "lbbw.de" }], figures: [{ parameter: "cet1Pct", value: 17.5, unit: "%", quote: "The CET1 ratio stood at 16.1 percent.", url: URL_H1 }], metrics: { cet1Pct: 17.5 } });
    expect(r.ok && r.facts.metrics.cet1Pct).toBeNull();
    expect(r.ok && r.facts.notes?.join(" ")).toMatch(/quote does not contain the number/);
  });
});
