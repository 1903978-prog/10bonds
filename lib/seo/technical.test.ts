import { describe, expect, it } from "vitest";
import { geoAssessed } from "./geo";
import { fixBrief, issuesOf, type CrawlSnapshot, type PageRow } from "./technical";

const page = (p: Partial<PageRow>): PageRow => ({
  path: "/it", status: 200, redirects: 0, title: "Obbligazioni: le 10 migliori per te", description: "x".repeat(120), canonical: "https://10bonds.com/it",
  h1: 1, words: 600, noindex: false, inSitemap: true, viewport: true, jsonLd: ["WebPage"], jsonLdErrors: 0, hreflang: 4, ...p,
});
const snap = (pages: PageRow[], extra: Partial<CrawlSnapshot> = {}): CrawlSnapshot => ({ at: "2026-10-19T00:00:00Z", error: null, robotsOk: true, sitemapOk: true, sitemapCount: pages.length, pages, brokenLinks: [], privatePages: [], ...extra });

describe("technical issues", () => {
  it("finds nothing on a clean page", () => {
    expect(issuesOf(snap([page({})]))).toEqual([]);
  });
  it("flags missing title, description, H1 and duplicates, worst first", () => {
    const issues = issuesOf(snap([page({ path: "/a", title: null, description: null, h1: 0 }), page({ path: "/b" }), page({ path: "/c" })]));
    expect(issues[0]).toMatchObject({ path: "/a", severity: "high", problem: "No title" });
    expect(issues.some((i) => i.path === "/a" && i.problem === "No meta description")).toBe(true);
    expect(issues.filter((i) => i.problem.startsWith("Same title")).map((i) => i.path)).toEqual(["/b", "/c"]);
  });
  it("only checks noindex pages for the sitemap, and reports broken links and open private pages", () => {
    const issues = issuesOf(snap([page({ path: "/x", noindex: true, title: null })], {
      brokenLinks: [{ from: "/x", to: "/gone", status: 404 }],
      privatePages: [{ path: "/admin", status: 200, noindex: false, blocked: false }],
    }));
    expect(issues.map((i) => i.problem).sort()).toEqual(["Broken link to /gone (HTTP 404)", "In the sitemap but marked noindex", "Private page can be indexed"]);
  });
  it("groups the same problem across pages in the brief", () => {
    const issues = issuesOf(snap([page({ path: "/a", description: null }), page({ path: "/b", description: null, title: "Another distinct page title here" })]));
    const brief = fixBrief("10bonds.com", issues, [{ area: "SEO", title: "Backlinks", action: "Get links." }]);
    expect(brief).toContain("No meta description → Add a meta description of 70-160 characters. Pages: /a, /b");
    expect(brief).toContain("- SEO: Backlinks. Get links.");
  });
});

describe("GEO assessed share", () => {
  it("leaves out checks whose source is not connected", () => {
    expect(geoAssessed([{ id: "m", name: "M", weight: 5, score: 0, checks: [{ label: "a", done: true }, { label: "b", done: false, notConnected: true }] }])).toBe(50);
  });
});
