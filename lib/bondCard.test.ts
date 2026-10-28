import { describe, expect, it } from "vitest";
import { alternativesOf, cardOf } from "./bondCard";
import { SAMPLE_BONDS } from "./sample-bonds";

describe("bond card", () => {
  const all = SAMPLE_BONDS.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null);
  it("builds a card with an efficiency between 0 and 100", () => {
    const c = cardOf(all[0], all, { kind: "bund", points: [] });
    expect(c.isin).toBe(all[0].isin);
    expect(c.efficiency ?? 0).toBeGreaterThanOrEqual(0);
    expect(c.efficiency ?? 0).toBeLessThanOrEqual(100);
  });
  it("alternatives have the same risk, a higher return and one bond per issuer", () => {
    const b = all[0];
    const alts = alternativesOf(b, all);
    expect(new Set(alts.map((a) => a.issuer)).size).toBe(alts.length);
    for (const a of alts) { expect(a.ret).toBeGreaterThan(b.grossYtm!); expect(a.isin).not.toBe(b.isin); }
  });
});
