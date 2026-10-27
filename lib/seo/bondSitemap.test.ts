import { describe, expect, it } from "vitest";
import { bondSitemapIndexXml, fileXml } from "./bondSitemap";

describe("bond sitemap files", () => {
  it("writes four language addresses per bond with alternates", () => {
    const xml = fileXml(["DE000LB39CB2", "FR0013000000"], "2026-10-27");
    expect(xml.match(/<url>/g)).toHaveLength(8);
    expect(xml).toContain("hreflang=\"x-default\"");
    expect(xml).toContain("<lastmod>2026-10-27</lastmod>");
    expect(xml.endsWith("</urlset>")).toBe(true);
  });
  it("indexes the files", () => {
    const xml = bondSitemapIndexXml(3);
    expect(xml.match(/<sitemap>/g)).toHaveLength(3);
    expect(xml).toContain("/bonds/sitemaps/3.xml");
  });
});
