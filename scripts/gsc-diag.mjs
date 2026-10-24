// Temporary diagnostic: what Search Console and the keyword table actually hold.
import { createSign } from "node:crypto";
import postgres from "postgres";
import { accountsUrl } from "./accounts-url.mjs";

const sa = JSON.parse(process.env.G.trim().startsWith("{") ? process.env.G : Buffer.from(process.env.G, "base64").toString());
const b64 = (s) => Buffer.from(s).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const h = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const c = b64(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
const sig = createSign("RSA-SHA256").update(`${h}.${c}`).sign(sa.private_key).toString("base64url");
const tok = (await (await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${h}.${c}.${sig}` }) })).json()).access_token;
const g = async (url, body) => { const r = await fetch(url, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: body && JSON.stringify(body) }); return r.json(); };

console.log("SITES", JSON.stringify(await g("https://www.googleapis.com/webmasters/v3/sites")));
const sql = postgres(accountsUrl(process.env.ACCOUNTS_DATABASE_URL, process.env.DATABASE_URL), { ssl: "require", max: 1 });
console.log("SETTING", JSON.stringify(await sql`select key, value from app.settings where key like 'seo_gsc%'`));
const kws = await sql`select market, keyword, landing_path, volume, volume_source, metrics_at, impressions from app.seo_keywords order by market, id`;
console.log("KEYWORDS", kws.length);
for (const k of kws) console.log("KW", k.market, "|", k.keyword, "|", k.landing_path, "|", k.volume, k.volume_source, "|", k.metrics_at, k.impressions);
const site = "sc-domain:10bonds.com";
const q = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
const range = { startDate: "2026-07-01", endDate: "2026-10-24", dataState: "all" };
console.log("TOTAL", JSON.stringify(await g(q, range)));
const d = await g(q, { ...range, dimensions: ["date"] });
console.log("DAILY", JSON.stringify((d.rows ?? []).map((r) => [r.keys[0], r.clicks, r.impressions])));
const qs = await g(q, { ...range, dimensions: ["query", "country"], rowLimit: 500 });
console.log("QUERIES", (qs.rows ?? []).length);
for (const r of qs.rows ?? []) console.log("Q", r.keys.join(" | "), r.clicks, r.impressions, r.position.toFixed(1));
const ps = await g(q, { ...range, dimensions: ["page"], rowLimit: 500 });
for (const r of ps.rows ?? []) console.log("P", r.keys[0], r.clicks, r.impressions, r.position.toFixed(1));
const paths = [...new Set(kws.map((k) => k.landing_path).filter(Boolean))];
for (const p of paths) {
  const j = await g("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", { inspectionUrl: `https://10bonds.com${p}`, siteUrl: site });
  const s = j.inspectionResult?.indexStatusResult;
  console.log("INSPECT", p, "|", s?.coverageState ?? JSON.stringify(j.error?.message), "|", s?.verdict, "|", s?.googleCanonical ?? "", "|", s?.lastCrawlTime ?? "");
}
for (const sm of ["https://10bonds.com/sitemap.xml"]) console.log("SITEMAPS", JSON.stringify(await g(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`)));
await sql.end();
