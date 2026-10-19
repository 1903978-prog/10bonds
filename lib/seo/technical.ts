import type { CrawlResult } from "./crawl";

// Pages & technical: a compact copy of the last crawl (kept in app.settings) and the problems found on each page.
// Pure functions, so the rules are tested without a server.

export type PageRow = {
  path: string;
  status: number;
  redirects: number;
  title: string | null;
  description: string | null;
  canonical: string | null;
  h1: number;
  words: number;
  noindex: boolean;
  inSitemap: boolean;
  viewport: boolean;
  jsonLd: string[];
  jsonLdErrors: number;
  hreflang: number;
};

export type CrawlSnapshot = {
  at: string;
  error: string | null;
  robotsOk: boolean;
  sitemapOk: boolean;
  sitemapCount: number;
  pages: PageRow[];
  brokenLinks: { from: string; to: string; status: number }[];
  privatePages: { path: string; status: number; noindex: boolean; blocked: boolean }[];
};

const cut = (s: string | null, n: number) => (s === null ? null : s.slice(0, n));

export function snapshotOf(c: CrawlResult): CrawlSnapshot {
  return {
    at: c.at,
    error: c.error,
    robotsOk: c.robotsTxt !== null,
    sitemapOk: c.sitemapOk,
    sitemapCount: c.sitemap.length,
    pages: c.pages
      .map((p) => ({
        path: p.path,
        status: p.status,
        redirects: p.redirects,
        title: cut(p.title, 200),
        description: cut(p.description, 300),
        canonical: cut(p.canonical, 300),
        h1: p.h1,
        words: p.words,
        noindex: p.noindex,
        inSitemap: p.inSitemap,
        viewport: p.viewport,
        jsonLd: p.jsonLd.types.slice(0, 6),
        jsonLdErrors: p.jsonLd.errors,
        hreflang: Object.keys(p.hreflang).length,
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
    brokenLinks: c.brokenLinks.slice(0, 200),
    privatePages: c.privatePages,
  };
}

export type Severity = "high" | "medium" | "low";
export type Issue = { path: string; severity: Severity; problem: string; fix: string };

/** Every problem found, worst first. Pages with noindex are only checked for not being in the sitemap. */
export function issuesOf(s: CrawlSnapshot): Issue[] {
  const out: Issue[] = [];
  const add = (path: string, severity: Severity, problem: string, fix: string) => out.push({ path, severity, problem, fix });
  if (!s.robotsOk) add("/robots.txt", "high", "robots.txt does not answer", "Serve /robots.txt with the sitemap address.");
  if (!s.sitemapOk) add("/sitemap.xml", "high", "sitemap.xml missing or not valid", "Serve a valid /sitemap.xml listing every public page.");
  const titles = new Map<string, string[]>();
  for (const p of s.pages) {
    if (p.status !== 200) {
      add(p.path, p.status >= 400 || p.status === 0 ? "high" : "medium", `Answers HTTP ${p.status || "no answer"}`, p.inSitemap ? "Fix the page or remove it from the sitemap." : "Fix the page or the links pointing to it.");
      continue;
    }
    if (p.noindex) {
      if (p.inSitemap) add(p.path, "medium", "In the sitemap but marked noindex", "Remove it from the sitemap, or drop noindex.");
      continue;
    }
    if (p.redirects > 0 && p.inSitemap) add(p.path, "low", "Sitemap address redirects", "List the final address in the sitemap.");
    if (!p.title) add(p.path, "high", "No title", "Add a unique title of 30-60 characters.");
    else {
      if (p.title.length > 65) add(p.path, "low", `Title too long (${p.title.length} characters)`, "Shorten the title to 60 characters or less.");
      if (p.title.length < 20) add(p.path, "low", `Title too short (${p.title.length} characters)`, "Make the title 30-60 characters, with the main keyword.");
      titles.set(p.title, [...(titles.get(p.title) ?? []), p.path]);
    }
    if (!p.description) add(p.path, "medium", "No meta description", "Add a meta description of 70-160 characters.");
    else if (p.description.length > 170) add(p.path, "low", `Meta description too long (${p.description.length})`, "Shorten it to 160 characters or less.");
    else if (p.description.length < 60) add(p.path, "low", `Meta description too short (${p.description.length})`, "Make it 70-160 characters.");
    if (p.h1 === 0) add(p.path, "medium", "No H1 heading", "Add one H1 heading.");
    else if (p.h1 > 1) add(p.path, "low", `${p.h1} H1 headings`, "Keep a single H1 heading.");
    if (!p.canonical) add(p.path, "medium", "No canonical link", "Add <link rel=\"canonical\"> pointing to the page itself.");
    if (!p.viewport) add(p.path, "medium", "No mobile viewport", "Add the viewport meta tag.");
    if (p.jsonLdErrors > 0) add(p.path, "medium", "Structured data (JSON-LD) does not parse", "Fix the JSON-LD block.");
    if (!p.inSitemap) add(p.path, "low", "Not in the sitemap", "Add the page to the sitemap.");
    if (p.words < 150) add(p.path, "low", `Thin page (${p.words} words)`, "Add useful text, or mark it noindex.");
  }
  for (const [title, paths] of titles) {
    if (paths.length > 1) for (const p of paths) add(p, "medium", `Same title as ${paths.length - 1} other page(s): "${title.slice(0, 60)}"`, "Give every page its own title.");
  }
  for (const b of s.brokenLinks) add(b.from, "high", `Broken link to ${b.to} (HTTP ${b.status || "no answer"})`, "Fix or remove the link.");
  for (const p of s.privatePages) {
    if (p.status === 200 && !p.noindex && !p.blocked) add(p.path, "medium", "Private page can be indexed", "Mark it noindex or block it in robots.txt.");
  }
  const rank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.path.localeCompare(b.path));
}

/** Plain-text brief listing every open problem, to paste into the project chat so Claude fixes them. */
export function fixBrief(site: string, issues: Issue[], roadmap: { area: string; title: string; action: string }[]): string {
  const lines = [`Please fix these SEO problems on ${site}. Keep every page's look unchanged (no scrolling, no layout shift).`, ""];
  if (issues.length) {
    lines.push("Technical problems found by the last crawl:");
    const groups = new Map<string, string[]>();
    for (const i of issues) {
      const k = `${i.problem.replace(/\s*\(\d+[^)]*\)/, "")} → ${i.fix}`;
      groups.set(k, [...(groups.get(k) ?? []), i.path]);
    }
    for (const [k, paths] of groups) lines.push(`- ${k} Pages: ${paths.slice(0, 15).join(", ")}${paths.length > 15 ? ` and ${paths.length - 15} more` : ""}`);
    lines.push("");
  }
  if (roadmap.length) {
    lines.push("Next improvements (biggest gain first):");
    for (const r of roadmap) lines.push(`- ${r.area}: ${r.title}. ${r.action}`);
  }
  if (!issues.length && !roadmap.length) lines.push("Nothing open: the last check found no problems.");
  return lines.join("\n").trim();
}
