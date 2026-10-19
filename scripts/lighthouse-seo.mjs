// Runs after each deploy (GitHub Actions): Lighthouse, mobile, on each language home page, and stores the result
// where the SEO dashboard reads PageSpeed results (app.settings, seo_psi_<market>). Lighthouse is the engine
// behind PageSpeed Insights; this avoids its shared daily quota. Real-user data (Chrome UX Report) is kept as is.
// Usage: node scripts/lighthouse-seo.mjs <dir with it-1.json, it-2.json, ...>
import { readFileSync, readdirSync } from "node:fs";
import postgres from "postgres";
import { accountsUrl } from "../lib/pgUrl.ts";

const dir = process.argv[2];
const SITE = process.env.SITE_URL ?? "https://10bonds.com";
const median = (xs) => { const s = xs.filter((x) => typeof x === "number").sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

// Same login rules as the site: the secret may be a full URL or only the password of the app role.
const url = accountsUrl(process.env.ACCOUNTS_DATABASE_URL, process.env.DATABASE_URL);
const sql = postgres(url, { max: 1, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require", prepare: false });
for (const market of ["it", "fr", "de"]) {
  const runs = readdirSync(dir).filter((f) => f.startsWith(`${market}-`)).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"))).filter((r) => !r.runtimeError);
  if (!runs.length) { console.log(`${market}: no Lighthouse run`); continue; }
  const cat = (k) => median(runs.map((r) => (typeof r.categories?.[k]?.score === "number" ? Math.round(r.categories[k].score * 100) : null)));
  const audit = (k) => median(runs.map((r) => r.audits?.[k]?.numericValue));
  const [old] = await sql`select value from app.settings where key = ${`seo_psi_${market}`}`;
  let field = null;
  try { field = old ? JSON.parse(old.value).field ?? null : null; } catch {}
  const psi = {
    at: new Date().toISOString(),
    url: `${SITE}/${market}`,
    lab: { performance: cat("performance"), accessibility: cat("accessibility"), lcpMs: audit("largest-contentful-paint"), cls: audit("cumulative-layout-shift"), tbtMs: audit("total-blocking-time") },
    field,
  };
  await sql`insert into app.settings (key, value) values (${`seo_psi_${market}`}, ${JSON.stringify(psi)}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  await sql`delete from app.settings where key = ${`seo_psi_error_${market}`}`;
  console.log(`${market}: performance ${psi.lab.performance}, accessibility ${psi.lab.accessibility} (median of ${runs.length})`);
}
await sql.end();
