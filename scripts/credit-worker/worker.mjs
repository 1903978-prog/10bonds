#!/usr/bin/env node
// 10bonds credit research worker (runs on the owner's computer, NOT on the website server).
// Loop: claim a job over HTTPS -> collect public sources -> local Ollama extracts facts as JSON -> send facts + sources back.
// The website validates the facts and calculates IR / BR itself. Only the local Ollama endpoint is ever used for inference.
// Needs Node 18+. No packages. Optional: `pdftotext` (poppler) to read PDF reports.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir, hostname } from "node:os";
import { join } from "node:path";

const run = promisify(execFile);
const SITE = (process.env.BONDS_URL ?? "https://10bonds.com").replace(/\/$/, "");
const TOKEN = process.env.WORKER_TOKEN ?? "";
const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
const MODEL = process.env.OLLAMA_MODEL ?? "";
const ID = process.env.WORKER_ID ?? `worker-${hostname().replace(/[^A-Za-z0-9._-]/g, "")}`.slice(0, 60);
const IDLE_MS = Number(process.env.IDLE_SECONDS ?? 60) * 1000;
const MAX_DOCS = Number(process.env.MAX_DOCS ?? 6);
const CTX = Number(process.env.NUM_CTX ?? 8192);
const UA = "10bonds-research-bot/1.0 (+https://10bonds.com; credit research, polite rate limits)";
const log = (...a) => console.log(new Date().toISOString(), ...a);

// Inference must stay on this machine: refuse any Ollama address that is not loopback or a private network address.
const host = new URL(OLLAMA).hostname;
if (!/^(localhost|127\.|\[?::1\]?$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) { console.error(`OLLAMA_URL must be local, got ${host}`); process.exit(1); }
if (!TOKEN) { console.error("WORKER_TOKEN is not set"); process.exit(1); }

let stopping = false;
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { log("stopping after the current step"); stopping = true; });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, body) {
  const r = await fetch(`${SITE}/api/credit-worker/${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ workerId: ID, model: MODEL, host: hostname(), ...body }), signal: AbortSignal.timeout(30_000) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}

// ---- polite fetching: robots.txt, one request per host every 2 s, timeouts, size cap ----
const lastHit = new Map(); const robots = new Map();
async function allowed(url) {
  const u = new URL(url);
  if (!robots.has(u.origin)) {
    let txt = ""; try { const r = await fetch(`${u.origin}/robots.txt`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(10_000) }); if (r.ok) txt = await r.text(); } catch {}
    const rules = []; let on = false;
    for (const line of txt.split(/\r?\n/)) { const m = /^\s*([a-z-]+)\s*:\s*(.*)$/i.exec(line); if (!m) continue; const k = m[1].toLowerCase(); if (k === "user-agent") on = m[2].trim() === "*" || /10bonds/i.test(m[2]); else if (on && k === "disallow" && m[2].trim()) rules.push(m[2].trim()); }
    robots.set(u.origin, rules);
  }
  return !robots.get(u.origin).some((p) => u.pathname.startsWith(p));
}
async function get(url, asBytes = false) {
  if (!url.startsWith("https://") || !(await allowed(url))) return null;
  const h = new URL(url).host; const wait = (lastHit.get(h) ?? 0) + 2000 - Date.now(); if (wait > 0) await sleep(wait); lastHit.set(h, Date.now());
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(25_000) });
    if (!r.ok || Number(r.headers.get("content-length") ?? 0) > 30e6) return null;
    return asBytes ? Buffer.from(await r.arrayBuffer()) : await r.text();
  } catch { return null; }
}
const strip = (h) => h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
async function pdfText(buf) {
  const dir = await mkdtemp(join(tmpdir(), "cw-")); const f = join(dir, "d.pdf");
  try { await writeFile(f, buf); const { stdout } = await run("pdftotext", ["-l", "40", "-layout", f, "-"], { maxBuffer: 20e6, timeout: 60_000 }); return stdout.replace(/\s+/g, " "); } catch { return ""; } finally { await rm(dir, { recursive: true, force: true }); }
}

// ---- retrieval: GLEIF (legal entity), Wikidata/Wikipedia (website, summary), issuer site (investor pages, reports) ----
async function collect(job) {
  const docs = []; const name = job.known?.issuer || job.known?.name || "";
  const add = (d) => { if (d?.text) docs.push({ ...d, text: d.text.slice(0, 12_000), retrievedAt: new Date().toISOString() }); };
  const nameUsed = name.replace(/\b(plc|ag|sa|se|nv|n\.v\.|spa|s\.p\.a\.|gmbh|ltd|inc|corp|co\.?)\b\.?/gi, "").trim();
  if (nameUsed) {
    const g = await get(`https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(nameUsed)}&page[size]=3`);
    if (g) { try { const j = JSON.parse(g); const e = j.data?.[0]; if (e) add({ url: `https://search.gleif.org/#/record/${e.id}`, title: `GLEIF record ${e.attributes.entity.legalName.name}`, publisher: "GLEIF", period: null, primary: true, method: "api", text: JSON.stringify({ lei: e.id, legalName: e.attributes.entity.legalName.name, jurisdiction: e.attributes.entity.jurisdiction, status: e.attributes.entity.status, registration: e.attributes.registration?.status }) }); } catch {} }
    const wd = await get(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(nameUsed)}&language=en&format=json&limit=1`);
    let site = null;
    try { const id = JSON.parse(wd)?.search?.[0]?.id; if (id) { const ent = JSON.parse(await get(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`) ?? "{}"); site = ent.entities?.[id]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value ?? null; } } catch {}
    const wp = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nameUsed.replace(/ /g, "_"))}`);
    try { const j = JSON.parse(wp ?? "{}"); if (j.extract) add({ url: j.content_urls?.desktop?.page ?? "https://en.wikipedia.org/", title: j.title, publisher: "Wikipedia", period: null, primary: false, method: "api", text: j.extract }); } catch {}
    if (site?.startsWith("https://")) {
      const home = await get(site);
      if (home) {
        add({ url: site, title: "Issuer website", publisher: nameUsed, period: null, primary: true, method: "html", text: strip(home) });
        const links = [...home.matchAll(/href="([^"#]+)"/gi)].map((m) => { try { return new URL(m[1], site).href; } catch { return null; } }).filter((u) => u && u.startsWith("https://") && new URL(u).host === new URL(site).host);
        const rank = (u) => (/investor|ir\b/i.test(u) ? 0 : 5) + (/annual|financial|results|report|prospectus|final-terms/i.test(u) ? 0 : 3) + (/\.pdf($|\?)/i.test(u) ? 0 : 1);
        for (const u of [...new Set(links)].sort((a, b) => rank(a) - rank(b)).slice(0, MAX_DOCS)) {
          if (docs.length >= MAX_DOCS + 3) break;
          if (/\.pdf($|\?)/i.test(u)) { const b = await get(u, true); const t = b ? await pdfText(b) : ""; if (t) add({ url: u, title: decodeURIComponent(u.split("/").pop() ?? "document").slice(0, 120), publisher: nameUsed, period: null, primary: true, method: "pdf", text: t }); }
          else if (rank(u) < 6) { const h = await get(u); if (h) add({ url: u, title: "Issuer page", publisher: nameUsed, period: null, primary: true, method: "html", text: strip(h) }); }
        }
      }
    }
  }
  return docs;
}

// ---- local Ollama extraction (temperature 0, JSON schema) ----
const COLORS = ["RED", "AMBER", "GREEN", "GREY"];
const RISKS = ["news_mgmt_legal", "politics_regulation", "market_competition_tech", "rates_refinancing_liquidity", "macro_fx_energy", "health_climate_cyber"];
const SCHEMA = { type: "object", required: ["issuerType", "seniority", "agencyRatings", "metrics", "risks"], properties: {
  issuerType: { enum: ["corporate", "bank", "sovereign", "other"] },
  seniority: { enum: ["senior_preferred", "senior_unsecured", "secured", "senior_non_preferred", "tier2", "at1", "unknown"] },
  guaranteed: { type: ["boolean", "null"] },
  agencyRatings: { type: "array", items: { type: "object", required: ["agency", "rating", "scope"], properties: { agency: { type: "string" }, rating: { type: "string" }, scope: { enum: ["issuer", "instrument"] }, date: { type: ["string", "null"] } } } },
  metrics: { type: "object", properties: { netDebtToEbitda: { type: ["number", "null"] }, interestCover: { type: ["number", "null"] }, cet1Pct: { type: ["number", "null"] }, nplPct: { type: ["number", "null"] }, debtToGdpPct: { type: ["number", "null"] } } },
  risks: { type: "array", items: { type: "object", required: ["key", "color", "explanation", "evidence"], properties: { key: { enum: RISKS }, color: { enum: COLORS }, explanation: { type: "string" }, evidence: { type: "array", items: { type: "string" } } } } },
  conflicts: { type: "array", items: { type: "string" } } } };

async function extract(job, docs) {
  const body = docs.map((d, i) => `### SOURCE ${i + 1}: ${d.url}\n${d.text.slice(0, Math.floor((CTX * 2.5) / Math.max(1, docs.length)))}`).join("\n\n");
  const prompt = `You extract credit facts for ONE bond. Use ONLY the sources below; never use memory or guess. If a fact is not stated, use null / "unknown" / GREY.\n` +
    `Bond: ${JSON.stringify({ isin: job.isin, ...job.known })}\n` +
    `Rules: seniority is the BOND's own ranking (senior_non_preferred, tier2, at1 are NOT senior_preferred), set "unknown" unless the sources state it. agencyRatings: only ratings written in the sources; scope "issuer" for issuer ratings, "instrument" for a single bond/class rating. ` +
    `risks: one entry for each of the six keys (${RISKS.join(", ")}); GREEN only if the sources checked it and show no material risk (list the SOURCE urls in evidence), otherwise GREY; RED/AMBER need an explanation quoting the source. List contradictions between sources in conflicts.\n\n${body}`;
  const t0 = Date.now();
  const r = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(Number(process.env.INFERENCE_TIMEOUT_S ?? 900) * 1000),
    body: JSON.stringify({ model: MODEL, stream: false, format: SCHEMA, options: { temperature: 0, num_ctx: CTX }, messages: [{ role: "system", content: "Return only JSON matching the schema." }, { role: "user", content: prompt }] }) });
  if (!r.ok) throw new Error(`ollama ${r.status}`);
  const j = await r.json();
  return { result: JSON.parse(j.message.content), ms: Date.now() - t0, tokensIn: j.prompt_eval_count ?? 0, tokensOut: j.eval_count ?? 0 };
}

async function work(job) {
  const beat = setInterval(() => api("heartbeat", { isin: job.isin, stage: "working" }).catch(() => {}), 120_000);
  try {
    await api("heartbeat", { isin: job.isin, stage: "collecting" });
    const docs = await collect(job);
    log(job.isin, "sources:", docs.length);
    if (!docs.length) throw new Error("no public sources found");
    await api("heartbeat", { isin: job.isin, stage: "extracting" });
    const x = await extract(job, docs);
    const evidence = docs.map((d) => ({ url: d.url, title: d.title, publisher: d.publisher, publishedAt: null, period: d.period, retrievedAt: d.retrievedAt, location: null, method: d.method, verification: "unverified", primary: d.primary }));
    const res = await api("complete", { isin: job.isin, result: { ...x.result, evidence, usage: { model: MODEL, ms: x.ms, tokensIn: x.tokensIn, tokensOut: x.tokensOut } } });
    log(job.isin, "complete", res.status, JSON.stringify({ ir: res.ir, br: res.br, status: res.status }));
    if (res.status >= 400 && res.status !== 409) throw new Error(`complete rejected: ${res.error}`);
  } catch (e) {
    log(job.isin, "failed:", e.message);
    await api("fail", { isin: job.isin, error: e.message }).catch(() => {});
  } finally { clearInterval(beat); }
}

if (!MODEL) {
  const t = await fetch(`${OLLAMA}/api/tags`).then((r) => r.json()).catch(() => null);
  console.error(t ? `Set OLLAMA_MODEL to one of: ${t.models.map((m) => m.name).join(", ")}` : `Ollama is not answering at ${OLLAMA}`);
  process.exit(1);
}
log(`worker ${ID} -> ${SITE}, model ${MODEL}, ollama ${OLLAMA}`);
let fails = 0;
while (!stopping) {
  try {
    const r = await api("claim", {});
    if (r.status === 401) { console.error("token rejected: create a new one in Admin > Credit Research"); process.exit(2); }
    fails = 0;
    if (r.job) { log("claimed", r.job.isin, `P${r.job.priority}`); await work(r.job); continue; }
    if (r.paused) log("paused in admin");
  } catch (e) { fails++; log("website not reachable:", e.message); }
  await sleep(Math.min(15 * 60_000, IDLE_MS * 2 ** Math.min(fails, 4)));
}
log("stopped");
