import { describe, expect, it } from "vitest";
import type { PublicBond } from "../types";
import { embedSnippet, widgetHtml, yieldGrid } from "./widget";

const bond = (rating: string, years: number, ytm: number, currency = "EUR"): PublicBond => ({
  isin: "X", name: "n", issuer: "i", country: "IT", currency, coupon: 1, maturity: new Date(Date.UTC(2026, 9, 19) + years * 365.25 * 86_400_000).toISOString().slice(0, 10),
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: years, ytmAsOf: null,
});
const now = new Date(Date.UTC(2026, 9, 19));

describe("yields widget", () => {
  it("gives the median yield per risk group and maturity, and a dash below three bonds", () => {
    const g = yieldGrid([bond("AA+", 5, 2), bond("AA-", 5, 3), bond("AA", 5, 4), bond("BBB", 1, 4), bond("BBB", 1, 5), bond("A", 20, 9), bond("AAA", 5, 1, "USD")], now);
    expect(g.rows).toEqual([{ risk: "2", cells: [null, 3, null, null] }]);
  });
  it("leaves out unrated bonds", () => {
    expect(yieldGrid([bond("NR", 5, 2), bond("NR", 5, 2), bond("NR", 5, 2)], now).rows).toEqual([]);
  });
  it("embed code keeps a plain link to 10bonds outside the frame", () => {
    const s = embedSnippet("it");
    expect(s).toMatch(/<iframe src="[^"]+\/embed\/yields\?lang=it"/);
    expect(s).toMatch(/<\/iframe>\n<p[^>]*><a href="[^"]+\/it">/);
    expect(s).not.toContain("nofollow");
  });
  it("the widget page has no script and says it is not advice", () => {
    const h = widgetHtml(yieldGrid([bond("AA", 5, 2), bond("AA", 5, 3), bond("AA", 5, 4)], now), "2026-10-18", "en", false);
    expect(h).not.toContain("<script");
    expect(h).toContain("not advice");
    expect(h).toContain("3.00%");
  });
});
