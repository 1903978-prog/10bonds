import type { CrawlResult, CrawledPage } from "./crawl";
import type { PsiResult } from "./google";
import { similarity } from "./page";
import { comparisonBySlug } from "./comparisons";
import { LOCALE, type Locale } from "./locales";
import { DIMENSIONS, problems, share, tier, type CriterionResult, type DimensionId, type Points } from "./rubric";

// Automatic evaluation: every point comes from evidence that can be re-checked (the crawled server HTML, the
// database, or a PageSpeed Insights run). When a source is missing the criterion is "not_assessed", never 0.

export type GuideFact = {
  slug: string; seoTitle: string; metaDescription: string; primaryKeyword: string; relatedKeywords: string[];
  reviewerId: number | null; reviewedAt: string | null; logCount: number;
};
export type Facts = {
  market: Locale;
  now: Date;
  keywords: { keyword: string; intent: string }[]; // this market's target keywords
  crawl: CrawlResult | null;
  guides: GuideFact[]; // published only
  people: { id: number; isPublic: boolean; credentialsVerified: boolean }[];
  dataSource: "live" | "sample" | null;
  backlinks: { sourceDomain: string; status: string; verifiedAt: string | null; relevance: number | null; linkType: string; rel: string }[];
  backlinksChecked: boolean; // data was imported or the admin recorded a check
  opportunities: { status: string; updatedAt: string }[];
  psi: PsiResult | null;
  psiError: string | null;
};

type Out = { points: Points | null; evidence: string };
const na = (why: string): Out => ({ points: null, evidence: why });
const list = (xs: string[], n = 8) => (xs.length ? xs.slice(0, n).join(", ") + (xs.length > n ? ` and ${xs.length - n} more` : "") : "none");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");
const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9%]+/).filter((w) => w.length > 2 || /\d/.test(w));
const covers = (text: string, keyword: string) => {
  const have = new Set(words(text));
  return words(keyword).every((w) => have.has(w));
};
const DAY = 86_400_000;
const internal = (href: string) => {
  try {
    return new URL(href, "https://x").pathname.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
};

export function evaluate(f: Facts): CriterionResult[] {
  const m = f.market;
  const seg = LOCALE[m].seg;
  const home = `/${m}`;
  const all = f.crawl && !f.crawl.error ? f.crawl : null;
  // Only this language's pages count for this market; site-wide files (robots, sitemap) are shared.
  const inMarket = (p: string) => p === home || p.startsWith(home + "/");
  const c = all ? { ...all, pages: all.pages.filter((p) => inMarket(p.path)), sitemap: all.sitemap.filter(inMarket), brokenLinks: all.brokenLinks.filter((b) => inMarket(b.from)) } : null;
  const toTool = (p: CrawledPage) => p.linksOut.includes(home) || p.linksOut.includes("/");
  const noCrawl = na(`The site crawl did not run${f.crawl?.error ? `: ${f.crawl.error}` : ""}.`);
  const ok = (p: CrawledPage) => p.status === 200;
  const indexable = c ? c.pages.filter((p) => ok(p) && !p.noindex) : [];
  const guideBase = `${home}/${seg.guides}/`;
  const compBase = `${home}/${seg.bonds}/`;
  const guidePages = c ? c.pages.filter((p) => p.path.startsWith(guideBase) && !p.path.slice(guideBase.length).includes("/") && ok(p)) : [];
  const compPages = c ? c.pages.filter((p) => p.path.startsWith(compBase) && !!comparisonBySlug(m, p.path.slice(compBase.length)) && ok(p) && !p.noindex) : [];
  const published = f.guides;
  const pageOf = (slug: string) => guidePages.find((p) => p.path === guideBase + slug);
  const methodPath = `${home}/${seg.method}`;

  const R: Record<DimensionId, Record<string, () => Out>> = {
    guides: {
      coverage: () => {
        const targets = f.keywords.filter((k) => k.intent === "informational").map((k) => k.keyword);
        if (!targets.length) return { points: 0, evidence: "No informational target keyword is listed for this market." };
        const covered = targets.filter((k) => published.some((g) => [g.primaryKeyword, ...g.relatedKeywords].some((x) => covers(x, k) && covers(k, x))));
        return { points: tier(covered.length / targets.length, 0.8, 0.3), evidence: `${covered.length} of ${targets.length} informational target keywords have a published guide (${list(covered)}). ${published.length} guide(s) published in this language.` };
      },
      structure: () => {
        if (!c) return noCrawl;
        const fail = published.filter((g) => {
          const p = pageOf(g.slug);
          return !p || p.h1 !== 1 || p.h2 < 3 || p.words < 600;
        });
        return { points: share(published.length - fail.length, published.length), evidence: published.length ? `${published.length - fail.length} of ${published.length} published guides pass (one H1, 3+ H2, 600+ words in server HTML). Failing: ${list(fail.map((g) => g.slug))}.` : "No guide is published yet." };
      },
      metadata: () => {
        const titles = new Map<string, number>();
        for (const g of published) titles.set(g.seoTitle.toLowerCase(), (titles.get(g.seoTitle.toLowerCase()) ?? 0) + 1);
        const fail = published.filter((g) => g.seoTitle.length > 60 || !covers(g.seoTitle, g.primaryKeyword) || g.metaDescription.length < 70 || g.metaDescription.length > 160 || titles.get(g.seoTitle.toLowerCase())! > 1);
        return { points: share(published.length - fail.length, published.length), evidence: published.length ? `${published.length - fail.length} of ${published.length} pass. Failing: ${list(fail.map((g) => g.slug))}.` : "No guide is published yet." };
      },
      freshness: () => {
        const fresh = published.filter((g) => g.reviewerId !== null && g.reviewedAt && f.now.getTime() - Date.parse(g.reviewedAt) <= 365 * DAY);
        return { points: share(fresh.length, published.length), evidence: published.length ? `${fresh.length} of ${published.length} have a reviewer and a review in the last 12 months. Missing: ${list(published.filter((g) => !fresh.includes(g)).map((g) => g.slug))}.` : "No guide is published yet." };
      },
    },
    comparisons: {
      indexable: () => {
        if (!c) return noCrawl;
        const good = compPages.filter((p) => p.inSitemap);
        return { points: tier(good.length, 8, 3), evidence: `${good.length} comparison pages answer 200, are indexable and in the sitemap: ${list(good.map((p) => p.path), 12)}.` };
      },
      unique: () => {
        if (!c) return noCrawl;
        if (!compPages.length) return { points: 0, evidence: "No comparison page is live." };
        const pairs: string[] = [];
        for (let i = 0; i < compPages.length; i++)
          for (let j = i + 1; j < compPages.length; j++) {
            const a = compPages[i];
            const b = compPages[j];
            const sim = similarity(a.text, b.text);
            if (a.title === b.title || a.description === b.description || sim > 0.85) pairs.push(`${a.path} ~ ${b.path} (${Math.round(sim * 100)}%)`);
          }
        return { points: problems(pairs.length), evidence: pairs.length ? `Near-duplicate pairs: ${list(pairs, 5)}.` : `${compPages.length} pages checked: titles, descriptions and texts are distinct (text overlap below 85%).` };
      },
      data: () => {
        if (!c) return noCrawl;
        const live = f.dataSource === "live";
        const dated = compPages.length > 0 && compPages.every((p) => p.times > 0);
        return { points: ((live ? 1 : 0) + (dated ? 1 : 0)) as Points, evidence: `Bond data: ${f.dataSource ?? "unavailable"}. ${dated ? "Every comparison page shows a dated timestamp." : `Pages without a timestamp: ${list(compPages.filter((p) => !p.times).map((p) => p.path))}.`}` };
      },
      safety: () => {
        if (!c) return noCrawl;
        const withIsin = c.pages.filter((p) => p.isins.length);
        const noMethod = compPages.filter((p) => !p.linksOut.includes(methodPath));
        return {
          points: ((withIsin.length === 0 ? 1 : 0) + (compPages.length && noMethod.length === 0 ? 1 : 0)) as Points,
          evidence: `${withIsin.length ? `ISIN codes found on public pages: ${list(withIsin.map((p) => `${p.path} (${p.isins[0]})`))}.` : `No ISIN code in the text of ${c.pages.length} public pages.`} ${noMethod.length ? `Not linking the methodology: ${list(noMethod.map((p) => p.path))}.` : compPages.length ? "Every comparison page links the methodology." : "No comparison page is live."}`,
        };
      },
      conversion: () => {
        if (!c) return noCrawl;
        const good = compPages.filter((p) => toTool(p) && p.linksOut.some((l) => l.startsWith(guideBase)));
        return { points: share(good.length, compPages.length), evidence: `${good.length} of ${compPages.length} comparison pages link the tool and a guide.` };
      },
    },
    credibility: {
      profiles: () => {
        const pub = f.people.filter((p) => p.isPublic);
        const verified = pub.filter((p) => p.credentialsVerified);
        const pubIds = new Set(pub.map((p) => p.id));
        const allReviewed = published.length > 0 && published.every((g) => g.reviewerId !== null && pubIds.has(g.reviewerId));
        return { points: verified.length && allReviewed ? 2 : pub.length ? 1 : 0, evidence: `${pub.length} public profile(s), ${verified.length} with credentials verified by the admin. ${published.length ? `${published.filter((g) => g.reviewerId !== null && pubIds.has(g.reviewerId)).length} of ${published.length} published guides name a public reviewer.` : "No guide is published yet."}` };
      },
      methodology: () => {
        if (!c) return noCrawl;
        const p = c.pages.find((x) => x.path === methodPath);
        if (!p || !ok(p)) return { points: 0, evidence: `The methodology page ${methodPath} ${p ? `answers ${p.status}` : "was not found"}.` };
        const full = !p.noindex && p.ids.includes("ranking");
        return { points: full ? 2 : 1, evidence: full ? `${methodPath} is live, indexable and explains the ranking.` : `${methodPath} is live but noindex or has no ranking section.` };
      },
      sources: () => {
        if (!c) return noCrawl;
        const p = c.pages.find((x) => x.path === methodPath && ok(x));
        const have = ["sources", "calculations"].filter((id) => p?.ids.includes(id));
        return { points: have.length as Points, evidence: p ? `Sections found on ${methodPath}: ${list(have)} (of sources, calculations).` : "No methodology page." };
      },
      disclosure: () => {
        if (!c) return noCrawl;
        const pages = c.pages.filter(ok);
        const miss = pages.filter((p) => !p.linksOut.includes("/disclaimer") && !p.linksOut.includes("/terms"));
        return { points: share(pages.length - miss.length, pages.length, 0.8), evidence: `${pages.length - miss.length} of ${pages.length} public pages link the risk disclaimer or terms. Missing: ${list(miss.map((p) => p.path))}.` };
      },
      history: () => {
        if (!c) return noCrawl;
        const good = published.filter((g) => (pageOf(g.slug)?.times ?? 0) >= 2 && g.logCount > 0);
        return { points: share(good.length, published.length), evidence: published.length ? `${good.length} of ${published.length} published guides show publication and review dates and have a revision log.` : "No guide is published yet." };
      },
    },
    backlinks: (() => {
      const none = na("No backlink data has been entered or imported yet. Import the Search Console Links report, or record that you checked.");
      const verified = f.backlinks.filter((b) => b.status === "active" && b.verifiedAt);
      const domains = [...new Set(verified.map((b) => b.sourceDomain))];
      return {
        domains: () => (!f.backlinksChecked && !f.backlinks.length ? none : { points: tier(domains.length, 20, 5), evidence: `${domains.length} verified referring domain(s): ${list(domains)}.` }),
        relevance: () => {
          if (!f.backlinksChecked && !f.backlinks.length) return none;
          const rel = domains.filter((d) => verified.some((b) => b.sourceDomain === d && (b.relevance ?? 0) >= 4));
          return { points: domains.length ? tier(rel.length / domains.length, 0.5, 0.2) : 0, evidence: `${rel.length} of ${domains.length} verified domains rated 4-5 for relevance (${pct(rel.length, domains.length)}).` };
        },
        monitoring: () => {
          if (!f.backlinksChecked && !f.backlinks.length) return none;
          const active = f.backlinks.filter((b) => b.status === "active");
          const recent = active.filter((b) => b.verifiedAt && f.now.getTime() - Date.parse(b.verifiedAt) <= 90 * DAY);
          return { points: share(recent.length, active.length), evidence: `${recent.length} of ${active.length} active links re-checked in the last 90 days.` };
        },
        earned: () => {
          if (!f.backlinksChecked && !f.backlinks.length) return none;
          const ed = [...new Set(verified.filter((b) => b.linkType === "editorial" && b.rel === "follow").map((b) => b.sourceDomain))];
          return { points: tier(ed.length, 5, 1), evidence: `${ed.length} domain(s) with a followed editorial link: ${list(ed)}.` };
        },
        outreach: () => {
          const worked = f.opportunities.filter((o) => o.status !== "idea" && f.now.getTime() - Date.parse(o.updatedAt) <= 90 * DAY);
          return { points: tier(worked.length, 3, 1), evidence: `${worked.length} opportunit${worked.length === 1 ? "y" : "ies"} contacted or further in the last 90 days (${f.opportunities.length} in the list).` };
        },
      };
    })(),
    technical: {
      sitemap: () => {
        if (!c) return noCrawl;
        const r = c.robotsTxt ?? "";
        const robotsOk = /^sitemap:\s*\S+/im.test(r) && /disallow:\s*\/admin/i.test(r) && /disallow:\s*\/api/i.test(r);
        const bad = c.sitemap.filter((p) => {
          const pg = c.pages.find((x) => x.path === p);
          return !pg || !ok(pg) || pg.noindex;
        });
        const smOk = c.sitemapOk && c.sitemap.length > 0 && bad.length === 0;
        return { points: ((robotsOk ? 1 : 0) + (smOk ? 1 : 0)) as Points, evidence: `robots.txt ${robotsOk ? "names the sitemap and blocks /admin and /api" : c.robotsTxt === null ? "is missing" : "is incomplete"}. Sitemap: ${c.sitemapOk ? `${c.sitemap.length} URLs` : "missing or invalid"}${bad.length ? `; not live or noindex: ${list(bad)}` : ""}.` };
      },
      indexing: () => {
        if (!c) return noCrawl;
        const issues: string[] = [];
        for (const p of indexable) {
          const can = p.canonical ? (() => { try { return new URL(p.canonical!, "https://x").pathname.replace(/\/+$/, "") || "/"; } catch { return null; } })() : null;
          if (can !== p.path) issues.push(`${p.path} ${p.canonical ? "canonical points elsewhere" : "no canonical"}`);
        }
        // hreflang: each language version names itself and the others, and the others point back.
        const code = LOCALE[m].hreflang;
        for (const p of indexable.filter((x) => x.path.startsWith(guideBase) || x.path.startsWith(compBase) || x.path === home)) {
          const self = p.hreflang[code] ? internal(p.hreflang[code]) : null;
          if (self !== p.path) issues.push(`${p.path} hreflang ${code} ${self ? "points elsewhere" : "missing"}`);
          for (const [lang, href] of Object.entries(p.hreflang)) {
            const other = all!.pages.find((x) => x.path === internal(href));
            if (lang !== code && lang !== "x-default" && other && ok(other) && internal(other.hreflang[code] ?? "") !== p.path) issues.push(`${p.path} ↔ ${other.path} hreflang not reciprocal`);
          }
        }
        for (const p of all!.privatePages) if (p.status === 200 && !p.noindex && !p.blocked) issues.push(`${p.path} private but indexable`);
        return { points: problems(issues.length), evidence: issues.length ? `Problems: ${list(issues)}.` : `${indexable.length} indexable pages have a self canonical and reciprocal hreflang; ${all!.privatePages.length} private pages are blocked, noindex or not found.` };
      },
      metadata: () => {
        if (!c) return noCrawl;
        const count = new Map<string, number>();
        for (const p of indexable) if (p.title) count.set(p.title, (count.get(p.title) ?? 0) + 1);
        const bad = indexable.filter((p) => !p.title || !p.description || count.get(p.title)! > 1);
        return { points: share(indexable.length - bad.length, indexable.length, 0.8), evidence: `${indexable.length - bad.length} of ${indexable.length} indexable pages have a unique title and a description. Failing: ${list(bad.map((p) => p.path))}.` };
      },
      structured: () => {
        if (!c) return noCrawl;
        const pages = [...guidePages, ...compPages];
        const bad = pages.filter((p) => p.jsonLd.errors > 0 || !p.jsonLd.types.length);
        return { points: share(pages.length - bad.length, pages.length), evidence: pages.length ? `${pages.length - bad.length} of ${pages.length} guide and comparison pages carry valid JSON-LD. Failing: ${list(bad.map((p) => p.path))}.` : "No guide or comparison page is live." };
      },
      rendering: () => {
        if (!c) return noCrawl;
        const issues = [
          ...c.pages.filter((p) => !ok(p)).map((p) => `${p.path} answers ${p.status || "nothing"}`),
          ...indexable.filter((p) => p.h1 === 0).map((p) => `${p.path} has no H1 in the server HTML`),
          ...c.pages.filter((p) => p.redirects > 1).map((p) => `${p.path} ${p.redirects} redirects`),
        ];
        return { points: problems(issues.length), evidence: issues.length ? `Problems: ${list(issues)}.` : `${c.pages.length} pages answer 200 with their H1 in the server HTML and no redirect chains.` };
      },
    },
    internal: {
      hubs: () => {
        if (!c) return noCrawl;
        const gPath = `${home}/${seg.guides}`;
        const oPath = `${home}/${seg.bonds}`;
        const g = c.pages.find((p) => p.path === gPath && ok(p));
        const o = c.pages.find((p) => p.path === oPath && ok(p));
        const hp = c.pages.find((p) => p.path === home);
        if (!g || !o) return { points: 0, evidence: `Hub pages: ${gPath} ${g ? "live" : "missing"}, ${oPath} ${o ? "live" : "missing"}.` };
        const missG = published.map((x) => guideBase + x.slug).filter((p) => !g.linksOut.includes(p));
        const missO = compPages.map((p) => p.path).filter((p) => !o.linksOut.includes(p));
        const homeOk = !!hp && hp.linksOut.includes(gPath) && hp.linksOut.includes(oPath);
        const all = !missG.length && !missO.length && homeOk;
        return { points: all ? 2 : 1, evidence: all ? "Both hubs are live, link all their pages, and the home page links both hubs." : `Hubs live. Not linked from their hub: ${list([...missG, ...missO])}. Home links both hubs: ${homeOk ? "yes" : "no"}.` };
      },
      breadcrumbs: () => {
        if (!c) return noCrawl;
        const pages = [...guidePages, ...compPages];
        const good = pages.filter((p) => p.jsonLd.types.includes("BreadcrumbList"));
        return { points: share(good.length, pages.length), evidence: `${good.length} of ${pages.length} guide and comparison pages have breadcrumbs.` };
      },
      contextual: () => {
        if (!c) return noCrawl;
        const pages = [...guidePages, ...compPages];
        const good = pages.filter((p) => (p.path.startsWith(guideBase) ? p.linksOut.some((l) => l.startsWith(compBase)) && toTool(p) : p.linksOut.some((l) => l.startsWith(guideBase))));
        return { points: share(good.length, pages.length), evidence: `${good.length} of ${pages.length} pages have the expected contextual links. Missing: ${list(pages.filter((p) => !good.includes(p)).map((p) => p.path))}.` };
      },
      orphans: () => {
        if (!c) return noCrawl;
        const orphans = c.sitemap.filter((s) => s !== home && !all!.pages.some((p) => p.path !== s && p.linksOut.includes(s)));
        return { points: problems(orphans.length), evidence: orphans.length ? `Orphan pages: ${list(orphans)}.` : `All ${c.sitemap.length} sitemap pages are linked from another page.` };
      },
      integrity: () => {
        if (!c) return noCrawl;
        const broken = [...new Set(c.brokenLinks.map((b) => `${b.from} → ${b.to} (${b.status})`))];
        return { points: problems(broken.length), evidence: broken.length ? `Broken: ${list(broken)}.` : `No broken internal link among ${c.pages.length} crawled pages.` };
      },
    },
    mobile: {
      responsive: () => {
        if (!c) return noCrawl;
        const pages = c.pages.filter(ok);
        const bad = pages.filter((p) => !p.viewport);
        return { points: share(pages.length - bad.length, pages.length, 0.8), evidence: `${pages.length - bad.length} of ${pages.length} pages declare a mobile viewport.` };
      },
      lab: () => {
        const v = f.psi?.lab.performance;
        if (v === null || v === undefined) return na(f.psiError ? `PageSpeed Insights failed: ${f.psiError}` : "PageSpeed Insights has not run yet.");
        return { points: tier(v, 90, 50), evidence: `Lab (Lighthouse, mobile) performance ${v}/100 for ${f.psi!.url} on ${f.psi!.at.slice(0, 10)}. LCP ${Math.round((f.psi!.lab.lcpMs ?? 0) / 100) / 10}s, CLS ${f.psi!.lab.cls?.toFixed(2) ?? "?"}, TBT ${Math.round(f.psi!.lab.tbtMs ?? 0)}ms. A lab estimate, not real users.` };
      },
      cwv: () => {
        if (!f.psi) return na(f.psiError ? `PageSpeed Insights failed: ${f.psiError}` : "PageSpeed Insights has not run yet.");
        if (!f.psi.field) return na(`Google has no real-user (Chrome UX Report) data for ${f.psi.url} yet: the site needs more visitors. Checked ${f.psi.at.slice(0, 10)}.`);
        const v = [f.psi.field.lcp, f.psi.field.inp, f.psi.field.cls];
        const fast = v.filter((x) => x === "FAST").length;
        return { points: fast === 3 ? 2 : fast >= 1 ? 1 : 0, evidence: `Real users (28 days): LCP ${v[0] ?? "?"}, INP ${v[1] ?? "?"}, CLS ${v[2] ?? "?"}. Checked ${f.psi.at.slice(0, 10)}.` };
      },
      accessibility: () => {
        const v = f.psi?.lab.accessibility;
        if (v === null || v === undefined) return na(f.psiError ? `PageSpeed Insights failed: ${f.psiError}` : "PageSpeed Insights has not run yet.");
        return { points: tier(v, 90, 75), evidence: `Accessibility ${v}/100 (Lighthouse, mobile) for ${f.psi!.url} on ${f.psi!.at.slice(0, 10)}.` };
      },
    },
  };

  const at = f.now.toISOString();
  const out: CriterionResult[] = [];
  for (const d of DIMENSIONS) {
    for (const crit of d.criteria) {
      if (crit.method !== "auto") continue;
      const fn = R[d.id][crit.id];
      const r = fn ? fn() : na("No automatic check is defined.");
      out.push({ dimension: d.id, criterion: crit.id, points: r.points, status: r.points === null ? "not_assessed" : "verified", method: "auto", evidence: r.evidence, evaluator: "system", evaluatedAt: at });
    }
  }
  return out;
}
