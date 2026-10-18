// SEO Development Score: 7 dimensions x 5 criteria, each criterion 0 / 1 / 2 points.
// The weights are 10BONDS' own priorities for building organic visibility. They are NOT Google's ranking
// algorithm and the score is not a Google score.

export type Points = 0 | 1 | 2;
export type Effort = "Low" | "Medium" | "High";
/** auto: checked by code on the live HTML or the database. manual: needs a person to look and record evidence. */
export type Method = "auto" | "manual";
/**
 * verified: an automatic check ran and produced evidence.
 * manual: a person recorded the points with evidence.
 * override: a person replaced an automatic result (shown with its justification).
 * needs_review: a manual criterion nobody has assessed yet.
 * not_assessed: the automatic check could not run (no data source yet). Counts as 0 but is NOT a verified zero.
 */
export type Status = "verified" | "manual" | "override" | "needs_review" | "not_assessed";

export type DimensionId = "guides" | "comparisons" | "credibility" | "backlinks" | "technical" | "internal" | "mobile";

export type CriterionDef = {
  id: string; // unique inside its dimension
  title: string;
  description: string;
  rule: string; // how 0 / 1 / 2 are decided
  method: Method;
  action: string; // what to do to raise it
  effort: Effort;
};

export type DimensionDef = { id: DimensionId; title: string; weight: number; criteria: CriterionDef[] };

/** Points per rating point in the overall score: weight 25% -> each 1/10 is worth 2.5 of 100. */
export const factorOf = (d: { weight: number }) => d.weight / 10;

export const DIMENSIONS: DimensionDef[] = [
  {
    id: "guides",
    title: "HTML educational guides",
    weight: 25,
    criteria: [
      { id: "coverage", title: "Keyword coverage", description: "Published guides in this language cover the market's informational target keywords (Admin → SEO → Keywords).", rule: "2 = 80% or more of them have a matching published guide; 1 = 30% to 79%; 0 = less, or no keyword listed.", method: "auto", action: "Approve the guides waiting in review, then write guides for the uncovered target keywords.", effort: "Medium" },
      { id: "structure", title: "HTML structure and depth", description: "Each published guide has one H1, at least 3 H2 sections and 600+ words in the server HTML.", rule: "2 = every published guide passes; 1 = at least half; 0 = fewer or none published.", method: "auto", action: "Add H2 sections and depth to the guides that fail.", effort: "Medium" },
      { id: "metadata", title: "SEO title and description", description: "Title up to 60 characters containing the primary keyword; description 70 to 160 characters; unique.", rule: "2 = every published guide passes; 1 = at least half; 0 = fewer or none published.", method: "auto", action: "Fix the SEO title or meta description of the guides listed in the evidence.", effort: "Low" },
      { id: "freshness", title: "Review and freshness", description: "Each published guide names a reviewer and was reviewed in the last 12 months.", rule: "2 = every published guide; 1 = at least half; 0 = fewer or none published.", method: "auto", action: "Assign a reviewer profile and record a review date on each guide.", effort: "Low" },
      { id: "quality", title: "Editorial quality and relevance", description: "A person has read the guides: accurate, original, useful to Italian investors, leads naturally to the bond tool.", rule: "2 = all checked and good; 1 = some issues; 0 = poor. Recorded by hand with evidence.", method: "manual", action: "Read the published guides and record a manual assessment with notes.", effort: "Low" },
    ],
  },
  {
    id: "comparisons",
    title: "Searchable bond-comparison pages",
    weight: 25,
    criteria: [
      { id: "indexable", title: "Useful pages live and indexable", description: "Comparison pages with at least 5 issuers are live (HTTP 200), indexable and in the sitemap.", rule: "2 = 8 or more such pages; 1 = 3 to 7; 0 = fewer.", method: "auto", action: "Add comparison pages for more searches that have enough bonds behind them.", effort: "Medium" },
      { id: "unique", title: "Distinct content", description: "Each comparison page has its own title, description and text (no near-duplicate pages).", rule: "2 = no duplicates; 1 = one or two pairs; 0 = more.", method: "auto", action: "Rewrite the introductions of the pages flagged as near-duplicates.", effort: "Medium" },
      { id: "data", title: "Live database integration", description: "Pages read the daily bond copy (not sample data) and show the data date.", rule: "2 = live data and a dated timestamp on every page; 1 = one of the two; 0 = neither.", method: "auto", action: "Connect the live bond copy and show its date on every page.", effort: "Low" },
      { id: "safety", title: "Data transparency and plan safety", description: "No ISIN codes or paid-plan fields appear on public pages; each links to the methodology.", rule: "2 = no ISIN found and methodology linked on every page; 1 = one of the two; 0 = neither.", method: "auto", action: "Remove ISINs from public pages and link the methodology page.", effort: "Low" },
      { id: "conversion", title: "Conversion path", description: "Each page links to the bond tool and to at least one guide.", rule: "2 = every page; 1 = at least half; 0 = fewer.", method: "auto", action: "Add a call to action to the tool and links to related guides.", effort: "Low" },
    ],
  },
  {
    id: "credibility",
    title: "Financial credibility and expertise",
    weight: 15,
    criteria: [
      { id: "profiles", title: "Author and reviewer profiles", description: "Public profiles of real people, with credentials the admin has verified, linked from guides.", rule: "2 = at least one verified public profile and every published guide names a reviewer profile; 1 = a public profile exists; 0 = none.", method: "auto", action: "Add your own profile (real credentials only) and mark it verified once checked.", effort: "Low" },
      { id: "methodology", title: "Methodology explained", description: "A public page explains how bonds are selected and ranked.", rule: "2 = methodology page live, indexable, with a ranking section; 1 = live but incomplete; 0 = missing.", method: "auto", action: "Publish and complete the methodology page.", effort: "Low" },
      { id: "sources", title: "Sources and calculations", description: "The methodology page names data sources and explains yield and duration calculations.", rule: "2 = both a sources and a calculation section; 1 = one; 0 = none.", method: "auto", action: "Add the data sources and calculation sections to the methodology page.", effort: "Low" },
      { id: "disclosure", title: "Risk disclosures", description: "Every public page links to the risk disclaimer.", rule: "2 = every crawled public page; 1 = at least 80%; 0 = fewer.", method: "auto", action: "Link the disclaimer from the pages listed in the evidence.", effort: "Low" },
      { id: "history", title: "Publication and review history", description: "Published guides show publication and review dates and keep a revision log.", rule: "2 = every published guide shows both dates and has a log; 1 = at least half; 0 = fewer or none published.", method: "auto", action: "Record a review on each published guide.", effort: "Low" },
    ],
  },
  {
    id: "backlinks",
    title: "Backlinks and external authority",
    weight: 15,
    criteria: [
      { id: "domains", title: "Verified referring domains", description: "Distinct websites with a verified, live link to 10BONDS.", rule: "2 = 20 or more; 1 = 5 to 19; 0 = fewer. Not assessed until backlink data has been entered or imported.", method: "auto", action: "Import the Links report from Google Search Console (CSV) or add verified links by hand.", effort: "Medium" },
      { id: "relevance", title: "Relevance", description: "Share of verified domains rated 4 or 5 for relevance to bonds and personal finance.", rule: "2 = at least 50%; 1 = at least 20%; 0 = less.", method: "auto", action: "Pursue links from finance and investing sites.", effort: "High" },
      { id: "monitoring", title: "Monitoring", description: "Active links re-checked in the last 90 days.", rule: "2 = all; 1 = at least half; 0 = fewer.", method: "auto", action: "Re-check the listed links and update their status.", effort: "Low" },
      { id: "earned", title: "Earned editorial links", description: "Followed editorial links (not sponsored, not directories).", rule: "2 = 5 or more; 1 = 1 to 4; 0 = none.", method: "auto", action: "Pitch data stories to Italian finance publishers and blogs.", effort: "High" },
      { id: "outreach", title: "Authority-building activity", description: "Partnership and outreach opportunities worked on in the last 90 days.", rule: "2 = 3 or more contacted or further; 1 = 1 or 2; 0 = none.", method: "auto", action: "Add opportunities and contact them (publishers, blogs, YouTube creators).", effort: "Medium" },
    ],
  },
  {
    id: "technical",
    title: "Technical SEO and indexing",
    weight: 10,
    criteria: [
      { id: "sitemap", title: "Sitemap and robots.txt", description: "robots.txt names the sitemap and blocks private areas; the sitemap lists live indexable pages only.", rule: "2 = both correct; 1 = one; 0 = neither.", method: "auto", action: "Fix robots.txt or the sitemap entries listed in the evidence.", effort: "Low" },
      { id: "indexing", title: "Canonicals, hreflang and indexing", description: "Pages have a self canonical and hreflang links to their other-language versions (pointing back); private pages are noindex or blocked.", rule: "2 = all correct; 1 = at most 2 problems; 0 = more.", method: "auto", action: "Add canonical URLs or noindex to the pages listed.", effort: "Low" },
      { id: "metadata", title: "Metadata completeness", description: "Every indexable page has a unique title and a meta description.", rule: "2 = all; 1 = at least 80%; 0 = fewer.", method: "auto", action: "Add or de-duplicate titles and descriptions on the pages listed.", effort: "Low" },
      { id: "structured", title: "Structured data", description: "Guides and comparison pages carry valid JSON-LD (Article / ItemList / BreadcrumbList).", rule: "2 = all valid; 1 = at least half; 0 = fewer.", method: "auto", action: "Fix the JSON-LD on the pages listed.", effort: "Low" },
      { id: "rendering", title: "Server rendering and redirects", description: "Main content (H1) is in the server HTML, no page answers with an error, no redirect chains.", rule: "2 = all pass; 1 = at most 2 problems; 0 = more.", method: "auto", action: "Fix the pages listed in the evidence.", effort: "Medium" },
    ],
  },
  {
    id: "internal",
    title: "Internal linking and site architecture",
    weight: 5,
    criteria: [
      { id: "hubs", title: "Topic architecture", description: "The guide and comparison hub pages of this language exist and link to all their children; the language home links to both hubs.", rule: "2 = all three; 1 = hubs exist; 0 = missing.", method: "auto", action: "Link every guide and comparison page from its hub, and the hubs from the home page footer.", effort: "Low" },
      { id: "breadcrumbs", title: "Breadcrumbs", description: "Guides and comparison pages show breadcrumb navigation with BreadcrumbList data.", rule: "2 = all; 1 = at least half; 0 = fewer.", method: "auto", action: "Add breadcrumbs to the pages listed.", effort: "Low" },
      { id: "contextual", title: "Contextual links", description: "Guides link to a comparison page and the tool; comparison pages link to a guide.", rule: "2 = all; 1 = at least half; 0 = fewer.", method: "auto", action: "Add contextual links in the pages listed.", effort: "Low" },
      { id: "orphans", title: "No orphan pages", description: "Every sitemap page is linked from at least one other page.", rule: "2 = none orphaned; 1 = 1 or 2; 0 = more.", method: "auto", action: "Link the orphan pages from a hub or related page.", effort: "Low" },
      { id: "integrity", title: "Internal link integrity", description: "No internal link points to a missing page.", rule: "2 = none broken; 1 = 1 or 2; 0 = more.", method: "auto", action: "Fix or remove the broken links listed.", effort: "Low" },
    ],
  },
  {
    id: "mobile",
    title: "Mobile experience and performance",
    weight: 5,
    criteria: [
      { id: "responsive", title: "Mobile responsiveness", description: "Every page declares a mobile viewport.", rule: "2 = all pages; 1 = at least 80%; 0 = fewer.", method: "auto", action: "Add the viewport tag to the pages listed.", effort: "Low" },
      { id: "lab", title: "Loading performance (lab)", description: "Google PageSpeed Insights mobile performance score for the home page (a lab estimate, not real users).", rule: "2 = 90 or more; 1 = 50 to 89; 0 = below 50.", method: "auto", action: "Reduce JavaScript and image weight on the home page.", effort: "Medium" },
      { id: "cwv", title: "Core Web Vitals (real users)", description: "Chrome UX Report field data from PageSpeed Insights (real visitors).", rule: "2 = all three vitals good; 1 = some; 0 = none. Not assessed while Google has too little traffic data.", method: "auto", action: "Wait for enough traffic, then fix the vitals rated poor.", effort: "Medium" },
      { id: "accessibility", title: "Accessibility and readability", description: "PageSpeed Insights accessibility score for the home page.", rule: "2 = 90 or more; 1 = 75 to 89; 0 = below 75.", method: "auto", action: "Fix the accessibility issues listed by PageSpeed Insights.", effort: "Low" },
      { id: "tables", title: "Bond tables on phones", description: "A person checked the bond tables on a real phone: readable, no sideways page scroll.", rule: "2 = good on all pages; 1 = usable with issues; 0 = not usable. Recorded by hand.", method: "manual", action: "Open the comparison pages on a phone and record what you see.", effort: "Low" },
    ],
  },
];

export const dimensionOf = (id: string) => DIMENSIONS.find((d) => d.id === id);
export const criterionOf = (dim: string, crit: string) => dimensionOf(dim)?.criteria.find((c) => c.id === crit);

export type CriterionResult = {
  dimension: DimensionId;
  criterion: string;
  points: Points | null; // null = not assessed / needs review
  status: Status;
  method: Method;
  evidence: string;
  justification?: string | null; // for manual results and overrides
  evaluator: string; // "system" or the admin's e-mail
  evaluatedAt: string; // ISO
};

export type DimensionScore = {
  id: DimensionId;
  title: string;
  weight: number;
  rating: number; // 0..10, unassessed criteria count as 0
  assessed: number; // criteria with points
  complete: boolean;
  weighted: number; // rating x factor, out of weight
};

export function scoreDimension(def: DimensionDef, results: CriterionResult[]): DimensionScore {
  const mine = def.criteria.map((c) => results.find((r) => r.dimension === def.id && r.criterion === c.id));
  const rating = mine.reduce((s, r) => s + (r?.points ?? 0), 0);
  const assessed = mine.filter((r) => r && r.points !== null).length;
  return { id: def.id, title: def.title, weight: def.weight, rating, assessed, complete: assessed === def.criteria.length, weighted: round2(rating * factorOf(def)) };
}

export function overallScore(results: CriterionResult[]) {
  const dimensions = DIMENSIONS.map((d) => scoreDimension(d, results));
  const total = round2(dimensions.reduce((s, d) => s + d.weighted, 0));
  const assessed = dimensions.reduce((s, d) => s + d.assessed, 0);
  const all = DIMENSIONS.reduce((s, d) => s + d.criteria.length, 0);
  return { total, dimensions, assessed, criteria: all, complete: assessed === all };
}

/**
 * The live result for each criterion: a manual assessment wins for manual criteria; for automatic criteria it wins
 * only when it was saved as an override with a justification.
 */
export function mergeManual(auto: CriterionResult[], manual: CriterionResult[]): CriterionResult[] {
  const out: CriterionResult[] = [];
  for (const d of DIMENSIONS) {
    for (const c of d.criteria) {
      const a = auto.find((r) => r.dimension === d.id && r.criterion === c.id);
      const m = manual.find((r) => r.dimension === d.id && r.criterion === c.id);
      if (c.method === "manual") {
        out.push(m ? { ...m, status: "manual", method: "manual" } : { dimension: d.id, criterion: c.id, points: null, status: "needs_review", method: "manual", evidence: "Nobody has assessed this yet.", evaluator: "system", evaluatedAt: a?.evaluatedAt ?? new Date().toISOString() });
      } else if (m && m.status === "override") {
        out.push({ ...m, method: "auto", evidence: `${m.evidence}\n(Automatic check said: ${a ? `${a.points ?? "not assessed"}/2 · ${a.evidence}` : "did not run"})` });
      } else if (a) {
        out.push(a);
      }
    }
  }
  return out;
}

export type Recommendation = {
  key: string;
  dimension: DimensionId;
  dimensionTitle: string;
  criterion: string;
  title: string;
  deficiency: string;
  action: string;
  gain: number; // overall points gained if this criterion reaches 2/2
  effort: Effort;
  priorityScore: number;
  priority: "High" | "Medium" | "Low";
};

const EFFORT_COST: Record<Effort, number> = { Low: 1, Medium: 2, High: 3 };

/**
 * Roadmap: every criterion below 2/2. Gain = (2 - current points) x the dimension factor, straight from the rubric.
 * Priority score = gain / effort cost (Low 1, Medium 2, High 3); the dimension weight already carries business impact.
 * High >= 2.5, Medium >= 1, else Low.
 */
export function recommendations(results: CriterionResult[]): Recommendation[] {
  const out: Recommendation[] = [];
  for (const d of DIMENSIONS) {
    for (const c of d.criteria) {
      const r = results.find((x) => x.dimension === d.id && x.criterion === c.id);
      const p = r?.points ?? 0;
      if (p >= 2) continue;
      const gain = round2((2 - p) * factorOf(d));
      const priorityScore = round2(gain / EFFORT_COST[c.effort]);
      out.push({
        key: `${d.id}.${c.id}`,
        dimension: d.id,
        dimensionTitle: d.title,
        criterion: c.id,
        title: c.title,
        deficiency: r?.points === null || !r ? `Not assessed yet. ${r?.evidence ?? ""}`.trim() : r.evidence,
        action: c.action,
        gain,
        effort: c.effort,
        priorityScore,
        priority: priorityScore >= 2.5 ? "High" : priorityScore >= 1 ? "Medium" : "Low",
      });
    }
  }
  return out.sort((a, b) => b.priorityScore - a.priorityScore || b.gain - a.gain || a.key.localeCompare(b.key));
}

/** Score between two thresholds: 2 at or above `full`, 1 at or above `part`, else 0. */
export const tier = (value: number, full: number, part: number): Points => (value >= full ? 2 : value >= part ? 1 : 0);
/** Share-based score: 2 when all pass, 1 when at least `part` share passes, 0 otherwise or when there is nothing. */
export const share = (pass: number, total: number, part = 0.5): Points => (total === 0 ? 0 : pass === total ? 2 : pass / total >= part ? 1 : 0);
/** Count of problems: 2 at zero, 1 up to `allowed`, else 0. */
export const problems = (n: number, allowed = 2): Points => (n === 0 ? 2 : n <= allowed ? 1 : 0);

export const round2 = (x: number) => Math.round(x * 100) / 100;
