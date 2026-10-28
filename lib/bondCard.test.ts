import { describe, expect, it } from "vitest";
import { INFLATION_LINKED, alternativesOf, cardOf, notShownReason } from "./bondCard";
import { whyHidden } from "./bonds";
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

  it("says why a bond is not shown (FR0000186413: inflation-linked OAT, structure not modelled, no duration)", () => {
    const row = { isin: "FR0000186413", currency: "EUR", gross_ytm: 5.03, modified_duration: null, maturity: "2029-07-25", structure_modelled: false, rating_sp: "A+", rating_moodys: "Aa3", rating_fitch: "A+", rating_resolved: "A+" };
    expect(notShownReason(true, whyHidden(row))).toBe("structure");
    expect(notShownReason(false, null)).toBe("not_listed");
    expect(notShownReason(true, whyHidden({ ...row, structure_modelled: true, modified_duration: 3, rating_sp: null, rating_moodys: null, rating_fitch: null, rating_resolved: null }))).toBe("no_rating");
    expect(notShownReason(true, whyHidden({ ...row, structure_modelled: true, modified_duration: 3 }))).toBe("quality");
  });

  it("builds a card for an inflation-linked bond with no duration and no yield model (FR0000186413) without crashing", () => {
    const b = { ...all[0], isin: "FR0000186413", grossYtm: 5.03, modifiedDuration: null, couponType: "inflation", seniority: null, maturity: "2029-07-25" };
    const c = cardOf(b, all, { kind: "bund", points: [] });
    expect(c.duration).toBeNull();
    expect(c.efficiency).toBeNull();
    expect(c.afterLoss).toBeNull();
    expect(c.spreadBp).toBeNull();
    expect(alternativesOf(b, all)).toEqual([]);
  });
  it("lists FR0000186413 as inflation-linked so its card never shows a normal yield and spread", () => {
    expect(INFLATION_LINKED.has("FR0000186413")).toBe(true);
  });
});
