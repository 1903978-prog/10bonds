import { describe, expect, it } from "vitest";
import { PARAMETERS, parameterReport, confidenceOf } from "./creditParameters";
import { RISK_KEYS, scoreResearch, type ResearchFacts } from "./creditScoring";

const base = (isin: string, over: Partial<ResearchFacts> = {}): ResearchFacts => ({
  isin, issuerType: "corporate", seniority: "senior_unsecured", guaranteed: null,
  agencyRatings: [{ agency: "S&P (data copy)", rating: "BBB+", scope: "issuer", date: null }], metrics: {}, risks: [], conflicts: [], evidence: [], ...over,
});

describe("parameter list", () => {
  it("counts gathered / maximum from the single list, per issuer type", () => {
    const thin = parameterReport(base("A"));
    // corporate: agency, seniority, guarantee, 2 metrics, 6 risks, sources = 12
    expect(thin.max).toBe(12);
    expect(thin.found).toBe(2); // agency + seniority
    expect(thin.confidence).toBe("low");
    expect(parameterReport(base("B", { issuerType: "bank" })).max).toBe(12);
    expect(parameterReport(base("C", { issuerType: "sovereign" })).max).toBe(11);
    expect(PARAMETERS.filter((p) => p.group === "Risk categories")).toHaveLength(RISK_KEYS.length);
  });
  it("green without named evidence is not counted; with evidence it is, with its source", () => {
    const ev = { url: "https://x.example/r", title: "t", publisher: "X Co", publishedAt: null, period: null, retrievedAt: "2026-11-02T00:00:00Z", location: null, method: "t", verification: "verified" as const, primary: true };
    const r = parameterReport(base("A", { evidence: [ev], risks: [
      { key: RISK_KEYS[0], color: "GREEN", explanation: "", evidence: [], verifiedOn: null },
      { key: RISK_KEYS[1], color: "AMBER", explanation: "", evidence: [ev.url], verifiedOn: null },
    ] }));
    expect(r.items.find((i) => i.key === `risk_${RISK_KEYS[0]}`)?.found).toBe(false);
    const amber = r.items.find((i) => i.key === `risk_${RISK_KEYS[1]}`);
    expect(amber?.found).toBe(true);
    expect(amber?.source).toBe("X Co");
  });
  it("confidence bands", () => {
    expect(confidenceOf(9, 12)).toBe("high");
    expect(confidenceOf(6, 12)).toBe("medium");
    expect(confidenceOf(5, 12)).toBe("low");
  });
});

describe("why different bonds can look alike", () => {
  it("two bonds with the same agency grade and nothing else get the same ranges (this is what the identical-result flag catches)", () => {
    const a = scoreResearch(base("A")), b = scoreResearch(base("B"));
    expect([a.irMin, a.irMax, a.brMin, a.brMax]).toEqual([b.irMin, b.irMax, b.brMin, b.brMax]);
    expect(a.status).toBe("review_required"); // low coverage already needs a person
  });
  it("a different grade or any extra finding separates them", () => {
    const a = scoreResearch(base("A"));
    const other = scoreResearch(base("B", { agencyRatings: [{ agency: "S&P (data copy)", rating: "A-", scope: "issuer", date: null }] }));
    const metric = scoreResearch(base("C", { metrics: { netDebtToEbitda: 5 } }));
    expect(other.irMin).not.toBe(a.irMin);
    expect(metric.irMin).not.toBe(a.irMin);
  });
});
