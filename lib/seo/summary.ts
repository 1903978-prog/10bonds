import { storedPsi } from "./assess";
import type { CrawlResult } from "./crawl";
import { bing, google } from "./engines";
import { geoAssessed } from "./geo";
import { geoReport } from "./geoReport";
import { serviceAccount } from "./google";
import { LOCALES } from "./locales";
import { recommendations, round2 } from "./rubric";
import { actionStatuses, getSeoSetting, latestAssessments, setSeoSetting } from "./store";
import { snapshotOf, type CrawlSnapshot } from "./technical";

// The top of the SEO & GEO page: both scores, their history (one point per refresh), the connected data sources
// and the next steps across SEO and GEO, biggest gain for least work first.

export type HistoryPoint = { at: string; seo: number | null; geo: number | null };
export type SourceState = "connected" | "not_connected" | "error";
export type Source = { id: string; name: string; state: SourceState; detail: string; help: { text: string; url?: string }[] };
export type NextStep = { area: "SEO" | "GEO"; title: string; action: string; gain: number; effort: "Low" | "Medium" | "High"; where: string };

const GITHUB_SECRET = "https://github.com/1903978-prog/10bonds/settings/secrets/actions/new";
const COST = { Low: 1, Medium: 2, High: 3 } as const;

/** After each refresh: keep the crawl for the Pages & technical tab and add a point to the SEO + GEO history. */
export async function recordRefresh(crawl: CrawlResult, seo: number | null): Promise<void> {
  await setSeoSetting("crawl_last", JSON.stringify(snapshotOf(crawl))).catch(() => {});
  const geo = await geoReport().then((g) => g.score, () => null);
  const history = await readHistory();
  history.push({ at: new Date().toISOString(), seo, geo });
  await setSeoSetting("score_history", JSON.stringify(history.slice(-60))).catch(() => {});
}

export async function readHistory(): Promise<HistoryPoint[]> {
  try {
    return JSON.parse((await getSeoSetting("score_history")) ?? "[]") as HistoryPoint[];
  } catch {
    return [];
  }
}

export async function readCrawl(): Promise<CrawlSnapshot | null> {
  try {
    const raw = await getSeoSetting("crawl_last");
    return raw ? (JSON.parse(raw) as CrawlSnapshot) : null;
  } catch {
    return null;
  }
}

const day = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

async function sources(crawl: CrawlSnapshot | null, citationsAt: string | null): Promise<Source[]> {
  const sa = serviceAccount();
  const [g, b, psi, ga4] = await Promise.all([google(), bing(), Promise.all(LOCALES.map((m) => storedPsi(m).catch(() => ({ psi: null, error: null })))), getSeoSetting("ga4_property").catch(() => null)]);
  const psiAt = psi.map((p) => p.psi?.at).filter((x): x is string => !!x).sort().reverse()[0] ?? null;
  const psiErr = psi.map((p, i) => (p.error ? `/${LOCALES[i]}: ${p.error}` : null)).filter((x): x is string => !!x);
  const share = { text: sa ? `The service account email is ${sa.client_email}.` : "First set GOOGLE_SERVICE_ACCOUNT_JSON as a GitHub secret:", url: sa ? undefined : GITHUB_SECRET };
  return [
    {
      id: "crawl", name: "Site crawl (public pages)",
      state: !crawl ? "not_connected" : crawl.error ? "error" : "connected",
      detail: !crawl ? "Runs with the next refresh." : crawl.error ? crawl.error : `${crawl.pages.length} pages read ${day(crawl.at)}`,
      help: crawl ? [] : [{ text: 'Needs no key. Press "Refresh now".' }],
    },
    {
      id: "psi", name: "PageSpeed Insights",
      state: psiAt ? (psiErr.length ? "error" : "connected") : psiErr.length ? "error" : "not_connected",
      detail: [psiAt ? `Last measured ${day(psiAt)}` : "Not measured yet.", ...psiErr].join(" · "),
      help: psiAt && !psiErr.length ? [] : [{ text: 'Needs no key: measured every Monday and after each deploy, or open the Speed tab and press "Measure now". A free key raises Google\'s daily limit; save it as PAGESPEED_API_KEY at', url: GITHUB_SECRET }],
    },
    {
      id: "gsc", name: "Google Search Console",
      state: g.state === "connected" ? "connected" : g.state === "error" ? "error" : "not_connected",
      detail: g.message,
      help: g.state === "connected" ? [] : [share, { text: "Add that email as a Restricted user for 10bonds.com at", url: "https://search.google.com/search-console/users?resource_id=sc-domain%3A10bonds.com" }],
    },
    {
      id: "bing", name: "Bing Webmaster",
      state: b.state === "connected" ? "connected" : b.state === "error" ? "error" : "not_connected",
      detail: b.message,
      help: b.state === "connected" ? [] : [{ text: "Create an API key (Settings → API access) at", url: "https://www.bing.com/webmasters/apikey" }, { text: "Save it as BING_WEBMASTER_API_KEY at", url: GITHUB_SECRET }],
    },
    {
      id: "ga4", name: "Google Analytics 4 (optional)",
      state: sa && ga4 ? "connected" : "not_connected",
      detail: sa && ga4 ? `Property ${ga4}` : "Not connected.",
      help: sa && ga4 ? [] : [share, { text: "In GA4, Admin → Property access management: add that email as Viewer:", url: "https://analytics.google.com/analytics/web/#/admin" }, { text: "Then enter the property ID in the Search performance tab." }],
    },
    {
      id: "ai", name: "AI citation test",
      state: citationsAt && Date.now() - Date.parse(citationsAt) < 8 * 86_400_000 ? "connected" : "not_connected",
      detail: citationsAt ? `Last test ${day(citationsAt)}` : "Not connected.",
      help: citationsAt ? [] : [{ text: "Save PERPLEXITY_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY at", url: GITHUB_SECRET }, { text: "Or paste ChatGPT's answers in the AI visibility tab each week." }],
    },
  ];
}

/** Everything the top of the page shows. */
export async function seoSummary() {
  const [latest, actions, history, crawl, geo] = await Promise.all([
    Promise.all(LOCALES.map((m) => latestAssessments(m, 1).then((r) => r[0] ?? null))),
    actionStatuses(),
    readHistory(),
    readCrawl(),
    geoReport(),
  ]);
  const scored = latest.filter((x): x is NonNullable<typeof x> => x !== null);
  const seo = scored.length === LOCALES.length ? round2(scored.reduce((s, a) => s + a.row.overall, 0) / scored.length) : null;
  const assessed = scored.reduce((s, a) => s + a.row.assessed, 0);
  const criteria = scored.reduce((s, a) => s + a.row.criteria, 0);
  const lastCheck = scored.map((a) => a.row.at).sort().reverse()[0] ?? null;

  // SEO steps: the same criterion in several markets is one step, with its largest gain.
  const seoSteps = new Map<string, NextStep>();
  LOCALES.forEach((m, i) => {
    const a = latest[i];
    if (!a) return;
    for (const r of recommendations(a.results)) {
      if (actions[`${m}:${r.key}`]?.status === "completed") continue;
      const prev = seoSteps.get(r.key);
      const where = prev ? `${prev.where}, ${m.toUpperCase()}` : m.toUpperCase();
      seoSteps.set(r.key, { area: "SEO", title: `${r.dimensionTitle}: ${r.title}`, action: r.action, gain: Math.max(prev?.gain ?? 0, r.gain), effort: r.effort, where });
    }
  });
  const geoSteps: NextStep[] = geo.dimensions.flatMap((d) =>
    d.checks.filter((c) => !c.done).map((c) => ({
      area: "GEO" as const,
      title: `${d.name}: ${c.label}`,
      action: c.notConnected ? "Connect the source (see Connected sources)." : c.detail ? `Now: ${c.detail}.` : "See the AI visibility tab.",
      gain: round2(d.weight / d.checks.length),
      effort: c.notConnected ? ("Low" as const) : ("Medium" as const),
      where: "AI visibility",
    })),
  );
  const next = [...seoSteps.values(), ...geoSteps].sort((a, b) => b.gain / COST[b.effort] - a.gain / COST[a.effort] || b.gain - a.gain).slice(0, 8);

  return {
    lastCheck,
    seo: { score: seo, assessedPct: criteria ? Math.round((assessed / criteria) * 100) : 0 },
    geo: { score: geo.score, assessedPct: geoAssessed(geo.dimensions) },
    history: history.slice(-12).reverse(),
    sources: await sources(crawl, geo.citations?.at ?? null),
    next,
  };
}
