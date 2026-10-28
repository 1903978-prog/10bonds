import { describe, expect, it } from "vitest";
import { FINDER_TEXT } from "./finderText";

describe("finder translations", () => {
  it("every language has every string, none empty", () => {
    const keys = Object.keys(FINDER_TEXT.en).sort();
    for (const [lang, t] of Object.entries(FINDER_TEXT)) {
      expect(Object.keys(t).sort(), lang).toEqual(keys);
      const why = { spreadBp: 180, requiredBp: 95, surplusBp: 85, adjYtm: 3.35, version: "1.0", asOf: null };
      for (const [k, v] of Object.entries(t)) {
        const args = k === "riskWhy" ? [why] : [3, 10, true, "Monday"];
        expect(typeof v === "function" ? (v as (...a: unknown[]) => string)(...args) : v, `${lang}.${k}`).toBeTruthy();
      }
    }
  });

  it("short tile labels fit on one line in the finder tiles (about 150 px wide on a 390 px phone)", () => {
    for (const [lang, t] of Object.entries(FINDER_TEXT)) {
      for (const k of ["retYear", "avgYield", "avgDuration", "found", "besShort"] as const) {
        expect(t[k].length, `${lang}.${k}`).toBeLessThanOrEqual(26);
      }
      for (const k of ["lifeLoss", "chartX", "chartY", "chartSlope"] as const) {
        expect(t[k].length, `${lang}.${k}`).toBeLessThanOrEqual(44);
      }
    }
  });
});
