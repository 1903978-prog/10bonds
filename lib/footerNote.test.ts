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
  it("every language carries the disclaimer and the plan terms once", () => {
    for (const [l, t] of Object.entries(FOOTER_NOTE)) {
      expect(t, l).toMatch(/Stripe/);
      expect(t, l).toMatch(/VAT|IVA|TVA|MwSt/);
    }
    expect(FOOTER_NOTE.en.match(/investment advice/g)).toHaveLength(1);
  });
});
