import { describe, expect, it } from "vitest";
import { FOOTER_NOTE, footerLang } from "./footerNote";

describe("footer note", () => {
  it("picks the page's language", () => {
    expect(footerLang("/")).toBe("en");
    expect(footerLang("/pricing")).toBe("en");
    expect(footerLang("/it")).toBe("it");
    expect(footerLang("/fr/obligations")).toBe("fr");
    expect(footerLang("/de/anleihen")).toBe("de");
    expect(footerLang("/italy")).toBe("en");
  });
  it("every language carries only the short disclaimer (plan terms are on Pricing)", () => {
    for (const [l, t] of Object.entries(FOOTER_NOTE)) {
      expect(t, l).not.toMatch(/Stripe/);
      expect(t, l).toMatch(/10BONDS/);
      expect(t.length, l).toBeLessThan(280);
    }
    expect(FOOTER_NOTE.en.match(/investment advice/g)).toHaveLength(1);
  });
});

import { FOOTER_LINKS } from "./footerNote";
describe("legal menu", () => {
  it("has every link in all four languages", () => {
    for (const l of ["en", "it", "fr", "de"] as const) {
      for (const k of ["disclaimer", "methodology", "rating", "ranking", "terms", "privacy", "cookies", "pro"] as const) expect(FOOTER_LINKS[l][k].length).toBeGreaterThan(2);
    }
  });
});
