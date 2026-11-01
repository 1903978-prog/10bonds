import { describe, expect, it } from "vitest";
import { scoreResearch, SCORING_VERSION, RISK_KEYS, type ResearchFacts } from "./creditScoring";
import { parseResult } from "./creditResearchSchema";

const ev = (url: string, primary = true) => ({ url, title: "t", publisher: "p", publishedAt: "2026-06-30", period: "H1 2026", retrievedAt: "2026-11-01T00:00:00Z", location: "p.4", method: "ollama-json", verification: "verified" as const, primary });
const base = (o: Partial<ResearchFacts> = {}): ResearchFacts => ({
  isin: "DE000AAR0504", issuerType: "bank", seniority: "senior_preferred", guaranteed: null,
  agencyRatings: [{ agency: "Fitch", rating: "A-", scope: "issuer", date: "2026-05-01" }],
  metrics: { cet1Pct: 16, nplPct: 1.5 },
  risks: RISK_KEYS.map((key) => ({ key, color: "GREEN" as const, explanation: "checked", evidence: ["https://a.example/x"], verifiedOn: "2026-11-01" })),
  conflicts: [], evidence: [ev("https://a.example/x"), ev("https://b.example/y")], ...o,
});

describe("scoreResearch", () => {
  it("is reproducible", () => {
    expect(scoreResearch(base())).toEqual(scoreResearch(base()));
    expect(scoreResearch(base()).version).toBe(SCORING_VERSION);
  });
  it("keeps IR and BR apart: a senior non-preferred bond scores below the same issuer's senior preferred bond", () => {
    const pref = scoreResearch(base());
    const snp = scoreResearch(base({ seniority: "senior_non_preferred" }));
    expect([snp.irMin, snp.irMax]).toEqual([pref.irMin, pref.irMax]);
    expect(snp.brMax).toBeLessThan(pref.brMax);
    expect(snp.brMax).toBeLessThan(snp.irMax);
  });
  it("widens the range and asks for review when evidence is thin, and never invents an anchor", () => {
    const thin = scoreResearch(base({ agencyRatings: [], metrics: {}, risks: [], evidence: [], seniority: "unknown" }));
    const full = scoreResearch(base());
    expect(thin.irMax - thin.irMin).toBeGreaterThan(full.irMax - full.irMin);
    expect(thin.status).toBe("review_required");
    expect(thin.anchorGrade).toBeNull();
    expect(thin.missing).toContain("issuer agency rating");
  });
  it("treats GREEN without evidence as not researched", () => {
    const s = scoreResearch(base({ risks: RISK_KEYS.map((key) => ({ key, color: "GREEN" as const, explanation: "", evidence: [], verifiedOn: null })) }));
    expect(s.riskAdjustments.every((r) => r.color === "GREY")).toBe(true);
  });
  it("red risks lower both ratings; conflicts force review", () => {
    const red = scoreResearch(base({ risks: RISK_KEYS.map((key, i) => ({ key, color: i === 0 ? ("RED" as const) : ("GREEN" as const), explanation: "x", evidence: ["https://a.example/x"], verifiedOn: null })), conflicts: ["two sources disagree on CET1"] }));
    expect(red.irMax).toBeLessThan(scoreResearch(base()).irMax + 4);
    expect(red.status).toBe("review_required");
  });
  it("uses only issuer-scope grades for the anchor", () => {
    const s = scoreResearch(base({ agencyRatings: [{ agency: "Fitch", rating: "BBB", scope: "instrument", date: null }] }));
    expect(s.anchorGrade).toBeNull();
  });
});

describe("parseResult", () => {
  it("drops non-https sources and risk evidence that was never retrieved, and ignores bad enums", () => {
    const p = parseResult("DE000AAR0504", {
      seniority: "super-senior", issuerType: "bank",
      evidence: [{ url: "http://x.example", title: "no" }, { url: "https://ok.example/a", title: "ok", verification: "verified", primary: true }],
      risks: [{ key: "news_mgmt_legal", color: "GREEN", evidence: ["https://ok.example/a", "https://invented.example"] }, { key: "bogus", color: "RED" }],
      metrics: { cet1Pct: "16", nplPct: 1.5 },
    });
    if (!p.ok) throw new Error("expected ok");
    expect(p.facts.seniority).toBe("unknown");
    expect(p.facts.evidence).toHaveLength(1);
    expect(p.facts.risks).toHaveLength(1);
    expect(p.facts.risks[0].evidence).toEqual(["https://ok.example/a"]);
    expect(p.facts.metrics.cet1Pct).toBeNull();
  });
});
