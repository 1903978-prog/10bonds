import { describe, expect, it } from "vitest";
import { bondYield } from "./calc";
import { CALC_EXTRA_HTML, PRESETS } from "./calculatorExtras";
import { EN_GUIDES } from "./guidesEn";
import { SEED_GUIDES } from "./guidesSeed";
import { SEED_GUIDES_CALC } from "./guidesSeedCalc";
import { SEED_KEYWORDS } from "./keywordsSeed";
import { CALCULATORS } from "./calculators";
import { CALCULATOR_EN } from "./knowledgeEn";
import { findIsins } from "./page";
import { wordCount } from "./sanitize";

const y = (price: number, coupon: number, frequency: 1 | 2 | 4, tax = 0, years = 5, settle = "2026-11-15") =>
  bondYield({ price, coupon, frequency, settlement: settle, maturity: `${Number(settle.slice(0, 4)) + years}${settle.slice(4)}`, taxRate: tax });
const r2 = (x: number) => x.toFixed(2);

describe("yield calculator cluster", () => {
  it("the numbers quoted in the texts are what the calculator returns", () => {
    expect(r2(y(95, 3, 1).grossYtm)).toBe("4.13");
    expect(r2(y(95, 3, 1).currentYield)).toBe("3.16");
    expect(r2(y(95, 3, 1, 26).netYtm)).toBe("3.07");
    expect(r2(y(95, 3, 1, 12.5).netYtm)).toBe("3.62");
    expect(r2(y(98.5, 4.25, 2, 0, 10).grossYtm)).toBe("4.44");
    expect(r2(y(98.5, 4.25, 2, 0, 10).currentYield)).toBe("4.31");
    expect(r2(y(98.5, 4, 2, 0, 10).grossYtm)).toBe("4.19");
    expect(r2(y(102, 4, 2, 0, 10).grossYtm)).toBe("3.76");
    const acc = bondYield({ price: 98, coupon: 3.5, frequency: 2, settlement: "2026-12-15", maturity: "2031-02-15", taxRate: 0 });
    expect(r2(acc.accrued)).toBe("1.16");
    expect(r2(acc.dirtyPrice)).toBe("99.16");
  });

  it("presets are valid inputs", () => {
    for (const p of Object.values(PRESETS)) expect(p.price).toBeGreaterThan(0);
  });

  it("every internal link of the new pages points to a page that exists", () => {
    const pages = new Set<string>(["/", "/it", "/fr", "/de", "/knowledge/bond-yield-calculator"]);
    for (const g of EN_GUIDES) pages.add(`/knowledge/${g.slug}`);
    for (const g of SEED_GUIDES) pages.add(`/${g.locale}/${{ it: "guide", fr: "guides", de: "ratgeber" }[g.locale]}/${g.slug}`);
    for (const l of ["it", "fr", "de"] as const) pages.add(`/${l}/${{ it: "calcolatori", fr: "calculateurs", de: "rechner" }[l]}/${CALCULATORS[l].slug}`);
    const texts = [...Object.values(CALC_EXTRA_HTML), ...SEED_GUIDES_CALC.map((g) => g.bodyHtml), ...EN_GUIDES.filter((g) => g.published === "2026-10-29").map((g) => g.bodyHtml)];
    for (const t of texts) for (const m of t.matchAll(/href="(\/[^"#?]*)/g)) expect(pages.has(m[1]), m[1]).toBe(true);
  });

  it("new guides: size, titles, descriptions, no ISINs, no advice wording", () => {
    const bodies = [
      ...SEED_GUIDES_CALC.map((g) => ({ k: `${g.locale}/${g.slug}`, b: g.bodyHtml, t: g.seoTitle, d: g.metaDescription })),
      ...EN_GUIDES.filter((g) => g.published === "2026-10-29").map((g) => ({ k: `en/${g.slug}`, b: g.bodyHtml, t: g.seoTitle, d: g.metaDescription })),
    ];
    expect(bodies.length).toBe(15);
    for (const x of bodies) {
      expect(wordCount(x.b), x.k).toBeGreaterThan(350);
      expect(x.t.length, x.k).toBeLessThanOrEqual(60);
      expect(x.d.length, x.k).toBeGreaterThanOrEqual(70);
      expect(x.d.length, x.k).toBeLessThanOrEqual(160);
      expect(findIsins(x.b), x.k).toEqual([]);
      expect(x.b, x.k).toContain('id="faq"');
      expect(x.b, x.k).not.toMatch(/best bonds|Pareto-efficient|Monte Carlo|Moody|Standard &amp; Poor|S&amp;P|Fitch|empfehlen Sie|raccomandiamo|nous recommandons/i);
    }
  });

  it("calculator pages keep clear titles and the extras have an FAQ", () => {
    for (const t of [CALCULATORS.fr.title, CALCULATORS.de.title, CALCULATOR_EN.title]) expect(t.length).toBeLessThanOrEqual(60);
    for (const h of Object.values(CALC_EXTRA_HTML)) expect(h).toContain('<h2 id="faq">');
  });

  it("cluster keywords all point to existing pages", () => {
    const pages = new Set(EN_GUIDES.map((g) => `/knowledge/${g.slug}`));
    const mine = SEED_KEYWORDS.filter((k) => k.landingPath?.startsWith("/knowledge/"));
    for (const k of mine) expect(pages.has(k.landingPath!) || k.landingPath === "/knowledge/bond-yield-calculator", k.keyword).toBe(true);
  });
});
