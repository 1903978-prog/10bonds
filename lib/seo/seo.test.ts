import { describe, expect, it } from "vitest";
import { SAMPLE_BONDS } from "../sample-bonds";
import { linksFromCsv, parseCsv } from "./backlinkCsv";
import { issuerClass, sovereignOf } from "./classify";
import { allComparisons, buildComparison, comparisonById, comparisonBySlug, COMPARISONS, hasEnough } from "./comparisons";
import { disallowed, internalPath, type CrawlResult, type CrawledPage } from "./crawl";
import { evaluate, type Facts } from "./evaluate";
import { SEED_GUIDES } from "./guidesSeed";
import { SEED_KEYWORDS } from "./keywordsSeed";
import { FIRST_WAVE, opportunity } from "./knowledge";
import { LOCALE, LOCALES, localeFromAcceptLanguage, pathOf, sectionOf, suggestLocale, T } from "./locales";
import { findIsins, isValidIsin, parsePage, similarity } from "./page";
import { DIMENSIONS, mergeManual, overallScore, recommendations, type CriterionResult } from "./rubric";
import { safeHref, sanitizeHtml, wordCount } from "./sanitize";

const at = "2026-10-18T10:00:00.000Z";
const result = (dimension: string, criterion: string, points: 0 | 1 | 2 | null, status: CriterionResult["status"] = "verified"): CriterionResult => ({
  dimension: dimension as CriterionResult["dimension"], criterion, points, status, method: "auto", evidence: "x", evaluator: "system", evaluatedAt: at,
});
const all = (p: 0 | 1 | 2 | null) => DIMENSIONS.flatMap((d) => d.criteria.map((c) => result(d.id, c.id, p)));

describe("rubric", () => {
  it("has 7 dimensions of 5 criteria and weights summing to 100", () => {
    expect(DIMENSIONS).toHaveLength(7);
    expect(DIMENSIONS.every((d) => d.criteria.length === 5)).toBe(true);
    expect(DIMENSIONS.reduce((s, d) => s + d.weight, 0)).toBe(100);
    expect(DIMENSIONS.map((d) => d.weight)).toEqual([25, 25, 15, 15, 10, 5, 5]);
  });
  it("scores 100 when everything is 2 and 0 when everything is 0", () => {
    expect(overallScore(all(2)).total).toBe(100);
    expect(overallScore(all(0)).total).toBe(0);
    expect(overallScore(all(1)).total).toBe(50);
  });
  it("counts unassessed criteria as 0 but not as assessed", () => {
    const s = overallScore(all(null));
    expect(s.total).toBe(0);
    expect(s.assessed).toBe(0);
    expect(s.complete).toBe(false);
  });
  it("one guides point is worth 2.5 overall points", () => {
    const r = all(0);
    r[0] = result("guides", r[0].criterion, 1);
    expect(overallScore(r).total).toBe(2.5);
  });
  it("manual criteria use the manual entry; automatic ones only an override", () => {
    const auto = all(1);
    const manualDim = DIMENSIONS.flatMap((d) => d.criteria.filter((c) => c.method === "manual").map((c) => ({ d: d.id, c: c.id })))[0];
    const autoDim = DIMENSIONS.flatMap((d) => d.criteria.filter((c) => c.method === "auto").map((c) => ({ d: d.id, c: c.id })))[0];
    const manual = [
      { ...result(manualDim.d, manualDim.c, 2, "manual"), method: "manual" as const },
      { ...result(autoDim.d, autoDim.c, 2, "manual") }, // not an override: ignored for an automatic criterion
    ];
    const merged = mergeManual(auto, manual);
    expect(merged.find((r) => r.criterion === manualDim.c && r.dimension === manualDim.d)?.points).toBe(2);
    expect(merged.find((r) => r.criterion === autoDim.c && r.dimension === autoDim.d)?.points).toBe(1);
    const over = mergeManual(auto, [{ ...result(autoDim.d, autoDim.c, 2, "override"), justification: "checked by hand" }]);
    const o = over.find((r) => r.criterion === autoDim.c && r.dimension === autoDim.d)!;
    expect(o.points).toBe(2);
    expect(o.status).toBe("override");
    expect(o.evidence).toContain("Automatic check said");
  });
  it("manual criteria nobody assessed need review", () => {
    const merged = mergeManual(all(2), []);
    expect(merged.filter((r) => r.status === "needs_review").length).toBe(DIMENSIONS.flatMap((d) => d.criteria).filter((c) => c.method === "manual").length);
  });
  it("roadmap gains come from the weights and are sorted by priority", () => {
    const recs = recommendations(all(0));
    expect(recs).toHaveLength(35);
    expect(recs.find((r) => r.dimension === "guides")!.gain).toBe(5);
    expect(recs.find((r) => r.dimension === "mobile")!.gain).toBe(1);
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1].priorityScore).toBeGreaterThanOrEqual(recs[i].priorityScore);
    expect(recommendations(all(2))).toHaveLength(0);
  });
});

describe("sanitizer", () => {
  it("removes scripts, styles, event handlers and javascript links", () => {
    const out = sanitizeHtml(`<p onclick="x()">Hi <script>alert(1)</script><a href="javascript:alert(1)">bad</a> <a href="https://example.com">ok</a></p><style>p{}</style><iframe src="x"></iframe>`);
    expect(out).not.toMatch(/script|onclick|javascript|style|iframe|alert/);
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain("noopener");
  });
  it("keeps headings with safe ids and tables", () => {
    const out = sanitizeHtml(`<h2 id="ok-id">A</h2><h3 id="Bad Id!">B</h3><table><tr><th scope="col">x</th></tr></table>`);
    expect(out).toContain('<h2 id="ok-id">');
    expect(out).not.toContain("Bad Id");
    expect(out).toContain("<table>");
  });
  it("accepts site paths and rejects other schemes", () => {
    expect(safeHref("/it/guide/btp")).toBe("/it/guide/btp");
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(wordCount("<p>uno due tre</p>")).toBe(3);
  });
  it("every seed guide survives sanitising unchanged in substance and has a tool link", () => {
    for (const g of SEED_GUIDES) {
      const clean = sanitizeHtml(g.bodyHtml);
      expect(wordCount(clean)).toBeGreaterThan(g.status === "draft" ? 60 : 250);
      expect(clean).toMatch(new RegExp(`href="/${g.locale}[/"]`));
      expect(findIsins(clean)).toEqual([]);
    }
  });
});

describe("page parsing", () => {
  it("reads title, description, canonical, hreflang, headings and JSON-LD", () => {
    const f = parsePage(`<html lang="it"><head><title>T</title><meta name="description" content="D"><link rel="canonical" href="https://x/it">
      <link rel="alternate" hreflang="fr-FR" href="https://x/fr"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Article"}</script><script type="application/ld+json">{bad</script></head>
      <body><h1>H</h1><h2 id="a">A</h2><p>testo IT0005240830</p><a href="/it/guide">g</a></body></html>`);
    expect(f.title).toBe("T");
    expect(f.description).toBe("D");
    expect(f.canonical).toBe("https://x/it");
    expect(f.hreflang["fr-FR"]).toBe("https://x/fr");
    expect(f.h1).toBe(1);
    expect(f.jsonLd.types).toContain("Article");
    expect(f.jsonLd.errors).toBe(1);
    expect(f.links).toContain("/it/guide");
  });
  it("checks ISIN check digits", () => {
    expect(isValidIsin("US0378331005")).toBe(true);
    expect(isValidIsin("US0378331006")).toBe(false);
    expect(findIsins("x US0378331005 y XX1234567890")).toEqual(["US0378331005"]);
  });
  it("measures near-duplicate text", () => {
    const a = "le obbligazioni investment grade hanno rating da AAA a BBB meno e rischio contenuto per chi investe";
    expect(similarity(a, a)).toBe(1);
    expect(similarity(a, "una frase completamente diversa che parla di altro e non di titoli")).toBeLessThan(0.2);
  });
});

describe("crawl helpers", () => {
  it("keeps only internal page paths", () => {
    expect(internalPath("/it/guide/")).toBe("/it/guide");
    expect(internalPath("https://example.com/x")).toBeNull();
    expect(internalPath("/api/bonds")).toBeNull();
    expect(internalPath("mailto:a@b.c")).toBeNull();
  });
  it("reads robots.txt rules", () => {
    const r = "User-agent: *\nDisallow: /admin\nDisallow: /api/\n";
    expect(disallowed(r, "/admin/seo")).toBe(true);
    expect(disallowed(r, "/it")).toBe(false);
  });
});

describe("languages", () => {
  it("has unique section names per language and round-trips paths", () => {
    for (const l of LOCALES) {
      const segs = Object.values(LOCALE[l].seg);
      expect(new Set(segs).size).toBe(segs.length);
      for (const [s, seg] of Object.entries(LOCALE[l].seg)) expect(sectionOf(l, seg)).toBe(s);
      expect(pathOf(l, "bonds", "x")).toBe(`/${l}/${LOCALE[l].seg.bonds}/x`);
    }
    expect(pathOf("it", "tools")).toBe("/it/calcolatori");
  });
  it("every UI string exists in every language", () => {
    const keys = Object.keys(T.it).sort();
    expect(Object.keys(T.fr).sort()).toEqual(keys);
    expect(Object.keys(T.de).sort()).toEqual(keys);
  });
  it("detects language: saved choice, then browser, then country", () => {
    expect(localeFromAcceptLanguage("de-AT,de;q=0.9,en;q=0.8")).toBe("de");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBeNull();
    expect(localeFromAcceptLanguage("en;q=1,fr;q=0.5")).toBe("fr");
    expect(suggestLocale("it", "fr-FR", "DE")).toBe("it");
    expect(suggestLocale(null, "fr-FR", "DE")).toBe("fr");
    expect(suggestLocale(null, "en-GB", "IT")).toBe("it");
    expect(suggestLocale(null, "en-GB", "US")).toBeNull();
  });
});

describe("comparison pages", () => {
  it("have unique slugs per language and every related id exists", () => {
    for (const l of LOCALES) {
      const slugs = COMPARISONS.map((c) => c.text[l].slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
    for (const c of COMPARISONS) for (const r of c.related) expect(comparisonById(r)).toBeTruthy();
    expect(comparisonBySlug("de", "bundesanleihen")?.id).toBe("gov-de");
  });
  it("never expose ISINs, coupons or exact dates, and list each issuer once", () => {
    for (const c of allComparisons(SAMPLE_BONDS)) {
      const json = JSON.stringify(c.rows);
      expect(json).not.toMatch(/isin|coupon|"maturity"/i);
      if (c.def.kind === "issuers") expect(new Set(c.rows.map((r) => r.issuer)).size).toBe(c.rows.length);
    }
  });
  it("hide pages without enough bonds", () => {
    const c = buildComparison(comparisonById("issuers-de")!, SAMPLE_BONDS.slice(0, 2));
    expect(hasEnough(c)).toBe(false);
  });
  it("classify governments by issuer name", () => {
    expect(sovereignOf({ issuer: "Republic of Italy", isin: "IT0005240830", country: "IT" })).toBe("IT");
    expect(sovereignOf({ issuer: "Bundesrepublik Deutschland", isin: "DE0001102580", country: "DE" })).toBe("DE");
    expect(sovereignOf({ issuer: "Enel SpA", isin: "XS1", country: "IT" })).toBeNull();
    expect(issuerClass({ issuer: "Enel SpA", isin: "XS1", country: "IT" })).toBe("corporate");
  });
});

describe("backlink CSV", () => {
  it("parses quoted CSV", () => {
    expect(parseCsv('a,"b,c",d\n1,2,3')).toEqual([["a", "b,c", "d"], ["1", "2", "3"]]);
  });
  it("reads a Search Console export", () => {
    const r = linksFromCsv("Linking page,Last crawled\nhttps://blog.example.com/post,2026-10-01\nnot a url,2026-10-01\n", "https://10bonds.fly.dev/");
    expect(r.error).toBeNull();
    expect(r.links).toHaveLength(1);
    expect(r.links[0].verifiedAt).toBe("2026-10-01");
    expect(r.skipped).toBe(1);
  });
});

describe("knowledge center", () => {
  it("has 18 first-wave pages, 6 per market", () => {
    expect(FIRST_WAVE).toHaveLength(18);
    for (const l of LOCALES) expect(FIRST_WAVE.filter((w) => w.market === l)).toHaveLength(6);
    for (const w of FIRST_WAVE.filter((x) => x.kind === "comparison")) expect(comparisonById(w.ref!)).toBeTruthy();
    for (const w of FIRST_WAVE.filter((x) => x.kind === "guide")) expect(SEED_GUIDES.some((g) => g.locale === w.market && g.slug === w.ref)).toBe(true);
  });
  it("keyword volumes always carry a source", () => {
    for (const k of SEED_KEYWORDS) if (k.volume) expect(k.volumeSource).toMatch(/third-party estimate/);
    expect(SEED_KEYWORDS.filter((k) => k.market === "fr" && k.volume)).toHaveLength(0);
    expect(SEED_KEYWORDS.find((k) => k.keyword === "rendimenti btp")?.volume).toBe(27_100);
  });
  it("opportunity score uses only known factors and reports coverage", () => {
    const empty = opportunity({ volume: null, difficulty: null, intent: "informational", potential: null, position: null, impressions: null, verifiedAt: null });
    expect(empty.coverage).toBe(25); // intent + freshness
    expect(empty.factors.filter((f) => f.points === null).map((f) => f.id)).toEqual(["demand", "competition", "business", "ranking"]);
    const strong = opportunity({ volume: 27_100, difficulty: 20, intent: "commercial", potential: "high", position: 8, impressions: 500, verifiedAt: "2026-10-01" }, new Date("2026-10-18"));
    expect(strong.coverage).toBe(100);
    expect(strong.score).toBeGreaterThan(85);
    const weak = opportunity({ volume: 50, difficulty: 90, intent: "navigational", potential: "low", position: 2, impressions: 500, verifiedAt: "2024-01-01" }, new Date("2026-10-18"));
    expect(weak.score!).toBeLessThan(30);
  });
});

describe("automatic evaluation", () => {
  const page = (path: string, html: string, extra: Partial<CrawledPage> = {}): CrawledPage => ({
    ...parsePage(html), path, status: 200, redirects: 0, finalPath: path, inSitemap: true, noindex: false, linksOut: [], ...extra,
  });
  const facts = (crawl: CrawlResult | null): Facts => ({
    market: "it", now: new Date(at), keywords: [{ keyword: "btp", intent: "informational" }], crawl, guides: [], people: [], dataSource: "live",
    backlinks: [], backlinksChecked: false, opportunities: [], psi: null, psiError: null,
  });
  it("marks everything automatic as not assessed when the crawl failed, never as a verified zero", () => {
    const r = evaluate(facts({ at, robotsTxt: null, sitemap: [], sitemapOk: false, pages: [], privatePages: [], brokenLinks: [], error: "timeout" }));
    const crawlBased = r.filter((x) => x.dimension === "technical");
    expect(crawlBased.length).toBeGreaterThan(0);
    expect(crawlBased.every((x) => x.points === null && x.status === "not_assessed")).toBe(true);
  });
  it("backlinks stay not assessed until data exists or a check is recorded", () => {
    const r = evaluate(facts(null)).filter((x) => x.dimension === "backlinks" && x.method === "auto" && !/opportunit/.test(x.evidence));
    expect(r.every((x) => x.status === "not_assessed")).toBe(true);
    const checked = evaluate({ ...facts(null), backlinksChecked: true }).filter((x) => x.dimension === "backlinks" && x.method === "auto");
    expect(checked.some((x) => x.points === 0 && x.status === "verified")).toBe(true);
  });
  it("scores a healthy crawled page set and finds problems on a broken one", () => {
    const html = (title: string, extra = "") => `<html lang="it"><head><title>${title}</title><meta name="description" content="Una descrizione abbastanza lunga per superare la soglia minima di settanta caratteri prevista.">
      <meta name="viewport" content="width=device-width"><link rel="canonical" href="https://10bonds.fly.dev/it">
      <link rel="alternate" hreflang="it-IT" href="https://10bonds.fly.dev/it"><link rel="alternate" hreflang="fr-FR" href="https://10bonds.fly.dev/fr"><link rel="alternate" hreflang="de-DE" href="https://10bonds.fly.dev/de">
      <script type="application/ld+json">{"@type":"WebSite"}</script></head><body><h1>${title}</h1>${extra}</body></html>`;
    const good = evaluate(facts({ at, robotsTxt: "User-agent: *\nDisallow: /admin\n", sitemap: ["/it"], sitemapOk: true, pages: [page("/it", html("Obbligazioni"))], privatePages: [{ path: "/admin", status: 404, noindex: true, blocked: true }], brokenLinks: [], error: null }));
    const bad = evaluate(facts({ at, robotsTxt: null, sitemap: [], sitemapOk: false, pages: [page("/it", "<html><body>no</body></html>", { status: 500 })], privatePages: [{ path: "/admin", status: 200, noindex: false, blocked: false }], brokenLinks: [{ from: "/it", to: "/it/x", status: 404 }], error: null }));
    const tech = (r: CriterionResult[]) => r.filter((x) => x.dimension === "technical").reduce((s, x) => s + (x.points ?? 0), 0);
    expect(tech(good)).toBeGreaterThan(tech(bad));
    expect(good.every((x) => x.evidence.length > 0)).toBe(true);
  });
});

describe("guide links", () => {
  it("turn links to pages that are not public into plain text", async () => {
    const { unlinkMissing } = await import("./links");
    const html = '<p><a href="/it/guide/btp">BTP</a> <a href="/it/guide/duration-obbligazioni#x">duration</a> <a href="/it/obbligazioni/btp">curva</a> <a href="/it">tool</a> <a href="https://e.com">e</a></p>';
    const out = unlinkMissing(html, "it", new Set(["btp"]), new Set());
    expect(out).toContain('<a href="/it/guide/btp">BTP</a>');
    expect(out).toContain(" duration ");
    expect(out).toContain(" curva ");
    expect(out).toContain('<a href="/it">tool</a>');
    expect(out).toContain('href="https://e.com"');
  });
});

describe("broker pages link", () => {
  it("first-wave broker entries point at the broker section of each market", async () => {
    const { sectionPath } = await import("../brokers/content");
    for (const w of FIRST_WAVE.filter((x) => x.kind === "broker")) expect(w.path).toBe(sectionPath(w.market));
  });
});

describe("Knowledge Center sections", () => {
  it("files first-wave guides where the plan puts them and others by topic", async () => {
    const { guideSection, comparisonSection } = await import("./knowledgeHub");
    expect(guideSection({ locale: "fr", slug: "acheter-des-oat", primaryKeyword: "acheter des oat" })).toBe("government");
    expect(guideSection({ locale: "it", slug: "cosa-e-il-rating", primaryKeyword: "rating obbligazioni" })).toBe("risk");
    expect(guideSection({ locale: "de", slug: "was-ist-eine-anleihe", primaryKeyword: "was ist eine anleihe" })).toBe("academy");
    expect(comparisonSection("gov-it")).toBe("government");
    expect(comparisonSection("maturity-2031")).toBe("best");
    expect(comparisonSection("high-yield")).toBe("risk");
  });
});

describe("Livio's articles", () => {
  it("keeps the CTA button class and reads the FAQ for structured data", async () => {
    const { sanitizeHtml, faqFromHtml, wordCount } = await import("./sanitize");
    const { SEED_GUIDES_LIVIO } = await import("./guidesSeedLivio");
    const html = sanitizeHtml(SEED_GUIDES_LIVIO[0].bodyHtml);
    expect(html).toContain('<a href="/it" class="cta">');
    expect(sanitizeHtml('<a class="evil" href="/x">x</a>')).toBe('<a href="/x">x</a>');
    expect(faqFromHtml(html)).toHaveLength(4);
    expect(wordCount(html)).toBeGreaterThan(600);
    expect(SEED_GUIDES_LIVIO[0].seoTitle.length).toBeLessThanOrEqual(60);
    const { guideSection } = await import("./knowledgeHub");
    expect(guideSection(SEED_GUIDES_LIVIO[0])).toBe("best");
  });
});
