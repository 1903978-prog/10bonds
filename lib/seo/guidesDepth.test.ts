import { describe, expect, it } from "vitest";
import { DEPTH_EXTRAS, META_FIXES, withDepth } from "./guidesDepth";
import { SEED_GUIDES } from "./guidesSeed";
import { findIsins } from "./page";

const last = new Map<string, (typeof SEED_GUIDES)[number]>();
for (const g of SEED_GUIDES) last.set(`${g.locale}/${g.slug}`, g);
const words = (h: string) => h.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

describe("guide depth sections", () => {
  for (const e of DEPTH_EXTRAS) {
    it(`${e.locale}/${e.slug} reaches 600 words and 3 sections`, () => {
      const base = last.get(`${e.locale}/${e.slug}`)!;
      expect(base).toBeTruthy();
      const body = withDepth(base.bodyHtml, e.html);
      expect(words(body)).toBeGreaterThan(600);
      expect((body.match(/<h2/g) ?? []).length).toBeGreaterThanOrEqual(3);
      const ids = [...body.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      expect(findIsins(e.html)).toEqual([]);
      expect(e.html).not.toMatch(/empfehl|recommand|raccomand|beste |best for you|you should/i);
    });
  }
  it("fixes titles and descriptions within the limits", () => {
    for (const m of META_FIXES) {
      if (m.seoTitle) expect(m.seoTitle.length).toBeLessThanOrEqual(60);
      if (m.metaDescription) {
        expect(m.metaDescription.length).toBeGreaterThanOrEqual(70);
        expect(m.metaDescription.length).toBeLessThanOrEqual(160);
      }
    }
  });
  it("puts the sections before the FAQ, else before the closing call", () => {
    expect(withDepth('<p>a</p><h2 id="faq">F</h2><p>x</p>', "<h2>N</h2>")).toBe('<p>a</p><h2>N</h2>\n<h2 id="faq">F</h2><p>x</p>');
    expect(withDepth("<p>a</p><p><strong>Go</strong></p>", "<h2>N</h2>")).toBe("<p>a</p><h2>N</h2>\n<p><strong>Go</strong></p>");
  });
});
