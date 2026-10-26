import { describe, expect, it } from "vitest";
import { BLOCKED_COUNTRIES, FIRST_BATCH, draftFor } from "./outreachText";

describe("outreach drafts", () => {
  it("writes each draft in the firm's language, naming the firm, with an opt-out and the demo link", () => {
    for (const f of FIRST_BATCH) {
      const d = draftFor(f);
      expect(d.lang).toBe({ IT: "it", FR: "fr", DE: "de" }[f.country]);
      expect(d.subject).toContain(f.firm);
      expect(d.body).toContain(f.firm);
      expect(d.body).toContain("STOP");
      expect(d.body).toContain("https://10bonds.com/pro");
      expect(d.body).toContain("SQUARE ONE OÜ");
    }
  });
  it("uses neutral wording only", () => {
    for (const f of FIRST_BATCH) expect(draftFor(f).body).not.toMatch(/\b(best|migliore|meilleur|beste|recommended|raccomand|garantit|garantiert|garantito)\b/i);
  });
  it("uses firm-level addresses only", () => {
    for (const f of FIRST_BATCH) expect(f.email).toMatch(/^(info|contact|fcp|segreteria)@/);
  });
  it("blocks Germany by default", () => expect(BLOCKED_COUNTRIES).toContain("DE"));
});
