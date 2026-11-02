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
