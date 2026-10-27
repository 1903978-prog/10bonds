import { parsePage, type PageFacts } from "./page";

// Crawl the site's own public pages over HTTP, like a search engine: robots.txt, sitemap.xml, then every page in
// the sitemap and every internal link found, without running JavaScript. Private paths are only checked for
// being blocked or noindex, never followed.

export const SITE_URL = (process.env.SITE_URL ?? "https://10bonds.fly.dev").replace(/\/$/, "");
/** Where the crawler fetches from: the server itself, so the check does not leave the machine. */
export const crawlBase = () => (process.env.SEO_CRAWL_BASE ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`).replace(/\/$/, "");

export const PRIVATE_PATHS = ["/admin", "/admin/seo", "/login", "/signup", "/redeem", "/account"];
const SEEDS = ["/", "/it", "/fr", "/de", "/pricing", "/disclaimer", "/terms", "/privacy", "/cookies"];
const MAX_PAGES = 600;
// Two at a time with a pause: the site crawls itself on its own small machine, and six at once (every page rendered in full)
// kept its one CPU busy for minutes, so real visitors and the health check got no answer.
const CONCURRENCY = 2;
const PAUSE_MS = 400;

export type CrawledPage = PageFacts & {
  path: string;
  status: number;
  redirects: number;
  finalPath: string;
  inSitemap: boolean;
  noindex: boolean;
  linksOut: string[]; // internal paths linked from this page
};

export type CrawlResult = {
  at: string;
  robotsTxt: string | null;
  sitemap: string[]; // paths
  sitemapOk: boolean;
  pages: CrawledPage[];
  privatePages: { path: string; status: number; noindex: boolean; blocked: boolean }[];
  brokenLinks: { from: string; to: string; status: number }[];
  error: string | null;
};

/** The internal path of a link on this site, or null for other sites, mail links, files and the API. */
export function internalPath(href: string, from = "/"): string | null {
  if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return null;
  let u: URL;
  try {
    u = new URL(href, SITE_URL + from);
  } catch {
    return null;
  }
  if (u.origin !== new URL(SITE_URL).origin) return null;
  const p = u.pathname.replace(/\/+$/, "") || "/";
  if (p.startsWith("/api/") || p.startsWith("/_next/") || /\.(png|jpe?g|svg|ico|xml|txt|pdf|css|js)$/i.test(p)) return null;
  return p;
}

export function disallowed(robots: string | null, path: string): boolean {
  if (!robots) return false;
  let applies = false;
  const rules: string[] = [];
  for (const line of robots.split(/\r?\n/)) {
    const [k, ...rest] = line.split(":");
    const v = rest.join(":").trim();
    if (/^user-agent$/i.test(k.trim())) applies = v === "*";
    else if (applies && /^disallow$/i.test(k.trim()) && v) rules.push(v);
  }
  return rules.some((r) => path.startsWith(r.replace(/\*$/, "")));
}

async function get(base: string, path: string, timeoutMs = 15000): Promise<{ status: number; body: string; redirects: number; finalPath: string }> {
  let url = base + path;
  let redirects = 0;
  for (;;) {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": "10BONDS-SEO-check/1.0", Accept: "text/html,*/*" } });
    const loc = r.headers.get("location");
    if (r.status >= 300 && r.status < 400 && loc && redirects < 5) {
      redirects++;
      const next = new URL(loc, url);
      url = next.origin === new URL(SITE_URL).origin ? base + next.pathname + next.search : next.toString();
      continue;
    }
    const body = (r.headers.get("content-type") ?? "").match(/text|xml|json/) ? await r.text() : "";
    return { status: r.status, body, redirects, finalPath: new URL(url).pathname };
  }
}

export async function crawlSite(base = crawlBase()): Promise<CrawlResult> {
  const at = new Date().toISOString();
  const empty: CrawlResult = { at, robotsTxt: null, sitemap: [], sitemapOk: false, pages: [], privatePages: [], brokenLinks: [], error: null };
  try {
    const robots = await get(base, "/robots.txt");
    const robotsTxt = robots.status === 200 ? robots.body : null;
    const sm = await get(base, "/sitemap.xml");
    const sitemap = sm.status === 200 ? [...sm.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => internalPath(m[1].replace(/&amp;/g, "&"))).filter((p): p is string => !!p) : [];
    const inSitemap = new Set(sitemap);
    const queue = [...new Set([...sitemap, ...SEEDS])];
    const seen = new Set(queue);
    const pages: CrawledPage[] = [];
    const statusOf = new Map<string, number>();
    // A few pages at a time, so the whole sitemap (all languages) fits well within the request.
    const visit = async (path: string) => {
      const r = await get(base, path).catch(() => ({ status: 0, body: "", redirects: 0, finalPath: path }));
      statusOf.set(path, r.status);
      const facts = parsePage(r.body);
      const linksOut = [...new Set(facts.links.map((h) => internalPath(h, path)).filter((p): p is string => !!p))];
      const noindex = /noindex/i.test(facts.robots ?? "");
      pages.push({ ...facts, path, status: r.status, redirects: r.redirects, finalPath: r.finalPath, inSitemap: inSitemap.has(path), noindex, linksOut });
      if (r.status !== 200) return;
      for (const l of linksOut) {
        if (!seen.has(l) && !PRIVATE_PATHS.some((p) => l === p || l.startsWith(p + "/"))) {
          seen.add(l);
          queue.push(l);
        }
      }
    };
    let started = 0;
    const worker = async () => {
      while (queue.length && started < MAX_PAGES) {
        const path = queue.shift()!;
        if (PRIVATE_PATHS.some((p) => path === p || path.startsWith(p + "/"))) continue;
        started++;
        await visit(path);
        await new Promise((done) => setTimeout(done, PAUSE_MS));
      }
    };
    // Workers stop when the queue is momentarily empty; run rounds until nothing new was queued.
    while (queue.length && started < MAX_PAGES) await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    const privatePages = [];
    for (const path of PRIVATE_PATHS) {
      const r = await get(base, path).catch(() => ({ status: 0, body: "", redirects: 0, finalPath: path }));
      const robotsMeta = parsePage(r.body).robots ?? "";
      privatePages.push({ path, status: r.status, noindex: /noindex/i.test(robotsMeta), blocked: disallowed(robotsTxt, path) });
    }
    const brokenLinks: CrawlResult["brokenLinks"] = [];
    for (const p of pages) {
      for (const l of p.linksOut) {
        const s = statusOf.get(l);
        if (s !== undefined && (s === 0 || s >= 400)) brokenLinks.push({ from: p.path, to: l, status: s });
      }
    }
    return { at, robotsTxt, sitemap, sitemapOk: sm.status === 200 && /<urlset/.test(sm.body), pages, privatePages, brokenLinks, error: null };
  } catch (e) {
    return { ...empty, error: (e as Error).message.slice(0, 200) };
  }
}
