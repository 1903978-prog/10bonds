import { createSign } from "node:crypto";
import type { SearchKpis } from "./bing";

// Google data sources. Nothing here is ever invented: without credentials each source reports "not connected".
// - PageSpeed Insights: public API, works without a key at a low daily quota; PAGESPEED_API_KEY raises it.
// - Search Console and Analytics 4: a Google service account (GOOGLE_SERVICE_ACCOUNT_JSON) that Livio adds as a user
//   to his Search Console property and GA4 property.

type ServiceAccount = { client_email: string; private_key: string };

export function serviceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const j = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    return typeof j.client_email === "string" && typeof j.private_key === "string" ? { client_email: j.client_email, private_key: j.private_key } : null;
  } catch {
    return null;
  }
}

const b64url = (s: string | Buffer) => (typeof s === "string" ? Buffer.from(s) : s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

let token: { value: string; until: number } | null = null;
async function accessToken(sa: ServiceAccount): Promise<string> {
  if (token && token.until > Date.now() + 60_000) return token.value;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${claims}`);
  const jwt = `${head}.${claims}.${b64url(signer.sign(sa.private_key))}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Google sign-in failed (${j.error ?? r.status})`);
  token = { value: j.access_token, until: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return token.value;
}

async function googleJson(url: string, body: unknown) {
  const sa = serviceAccount();
  if (!sa) throw new Error("not connected");
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message ? String(j.error.message).slice(0, 200) : `HTTP ${r.status}`);
  return j;
}

async function googleGet(url: string) {
  const sa = serviceAccount();
  if (!sa) throw new Error("not connected");
  const r = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken(sa)}` }, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message ? String(j.error.message).slice(0, 200) : `HTTP ${r.status}`);
  return j;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** The 10bonds.com Search Console property the service account can read: the domain property first, else a URL one. */
export async function gscSiteFor(domain = "10bonds.com"): Promise<string | null> {
  const j = await googleGet("https://www.googleapis.com/webmasters/v3/sites");
  const sites: string[] = (j.siteEntry ?? []).filter((e: { permissionLevel?: string }) => e.permissionLevel !== "siteUnverifiedUser").map((e: { siteUrl: string }) => e.siteUrl);
  return sites.find((s) => s === `sc-domain:${domain}`) ?? sites.find((s) => s === `https://${domain}/`) ?? sites.find((s) => s.includes(domain)) ?? null;
}

/**
 * Google headline figures for the last `days` days (and the period before). Google's API has no index-coverage count,
 * so "indexed" is the number of pages that appeared in Google search at least once in the period.
 */
export async function searchConsoleKpis(siteUrl: string, days = 28): Promise<SearchKpis> {
  const end = new Date(Date.now() - 2 * 86_400_000); // Search Console data lags 2-3 days
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const pEnd = new Date(start.getTime() - 86_400_000);
  const pStart = new Date(pEnd.getTime() - (days - 1) * 86_400_000);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const cur = { startDate: ymd(start), endDate: ymd(end), type: "web" };
  const [tot, prev, pages] = await Promise.all([
    googleJson(url, cur),
    googleJson(url, { ...cur, startDate: ymd(pStart), endDate: ymd(pEnd) }),
    googleJson(url, { ...cur, dimensions: ["page"], rowLimit: 25000 }),
  ]);
  const t = tot.rows?.[0];
  const p = prev.rows?.[0];
  return {
    days,
    clicks: t?.clicks ?? 0,
    impressions: t?.impressions ?? 0,
    ctr: t?.impressions ? t.ctr : null,
    position: t?.impressions ? Math.round(t.position * 10) / 10 : null,
    prevClicks: p?.clicks ?? 0,
    prevImpressions: p?.impressions ?? 0,
    indexed: (pages.rows ?? []).length,
  };
}

export type GscData = {
  range: { start: string; end: string };
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  queries: { key: string; clicks: number; impressions: number; ctr: number; position: number }[];
  pages: { key: string; clicks: number; impressions: number; ctr: number; position: number }[];
  daily: { date: string; clicks: number; impressions: number }[];
};

/** Search Console, last 28 days (Search Console data lags 2-3 days). */
export async function searchConsole(siteUrl: string, days = 28): Promise<GscData> {
  const end = new Date(Date.now() - 2 * 86_400_000);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const base = { startDate: ymd(start), endDate: ymd(end), type: "web" };
  type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };
  const [tot, q, p, d] = await Promise.all([
    googleJson(url, base),
    googleJson(url, { ...base, dimensions: ["query"], rowLimit: 25 }),
    googleJson(url, { ...base, dimensions: ["page"], rowLimit: 25 }),
    googleJson(url, { ...base, dimensions: ["date"], rowLimit: 500 }),
  ]);
  const row = (r: Row) => ({ key: r.keys?.[0] ?? "", clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
  const t: Row | undefined = tot.rows?.[0];
  return {
    range: { start: base.startDate, end: base.endDate },
    totals: t ? { clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position } : { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    queries: (q.rows ?? []).map(row),
    pages: (p.rows ?? []).map(row),
    daily: (d.rows ?? []).map((r: Row) => ({ date: r.keys?.[0] ?? "", clicks: r.clicks, impressions: r.impressions })),
  };
}

/** Search Console figures per query (up to 5,000 queries), for matching against the keyword list. */
export async function searchConsoleQueries(siteUrl: string, days = 28, country?: string): Promise<{ end: string; rows: { query: string; page: string; clicks: number; impressions: number; position: number }[] }> {
  const end = new Date(Date.now() - 2 * 86_400_000);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const filters = country ? [{ filters: [{ dimension: "country", operator: "equals", expression: country }] }] : undefined;
  const j = await googleJson(url, { startDate: ymd(start), endDate: ymd(end), type: "web", dimensions: ["query", "page"], rowLimit: 5000, dimensionFilterGroups: filters });
  type Row = { keys?: string[]; clicks: number; impressions: number; position: number };
  return { end: ymd(end), rows: (j.rows ?? []).map((r: Row) => ({ query: r.keys?.[0] ?? "", page: r.keys?.[1] ?? "", clicks: r.clicks, impressions: r.impressions, position: r.position })) };
}

/** Search Console totals for pages whose address contains `pathPart` (e.g. "/it/"), over the last `days` days. */
export async function searchConsoleTotals(siteUrl: string, pathPart: string, days = 28, country?: string): Promise<{ clicks: number; impressions: number; position: number }> {
  const end = new Date(Date.now() - 2 * 86_400_000);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const j = await googleJson(url, { startDate: ymd(start), endDate: ymd(end), type: "web", dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: pathPart }, ...(country ? [{ dimension: "country", operator: "equals", expression: country }] : [])] }] });
  const t = j.rows?.[0];
  return t ? { clicks: t.clicks, impressions: t.impressions, position: t.position } : { clicks: 0, impressions: 0, position: 0 };
}

export type Ga4Data = { range: { start: string; end: string }; organicUsers: number; organicSessions: number; organicConversions: { event: string; count: number }[] };

/** Analytics 4: organic-search users and key events, last 28 days. Needs the GA4 tag on the site to have any data. */
export async function analytics(propertyId: string, days = 28): Promise<Ga4Data> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
  const range = { startDate: `${days}daysAgo`, endDate: "yesterday" };
  const organic = { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { value: "Organic Search" } } };
  const [users, events] = await Promise.all([
    googleJson(url, { dateRanges: [range], metrics: [{ name: "totalUsers" }, { name: "sessions" }], dimensionFilter: organic }),
    googleJson(url, { dateRanges: [range], dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], dimensionFilter: organic, limit: 50 }),
  ]);
  const v = (r: { metricValues?: { value: string }[] } | undefined, i: number) => Number(r?.metricValues?.[i]?.value ?? 0);
  return {
    range: { start: range.startDate, end: range.endDate },
    organicUsers: v(users.rows?.[0], 0),
    organicSessions: v(users.rows?.[0], 1),
    organicConversions: (events.rows ?? []).map((r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({ event: r.dimensionValues[0].value, count: Number(r.metricValues[0].value) })),
  };
}

export type PsiResult = {
  at: string;
  url: string;
  lab: { performance: number | null; accessibility: number | null; lcpMs: number | null; cls: number | null; tbtMs: number | null };
  field: { overall: string | null; lcp: string | null; inp: string | null; cls: string | null } | null; // FAST / AVERAGE / SLOW per Google
};

/** PageSpeed Insights, mobile. Lab = Lighthouse run by Google now; field = real Chrome users over 28 days (when Google has enough). */
export async function pageSpeed(url: string): Promise<PsiResult> {
  const q = new URLSearchParams({ url, strategy: "mobile" });
  q.append("category", "performance");
  q.append("category", "accessibility");
  if (process.env.PAGESPEED_API_KEY) q.set("key", process.env.PAGESPEED_API_KEY);
  const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal: AbortSignal.timeout(90_000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message ? String(j.error.message).slice(0, 200) : `HTTP ${r.status}`);
  const cat = j.lighthouseResult?.categories ?? {};
  const audit = (k: string) => (typeof j.lighthouseResult?.audits?.[k]?.numericValue === "number" ? j.lighthouseResult.audits[k].numericValue : null);
  const le = j.loadingExperience;
  const m = le?.metrics ?? {};
  const hasField = le && le.id && Object.keys(m).length > 0 && !le.origin_fallback;
  return {
    at: new Date().toISOString(),
    url,
    lab: {
      performance: typeof cat.performance?.score === "number" ? Math.round(cat.performance.score * 100) : null,
      accessibility: typeof cat.accessibility?.score === "number" ? Math.round(cat.accessibility.score * 100) : null,
      lcpMs: audit("largest-contentful-paint"),
      cls: audit("cumulative-layout-shift"),
      tbtMs: audit("total-blocking-time"),
    },
    field: hasField
      ? {
          overall: le.overall_category ?? null,
          lcp: m.LARGEST_CONTENTFUL_PAINT_MS?.category ?? null,
          inp: m.INTERACTION_TO_NEXT_PAINT?.category ?? null,
          cls: m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category ?? null,
        }
      : null,
  };
}
