#!/usr/bin/env node
// 10bonds credit research worker (runs on the owner's computer, NOT on the website server).
// Loop: claim a job over HTTPS -> collect public sources -> local Ollama extracts facts as JSON -> send facts + sources back.
// The website validates the facts and calculates IR / BR itself. Only the local Ollama endpoint is ever used for inference.
// Needs Node 18+. No packages. Optional: `pdftotext` (poppler) to read PDF reports.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";
import https from "node:https";
import { writeFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir, hostname } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const run = promisify(execFile);
const SITE = (process.env.BONDS_URL ?? "https://10bonds.com").replace(/\/$/, "");
const TOKEN = process.env.WORKER_TOKEN ?? "";
const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
const MODEL = process.env.OLLAMA_MODEL ?? "";
const ID = process.env.WORKER_ID ?? `worker-${hostname().replace(/[^A-Za-z0-9._-]/g, "")}`.slice(0, 60);
const IDLE_MS = Number(process.env.IDLE_SECONDS ?? 60) * 1000;
const MAX_DOCS = Number(process.env.MAX_DOCS ?? 6);
const CTX = Number(process.env.NUM_CTX ?? 8192);
const NUM_PREDICT = Number(process.env.NUM_PREDICT ?? 2500);
const THINK = process.env.OLLAMA_THINK === "1"; // thinking stays OFF unless asked for
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

// ---- retrieval: GLEIF (legal entity + parent), Wikipedia/Wikidata (website), the issuer's investor pages and reports ----
const LEGAL = /\b(finance|funding|capital|international|treasury|holdings?|issuer|b\.?v\.?|n\.?v\.?|plc|ag|sa|s\.a\.|se|spa|s\.p\.a\.|gmbh|ltd|limited|inc|corp|co|kgaa|ab|asa|oyj|a\/s|sarl)\b\.?/gi;
/** Name forms to look for, most specific first: the name without brackets, then without legal forms ("Vonovia Finance B.V." -> "Vonovia"). */
export function nameVariants(name) {
  const plain = String(name).replace(/\([^)]*\)/g, " ").replace(/[,]/g, " ").replace(/\s+/g, " ").trim();
  const core = plain.replace(LEGAL, " ").replace(/[.]/g, " ").replace(/\s+/g, " ").trim();
  return [...new Set([plain, core].filter((x) => x.length >= 3))];
}
const KEYS = /net debt|ebitda|ebit\b|operating (?:profit|income|cash)|free cash|interest cover|leverage|liquidity|refinanc|maturit|covenant|rating|moody|fitch|s&p|standard & poor|scope ratings|cet1|common equity|capital ratio|lcr|nsfr|npl|non-performing|cost of risk|senior|subordinat|guarant|secured|bail-in|prospectus|final terms|dividend|litigation|investigation|downgrade|outlook|debt.{0,20}gdp|deficit/i;
/** Keeps the passages that mention credit facts (about 700 characters each) until `budget` characters are used, in their original order. */
export function relevantText(text, budget) {
  if (text.length <= budget) return text;
  const chunks = []; for (let i = 0; i < text.length; i += 700) chunks.push({ i, t: text.slice(i, i + 700) });
  const score = (c) => (c.t.match(new RegExp(KEYS.source, "gi")) ?? []).length + (/\d/.test(c.t) ? 0.5 : 0);
  const top = [...chunks].sort((x, y) => score(y) - score(x)).slice(0, Math.max(1, Math.floor(budget / 700)));
  return top.sort((x, y) => x.i - y.i).map((c) => c.t).join(" … ");
}
const IR_PATHS = ["/investors", "/investor-relations", "/en/investors", "/en/investor-relations", "/investor", "/ir", "/en/ir", "/investors/financial-reports", "/en/investors/financial-reports", "/about-us/investors", "/en/about-us/investors", "/company/investors"];
const baseDomain = (h) => h.split(".").slice(-2).join(".");
let warnedPdf = false;

async function collect(job) {
  const docs = []; const names = nameVariants(job.known?.issuer || job.known?.name || "");
  const add = (d) => { if (d?.text && d.text.length > 40 && !docs.some((x) => x.url === d.url)) docs.push({ ...d, text: d.text, retrievedAt: new Date().toISOString() }); };
  const guard = async (f) => { try { return await f(); } catch (e) { log("source step failed:", e.message); return null; } };
  if (!names.length) return docs;
  // 1. Legal entity (GLEIF) and its ultimate parent: a finance vehicle's credit is its parent's.
  let parent = null;
  await guard(async () => {
    for (const n of names) {
      const g = await get(`https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(n)}&page[size]=1`);
      const e = g ? JSON.parse(g).data?.[0] : null;
      if (!e) continue;
      const en = e.attributes.entity;
      add({ url: `https://search.gleif.org/#/record/${e.id}`, title: `GLEIF record ${en.legalName.name}`, publisher: "GLEIF", period: null, primary: true, method: "api", text: JSON.stringify({ lei: e.id, legalName: en.legalName.name, jurisdiction: en.jurisdiction, category: en.category, status: en.status, registration: e.attributes.registration?.status }) });
      const pr = await get(`https://api.gleif.org/api/v1/lei-records/${e.id}/ultimate-parent`);
      const pn = pr ? JSON.parse(pr).data?.attributes?.entity?.legalName?.name : null;
      if (pn) { parent = pn; add({ url: `https://api.gleif.org/api/v1/lei-records/${e.id}/ultimate-parent`, title: `Ultimate parent: ${pn}`, publisher: "GLEIF", period: null, primary: true, method: "api", text: `Ultimate parent of ${en.legalName.name}: ${pn}` }); }
      break;
    }
  });
  // 2. Website: Wikipedia search -> Wikidata item -> official website (issuer first, then the parent).
  let site = null;
  for (const n of [...names, ...(parent ? nameVariants(parent) : [])]) {
    if (site) break;
    await guard(async () => {
      const q = await get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(n + " company")}&srlimit=1&format=json`);
      const title = q ? JSON.parse(q).query?.search?.[0]?.title : null;
      if (!title) return;
      const pg = await get(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops|extracts&exintro=1&explaintext=1&ppprop=wikibase_item&titles=${encodeURIComponent(title)}&format=json`);
      const page = pg ? Object.values(JSON.parse(pg).query?.pages ?? {})[0] : null;
      if (page?.extract) add({ url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`, title, publisher: "Wikipedia", period: null, primary: false, method: "api", text: page.extract });
      const qid = page?.pageprops?.wikibase_item;
      if (!qid) return;
      const ent = await get(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
      const w = ent ? JSON.parse(ent).entities?.[qid]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value : null;
      if (typeof w === "string" && w.startsWith("https://")) site = w;
    });
  }
  // 3. Investor pages and reports on that website.
  if (site) await guard(async () => {
    const origin = new URL(site).origin, dom = baseDomain(new URL(site).hostname);
    const pages = [site, ...IR_PATHS.map((p) => origin + p)];
    const found = [];
    for (const u of pages) {
      if (found.length >= 3) break;
      const h = await get(u);
      if (!h) continue;
      found.push({ u, h });
      add({ url: u, title: u === site ? "Issuer website" : "Investor relations page", publisher: names[0], period: null, primary: true, method: "html", text: strip(h) });
    }
    const links = new Set();
    for (const { u, h } of found) for (const m of h.matchAll(/href="([^"#]+)"/gi)) { try { const l = new URL(m[1], u); if (l.protocol === "https:" && baseDomain(l.hostname) === dom) links.add(l.href); } catch { /* bad link */ } }
    const rank = (u) => (/annual|integrated|financial-report|results|interim|half-year|quarter|pillar|prospectus|final-terms|credit|rating|debt|bond/i.test(u) ? 0 : 5) + (/investor|\/ir\b/i.test(u) ? 0 : 2) + (/\.pdf($|\?)/i.test(u) ? 0 : 1);
    for (const u of [...links].sort((a, b) => rank(a) - rank(b)).slice(0, MAX_DOCS * 2)) {
      if (docs.length >= MAX_DOCS + 4) break;
      if (rank(u) >= 6) continue;
      if (/\.pdf($|\?)/i.test(u)) {
        const b = await get(u, true); const t = b ? await pdfText(b) : "";
        if (!t && b && !warnedPdf) { warnedPdf = true; log("PDF reports are skipped: install pdftotext (poppler) to read them"); }
        if (t) add({ url: u, title: decodeURIComponent(u.split("/").pop() ?? "document").slice(0, 120), publisher: names[0], period: null, primary: true, method: "pdf", text: t });
      } else { const h = await get(u); if (h) add({ url: u, title: "Issuer page", publisher: names[0], period: null, primary: true, method: "html", text: strip(h) }); }
    }
  });
  return docs;
}

/**
 * Talks to Ollama with node:http, NOT fetch: Node's fetch gives up after 300 s of waiting for the first byte, and a slow computer or a big model
 * needs longer than that to read a prompt. The reply is streamed (one JSON line per piece) and only `timeoutMs` as a whole can stop it.
 */
function ollamaChat(body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(`${OLLAMA}/api/chat`);
    const timer = setTimeout(() => req.destroy(new Error(`no complete answer from Ollama within ${Math.round(timeoutMs / 60000)} min`)), timeoutMs);
    const req = (u.protocol === "https:" ? https : http).request(u, { method: "POST", headers: { "content-type": "application/json" } }, (res) => {
      let raw = "", buf = "", content = "", last = {};
      res.setEncoding("utf8");
      res.on("data", (d) => {
        if (raw.length < 200_000) raw += d;
        buf += d;
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line) continue;
          try { const j = JSON.parse(line); if (j.message?.content) content += j.message.content; if (j.done) last = j; } catch { /* not a stream line (an error body) */ }
        }
      });
      res.on("end", () => { clearTimeout(timer); resolve({ status: res.statusCode, raw, content, last }); });
      res.on("error", (e) => { clearTimeout(timer); reject(e); });
    });
    req.on("error", (e) => { clearTimeout(timer); reject(e); });
    req.end(JSON.stringify(body));
  });
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

export async function extract(job, docs) {
  const body = docs.map((d, i) => `### SOURCE ${i + 1}: ${d.url}\n${relevantText(d.text, Math.floor((CTX * 2.5) / Math.max(1, docs.length)))}`).join("\n\n");
  const prompt = `You extract credit facts for ONE bond. Use ONLY the sources below; never use memory or guess. If a fact is not stated, use null / "unknown" / GREY.\n` +
    `Bond: ${JSON.stringify({ isin: job.isin, ...job.known })}\n` +
    `Rules: seniority is the BOND's own ranking (senior_non_preferred, tier2, at1 are NOT senior_preferred), set "unknown" unless the sources state it. agencyRatings: only ratings written in the sources; scope "issuer" for issuer ratings, "instrument" for a single bond/class rating. ` +
    `risks: one entry for each of the six keys (${RISKS.join(", ")}); GREEN only if the sources checked it and show no material risk (list the SOURCE urls in evidence), otherwise GREY; RED/AMBER need an explanation quoting the source. List contradictions between sources in conflicts.\n\n${body}`;
  // Small and "thinking" models (qwen3 family) often fail here: thinking is on by default and eats the time and the answer budget, or the
  // JSON schema is refused. So: thinking off, a cap on the answer length, a clean-up of the reply, and a second try with plain JSON mode.
  const t0 = Date.now();
  const attempts = [{ format: SCHEMA }, { format: "json" }];
  let lastErr = "";
  for (const [n, a] of attempts.entries()) {
    const ask = (withThink) => {
      const body = { model: MODEL, stream: true, format: a.format, keep_alive: "30m", options: { temperature: 0, num_ctx: CTX, num_predict: NUM_PREDICT },
        messages: [{ role: "system", content: "Return only JSON, no explanation." + (n ? ` Required keys: ${Object.keys(SCHEMA.properties).join(", ")}.` : "") }, { role: "user", content: prompt }] };
      if (withThink) body.think = THINK;
      return ollamaChat(body, Number(process.env.INFERENCE_TIMEOUT_S ?? 1800) * 1000);
    };
    let r = await ask(true);
    if (r.status === 400) { if (/think/i.test(r.raw)) r = await ask(false); else { lastErr = `ollama 400: ${r.raw.slice(0, 200)}`; log(lastErr); continue; } }
    if (r.status !== 200) { lastErr = `ollama ${r.status}: ${r.raw.slice(0, 200)}`; log(lastErr); continue; }
    const j = r.last;
    const parsed = parseJsonReply(r.content);
    log(`ollama ${MODEL} ${Math.round((Date.now() - t0) / 1000)}s, in ${j.prompt_eval_count ?? "?"} out ${j.eval_count ?? "?"} tokens, ${parsed ? "valid JSON" : "NOT valid JSON"}`);
    if (parsed) return { result: parsed, ms: Date.now() - t0, tokensIn: j.prompt_eval_count ?? 0, tokensOut: j.eval_count ?? 0 };
    lastErr = `model did not return JSON (${r.content.slice(0, 160).replace(/\s+/g, " ")}${j.done_reason === "length" ? " ... cut at the length limit" : ""})`;
  }
  throw new Error(lastErr || "no answer from Ollama");
}

/** Reply to JSON: drops <think> blocks and code fences, takes the outermost {...}. Null if it is not an object. */
export function parseJsonReply(text) {
  const t = String(text).replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "");
  const i = t.indexOf("{"), k = t.lastIndexOf("}");
  if (i < 0 || k <= i) return null;
  try { const v = JSON.parse(t.slice(i, k + 1)); return v && typeof v === "object" && !Array.isArray(v) ? v : null; } catch { return null; }
}

async function work(job) {
  let stage = "collecting";
  const beat = setInterval(() => api("heartbeat", { isin: job.isin, stage }).catch(() => {}), 120_000);
  try {
    await api("heartbeat", { isin: job.isin, stage });
    let docs = [];
    try { docs = await collect(job); } catch (e) { log(job.isin, "collection failed:", e.message); }
    log(job.isin, "sources:", docs.length);
    let x = null, problem = docs.length ? "" : "no public sources found";
    if (docs.length) {
      stage = "extracting";
      await api("heartbeat", { isin: job.isin, stage });
      try { x = await extract(job, docs); } catch (e) { problem = `extraction failed: ${e.message}`; log(job.isin, problem); }
    }
    // Two tries per bond; after that the site still gets a provisional assessment from the data it already holds (ratings, seniority),
    // marked "review required" with the gap listed, instead of the bond staying empty forever.
    if (!x && (job.attempts ?? 1) < 2) throw new Error(problem);
    const evidence = docs.map((d) => ({ url: d.url, title: d.title, publisher: d.publisher, publishedAt: null, period: d.period, retrievedAt: d.retrievedAt, location: null, method: d.method, verification: "unverified", primary: d.primary }));
    const result = x ? { ...x.result, evidence, usage: { model: MODEL, ms: x.ms, tokensIn: x.tokensIn, tokensOut: x.tokensOut } } : { evidence, notes: [`automatic research incomplete: ${problem}`], usage: { model: MODEL, ms: 0, tokensIn: 0, tokensOut: 0 } };
    stage = "publishing";
    const res = await api("complete", { isin: job.isin, result });
    log(job.isin, "complete", res.status, JSON.stringify({ ir: res.ir, br: res.br, status: res.status }));
    if (res.status >= 400 && res.status !== 409) throw new Error(`complete rejected: ${res.error}`);
  } catch (e) {
    log(job.isin, "failed:", e.message);
    await api("fail", { isin: job.isin, error: e.message }).catch(() => {});
  } finally { clearInterval(beat); }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
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

}
