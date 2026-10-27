import { describe, expect, it } from "vitest";
import { comparisonById, COMPARISONS } from "./comparisons";
import { comparisonEnBySlug, EN_TEXT, enComparisons, guidesFor } from "./comparisonsEn";
import { EN_GUIDES } from "./guidesEn";
import { findIsins } from "./page";

describe("English comparison pages", () => {
  it("map onto existing comparison ids and have unique slugs, titles and descriptions", () => {
    for (const id of Object.keys(EN_TEXT)) expect(comparisonById(id)).toBeTruthy();
    const all = Object.values(EN_TEXT);
    expect(new Set(all.map((x) => x.slug)).size).toBe(all.length);
    expect(new Set(all.map((x) => x.title)).size).toBe(all.length);
    expect(new Set(all.map((x) => x.description)).size).toBe(all.length);
    expect(enComparisons().length).toBeGreaterThanOrEqual(10);
    expect(comparisonEnBySlug("german-bunds")?.id).toBe("gov-de");
  });
  it("keep to information: no advice wording, no ISIN, no YTM, no fee claims", () => {
    for (const x of Object.values(EN_TEXT)) {
      const text = [x.h1, x.title, x.description, ...x.intro].join(" ");
      expect(text).not.toMatch(/recommend|best for you|you should|\bYTM\b|no fees/i);
      expect(findIsins(text)).toEqual([]);
      expect(x.title.length).toBeLessThanOrEqual(60);
      expect(x.description.length).toBeGreaterThanOrEqual(70);
      expect(x.description.length).toBeLessThanOrEqual(160);
    }
  });
  it("link only to English guides that exist", () => {
    const slugs = new Set(EN_GUIDES.map((g) => g.slug));
    for (const d of COMPARISONS) for (const g of guidesFor(d)) expect(slugs.has(g)).toBe(true);
  });
});
