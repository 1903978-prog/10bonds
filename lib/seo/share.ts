import { createHmac, hkdfSync, randomBytes } from "node:crypto";
import { open, seal } from "../secretBox";
import { SITE_URL } from "./crawl";
import { serviceAccount, submitSitemap } from "./google";
import { pathOf } from "./locales";
import { BOND_SITEMAP, bondPageUrls } from "./bondPages";
import { getSeoSetting, seoSql, setSeoSetting, type Guide } from "./store";

// When a guide goes live it is sent, by itself, to:
// - IndexNow (Bing, Yandex, Seznam, Naver share it): the page address, so they crawl it within minutes. No setup.
// - Google: the sitemap is re-submitted in Search Console (Google has no "index this page" for articles).
// - The 10BONDS LinkedIn page and X account: one short post with the link, once per guide.
// Each attempt is logged in app.seo_shares (Admin -> SEO -> Sharing). A channel without its keys is skipped quietly.
// Forums and Reddit are never posted to automatically: that is spam to them.

export type Channel = "indexnow" | "google" | "linkedin" | "x";
export const guideUrl = (g: Pick<Guide, "locale" | "slug">) => SITE_URL + pathOf(g.locale, "guides", g.slug);

async function log(guideId: number | null, url: string, channel: Channel, ok: boolean, detail: string | null) {
  const s = await seoSql();
  await s`insert into app.seo_shares (guide_id, url, channel, ok, detail) values (${guideId}, ${url}, ${channel}, ${ok}, ${detail?.slice(0, 300) ?? null})`;
}

export async function shareLog(limit = 50) {
  const s = await seoSql();
  const rows = await s`select guide_id, url, channel, ok, detail, at from app.seo_shares order by at desc, id desc limit ${limit}`;
  return rows.map((r) => ({ guideId: r.guide_id === null ? null : Number(r.guide_id), url: r.url as string, channel: r.channel as Channel, ok: r.ok === true, detail: (r.detail as string) ?? null, at: new Date(r.at as string).toISOString() }));
}

async function alreadyPosted(url: string, channel: Channel) {
  const s = await seoSql();
  const [r] = await s`select 1 from app.seo_shares where url = ${url} and channel = ${channel} and ok limit 1`;
  return !!r;
}

// ---------- IndexNow ----------

/** The site's IndexNow key, served at /indexnow.txt. Derived from SESSION_SECRET, so it needs no setup and never changes. */
export function indexNowKey(): string | null {
  const s = process.env.INDEXNOW_KEY ?? process.env.SESSION_SECRET;
  if (!s || s.length < 8) return null;
  return process.env.INDEXNOW_KEY ?? Buffer.from(hkdfSync("sha256", s, "10bonds", "indexnow v1", 16)).toString("hex");
}

/** Sends up to 10,000 addresses of this site to IndexNow in one call. */
export async function indexNow(urls: string[]): Promise<void> {
  const key = indexNowKey();
  if (!key) throw new Error("not configured");
  const host = new URL(SITE_URL).host;
  const list = [...new Set(urls)].filter((u) => { try { return new URL(u).host === host; } catch { return false; } }).slice(0, 10_000);
  if (!list.length) return;
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation: `${SITE_URL}/indexnow.txt`, urlList: list }),
    signal: AbortSignal.timeout(15_000),
  });
  // 200 = received, 202 = received and the key is still being checked.
  if (r.status !== 200 && r.status !== 202) throw new Error(`IndexNow HTTP ${r.status}`);
}

// ---------- Google ----------

/** Re-submits the sitemap in Search Console. Needs the service account and the property set in Admin -> SEO. */
export async function pingGoogle(): Promise<void> {
  const site = await getSeoSetting("gsc_site");
  if (!serviceAccount() || !site) throw new Error("not configured");
  await submitSitemap(site, `${SITE_URL}/sitemap.xml`);
  await submitSitemap(site, SITE_URL + BOND_SITEMAP);
}

/** Sends any number of addresses to IndexNow, 10,000 per call. */
export async function indexNowAll(urls: string[]): Promise<void> {
  const list = [...new Set(urls)];
  for (let i = 0; i < list.length; i += 10_000) await indexNow(list.slice(i, i + 10_000));
}

/** Sends every bond page (all languages) to IndexNow: weekly, since yields change every day. Logged in Admin -> SEO -> Sharing. */
export async function shareBondPages(isins: string[]) {
  const urls = bondPageUrls(SITE_URL, isins).map((e) => e.url);
  if (!urls.length) return;
  await attempt(null, `${SITE_URL}${BOND_SITEMAP} (${urls.length} bond pages)`, "indexnow", () => indexNowAll(urls));
}

// ---------- X (Twitter) ----------
// OAuth 1.0a with the four keys from the X developer portal (an app with "Read and write" permission).

const pct = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** OAuth 1.0a "Authorization" header. A JSON body is not signed; query or form parameters go in `extra`. */
export function oauth1Header(method: string, url: string, k: { apiKey: string; apiSecret: string; token: string; tokenSecret: string }, nonce = randomBytes(16).toString("hex"), ts = Math.floor(Date.now() / 1000), extra: Record<string, string> = {}): string {
  const p: Record<string, string> = {
    oauth_consumer_key: k.apiKey, oauth_nonce: nonce, oauth_signature_method: "HMAC-SHA1", oauth_timestamp: String(ts), oauth_token: k.token, oauth_version: "1.0",
  };
  const all = { ...extra, ...p };
  const params = Object.keys(all).map((x) => [pct(x), pct(all[x])]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([a, b]) => `${a}=${b}`).join("&");
  const base = [method.toUpperCase(), pct(url), pct(params)].join("&");
  p.oauth_signature = createHmac("sha1", `${pct(k.apiSecret)}&${pct(k.tokenSecret)}`).update(base).digest("base64");
  return "OAuth " + Object.keys(p).sort().map((x) => `${pct(x)}="${pct(p[x])}"`).join(", ");
}

function xKeys() {
  const [apiKey, apiSecret, token, tokenSecret] = [process.env.X_API_KEY, process.env.X_API_SECRET, process.env.X_ACCESS_TOKEN, process.env.X_ACCESS_TOKEN_SECRET];
  return apiKey && apiSecret && token && tokenSecret ? { apiKey, apiSecret, token, tokenSecret } : null;
}
export const xConfigured = () => !!xKeys();

/** The post: the guide's title and its link (X counts any link as 23 characters). */
export function xText(title: string, url: string): string {
  const t = title.replace(/\s*·\s*10BONDS\s*$/, "").trim();
  return `${t.length > 250 ? t.slice(0, 249) + "…" : t}\n\n${url}`;
}

async function postX(text: string): Promise<string> {
  const k = xKeys();
  if (!k) throw new Error("not configured");
  const url = "https://api.x.com/2/tweets";
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: oauth1Header("POST", url, k), "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`X HTTP ${r.status}${j?.detail ? `: ${j.detail}` : j?.title ? `: ${j.title}` : ""}`);
  return j?.data?.id ? `https://x.com/i/web/status/${j.data.id}` : "posted";
}

// ---------- LinkedIn company page ----------
// Livio connects once from Admin -> SEO -> Sharing (LinkedIn sign-in); the token is kept encrypted in app.settings.

export const linkedInRedirect = () => `${SITE_URL}/api/admin/social/linkedin`;
export const linkedInApp = () => (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET ? { id: process.env.LINKEDIN_CLIENT_ID, secret: process.env.LINKEDIN_CLIENT_SECRET } : null);

type LiToken = { access: string; until: number; refresh: string | null; refreshUntil: number | null };

export function linkedInAuthUrl(state: string): string | null {
  const app = linkedInApp();
  if (!app) return null;
  const q = new URLSearchParams({ response_type: "code", client_id: app.id, redirect_uri: linkedInRedirect(), state, scope: "w_organization_social" });
  return `https://www.linkedin.com/oauth/v2/authorization?${q}`;
}

async function tokenCall(body: Record<string, string>): Promise<LiToken> {
  const app = linkedInApp();
  if (!app) throw new Error("not configured");
  const r = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...body, client_id: app.id, client_secret: app.secret }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`LinkedIn sign-in failed (${j.error_description ?? j.error ?? r.status})`);
  const t: LiToken = {
    access: j.access_token, until: Date.now() + (Number(j.expires_in) || 0) * 1000,
    refresh: j.refresh_token ?? null, refreshUntil: j.refresh_token_expires_in ? Date.now() + Number(j.refresh_token_expires_in) * 1000 : null,
  };
  await setSeoSetting("linkedin_token", seal(JSON.stringify(t)));
  return t;
}

export const linkedInConnect = (code: string) => tokenCall({ grant_type: "authorization_code", code, redirect_uri: linkedInRedirect() });

async function linkedInToken(): Promise<LiToken | null> {
  const raw = await getSeoSetting("linkedin_token");
  const plain = raw ? open(raw) : null;
  if (!plain) return null;
  const t = JSON.parse(plain) as LiToken;
  if (t.until > Date.now() + 86_400_000) return t;
  if (t.refresh && (t.refreshUntil ?? Infinity) > Date.now()) return tokenCall({ grant_type: "refresh_token", refresh_token: t.refresh }).catch(() => null);
  return t.until > Date.now() ? t : null;
}

export async function linkedInStatus() {
  const raw = await getSeoSetting("linkedin_token");
  const plain = raw ? open(raw) : null;
  const t = plain ? (JSON.parse(plain) as LiToken) : null;
  return { app: !!linkedInApp(), connected: !!t && t.until > Date.now(), until: t ? new Date(t.until).toISOString() : null, renews: !!t?.refresh, org: await getSeoSetting("linkedin_org") };
}

/** LinkedIn's API wants a month version ("202507"). Start a few months back, step back while one is not offered. */
function liVersions(now = new Date()): string[] {
  if (process.env.LINKEDIN_VERSION) return [process.env.LINKEDIN_VERSION];
  return [2, 3, 4, 5, 6, 8, 10].map((back) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** LinkedIn post text is "little text": these characters must carry a backslash or the post is cut. */
export const littleText = (s: string) => s.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);

export function linkedInText(g: Pick<Guide, "title" | "metaDescription">, url: string): string {
  return littleText(`${g.title.replace(/\s*·\s*10BONDS\s*$/, "").trim()}\n\n${g.metaDescription}\n\n${url}`);
}

async function postLinkedIn(g: Guide, url: string): Promise<string> {
  const [t, org] = await Promise.all([linkedInToken(), getSeoSetting("linkedin_org")]);
  if (!t || !org) throw new Error("not configured");
  const body = JSON.stringify({
    author: `urn:li:organization:${org}`,
    commentary: linkedInText(g, url),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    content: { article: { source: url, title: g.title.slice(0, 200), description: g.metaDescription.slice(0, 250) } },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  });
  for (const v of liVersions()) {
    const r = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${t.access}`, "Content-Type": "application/json", "LinkedIn-Version": v, "X-Restli-Protocol-Version": "2.0.0" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (r.status === 426) continue; // this month's version is not offered (any more): try an older one
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(`LinkedIn HTTP ${r.status}${j?.message ? `: ${j.message}` : ""}`);
    }
    return r.headers.get("x-restli-id") ?? "posted";
  }
  throw new Error("LinkedIn: no API version accepted");
}

// ---------- Everything together ----------

const errText = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 300);

async function attempt(guideId: number | null, url: string, channel: Channel, run: () => Promise<string | void>) {
  try {
    const detail = await run();
    await log(guideId, url, channel, true, detail || null);
  } catch (e) {
    if (errText(e) === "not configured") return; // no keys for this channel yet: nothing to log
    await log(guideId, url, channel, false, errText(e)).catch(() => {});
  }
}

/**
 * Runs after a guide is saved. Search engines hear about every published save (new or updated text); the social
 * pages get one post per guide, only right after it is first published, so old guides are never posted in a burst.
 */
export async function shareGuide(g: Guide, now = Date.now()) {
  if (g.status !== "published" || g.noindex || g.canonicalUrl) return;
  const url = guideUrl(g);
  await Promise.all([attempt(g.id, url, "indexnow", () => indexNow([url])), attempt(g.id, url, "google", pingGoogle)]);
  const justPublished = !!g.publishedAt && now - Date.parse(g.publishedAt) < 15 * 60_000;
  if (!justPublished) return;
  for (const [channel, run] of [["linkedin", () => postLinkedIn(g, url)], ["x", () => postX(xText(g.title, url))]] as const) {
    if (await alreadyPosted(url, channel).catch(() => true)) continue;
    await attempt(g.id, url, channel, run);
  }
}

/** Sends every address in the sitemap to IndexNow and re-submits the sitemap to Google (Admin button). */
export async function shareAll(urls: string[]) {
  const site = `${SITE_URL}/sitemap.xml`;
  await Promise.all([
    attempt(null, `${site} (${urls.length} pages)`, "indexnow", () => indexNow(urls)),
    attempt(null, site, "google", pingGoogle),
  ]);
}
