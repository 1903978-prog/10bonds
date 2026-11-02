import { describe, expect, it } from "vitest";

// The worker script is plain JavaScript run on the owner's computer; its pure helpers are tested here.
async function worker() {
  process.env.WORKER_TOKEN = "crw_test"; process.env.OLLAMA_MODEL = "test";
  const path = "../scripts/credit-worker/worker.mjs";
  return (await import(/* @vite-ignore */ path)) as Record<string, (...a: never[]) => unknown>;
}

describe("credit worker helpers", () => {
  it("cleans a model reply into JSON", async () => {
    const w = await worker();
    expect(w.parseJsonReply('<think>x</think>```json\n{"a":1}\n```' as never)).toEqual({ a: 1 });
    expect(w.parseJsonReply("no json" as never)).toBeNull();
    expect(w.parseJsonReply("[1]" as never)).toBeNull();
  });
  it("looks for the parent name of a finance vehicle", async () => {
    const w = await worker();
    expect(w.nameVariants("Vonovia Finance B.V." as never)).toEqual(["Vonovia Finance B.V.", "Vonovia"]);
  });
  it("turns official country numbers into fixed-rule colours, and a worse model colour wins", async () => {
    const w = await worker();
    const wb = { stability: { value: 62, year: "2023", url: "https://a" }, inflation: { value: 2, year: "2023", url: "https://b" }, growth: { value: 1, year: "2023", url: "https://c" } };
    const det = { risks: w.countryRisks(wb as never) as { key: string; color: string; explanation: string; evidenceUrls: string[] }[], metrics: { debtToGdpPct: 60 } };
    expect(det.risks.map((r) => r.color)).toEqual(["GREEN", "GREEN"]);
    const m = w.mergeDeterministic({ risks: [{ key: "politics_regulation", color: "RED", explanation: "x", evidence: [] }], metrics: {} } as never, det as never) as { risks: { key: string; color: string }[]; metrics: Record<string, number> };
    expect(m.risks.find((r) => r.key === "politics_regulation")?.color).toBe("RED");
    expect(m.risks.find((r) => r.key === "macro_fx_energy")?.color).toBe("GREEN");
    expect(m.metrics.debtToGdpPct).toBe(60);
  });
  it("keeps the passages with credit facts", async () => {
    const w = await worker();
    const long = "Revenue grew. ".repeat(500) + "Net debt / EBITDA was 3.1x and Fitch rated the issuer A-. " + "Filler text. ".repeat(500);
    expect(String(w.relevantText(long as never, 1400 as never))).toContain("Net debt");
  });
});

const LBBW_H1_2026 = `Half-year results 2026 LBBW firmly on track LBBW continued its positive performance in the first half of 2026. The bank again recorded strong earnings of EUR 708 million before tax, reaching again the high level of the previous year (EUR 705 million). The cost/income ratio improved to 60.4% (H1 2025: 61.8%) thanks to the bank's stable income. At 8.3%, return on equity (RoE) was marginally lower than in the previous year (8.6%). The common equity Tier 1 capital ratio (CRR III) of 16.1% is far above the regulatory requirements. The portfolio quality continues to be solid; this can also be seen in the low non performing exposures (NPE) ratio of 0.9%. The Corporate Customers segment recorded a pre-tax profit of EUR 312 million (previous year: EUR 360 million). Common Equity Tier 1 ratio (CRR III/phase-in) 16.1 16.6 Total capital ratio (CRR III/phase-in) 19.9 21.6 Return on equity (RoE) 8.3 8.6 Cost/income ratio (CIR) 60.4 61.8 Consolidated profit/loss before tax 708 705 Pre-tax result 312 360`;

describe("LBBW H1 2026 figures (owner's reference values)", () => {
  it("reads the group's current-period figures, not segment or prior-year ones", async () => {
    const w = await worker();
    const { found } = (w.extractBankFigures as unknown as (t: string) => { found: { parameter: string; value: number }[] })(LBBW_H1_2026);
    const v = Object.fromEntries(found.map((f) => [f.parameter, f.value]));
    expect(v).toMatchObject({ cet1Pct: 16.1, npePct: 0.9, roePct: 8.3, costIncomePct: 60.4, pretaxProfitEurM: 708, totalCapitalPct: 19.9 });
  });
  it("a table row alone gives the current column", async () => {
    const w = await worker();
    const { found } = (w.extractBankFigures as unknown as (t: string) => { found: { parameter: string; value: number }[] })("Total capital ratio (CRR III/phase-in) 19.9 21.6 Consolidated profit/loss before tax 708 705");
    expect(found.map((f) => [f.parameter, f.value])).toEqual(expect.arrayContaining([["totalCapitalPct", 19.9], ["pretaxProfitEurM", 708]]));
  });
});

describe("PDF reports and the issuer figure cache", () => {
  it("parses a LBBW-style financial PDF with page numbers and the right figures", async () => {
    const w = await worker();
    const { readFileSync } = await import("node:fs");
    const buf = readFileSync("scripts/credit-worker/fixtures/lbbw-h1-2026-extract.pdf");
    const text = (await (w.pdfText as unknown as (b: Buffer) => Promise<string>)(buf));
    if (!text) return; // neither pdftotext nor pdfjs-dist installed in this environment
    expect(text.split("\f").length).toBeGreaterThanOrEqual(2);
    const { found } = (w.extractBankFigures as unknown as (t: string) => { found: { parameter: string; value: number; offset: number }[] })(text);
    const v = Object.fromEntries(found.map((f) => [f.parameter, f.value]));
    expect(v).toMatchObject({ cet1Pct: 16.1, roePct: 8.3, totalCapitalPct: 19.9, pretaxProfitEurM: 708 });
    const tcr = found.find((f) => f.parameter === "totalCapitalPct")!;
    expect(text.slice(0, tcr.offset).split("\f").length).toBe(2); // the table is on page 2
  });
  it("keeps both values when two documents disagree for the same period, and reuses the newest cited figure", async () => {
    const w = await worker();
    const kb = { domains: {}, dead: {}, financials: {} } as Record<string, unknown>;
    const fig = (value: number, url: string, reportingDate: string) => ({ parameter: "roePct", value, unit: "%", quote: `RoE ${value}%`, url, period: "x", reportingDate });
    const rec = w.recordFinancials as unknown as (k: string, i: string, f: unknown[], kb: unknown) => string[];
    expect(rec("lei1", "LBBW", [fig(8.3, "https://a", "2026-06-30")], kb)).toEqual([]);
    expect(rec("lei1", "LBBW", [fig(8.6, "https://b", "2026-06-30")], kb)).toHaveLength(1); // conflict, both kept
    expect(rec("lei1", "LBBW", [fig(8.6, "https://c", "2025-06-30")], kb)).toEqual([]); // other period: no conflict
    const cached = (w.cachedFigure as unknown as (k: string, p: string, kb: unknown) => { reportingDate: string } | null)("lei1", "roePct", kb);
    expect(cached?.reportingDate).toBe("2026-06-30");
  });
});
