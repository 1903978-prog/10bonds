import type { MetadataRoute } from "next";
import { faqFromHtml } from "./sanitize";
import { seoSql, type Guide } from "./store";

// AI Visibility (GEO / AEO): how ready the site is to be found, trusted and cited by AI assistants (ChatGPT,
// Claude, Copilot, Google AI, Perplexity). A score out of 100 on Livio's seven weights (19 Oct 2026). The weights
// are his management framework, not any AI provider's algorithm. Each dimension is a list of checks the site
// can verify about itself; nothing here is estimated. Citation share needs a weekly test against the assistants'
// APIs, which is not connected yet, so it shows "not connected" and scores zero.

export const AI_CRAWLERS = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Bingbot", "Googlebot"];
/** Crawlers Livio named as required (search and user-directed retrieval, not model training). */
export const REQUIRED_CRAWLERS = ["OAI-SearchBot", "Claude-SearchBot", "Claude-User"];

/** Referrer hosts of AI assistants, by assistant. */
export const AI_SOURCES: { id: string; name: string; re: RegExp }[] = [
  { id: "chatgpt", name: "ChatGPT", re: /(^|\.)(chatgpt\.com|chat\.openai\.com)$/ },
  { id: "claude", name: "Claude", re: /(^|\.)claude\.ai$/ },
  { id: "perplexity", name: "Perplexity", re: /(^|\.)perplexity\.ai$/ },
  { id: "copilot", name: "Copilot", re: /(^|\.)(copilot\.microsoft\.com|copilot\.cloud\.microsoft)$/ },
  { id: "gemini", name: "Gemini", re: /(^|\.)gemini\.google\.com$/ },
];
const AI_SQL = "(^|\\.)(chatgpt\\.com|chat\\.openai\\.com|claude\\.ai|perplexity\\.ai|copilot\\.microsoft\\.com|copilot\\.cloud\\.microsoft|gemini\\.google\\.com)$";

export { TEST_QUESTIONS } from "./testQuestions";

/** Result of the weekly AI citation test (scripts/ai-citations.mjs), stored in app.settings as seo_citation_test. */
export type CitationTest = {
  at: string;
  assistants: { id: string; name: string; asked: number; answered: number; cited: number; answers: { market: string; q: string; cited: boolean; domains: string[]; error?: string }[] }[];
  competitors: { domain: string; n: number }[];
};

/** Whether robots rules let a user agent read the site root. A group naming the agent wins over "*". */
export function robotsAllows(robots: MetadataRoute.Robots, agent: string): boolean {
  const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
  const names = (u: string | string[] | undefined) => (Array.isArray(u) ? u : u ? [u] : []).map((x) => x.toLowerCase());
  const rule = rules.find((r) => names(r.userAgent).includes(agent.toLowerCase())) ?? rules.find((r) => names(r.userAgent).includes("*"));
  if (!rule) return true;
  const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  return !list(rule.disallow).includes("/") || list(rule.allow).includes("/");
}

const words = (html: string) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

/** Answer-ready structure of one guide: a short answer before the first heading, question headings, sources, FAQ. */
export function guideShape(g: Pick<Guide, "bodyHtml">) {
  const i = g.bodyHtml.indexOf("<h2");
  const lead = i < 0 ? g.bodyHtml : g.bodyHtml.slice(0, i);
  const firstP = (lead.match(/<p\b[^>]*>([\s\S]*?)<\/p>/) ?? [])[1] ?? "";
  const headings = [...g.bodyHtml.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  return {
    answerFirst: words(firstP) >= 12 && words(firstP) <= 70,
    questionHeadings: headings.filter((h) => h.endsWith("?")).length,
    sources: /(Fonti|Fonte|Sources?|Quellen?)\s*:/i.test(g.bodyHtml) || /href="https?:\/\//.test(g.bodyHtml),
    faq: faqFromHtml(g.bodyHtml).length > 0,
    table: /<table\b/.test(g.bodyHtml),
  };
}

export type GeoFacts = {
  robots: MetadataRoute.Robots;
  sitemap: boolean;
  livePages: number; // live comparison pages with today's data
  calculators: number; // languages with the yield calculator
  curvePage: boolean;
  defaultTable: boolean;
  brokerMarkets: number; // markets with a published broker fee comparison
  guides: Pick<Guide, "bodyHtml" | "reviewedAt" | "publishedAt" | "updatedAt" | "translationGroup" | "locale">[];
  englishGroups: string[]; // translation groups with an English version
  publicAuthors: number;
  referringDomains: number; // live backlinks from distinct domains
  dataAgeDays: number | null;
  methodology: boolean;
  aiReferralTracking: boolean;
  citationTest: boolean;
  bingConnected: boolean;
};

export type Check = { label: string; done: boolean; detail?: string; notConnected?: boolean }; // notConnected: the source to check it is missing
export type Dimension = { id: string; name: string; weight: number; score: number; checks: Check[] };

const share = (n: number, of: number) => (of ? n / of : 0);
const pctTxt = (x: number) => `${Math.round(x * 100)}%`;

/** The seven dimensions and the score out of 100. A dimension's score is the share of its checks met (partial where stated). */
export function aiVisibility(f: GeoFacts): { score: number; dimensions: Dimension[] } {
  const shapes = f.guides.map(guideShape);
  const n = shapes.length;
  const ans = share(shapes.filter((s) => s.answerFirst).length, n);
  const qh = share(shapes.filter((s) => s.questionHeadings >= 2).length, n);
  const src = share(shapes.filter((s) => s.sources).length, n);
  const faq = share(shapes.filter((s) => s.faq || s.table).length, n);
  const year = Date.now() - 365 * 86_400_000;
  const dated = share(f.guides.filter((g) => Date.parse(g.reviewedAt ?? g.publishedAt ?? g.updatedAt) > year).length, f.guides.length);
  const groups = [...new Set(f.guides.map((g) => g.translationGroup).filter((x): x is string => !!x))];
  const full = groups.filter((gr) => ["it", "fr", "de"].every((l) => f.guides.some((g) => g.translationGroup === gr && g.locale === l)) && f.englishGroups.includes(gr)).length;
  const crawlers = REQUIRED_CRAWLERS.filter((a) => robotsAllows(f.robots, a));

  const dims: Omit<Dimension, "score">[] = [
    { id: "data", name: "Original financial data and calculators", weight: 25, checks: [
      { label: "Live bond comparison pages (at least 20)", done: f.livePages >= 20, detail: `${f.livePages} live` },
      { label: "Yield calculator in every language", done: f.calculators >= 3, detail: `${f.calculators} of 3` },
      { label: "Government yield curves by country", done: f.curvePage },
      { label: "Default probability by rating table", done: f.defaultTable },
      { label: "Broker fee comparison in every market", done: f.brokerMarkets >= 3, detail: `${f.brokerMarkets} of 3` },
    ] },
    { id: "answers", name: "Clear, answer-ready content", weight: 20, checks: [
      { label: "Guides open with a short direct answer", done: ans >= 0.8, detail: pctTxt(ans) },
      { label: "Guides use at least 2 question headings", done: qh >= 0.8, detail: pctTxt(qh) },
      { label: "Guides have a table or FAQ", done: faq >= 0.6, detail: pctTxt(faq) },
    ] },
    { id: "authority", name: "Authority and external citations", weight: 20, checks: [
      { label: "Named public authors or reviewers", done: f.publicAuthors > 0, detail: `${f.publicAuthors}` },
      { label: "Guides cite their sources", done: src >= 0.8, detail: pctTxt(src) },
      { label: "Links from at least 10 other websites", done: f.referringDomains >= 10, detail: `${f.referringDomains} domains` },
      { label: "Links from at least 50 other websites", done: f.referringDomains >= 50 },
    ] },
    { id: "access", name: "AI crawler access and technical SEO", weight: 15, checks: [
      ...REQUIRED_CRAWLERS.map((a) => ({ label: `${a} allowed in robots.txt`, done: crawlers.includes(a) })),
      { label: "Sitemap published", done: f.sitemap },
      { label: "Pages readable as plain HTML (server-rendered)", done: true },
    ] },
    { id: "fresh", name: "Data freshness and source transparency", weight: 10, checks: [
      { label: "Bond data updated in the last 2 days", done: f.dataAgeDays !== null && f.dataAgeDays <= 2, detail: f.dataAgeDays === null ? "no data" : `${f.dataAgeDays} days old` },
      { label: "Guides published or reviewed in the last 12 months", done: dated >= 0.9, detail: pctTxt(dated) },
      { label: "Public methodology page", done: f.methodology },
    ] },
    { id: "languages", name: "Multilingual content localization", weight: 5, checks: [
      { label: "Topics available in Italian, French, German and English", done: share(full, groups.length) >= 0.6, detail: `${full} of ${groups.length} topics` },
    ] },
    { id: "measure", name: "AI citation and referral measurement", weight: 5, checks: [
      { label: "Visitors from AI assistants are counted", done: f.aiReferralTracking },
      { label: "Weekly citation test of the question set", done: f.citationTest, detail: f.citationTest ? undefined : "not connected", notConnected: !f.citationTest },
      { label: "Bing Webmaster Tools AI Performance connected", done: f.bingConnected, detail: f.bingConnected ? undefined : "not connected", notConnected: !f.bingConnected },
    ] },
  ];
  const dimensions = dims.map((d) => ({ ...d, score: Math.round((d.checks.filter((c) => c.done).length / d.checks.length) * 100) }));
  const score = Math.round(dimensions.reduce((s, d) => s + (d.score / 100) * d.weight, 0));
  return { score, dimensions };
}

export type AiFunnel = { days: number; visitors: number; signups: number; paid: number; byAssistant: { name: string; visitors: number }[] };

/** Visitors who arrived from an AI assistant (consented visitors only, so a lower bound), and what they did next. */
export async function aiFunnel(days = 28): Promise<AiFunnel> {
  const s = await seoSql();
  const rows = await s`
    with v as (
      select visitor_id,
             min(case when kind = 'page_view' and coalesce(detail->>'referrer', '') ~* ${AI_SQL} then lower(detail->>'referrer') end) source,
             bool_or(kind = 'signup') signed,
             max(user_id) user_id
      from app.events where at > now() - make_interval(days => ${days}) group by visitor_id
    )
    select source, signed, exists (select 1 from app.users u where u.id = v.user_id and u.plan in ('plus','premium')) paid
    from v where source is not null`;
  const byAssistant = AI_SOURCES.map((a) => ({ name: a.name, visitors: rows.filter((r) => a.re.test(String(r.source))).length }));
  return { days, visitors: rows.length, signups: rows.filter((r) => r.signed).length, paid: rows.filter((r) => r.paid).length, byAssistant };
}

/** GEO share of checks that could be assessed: checks whose data source is missing do not count. */
export function geoAssessed(dims: Dimension[]): number {
  const all = dims.flatMap((d) => d.checks);
  return all.length ? Math.round((all.filter((c) => !c.notConnected).length / all.length) * 100) : 0;
}
