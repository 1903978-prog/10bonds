import { describe, expect, it } from "vitest";
import { BONDS_SKILL } from "./bondsSkill";
import { JSON_CONTRACT, bondsPrompt, parseBondsJson, skillVersion, systemFor, toCells } from "./bondsRun";

const answer = (json: string) => `Full analysis...\n\nRecommendation: 6.1/10 — HOLD\n\n\`\`\`json\n${json}\n\`\`\`\n`;

describe("$bonds run", () => {
  it("keeps the skill text intact and appends the JSON request after it", () => {
    expect(BONDS_SKILL.startsWith("---\nname: bonds")).toBe(true);
    expect(BONDS_SKILL).toContain("16. Do not claim a score was independently calculated");
    expect(BONDS_SKILL).toContain("S&P equivalent: BBB");
    expect(BONDS_SKILL).toContain("description: >\n");
    expect(systemFor(BONDS_SKILL).startsWith(BONDS_SKILL.trim())).toBe(true);
    expect(systemFor(BONDS_SKILL)).toContain(JSON_CONTRACT.trim());
    expect(bondsPrompt("XS0000000001")).toBe("$bonds XS0000000001");
  });
  it("reads the JSON block and builds the three cells", () => {
    const j = parseBondsJson(answer('{"isin":"XS0000000001","ir_min":62,"ir_max":70,"br_min":55,"br_max":55,"risk_pay":6.04,"recommendation_score":6.1}'));
    expect(toCells(j)).toEqual({ ir: "62–70", br: "55", riskPay: "6.0×" });
  });
  it("handles a missing, broken or out-of-range block", () => {
    expect(parseBondsJson("no json here")).toBeNull();
    expect(parseBondsJson(answer("{ broken"))).toBeNull();
    expect(toCells(null)).toEqual({ ir: null, br: null, riskPay: null });
    expect(toCells({ ir_min: 120, ir_max: 130, risk_pay: "N/A" })).toEqual({ ir: null, br: null, riskPay: null });
  });
  it("uses the last JSON block and a bare object", () => {
    const text = `${answer('{"ir_min":10,"ir_max":10}')}\nrevised\n${answer('{"ir_min":20,"ir_max":30,"br_min":null,"br_max":null}')}`;
    expect(toCells(parseBondsJson(text)).ir).toBe("20–30");
    expect(toCells(parseBondsJson('{"ir_min":40,"ir_max":40}')).ir).toBe("40");
  });
  it("changes the version when the skill text changes", () => {
    expect(skillVersion("a")).not.toBe(skillVersion("b"));
    expect(skillVersion(" a ")).toBe(skillVersion("a"));
  });
});
