#!/usr/bin/env node
// 10bonds credit research worker (runs on the owner's computer, NOT on the website server).
// Loop: claim a job over HTTPS -> collect public sources -> local Ollama extracts facts as JSON -> send facts + sources back.
// The website validates the facts and calculates IR / BR itself. Only the local Ollama endpoint is ever used for inference.
// Needs Node 18+. One optional package (pdfjs-dist, installed by itself on first use) or `pdftotext` (poppler) to read PDF reports.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";
import https from "node:https";
import { writeFile, rm, mkdtemp, readFile, mkdir } from "node:fs/promises";
import { tmpdir, hostname, homedir } from "node:os";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { lookup } from "node:dns/promises";

const run = promisify(execFile);
const SITE = (process.env.BONDS_URL ?? "https://10bonds.com").replace(/\/$/, "");
const TOKEN = process.env.WORKER_TOKEN ?? "";
const OLLAMA = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
// Standing rule (Livio, 04 Nov 2026): the Lenovo uses ONLY qwen3:8b. No other model is ever requested, loaded or warmed up (OLLAMA_MODEL is ignored).
export const ONLY_MODEL = "qwen3:8b";
const MODEL = ONLY_MODEL;
const ID = process.env.WORKER_ID ?? `worker-${hostname().replace(/[^A-Za-z0-9._-]/g, "")}`.slice(0, 60);
export const WORKER_VERSION = "2026-11-12.1";
let NET_DIAG = null;
const IDLE_MS = Number(process.env.IDLE_SECONDS ?? 60) * 1000;
const MAX_DOCS = Number(process.env.MAX_DOCS ?? 6);
const CTX = Number(process.env.NUM_CTX ?? 8192);
const NUM_PREDICT = Number(process.env.NUM_PREDICT ?? 2500);
const THINK = process.env.OLLAMA_THINK === "1"; // thinking stays OFF unless asked for
const UA = "10bonds-research-bot/1.0 (+https://10bonds.com; credit research, polite rate limits)";
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---- Knowledge kept between jobs (verified issuer websites, hosts that do not exist, period-tagged figures per issuer). Plain JSON in the worker's data folder. ----
const DATA_DIR = process.env.WORKER_DATA ?? join(homedir(), "10bonds-worker");
const KB_FILE = join(DATA_DIR, "knowledge.json");
let KB = { domains: {}, dead: {}, financials: {} };
async function loadKB() { try { KB = { domains: {}, dead: {}, financials: {}, ...JSON.parse(await readFile(KB_FILE, "utf8")) }; } catch { /* first run */ } }
async function saveKB() { try { await mkdir(DATA_DIR, { recursive: true }); await writeFile(KB_FILE, JSON.stringify(KB, null, 1)); } catch (e) { log("could not save knowledge file:", e.message); } }
// ---- Shared memory on the website (verified issuer websites and cited figures per issuer): survives a new computer and is the same for every worker. The local file stays as the fallback. ----
let kbWarned = false;
async function kbApi(body) {
  try { const r = await api("kb", body); if (r.status === 200) return r; if (!kbWarned) { kbWarned = true; log(`shared memory on the website answered HTTP ${r.status}; using the local file only`); } }
  catch (e) { if (!kbWarned) { kbWarned = true; log("shared memory on the website not reachable:", e.message, "- using the local file only"); } }
  return null;
}
const kbName = (ikey) => String(ikey).replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 120);
const sameRecord = (a, b) => a.parameter === b.parameter && a.reportingDate === b.reportingDate && a.url === b.url && a.value === b.value;
/** Reads the issuer's verified website and cited figures from the website database and merges them into the local copy. Returns true when the website answered. */
export async function kbPull(ikey, kb = KB, call = kbApi) {
  const k = kbName(ikey); if (k.length < 2) return false;
  const r = await call({ op: "get", keys: [`domain:${k}`, `fin:${k}`] });
  if (!r?.values) return false;
  const d = r.values[`domain:${k}`]; if (d?.site && !kb.domains[ikey]) kb.domains[ikey] = d;
  const f = r.values[`fin:${k}`];
  if (Array.isArray(f?.records)) { const rec = (kb.financials[ikey] ??= { issuer: f.issuer, records: [] }); for (const x of f.records) if (x?.parameter && !rec.records.some((y) => sameRecord(y, x))) rec.records.push(x); }
  return true;
}
/** Writes the issuer's verified website and cited figures (newest 150) to the website database. */
export async function kbPush(ikey, kb = KB, call = kbApi) {
  const k = kbName(ikey); if (k.length < 2) return false;
  const entries = {};
  if (kb.domains[ikey]) entries[`domain:${k}`] = kb.domains[ikey];
  const fin = kb.financials[ikey];
  if (fin) entries[`fin:${k}`] = { ...fin, records: [...fin.records].sort((a, b) => (b.retrievedAt ?? "").localeCompare(a.retrievedAt ?? "")).slice(0, 150) };
  if (!Object.keys(entries).length) return false;
  const r = await call({ op: "put", entries });
  return !!r && r.saved > 0;
}
const issuerKey = (job) => (job.identity?.lei || job.hints?.lei || (job.known?.issuer || job.known?.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")).toString();
// ---- Per-job counters for the stage summary: discovery, access, parsing, extraction, verification ----
export const stats = { fetchOk: 0, blocked: {}, failedHosts: {}, pdfParsed: 0, pdfFailed: 0, ollamaMs: 0 };
export const resetStats = () => { stats.fetchOk = 0; stats.blocked = {}; stats.failedHosts = {}; stats.pdfParsed = 0; stats.pdfFailed = 0; stats.ollamaMs = 0; };

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
// Documented public data APIs (they ask for a descriptive user agent, which we send, and publish their own rate limits).
const API_HOSTS = /^(api\.gleif\.org|api\.worldbank\.org|api\.gdeltproject\.org|[a-z]+\.wikipedia\.org|www\.wikidata\.org)$/;
async function get(url, asBytes = false) {
  if (!url.startsWith("https://")) return null;
  if (!API_HOSTS.test(new URL(url).hostname) && !(await allowed(url))) { log("  skipped (robots.txt):", url.slice(0, 100)); return null; }
  const h = new URL(url).host;
  if (KB.dead[h] && Date.now() - Date.parse(KB.dead[h]) < 24 * 3600e3) return null; // did not resolve in the last 24 h: not retried meanwhile (a name that never existed is not guessed any more)
  const wait = (lastHit.get(h) ?? 0) + 2000 - Date.now(); if (wait > 0) await sleep(wait); lastHit.set(h, Date.now());
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(25_000) });
    if (!r.ok || Number(r.headers.get("content-length") ?? 0) > 30e6) { if (r.status !== 404) { (stats.blocked[h] ??= new Set()).add(r.status); if (stats.blocked[h].size === 1 && !(stats.blocked[h].logged)) { stats.blocked[h].logged = true; log(`  access refused (${r.status}) by ${h}`); } } return null; }
    stats.fetchOk++;
    return asBytes ? Buffer.from(await r.arrayBuffer()) : await r.text();
  } catch (e) {
    const code = e.cause?.code ?? e.message;
    if (code === "ENOTFOUND") { KB.dead[h] = new Date().toISOString(); await saveKB(); } // remembered: this host does not exist
    if (!stats.failedHosts[h]) { stats.failedHosts[h] = code; log("  unreachable:", h, code); }
    return null;
  }
}
const strip = (h) => h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// ---- Evidence-backed figures (same rules as lib/creditExtract.ts on the website). The model never supplies a number: a figure counts only if a
// sentence of the retrieved document names it, and that sentence travels with the figure as its citation. No match = missing, never inferred. ----
const NUM = "(\\d{1,3}(?:[.,]\\d+)?)";
const AMT = "(\\d{1,3}(?:,\\d{3})+|\\d+(?:[.,]\\d+)?)";
const PCT = "\\s?(?:%|per ?cent)";
// Words that put a figure in the PRIOR period or in a business segment, not the group's current figure.
const PRIOR_CUE = /previous year|prior[- ]year|last year|compared with|versus|\bvs\.?\s/i;
const SEGMENT_CUE = /segment|Corporate Customers|Real Estate|Capital Markets|Private Customers|Savings Banks|division|business unit/i;
const lbl = (l) => ({
  fwd: new RegExp(`${l}[^.;\\n]{0,60}?${NUM}${PCT}`, "gi"),        // "CET1 ratio of 16.1%"
  rev: new RegExp(`${NUM}${PCT},?\\s+(?:(?!and\\b|or\\b|the\\b|with\\b|of\\b)[a-z-]+\\s+){0,2}?${l}`, "gi"), // "At 8.3%, return on equity" (the gap never crosses "and", "the"...: "16.1% and the NPE ratio" is not an NPE figure)
  tab: new RegExp(`${l}[^\\d.;]{0,60}?${NUM}\\s+${NUM}(?![\\d.,])`, "gi"), // table row: current period first, then prior
});
const L_CET1 = "(?:CET\\s?1|common equity tier 1)(?: capital)?(?: ratio)?";
const L_NPE = "(?:non-?performing exposures?|\\bNPE\\b)(?: ratio)?";
const L_NPL = "(?:non-?performing loans?|\\bNPL\\b)(?: ratio)?";
const L_ROE = "(?:return on equity|\\bRoE\\b)";
const L_CIR = "cost[/ -]?(?:to[- ])?income ratio";
const L_TCR = "total capital ratio";
const L_LCR = "(?:liquidity coverage ratio|\\bLCR\\b)";
const L_NSFR = "(?:net stable funding ratio|\\bNSFR\\b)";
const L_SII = "Solvency II(?: coverage| capital)?(?: ratio)?";
const L_COR = "combined ratio";
export const BANK_RULES = [
  { parameter: "cet1Pct", unit: "%", pats: Object.values(lbl(L_CET1)) },
  { parameter: "npePct", unit: "%", pats: Object.values(lbl(L_NPE)) },
  { parameter: "nplPct", unit: "%", pats: Object.values(lbl(L_NPL)) },
  { parameter: "roePct", unit: "%", pats: Object.values(lbl(L_ROE)) },
  { parameter: "costIncomePct", unit: "%", pats: Object.values(lbl(L_CIR)) },
  { parameter: "totalCapitalPct", unit: "%", pats: Object.values(lbl(L_TCR)) },
  // Liquidity: both ratios are regulatory minimums of 100%; a printed figure outside a sane band is a page artefact, not a ratio.
  { parameter: "lcrPct", unit: "%", range: [60, 600], pats: Object.values(lbl(L_LCR)) },
  { parameter: "nsfrPct", unit: "%", range: [60, 400], pats: Object.values(lbl(L_NSFR)) },
  // Insurers (owner-approved insurer method, 3/11/2026).
  { parameter: "solvencyIIPct", unit: "%", range: [80, 600], pats: Object.values(lbl(L_SII)) },
  { parameter: "combinedRatioPct", unit: "%", range: [70, 150], pats: Object.values(lbl(L_COR)) },
  { parameter: "pretaxProfitEurM", unit: "EUR m", skipSentence: SEGMENT_CUE, pats: [
    new RegExp(`(?:EUR|€)\\s?${AMT}\\s?(?:m\\b|million)\\s+(?:\\w+\\s+)?before tax`, "gi"),                         // "EUR 708 million before tax"
    new RegExp(`consolidated (?:profit|result)(?:/loss)? before tax[^\\d]{0,30}?${AMT}\\s+${AMT}(?![\\d.,])`, "gi"), // group table row, current period first
    new RegExp(`(?:pre-?tax (?:profit|result)|profit before tax)[^.;\\n]{0,60}?(?:EUR|€)\\s?${AMT}\\s?(?:m\\b|million)`, "gi"),
  ] },
];
const toNumber = (v) => Number(/^\d{1,3}(,\d{3})+$/.test(v) ? v.replace(/,/g, "") : v.replace(",", "."));
function sentenceAround(text, start, end) {
  const bounds = [0];
  for (const m of text.matchAll(/(?<=[.!?])\s+(?=[A-Z€(])|\n+/g)) bounds.push(m.index + m[0].length);
  bounds.push(text.length);
  let i = 0; while (i + 1 < bounds.length - 1 && bounds[i + 1] <= start) i++;
  let j = i; while (j + 1 < bounds.length - 1 && bounds[j + 1] < end) j++;
  return text.slice(bounds[i], bounds[j + 1]).replace(/\s+/g, " ").trim();
}
export function extractBankFigures(text) {
  const found = [];
  for (const r of BANK_RULES) {
    let best = null;
    for (const re of r.pats) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        const quote = sentenceAround(text, m.index, m.index + m[0].length);
        if (r.skipSentence && r.skipSentence.test(quote)) continue;          // a business segment, not the group
        if (r.range && (toNumber(m[1]) < r.range[0] || toNumber(m[1]) > r.range[1])) continue;
        const beforeNumber = m[0].slice(0, m[0].indexOf(m[1]));
        if (PRIOR_CUE.test(beforeNumber)) continue;                          // "... than in the previous year (8.6%)" is last year's figure
        if (!best || m.index < best.idx) best = { idx: m.index, value: toNumber(m[1]), quote };
        break;
      }
    }
    if (best) found.push({ parameter: r.parameter, value: best.value, unit: r.unit, quote: best.quote, offset: best.idx });
  }
  const have = new Set(found.map((f) => f.parameter));
  return { found, missing: BANK_RULES.map((r) => r.parameter).filter((p) => !have.has(p)) };
}
/** The reporting period a document talks about, as a label and its end date (H1 2026 -> 2026-06-30). Null when the text does not say. */
export function reportPeriod(text) {
  const t = text.slice(0, 20000);
  let m = /(?:first half(?: of)?|H1|half-year(?: results)?(?: of)?)\s*(?:of\s*)?(20\d\d)/i.exec(t);
  if (m) return { label: `H1 ${m[1]}`, end: `${m[1]}-06-30` };
  m = /(?:nine months|9M)\s*(?:of\s*)?(20\d\d)/i.exec(t); if (m) return { label: `9M ${m[1]}`, end: `${m[1]}-09-30` };
  m = /(?:first quarter|Q1)\s*(?:of\s*)?(20\d\d)/i.exec(t); if (m) return { label: `Q1 ${m[1]}`, end: `${m[1]}-03-31` };
  m = /(?:full[- ]year|annual report|financial year|FY)\s*(20\d\d)/i.exec(t); if (m) return { label: `FY ${m[1]}`, end: `${m[1]}-12-31` };
  return null;
}
/** Seniority stated on a regulatory-reference page, near the ISIN when the page lists several instruments. */
export function seniorityFromText(text, isin) {
  const i = isin ? text.indexOf(isin) : -1;
  const win = i >= 0 ? text.slice(Math.max(0, i - 400), i + 800) : text;
  if (/senior non[- ]?preferred|\bSNP\b/i.test(win)) return "Senior Non-Preferred";
  if (/senior preferred|preferred senior/i.test(win)) return "Senior Preferred";
  return null;
}
const FT_URL = /final[-_ ]?terms|endg(?:ue|ü)ltige[-_ ]?bedingungen|pricing[-_ ]?supplement|conditions[-_ ]?of[-_ ]?the[-_ ]?notes/i;
/**
 * Seniority as the bond's OWN terms (final terms) or the issuer's bond list state it. The document must name THIS ISIN; the words are read in a window around it.
 * The returned strings are chosen so the website reads them correctly (no word like "subordinated" inside a senior label).
 */
export function finalTermsSeniority(text, isin) {
  const i = isin ? text.indexOf(isin) : -1; if (i < 0) return null;
  const win = text.slice(Math.max(0, i - 3000), i + 6000);
  if (/senior non[- ]?preferred|non[- ]?preferred senior|nicht bevorrechtigt|46f\s*(?:abs\.?|\()?\s*\(?6/i.test(win)) return "Senior Non-Preferred";
  if (/\btier\s?2\b|nachrang|additional tier 1/i.test(win) && !/unsubordinated|nicht nachrangig/i.test(win)) return "Subordinated";
  if (/senior preferred|preferred senior/i.test(win)) return "Senior Preferred";
  if (/unsecured and unsubordinated|unbesichert und nicht nachrangig|nicht nachrangig\w* und unbesichert/i.test(win)) return "Senior Preferred (unsecured, ranking equally with other senior obligations)";
  return null;
}
/** Looks for the bond's final terms: documents already read, links of the issuer's site named "final terms", then the issuer's bond lists (searched for the ISIN, up to 900 pages). Null when none states the seniority. */
export async function findFinalTerms(job, docs) {
  const tried = [];
  for (const d of docs) if (d.method !== "api" && !/bankingresolution|boerse-stuttgart|businessinsider/.test(d.url) && d.text.includes(job.isin)) { const s = finalTermsSeniority(d.text, job.isin); tried.push(d.url); if (s) return { url: d.url, seniority: s, kind: FT_URL.test(d.url) ? "final terms" : "issuer document naming the ISIN", doc: null }; }
  const urls = [...new Set([...(job.linkPool ?? []).filter((u) => FT_URL.test(u)), ...(job.bondLists ?? [])])].filter((u) => !tried.includes(u)).slice(0, 4);
  for (const u of urls) {
    try {
      const isPdf = /\.pdf($|\?)/i.test(u); const raw = await get(u, isPdf); if (!raw) continue;
      const text = isPdf ? await pdfText(raw, { maxPages: 900, needle: job.isin }) : strip(raw);
      const s = text ? finalTermsSeniority(text, job.isin) : null; tried.push(u);
      if (s) return { url: u, seniority: s, kind: (job.bondLists ?? []).includes(u) ? "issuer bond list" : "final terms", doc: { url: u, title: decodeURIComponent(u.split("/").pop() ?? "document").slice(0, 120), publisher: new URL(u).hostname.replace(/^www\./, ""), period: null, primary: true, method: isPdf ? "pdf" : "html", text: text.slice(Math.max(0, text.indexOf(job.isin) - 3000), text.indexOf(job.isin) + 6000), verified: true, retrievedAt: new Date().toISOString() } };
    } catch (e) { log("final terms candidate failed:", e.message); }
  }
  return { url: null, seniority: null, tried: tried.length + urls.length };
}
// The metric the website's gate needs, per figure; NPE stays an NPE figure (not relabelled as NPL).
const METRIC_OF = { cet1Pct: "cet1Pct", nplPct: "nplPct", debtToGdpPct: "debtToGdpPct" };
/** Parameters the next retrieval round must look for, most publication-critical first, and the words that find the right document. */
export const TARGETS = [
  { parameter: "cet1Pct", words: /capital|pillar|results|financial|interim|half-year|report/i },
  { parameter: "nplPct", words: /asset.?quality|risk|results|financial|report/i },
  { parameter: "totalCapitalPct", words: /capital|pillar|results/i },
  { parameter: "lcrPct", words: /liquidity|funding|pillar|capital|results|report/i },
  { parameter: "nsfrPct", words: /liquidity|funding|pillar|capital|results|report/i },
  { parameter: "solvencyIIPct", words: /solvency|sfcr|capital|results|financial|report/i },
  { parameter: "combinedRatioPct", words: /results|financial|underwriting|report/i },
  { parameter: "roePct", words: /results|financial|profit|report/i },
  { parameter: "costIncomePct", words: /results|financial|report/i },
  { parameter: "pretaxProfitEurM", words: /results|financial|profit|report/i },
];

/** PDF text with a form feed between pages, so a figure can be cited with its page number (each page ends with one; page = form feeds before the figure + 1). */
export async function pdfText(buf, opts = {}) {
  const maxPages = opts.maxPages ?? 60;
  const dir = await mkdtemp(join(tmpdir(), "cw-")); const f = join(dir, "d.pdf");
  try { await writeFile(f, buf); const { stdout } = await run("pdftotext", ["-l", String(maxPages), "-layout", f, "-"], { maxBuffer: 120e6, timeout: maxPages > 60 ? 240_000 : 90_000 }); if (stdout.trim()) { stats.pdfParsed++; return stdout.replace(/[ \t\r\n\v]+/g, " ").replace(/ ?\f ?/g, "\f"); } } catch { /* pdftotext not installed: try the JavaScript reader */ } finally { await rm(dir, { recursive: true, force: true }); }
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false, verbosity: 0 }).promise;
    let out = "";
    for (let i = 1; i <= Math.min(doc.numPages, maxPages) && out.length < (maxPages > 60 ? 6_000_000 : 400_000); i++) { out += (await (await doc.getPage(i)).getTextContent()).items.map((x) => x.str).join(" ") + "\f"; if (opts.needle && out.includes(opts.needle)) break; }
    stats.pdfParsed++;
    return out.replace(/[ \t\r\n\v]+/g, " ").replace(/ ?\f ?/g, "\f");
  } catch (e) {
    if (e.code === "ERR_MODULE_NOT_FOUND" && !triedInstall) { // install the one optional package by itself, once, then retry
      triedInstall = true; log("installing the PDF reader (npm install, once) ...");
      try { await run("npm", ["install", "--silent", "--no-audit", "--no-fund"], { cwd: dirname(fileURLToPath(import.meta.url)), shell: process.platform === "win32", timeout: 240_000 }); return await pdfText(buf, opts); } catch (e2) { log("PDF reader install failed:", e2.message.slice(0, 120)); }
    }
    stats.pdfFailed++;
    if (!warnedPdf) { warnedPdf = true; log("PDF reports are skipped: run `npm install` in scripts\\credit-worker (or install pdftotext)", e.code ?? ""); } return ""; }
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
let warnedPdf = false; let triedInstall = false;
const IR_PATHS = ["/investors", "/investor-relations", "/en/investors", "/en/investor-relations", "/investor", "/ir", "/en/ir", "/investors/financial-reports", "/en/investors/financial-reports", "/about-us/investors", "/en/about-us/investors", "/company/investors"];
const baseDomain = (h) => h.split(".").slice(-2).join(".");

// ---- official numbers that need no model: World Bank (country risk, macro, public debt) and GDELT (news headlines) ----
let wbCountries = null;
async function wbIso(name) {
  if (!name) return null;
  if (!wbCountries) {
    const t = await get("https://api.worldbank.org/v2/country?format=json&per_page=400");
    wbCountries = new Map();
    try { for (const c of JSON.parse(t)[1] ?? []) wbCountries.set(c.name.toLowerCase().replace(/[^a-z]/g, ""), c.id); } catch { /* list not available */ }
    for (const [a, b] of [["czechrepublic", "czechia"], ["slovakrepublic", "slovakia"], ["turkey", "turkiye"], ["southkorea", "korearep"], ["unitedkingdom", "unitedkingdom"], ["unitedstates", "unitedstates"], ["russia", "russianfederation"], ["egypt", "egyptarabrep"]]) if (!wbCountries.has(a) && wbCountries.has(b)) wbCountries.set(a, wbCountries.get(b));
  }
  return wbCountries.get(String(name).toLowerCase().replace(/[^a-z]/g, "")) ?? null;
}
/** Latest value of a World Bank indicator for a country: { value, year, url } or null. */
export async function wbLatest(iso, indicator, source) {
  const url = `https://api.worldbank.org/v2/country/${iso}/indicator/${indicator}?format=json&mrnev=1${source ? `&source=${source}` : ""}`;
  const t = await get(url); if (!t) return null;
  try { const r = JSON.parse(t)[1]?.[0]; return r && typeof r.value === "number" ? { value: r.value, year: r.date, url } : null; } catch { return null; }
}
/** Deterministic colours from official numbers. Rules are fixed and written into each explanation. */
export function countryRisks(wb) {
  const out = [];
  if (wb.stability) { const v = wb.stability.value; out.push({ key: "politics_regulation", color: v >= 60 ? "GREEN" : v >= 30 ? "AMBER" : "RED", explanation: `World Bank political stability percentile ${v.toFixed(0)} (${wb.stability.year}); rule: 60+ green, 30-60 amber, below 30 red.`, evidenceUrls: [wb.stability.url] }); }
  if (wb.inflation && wb.growth) { const i = wb.inflation.value, g = wb.growth.value; out.push({ key: "macro_fx_energy", color: i <= 4 && g >= 0 ? "GREEN" : i > 8 || g < -2 ? "RED" : "AMBER", explanation: `Country inflation ${i.toFixed(1)}% (${wb.inflation.year}), GDP growth ${g.toFixed(1)}% (${wb.growth.year}); rule: inflation up to 4% and growth 0%+ green, inflation above 8% or growth below -2% red, else amber.`, evidenceUrls: [wb.inflation.url, wb.growth.url] }); }
  return out;
}
const NEGATIVE = '(downgrade OR default OR fraud OR investigation OR lawsuit OR insolvency OR "profit warning" OR sanctions OR bankruptcy)';
/** Recent headlines (GDELT, last 3 months) that mention the issuer with a risk word. */
export async function newsScan(name) {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${name}" ${NEGATIVE}`)}&mode=artlist&maxrecords=15&format=json&timespan=3months&sort=datedesc`;
  const t = await get(url); if (t === null) return null;
  let arts = []; try { arts = JSON.parse(t).articles ?? []; } catch { if (!/^\s*\{\s*\}\s*$/.test(t)) return null; }
  return { url, hits: arts.length, text: arts.length ? arts.map((a) => `${(a.seendate ?? "").slice(0, 8)} ${a.title} (${a.domain})`).join("\n") : `No headlines mentioning "${name}" together with a risk word (downgrade, default, fraud, investigation, lawsuit, insolvency, profit warning, sanctions, bankruptcy) in the last 3 months.` };
}
async function collect(job) {
  const docs = []; const names = nameVariants(job.known?.issuer || job.known?.name || job.hints?.issuer || "");
  const add = (d) => { if (d?.text && d.text.length > 40 && !docs.some((x) => x.url === d.url)) docs.push({ ...d, text: d.text, retrievedAt: new Date().toISOString() }); };
  const guard = async (f) => { try { return await f(); } catch (e) { log("source step failed:", e.message); return null; } };
  // -1. Seed from the owner's reference case when this ISIN has one: the issuer's LEI (official register = identity) and the official pages to read first.
  if (job.hints) await guard(async () => {
    if (job.hints.lei) {
      const g = await get(`https://api.gleif.org/api/v1/lei-records/${encodeURIComponent(job.hints.lei)}`);
      const e = g ? JSON.parse(g).data : null;
      const en = e?.attributes?.entity;
      if (en?.legalName?.name && e.id === job.hints.lei) {
        job.identity = { legalName: en.legalName.name, lei: e.id, status: en.status ?? null };
        add({ url: `https://api.gleif.org/api/v1/lei-records/${e.id}`, title: `GLEIF record ${en.legalName.name}`, publisher: "gleif.org", period: null, primary: true, method: "api", verified: true, text: JSON.stringify({ lei: e.id, legalName: en.legalName.name, status: en.status, jurisdiction: en.jurisdiction }) });
      }
    }
    for (const src of [...(job.hints.sources ?? [])].sort((a, b) => a.priority - b.priority)) {
      if (/outstanding issues|bond list/i.test(src.label)) { (job.bondLists ??= []).push(src.url); continue; }
      if (/\.pdf($|\?)/i.test(src.url)) { const b = await get(src.url, true); const t = b ? await pdfText(b) : ""; if (t) add({ url: src.url, title: src.label, publisher: new URL(src.url).hostname.replace(/^www\./, ""), period: null, primary: !/boerse|bankingresolution/.test(src.url), method: "pdf", text: t }); }
      else { const h = await get(src.url); if (h) add({ url: src.url, title: src.label, publisher: new URL(src.url).hostname.replace(/^www\./, ""), period: null, primary: !/boerse|bankingresolution/.test(src.url), method: "html", text: strip(h) }); }
    }
  });
  if (!names.length) return docs;
  // 0. Official numbers: the country's political stability, inflation and growth; recent news headlines. These need no model.
  job.det = { risks: [], metrics: {} };
  await guard(async () => {
    const iso = await wbIso(job.known?.country);
    if (iso) {
      const [stability, inflation, growth, debt] = await Promise.all([wbLatest(iso, "PV.PER.RNK", 3), wbLatest(iso, "FP.CPI.TOTL.ZG"), wbLatest(iso, "NY.GDP.MKTP.KD.ZG"), wbLatest(iso, "GC.DOD.TOTL.GD.ZS")]);
      for (const [d, label] of [[stability, "political stability percentile"], [inflation, "inflation %"], [growth, "GDP growth %"], [debt, "central government debt % of GDP"]])
        if (d) add({ url: d.url, title: `World Bank: ${label} (${d.year})`, publisher: "World Bank", period: d.year, primary: true, method: "api", text: `${job.known.country}: ${label} = ${d.value.toFixed(1)} (${d.year})` });
      job.det.risks.push(...countryRisks({ stability, inflation, growth }));
      if (debt && /republic of|kingdom of|government|bundesrepublik|state of/i.test(job.known?.issuer || job.known?.name || "")) job.det.metrics.debtToGdpPct = Math.round(debt.value * 10) / 10;
    }
    const news = await newsScan(names[names.length - 1] ?? names[0]);
    if (news) {
      add({ url: news.url, title: `News headlines scan (GDELT), ${news.hits} hit(s)`, publisher: "GDELT", period: null, primary: false, method: "api", text: news.text });
      if (news.hits === 0) job.det.risks.push({ key: "news_mgmt_legal", color: "GREEN", explanation: "Headline scan of the last 3 months (GDELT) found no article naming the issuer with a risk word (downgrade, default, fraud, investigation, lawsuit, insolvency, profit warning, sanctions, bankruptcy).", evidenceUrls: [news.url] });
      else job.det.risks.push({ key: "news_mgmt_legal", color: "AMBER", explanation: `${news.hits} recent headline(s) name the issuer with a risk word; they need reading before this can be green.`, evidenceUrls: [news.url] });
    }
  });
  // 1. Legal entity (GLEIF) and its ultimate parent: a finance vehicle's credit is its parent's.
  let parent = null;
  await guard(async () => {
    const norm = (x) => String(x || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\b(s\.?p\.?a\.?|a\.?g\.?|s\.?e\.?|n\.?v\.?|plc|ltd|gmbh|sa|ag|se|nv|spa|group|holding|holdings|inc|corp|co)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
    for (const n of names) {
      // exact legal-name filter first, then a full-text search (catalogue names rarely equal the registered legal name)
      let e = null;
      for (const q of [`filter[entity.legalName]=${encodeURIComponent(n)}`, `filter[fulltext]=${encodeURIComponent(n)}`]) {
        const g = await get(`https://api.gleif.org/api/v1/lei-records?${q}&page[size]=10`);
        let list = []; try { list = g ? (JSON.parse(g).data ?? []) : []; } catch { list = []; }
        // accept only an ACTIVE record whose legal name equals the issuer name after removing legal-form words (never a loose match)
        e = list.find((r) => norm(r.attributes?.entity?.legalName?.name) === norm(n) && (r.attributes?.registration?.status ?? "ISSUED") === "ISSUED") || null;
        if (e) break;
      }
      if (!e) continue;
      const en = e.attributes.entity;
      job.identity = { legalName: en.legalName.name, lei: e.id, status: en.status ?? null };
      add({ url: `https://search.gleif.org/#/record/${e.id}`, title: `GLEIF record ${en.legalName.name}`, publisher: "gleif.org", period: null, primary: true, method: "api", verified: true, text: JSON.stringify({ lei: e.id, legalName: en.legalName.name, jurisdiction: en.jurisdiction, category: en.category, status: en.status, registration: e.attributes.registration?.status }) });
      const pr = await get(`https://api.gleif.org/api/v1/lei-records/${e.id}/ultimate-parent`);
      let pn = null; try { pn = pr ? JSON.parse(pr).data?.attributes?.entity?.legalName?.name : null; } catch {}
      if (pn) { parent = pn; add({ url: `https://api.gleif.org/api/v1/lei-records/${e.id}/ultimate-parent`, title: `Ultimate parent: ${pn}`, publisher: "gleif.org", period: null, primary: true, method: "api", verified: true, text: `Ultimate parent of ${en.legalName.name}: ${pn}` }); }
      break;
    }
  });
  // 2. Website: Wikipedia search -> Wikidata item -> official website (issuer first, then the parent).
  // the owner's reference sources name the real website: use it before any search or guess
  let siteFrom = null;
  let site = KB.domains[issuerKey(job)]?.site ?? null; if (site) siteFrom = "cache"; // verified earlier for this issuer
  if (!site) for (const src of [...(job.hints?.sources ?? [])].sort((a, b) => a.priority - b.priority)) { try { const u = new URL(src.url); if (!/boerse|bankingresolution|gleif|wikipedia/.test(u.hostname)) { site = `${u.origin}/`; siteFrom = "reference"; break; } } catch { /* bad url */ } }
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
      if (typeof w === "string" && w.startsWith("https://")) { site = w; siteFrom = "wikidata"; }
    });
  }
  // 2b. Verify the official website once (its home page names the issuer), then remember it for every later bond of this issuer.
  if (site && siteFrom !== "cache") await guard(async () => {
    const h = await get(site);
    const word = (names[0] ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).find((w) => w.length >= 3);
    if (siteFrom === "reference" || (h && word && strip(h).toLowerCase().includes(word))) { KB.domains[issuerKey(job)] = { site, verifiedAt: new Date().toISOString(), via: siteFrom, issuer: names[0] }; await saveKB(); job.siteVerified = true; }
    else { log("official website not verified, not used:", site); site = null; }
  });
  else if (site) job.siteVerified = true;
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
    job.linkPool = [...links];
    const rank = (u) => (/annual|integrated|financial-report|results|interim|half-year|quarter|pillar|prospectus|final-terms|credit|rating|debt|bond/i.test(u) ? 0 : 5) + (/investor|\/ir\b/i.test(u) ? 0 : 2) + (/\.pdf($|\?)/i.test(u) ? 0 : 1);
    for (const u of [...links].sort((a, b) => rank(a) - rank(b)).slice(0, MAX_DOCS * 2)) {
      if (docs.length >= MAX_DOCS + 4) break;
      if (rank(u) >= 6) continue;
      if (/\.pdf($|\?)/i.test(u)) {
        const b = await get(u, true); const t = b ? await pdfText(b) : "";
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
  issuerType: { enum: ["corporate", "bank", "financial_holding", "insurer", "sovereign", "other"] },
  seniority: { enum: ["senior_preferred", "senior_unsecured", "secured", "senior_non_preferred", "tier2", "at1", "unknown"] },
  guaranteed: { type: ["boolean", "null"] },
  agencyRatings: { type: "array", items: { type: "object", required: ["agency", "rating", "scope"], properties: { agency: { type: "string" }, rating: { type: "string" }, scope: { enum: ["issuer", "instrument"] }, date: { type: ["string", "null"] } } } },
  metrics: { type: "object", properties: { netDebtToEbitda: { type: ["number", "null"] }, interestCover: { type: ["number", "null"] }, cet1Pct: { type: ["number", "null"] }, nplPct: { type: ["number", "null"] }, debtToGdpPct: { type: ["number", "null"] } } },
  risks: { type: "array", items: { type: "object", required: ["key", "color", "explanation", "evidence"], properties: { key: { enum: RISKS }, color: { enum: COLORS }, explanation: { type: "string" }, evidence: { type: "array", items: { type: "string" } } } } },
  conflicts: { type: "array", items: { type: "string" } } } };

// ---- Optional semantic retrieval with BGE-M3 (only when the model is installed in Ollama; nothing is downloaded by the worker). It only chooses WHICH passages the model reads;
// every figure still needs a quoted sentence found by the fixed rules, so it cannot invent a number. Embeddings are cached on disk by passage hash. ----
const EMBED_MODEL = process.env.EMBED_MODEL ?? "bge-m3";
const EMBED_FILE = join(DATA_DIR, "embeddings.json");
let embedState = null; let EMB = null;
export const embedStats = { used: false, chunks: 0, fromCache: 0 };
export async function embedAvailable() {
  return false; // embeddings would load a second model: keyword retrieval only (standing rule: qwen3:8b only)
  if (embedState !== null) return embedState;
  try { const t = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(5000) }).then((r) => r.json()); embedState = (t.models ?? []).some((m) => m.name.split(":")[0] === EMBED_MODEL); } catch { embedState = false; }
  return embedState;
}
export const cosine = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; };
async function embedTexts(texts, call = null) {
  if (call) return call(texts);
  const r = await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: EMBED_MODEL, input: texts }), signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`embed HTTP ${r.status}`);
  return (await r.json()).embeddings;
}
async function loadEmb() { if (EMB) return; try { EMB = JSON.parse(await readFile(EMBED_FILE, "utf8")); } catch { EMB = {}; } }
async function saveEmb() { try { const keys = Object.keys(EMB); if (keys.length > 1200) for (const k of keys.slice(0, keys.length - 1200)) delete EMB[k]; await mkdir(DATA_DIR, { recursive: true }); await writeFile(EMBED_FILE, JSON.stringify(EMB)); } catch { /* cache only */ } }
const QUERIES = ["Common Equity Tier 1 capital ratio CET1", "liquidity coverage ratio LCR and net stable funding ratio NSFR", "non-performing exposures ratio NPE", "total capital ratio, return on equity, cost income ratio, profit before tax",
  "ranking of the notes: senior preferred, senior non-preferred, subordinated", "guarantee of the notes", "credit ratings Moody's S&P Fitch", "net debt to EBITDA leverage and interest cover", "refinancing, liquidity and maturity profile", "legal proceedings, investigation, sanctions"];
/** For each document, the passages (about 700 characters) closest in meaning to what is still to be found, as text in reading order. Returns null when BGE-M3 is not installed or fails. */
export async function semanticPick(docs, budgetPerDoc, call = null, avail = null) {
  if (!(avail ?? await embedAvailable()) ) return null;
  try {
    await loadEmb();
    const crypto = await import("node:crypto");
    const key = (t) => crypto.createHash("sha1").update(t).digest("hex");
    const qv = await embedTexts(QUERIES, call);
    const out = new Map();
    for (const d of docs) {
      if (d.method === "api" || d.text.length <= budgetPerDoc) continue;
      const chunks = []; for (let i = 0; i < d.text.length && chunks.length < 400; i += 700) chunks.push({ i, t: d.text.slice(i, i + 700) });
      const need = chunks.filter((c) => !EMB[key(c.t)]);
      embedStats.fromCache += chunks.length - need.length;
      for (let b = 0; b < need.length; b += 24) { const vs = await embedTexts(need.slice(b, b + 24).map((c) => c.t), call); need.slice(b, b + 24).forEach((c, j) => { EMB[key(c.t)] = vs[j].map((x) => Math.round(x * 1e4) / 1e4); }); }
      embedStats.chunks += need.length;
      const scored = chunks.map((c) => ({ ...c, sc: Math.max(...qv.map((q) => cosine(q, EMB[key(c.t)]))) })).sort((x, y) => y.sc - x.sc).slice(0, Math.max(1, Math.floor(budgetPerDoc / 700)));
      out.set(d.url, scored.sort((x, y) => x.i - y.i).map((c) => c.t).join(" … "));
    }
    embedStats.used = true; await saveEmb();
    return out;
  } catch (e) { log("semantic retrieval failed, using keyword retrieval:", e.message); return null; }
}

export async function extract(job, docs) {
  const body = docs.map((d, i) => `### SOURCE ${i + 1}: ${d.url}\n${job.semantic?.get(d.url) ?? relevantText(d.text, Math.floor((CTX * 2.5) / Math.max(1, docs.length)))}`).join("\n\n");
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

/** Official-number results join the model's: a worse colour from the model stays; evidence urls must be sources that were retrieved. */
export function mergeDeterministic(result, det) {
  if (!det) return result;
  const risks = [...(result.risks ?? [])];
  const sev = { GREY: 0, GREEN: 1, AMBER: 2, RED: 3 };
  for (const d of det.risks) {
    const i = risks.findIndex((r) => r.key === d.key);
    const entry = { key: d.key, color: d.color, explanation: d.explanation, evidence: d.evidenceUrls };
    if (i < 0) risks.push(entry);
    else if ((sev[risks[i].color] ?? 0) <= sev[d.color]) risks[i] = { ...entry, explanation: `${d.explanation}${risks[i].explanation ? ` Model note: ${risks[i].explanation}` : ""}`.slice(0, 600) };
  }
  const metrics = { ...(result.metrics ?? {}) };
  for (const [k, v] of Object.entries(det.metrics)) if (metrics[k] == null) metrics[k] = v;
  return { ...result, risks, metrics };
}


/** Deterministic figures from every retrieved document; a document that yields a quoted figure counts as verified. Then targeted retrieval rounds for what is still missing. */
export async function gatherFigures(job, docs, fetchMore = null, rounds = 2) {
  const figures = [];
  const take = (d) => {
    if (d.method === "api") return;
    const per = reportPeriod(d.text);
    for (const f of extractBankFigures(d.text).found) {
      const have = figures.find((x) => x.parameter === f.parameter);
      const rd = per?.end ?? null;
      // the first (highest-priority) document wins, unless a later document is for a NEWER reporting period (H1 2026 beats FY 2025); a conflicting same-period value is reported below
      if (have) { if (rd && (!have.reportingDate || rd > have.reportingDate)) figures.splice(figures.indexOf(have), 1); else continue; }
      const page = d.method === "pdf" ? d.text.slice(0, f.offset).split("\f").length : null;
      const { offset, ...fig } = f;
      figures.push({ ...fig, url: d.url, period: per?.label ?? null, reportingDate: rd, ...(page ? { page } : {}) });
      d.verified = true;
    }
  };
  const conflicts = [];
  for (const d of docs) take(d);
  // a second document naming a different value for the same figure is a conflict, not a tie-break
  for (const d of docs) {
    if (d.method === "api") continue;
    for (const f of extractBankFigures(d.text).found) {
      const have = figures.find((x) => x.parameter === f.parameter);
      if (have && have.value !== f.value && have.url !== d.url && have.reportingDate === (reportPeriod(d.text)?.end ?? null)) conflicts.push(`${f.parameter}: ${have.value} (${have.url}) vs ${f.value} (${d.url})`);
    }
  }
  const critical = ["cet1Pct", "npePct"];
  for (let round = 1; round <= rounds && fetchMore && critical.some((p) => !figures.some((f) => f.parameter === p)); round++) {
    const want = TARGETS.filter((t) => !figures.some((f) => f.parameter === t.parameter));
    // look for the NEXT missing parameter specifically (e.g. CET1 in the capital/results documents), not for the ISIN again
    const next = want.find((t) => critical.includes(t.parameter)) ?? want[0];
    const more = await fetchMore(next, round);
    for (const d of more) { docs.push(d); take(d); }
    await sleep(2000 * round);
  }
  return { figures, conflicts };
}

/** Evidence records (verified only when a quoted figure or an official register record backs them), cited metrics and the extra facts sent to the website. */
export function buildExtra(job, docs, figures, figConflicts) {
  const evidence = docs.map((d) => ({ url: d.url, title: d.title, publisher: d.publisher, publishedAt: null, period: d.period, retrievedAt: d.retrievedAt, location: null, method: d.method, verification: d.verified ? "verified" : "unverified", primary: d.primary }));
  // The reported metrics come ONLY from cited figures (NPE is not relabelled as NPL); the website drops any metric without an accepted citation.
  const metrics = {}; const metricPeriods = {};
  for (const f of figures) { const k = METRIC_OF[f.parameter]; if (k) { metrics[k] = f.value; if (f.reportingDate) metricPeriods[k] = f.reportingDate; } }
  const regDoc = docs.find((d) => /bankingresolution\.com/.test(d.url));
  const extra = {
    figures, metricPeriods, conflicts: figConflicts,
    ...(job.identity ? { issuer: { canonicalId: job.identity.lei, legalName: job.identity.legalName, lei: job.identity.lei } } : {}),
    seniorityEvidence: { dataCopy: job.known?.seniority ?? null, regulatory: regDoc ? seniorityFromText(regDoc.text, job.isin) : null, finalTerms: job.finalTerms?.seniority ?? null },
    notes: [
      job.finalTerms?.seniority ? `seniority read in ${job.finalTerms.kind}: ${job.finalTerms.url}` : `final terms not found (${job.finalTerms?.tried ?? 0} candidate document(s) tried); seniority rests on regulatory reference data`,
      ...(figures.some((f) => f.parameter === "npePct") && !figures.some((f) => f.parameter === "nplPct") ? ["NPE ratio published; NPL ratio not found (the two are different metrics and are not relabelled)"] : []),
      ...TARGETS.filter((t) => !figures.some((f) => f.parameter === t.parameter)).map((t) => `not found after targeted retrieval: ${t.parameter}`).slice(0, 6),
    ],
  };
  return { evidence, metrics, extra };
}

/** Keep every cited figure per issuer with its reporting period; two different values for the SAME parameter and period from different documents are both kept and reported as a conflict (publication stays blocked until reconciled). */
export function recordFinancials(key, issuer, figures, kb = KB) {
  const rec = (kb.financials[key] ??= { issuer, records: [] }); rec.issuer = issuer; rec.updatedAt = new Date().toISOString();
  const conflicts = [];
  for (const f of figures) {
    if (f.cached || !f.quote || !f.url) continue;
    if (!rec.records.some((r) => r.parameter === f.parameter && r.reportingDate === f.reportingDate && r.url === f.url && r.value === f.value)) {
      const other = rec.records.find((r) => r.parameter === f.parameter && r.reportingDate && r.reportingDate === f.reportingDate && r.value !== f.value && r.url !== f.url);
      if (other) conflicts.push(`${f.parameter} ${f.period ?? f.reportingDate}: ${other.value} (${other.url}) vs ${f.value} (${f.url})`);
      rec.records.push({ parameter: f.parameter, value: f.value, unit: f.unit, period: f.period, reportingDate: f.reportingDate, url: f.url, page: f.page ?? null, quote: f.quote, retrievedAt: new Date().toISOString() });
    }
  }
  return conflicts;
}
/** A figure already cited in an earlier job for this issuer (newest reporting period first); used only when this job found nothing for that parameter. */
export function cachedFigure(key, parameter, kb = KB) {
  const rs = (kb.financials[key]?.records ?? []).filter((r) => r.parameter === parameter).sort((a, b) => (b.reportingDate ?? "").localeCompare(a.reportingDate ?? ""));
  return rs[0] ? { parameter, value: rs[0].value, unit: rs[0].unit, quote: rs[0].quote, url: rs[0].url, period: rs[0].period, reportingDate: rs[0].reportingDate, ...(rs[0].page ? { page: rs[0].page } : {}), cached: true } : null;
}
const MANDATORY = ["cet1Pct", "npePct", "totalCapitalPct", "roePct", "costIncomePct", "pretaxProfitEurM", "lcrPct", "nsfrPct"];
function summaryBlock(job, docs, figures, conflicts, x, res) {
  const blocked = Object.entries(stats.blocked).map(([h, set]) => `${h} (${[...set].join("/")})`);
  const verified = figures.filter((f) => f.quote && f.url);
  const missing = MANDATORY.filter((p) => !figures.some((f) => f.parameter === p));
  return [
    `== ${job.isin} research summary`,
    `issuer: ${job.identity?.legalName ?? job.known?.issuer ?? "?"}${job.identity?.lei ? ` · LEI ${job.identity.lei}` : ""} · official website ${job.siteVerified ? "verified" : "not verified"}`,
    `1 discovery:  ${docs.length} source(s) found`,
    `   bond terms: seniority ${job.finalTerms?.seniority ? `${job.finalTerms.seniority} from ${job.finalTerms.kind} (${job.finalTerms.url})` : "final terms not found"}; regulatory reference: ${docs.some((d) => /bankingresolution/.test(d.url)) ? (seniorityFromText(docs.find((d) => /bankingresolution/.test(d.url)).text, job.isin) ?? "page read, no seniority stated") : "not read"}`,
    `   shared memory: ${kbWarned ? "website database not available (local file used)" : "website database in use"}`,
    `2 access:     ${stats.fetchOk} fetched, ${blocked.length ? `refused: ${blocked.join(", ")}` : "none refused"}${Object.keys(stats.failedHosts).length ? `, unreachable: ${Object.keys(stats.failedHosts).join(", ")}` : ""}`,
    `3 parsing:    ${stats.pdfParsed} PDF parsed, ${stats.pdfFailed} failed`,
    `4 extraction: ${figures.length} figure(s) found${x ? `, model ${Math.round((x.ms ?? 0) / 1000)} s` : ", model not used"}; retrieval: ${embedStats.used ? `BGE-M3 (${embedStats.chunks} passages embedded, ${embedStats.fromCache} from cache)` : embedState === false ? "keywords (BGE-M3 not installed: ollama pull bge-m3 to enable)" : "keywords"}`,
    `5 verification: ${verified.length} with quote + source (${figures.filter((f) => f.cached).length} from earlier jobs); missing mandatory: ${missing.join(", ") || "none"}; conflicts: ${conflicts.length ? conflicts.join(" | ") : "none"}`,
    ...figures.map((f) => `   ${f.parameter} = ${f.value} ${f.unit} · ${f.period ?? "period unknown"} · ${f.url.slice(0, 90)}${f.page ? ` p.${f.page}` : ""}${f.cached ? " (cached)" : ""}`),
    `6 scoring/publication: ${res ? `IR ${res.ir ?? "?"} · BR ${res.br ?? "?"} · ${res.status}` : "not reached"}`,
  ].join("\n");
}

async function work(job) {
  resetStats(); embedStats.used = false; embedStats.chunks = 0; embedStats.fromCache = 0; await loadKB();
  const ikey0 = issuerKey(job); const pulled = await kbPull(ikey0); if (pulled) await saveKB();
  let stage = "collecting";
  const beat = setInterval(() => api("heartbeat", { isin: job.isin, stage }).catch(() => {}), 120_000);
  try {
    await api("heartbeat", { isin: job.isin, stage });
    let docs = [];
    try { docs = await collect(job); } catch (e) { log(job.isin, "collection failed:", e.message); }
    log(job.isin, "sources:", docs.length);
    const fetchMore = async (target, round) => {
      const pool = (job.linkPool ?? []).filter((u) => !docs.some((d) => d.url === u) && target.words.test(u)).slice(0, 3);
      log(job.isin, `targeted retrieval round ${round}: looking for ${target.parameter} in ${pool.length} document(s)`);
      const out = [];
      for (const u of pool) {
        try {
          if (/\.pdf($|\?)/i.test(u)) { const b = await get(u, true); const t = b ? await pdfText(b) : ""; if (t) out.push({ url: u, title: decodeURIComponent(u.split("/").pop() ?? "document").slice(0, 120), publisher: new URL(u).hostname.replace(/^www\./, ""), period: null, primary: true, method: "pdf", text: t, retrievedAt: new Date().toISOString() }); }
          else { const h = await get(u); if (h) out.push({ url: u, title: "Issuer page", publisher: new URL(u).hostname.replace(/^www\./, ""), period: null, primary: true, method: "html", text: strip(h), retrievedAt: new Date().toISOString() }); }
        } catch (e) { log("targeted fetch failed:", e.message); }
      }
      return out;
    };
    const { figures, conflicts: figConflicts } = await gatherFigures(job, docs, fetchMore);
    const ikey = issuerKey(job); const cachedList = []; // earlier cited figures: shown in the summary, never sent as if retrieved now
    for (const t of TARGETS) if (!figures.some((f) => f.parameter === t.parameter)) { const c = cachedFigure(ikey, t.parameter); if (c) cachedList.push(c); }
    figConflicts.push(...recordFinancials(ikey, job.identity?.legalName ?? job.known?.issuer ?? ikey, figures));
    try { job.finalTerms = await findFinalTerms(job, docs); if (job.finalTerms?.doc) docs.push(job.finalTerms.doc); } catch (e) { log("final terms search failed:", e.message); }
    await saveKB(); await kbPush(ikey);
    const wbDebt = docs.find((d) => d.publisher === "World Bank" && /central government debt/.test(d.title));
    if (wbDebt && job.det?.metrics?.debtToGdpPct != null) figures.push({ parameter: "debtToGdpPct", value: job.det.metrics.debtToGdpPct, unit: "% of GDP", quote: wbDebt.text, url: wbDebt.url, period: wbDebt.period ?? null, reportingDate: wbDebt.period ? `${wbDebt.period}-12-31` : null }), (wbDebt.verified = true);
    log(job.isin, "figures with citations:", figures.map((f) => `${f.parameter}=${f.value}`).join(", ") || "none");
    let x = null, problem = docs.length ? "" : "no public sources found";
    if (docs.length) {
      stage = "extracting";
      await api("heartbeat", { isin: job.isin, stage });
      try { job.semantic = await semanticPick(docs, Math.floor((CTX * 2.5) / Math.max(1, docs.length))); x = await extract(job, docs); } catch (e) { problem = `extraction failed: ${e.message}`; log(job.isin, problem); }
    }
    // Two tries per bond; after that the site still gets a provisional assessment from the data it already holds (ratings, seniority),
    // marked "review required" with the gap listed, instead of the bond staying empty forever.
    if (!x && (job.attempts ?? 1) < 2) throw new Error(problem);
    const { evidence, metrics, extra } = buildExtra(job, docs, figures, figConflicts);
    const result0 = x ? { ...x.result, ...extra, metrics: { ...(x.result.metrics ?? {}), ...metrics }, notes: [...(x.result.notes ?? []), ...extra.notes], conflicts: [...(x.result.conflicts ?? []), ...extra.conflicts], evidence, usage: { model: MODEL, ms: x.ms, tokensIn: x.tokensIn, tokensOut: x.tokensOut } } : { ...extra, metrics, notes: [`automatic research incomplete: ${problem}`, ...extra.notes], evidence, usage: { model: MODEL, ms: 0, tokensIn: 0, tokensOut: 0 } };
    const result = mergeDeterministic(result0, job.det);
    stage = "publishing";
    const res = await api("complete", { isin: job.isin, result });
    log(job.isin, "complete", res.status, JSON.stringify({ ir: res.ir, br: res.br, status: res.status }));
    console.log(summaryBlock(job, docs, [...figures, ...cachedList.filter((c) => !figures.some((f) => f.parameter === c.parameter))], figConflicts, x, res));
    if (res.status >= 400 && res.status !== 409) throw new Error(`complete rejected: ${res.error}`);
  } catch (e) {
    log(job.isin, "failed:", e.message);
    await api("fail", { isin: job.isin, error: e.message }).catch(() => {});
  } finally { clearInterval(beat); }
}

// ---- Self-test: reads the real LBBW H1 2026 documents (press release page, press-release PDF, half-year report PDF) and prints expected vs retrieved. Needs no Ollama. ----
const LBBW_DOCS = [
  { label: "press release (web page)", url: "https://www.lbbw.de/article/press-release/lbbw-firmly-on-track_ancu4bx2g2_e.html", pdf: false },
  { label: "press release (PDF)", url: "https://www.lbbw.de/konzern/medien-center/presseinfos/2026/20260828-press-release-lbbw-firmly-on-track_ancu39nmvc_m.pdf", pdf: true },
  { label: "half-year report 2026 (PDF)", url: "https://www.lbbw.de/konzern/investor-relations/finanzberichte/halbjahresberichte/2026/lbbw_half-yearly-financial-report-2026_ancu38v7h4_m.pdf", pdf: true },
];
// What the original LBBW report says for 1 Jan-30 Jun 2026 / 30 Jun 2026 (press release of 28 Aug 2026), and what the owner's list had, with the reason it differs.
const LBBW_EXPECTED = [
  { p: "cet1Pct", official: 16.1, listed: 16.1, note: "" },
  { p: "npePct", official: 0.9, listed: 0.9, note: "" },
  { p: "roePct", official: 8.3, listed: 8.6, note: "8.6 is H1 2025 (prior year)" },
  { p: "costIncomePct", official: 60.4, listed: 60.4, note: "" },
  { p: "pretaxProfitEurM", official: 708, listed: 312, note: "312 is the Corporate Customers segment only" },
  { p: "totalCapitalPct", official: 19.9, listed: 21.61, note: "21.6 is 30 June 2025 (prior year)" },
];
export async function selftest() {
  await loadKB(); resetStats();
  const rows = []; const lines = [`LBBW self-test ${new Date().toISOString()}`];
  const got = {};
  for (const d of LBBW_DOCS) {
    const raw = await get(d.url, d.pdf);
    if (!raw) { lines.push(`ACCESS FAILED: ${d.label} ${d.url}`); continue; }
    const text = d.pdf ? await pdfText(raw) : strip(raw);
    if (d.pdf && !text) { lines.push(`PARSE FAILED: ${d.label}`); continue; }
    const per = reportPeriod(text);
    lines.push(`OK: ${d.label} · ${text.replace(/\f/g, " ").length} characters${d.pdf ? ` · ${text.split("\f").length - (text.endsWith("\f") ? 1 : 0)} pages` : ""} · period ${per?.label ?? "not stated"}`);
    for (const f of extractBankFigures(text).found) {
      const page = d.pdf ? text.slice(0, f.offset).split("\f").length : null;
      (got[f.parameter] ??= []).push({ ...f, label: d.label, url: d.url, page, period: per?.label ?? "?", end: per?.end ?? "" });
    }
  }
  lines.push("", "parameter | owner's list | official H1 2026 | retrieved (period, source, page) | verdict");
  let ok = 0;
  for (const e of LBBW_EXPECTED) {
    const g = (got[e.p] ?? []).sort((a, b) => b.end.localeCompare(a.end))[0];
    const vals = [...new Set((got[e.p] ?? []).map((x) => x.value))];
    const verdict = !g ? "NOT RETRIEVED" : vals.length > 1 ? `CONFLICT between documents: ${vals.join(" vs ")}` : g.value === e.official ? `MATCHES official${e.listed !== e.official ? ` (owner's list ${e.listed}: ${e.note})` : ""}` : `DIFFERS from official ${e.official}`;
    if (g && g.value === e.official && vals.length === 1) ok++;
    lines.push(`${e.p} | ${e.listed} | ${e.official} | ${g ? `${g.value} (${g.period}, ${g.label}${g.page ? ` p.${g.page}` : ""})` : "-"} | ${verdict}`);
  }
  for (const p of ["lcrPct", "nsfrPct"]) { const g = (got[p] ?? []).sort((a, b) => b.end.localeCompare(a.end))[0]; lines.push(`${p} (liquidity, not in the owner's list) | ${g ? `${g.value} (${g.period}, ${g.label}${g.page ? ` p.${g.page}` : ""})` : "not found in these documents"}`); }
  lines.push("", `${ok} of ${LBBW_EXPECTED.length} figures retrieved and equal to the official H1 2026 report`);
  const out = lines.join("\n"); console.log(out);
  try { await mkdir(DATA_DIR, { recursive: true }); await writeFile(join(DATA_DIR, "selftest-report.txt"), out); } catch { /* ignore */ }
  return ok;
}


/** Finds the owner's original $bonds skill on THIS computer and uploads its text (and any files next to it) to the website, which compares its hash. Never edits anything. */
export async function uploadBondsSkill() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const cands = [join(home, ".codex", "skills", "bonds", "SKILL.md"), "C:\\Users\\moret\\.codex\\skills\\bonds\\SKILL.md", join(home, ".codex", "skills", "bonds", "skill.md"), join(home, ".agents", "skills", "bonds", "SKILL.md"), join(home, ".claude", "skills", "bonds", "SKILL.md")];
  for (const p of cands) {
    try {
      const text = await readFile(p, "utf8");
      const r = await kbApi({ op: "put", entries: { "skill:bonds": { path: p, found: true, bytes: text.length, uploadedAt: new Date().toISOString(), text: text.slice(0, 150000) } } });
      return { found: true, path: p, bytes: text.length, uploaded: !!r?.saved };
    } catch { /* try the next place */ }
  }
  await kbApi({ op: "put", entries: { "skill:bonds": { found: false, tried: cands, uploadedAt: new Date().toISOString() } } });
  return { found: false, tried: cands };
}

/** Everything the cloud sandbox cannot see, checked from THIS computer. Writes check-report.txt; the launcher runs it before the worker starts. Needs no job and writes nothing except one small test entry in the shared memory. */
export async function lenovoCheck() {
  const L = [`Lenovo check ${new Date().toISOString()} · worker ${ID} · site ${SITE}`]; let bad = 0;
  const line = (ok, name, detail) => { if (!ok) bad++; L.push(`${ok ? "OK    " : "FAIL  "}${name}${detail ? ` · ${detail}` : ""}`); };
  const info = (name, detail) => L.push(`info  ${name}${detail ? ` · ${detail}` : ""}`);
  await loadKB(); resetStats();
  // 1 website door and the shared memory
  const kb = await kbApi({ op: "put", entries: { "domain:lenovo-check": { site: "https://example.invalid/", checkedAt: new Date().toISOString() } } });
  line(!!kb && kb.saved === 1, "website database (shared memory) write", kb ? `saved ${kb.saved}` : "route not answering - the site may not have this release yet, or the token is wrong");
  const back = kb ? await kbApi({ op: "get", keys: ["domain:lenovo-check"] }) : null;
  line(!!back?.values?.["domain:lenovo-check"], "website database (shared memory) read");
  // 1b the original $bonds skill on this computer
  { const sk = await uploadBondsSkill().catch(() => null); (sk?.found ? line(true, "original $bonds skill file found and uploaded", `${sk.path} (${sk.bytes} bytes)`) : info("original $bonds skill file", "not found in the usual .codex folders - the website keeps its saved copy")); }
  // 2 Ollama, models
  const tags = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(8000) }).then((r) => r.json()).catch(() => null);
  line(!!tags, "Ollama answers", OLLAMA);
  line(!!tags?.models?.some((m) => m.name === MODEL), `model ${MODEL} installed`);
  const emb = await embedAvailable(); info("BGE-M3 retrieval", emb ? "installed - used for choosing passages" : "not installed (optional): run `ollama pull bge-m3` to enable; keyword retrieval is used meanwhile");
  if (emb) { try { const v = await embedTexts(["capital ratio"]); line(Array.isArray(v?.[0]) && v[0].length > 100, "BGE-M3 embedding works", `${v?.[0]?.length ?? 0} dimensions`); } catch (e) { line(false, "BGE-M3 embedding works", e.message); } }
  // 3 PDF reader
  let pdfOk = false; try { await run("pdftotext", ["-v"], { timeout: 8000 }); pdfOk = true; } catch (e) { pdfOk = e.code !== "ENOENT" && !!e.stderr; }
  if (!pdfOk) { try { await import("pdfjs-dist/legacy/build/pdf.mjs"); pdfOk = true; } catch { /* missing */ } }
  line(pdfOk, "PDF reader (pdftotext or pdfjs-dist)");
  // 4 reach of the sites that matter for bank bonds
  for (const [name, url, must] of [["LBBW website", "https://www.lbbw.de/", true], ["Banking Resolution (regulatory data)", "https://bankingresolution.com/instruments/DE000LB2CW16", true], ["Börse Stuttgart", "https://www.boerse-stuttgart.de/en/products/bonds/stuttgart/lb2cw1-landesbank-baden-w-rttemberg-mtn-serie-822-v-21-31/", false], ["GLEIF register", "https://api.gleif.org/api/v1/lei-records/B81CK4ESI35472RHJ606", true]]) {
    const h = await get(url);
    if (must) line(!!h, `reach ${name}`, h ? `${h.length} characters` : "refused or unreachable");
    else info(`reach ${name}`, h ? `${h.length} characters` : "refused or unreachable (expected for this site, only logged; other sources cover the same facts)");
    if (h && name.startsWith("Banking")) { const sen = seniorityFromText(strip(h), "DE000LB2CW16"); line(sen === "Senior Preferred", "bond terms: seniority of DE000LB2CW16 from regulatory data", sen ?? "not stated"); }
  }
  // 5 final terms discovery for the reference bond (issuer bond list scanned for the ISIN)
  const ft = await findFinalTerms({ isin: "DE000LB2CW16", bondLists: ["https://www.lbbw.de/konzern/investor-relations/refinanzierung/anleihen/outstanding-issues_ahtf9x1ikk_m.pdf"], linkPool: [] }, []);
  info("final terms / bond list for DE000LB2CW16", ft.seniority ? `${ft.seniority} (${ft.kind}: ${ft.url})` : `no seniority wording found (${ft.tried ?? 0} candidate(s)); the worker then relies on regulatory data and says so`);
  // 6 the real LBBW figures, including liquidity
  const ok = await selftest();
  line(ok === LBBW_EXPECTED.length, "LBBW H1 2026 figures", `${ok} of ${LBBW_EXPECTED.length}`);
  const out = L.join("\n"); console.log(out);
  try { await mkdir(DATA_DIR, { recursive: true }); await writeFile(join(DATA_DIR, "check-report.txt"), out); } catch { /* ignore */ }
  return bad;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain && process.argv.includes("--check")) { const bad = await lenovoCheck(); process.exit(bad ? 2 : 0); }
if (isMain && process.argv.includes("--selftest")) { const ok = await selftest(); process.exit(ok === LBBW_EXPECTED.length ? 0 : 2); }
if (isMain) {
  if (false) {
    const t = await fetch(`${OLLAMA}/api/tags`).then((r) => r.json()).catch(() => null);
    console.error(t ? `Set OLLAMA_MODEL to one of: ${t.models.map((m) => m.name).join(", ")}` : `Ollama is not answering at ${OLLAMA}`);
    process.exit(1);
  }
  log(`worker ${ID} v${WORKER_VERSION} -> ${SITE}, model ${MODEL}, ollama ${OLLAMA}`);
  // One look at what this computer can reach, sent with every job request, so the admin page shows why a job found no sources.
  NET_DIAG = (await Promise.all(["https://api.gleif.org/api/v1/lei-records?page[size]=1", "https://api.worldbank.org/v2/country/DE?format=json", "https://en.wikipedia.org/w/api.php?action=query&meta=siteinfo&format=json", "https://www.lbbw.de/", "https://www.bundesbank.de/"].map(async (u) => {
    try { const r = await fetch(u, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15_000) }); return `${new URL(u).hostname} ${r.status}`; } catch (e) { return `${new URL(u).hostname} ${e.cause?.code ?? e.message}`; }
  }))).join(" | ");
  log("network check:", NET_DIAG);
  let fails = 0, ollamaDown = 0;
  let lastUpdateCheck = Date.now();
  while (!stopping) {
    // Ollama crashed or was stopped: after 3 failed looks in a row, exit so start-worker.bat starts Ollama again and relaunches this worker.
    const alive = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(8000) }).then((r) => r.ok).catch(() => false);
    ollamaDown = alive ? 0 : ollamaDown + 1;
    if (ollamaDown >= 3) { log("Ollama is not answering: restarting so it is started again"); process.exit(1); }
    if (!alive) { await sleep(10_000); continue; }
    // Self-restart: every 10 minutes, between jobs, look at the published worker; if its version is newer, exit so start-worker.bat downloads it and relaunches.
    if (Date.now() - lastUpdateCheck > 10 * 60_000) {
      lastUpdateCheck = Date.now();
      try {
        const txt = await fetch("https://raw.githubusercontent.com/1903978-prog/10bonds/main/scripts/credit-worker/worker.mjs", { signal: AbortSignal.timeout(30_000) }).then((x) => x.text());
        const remote = /WORKER_VERSION = "([^"]+)"/.exec(txt)?.[1];
        if (remote && remote > WORKER_VERSION) { log(`newer worker ${remote} published: restarting to update`); process.exit(0); }
      } catch { /* offline: keep working */ }
    }
    try {
      const r = await api("claim", { version: WORKER_VERSION, diag: NET_DIAG });
      if (r.status === 401) { console.error("token rejected: create a new one in Admin > Credit Research"); process.exit(2); }
      fails = 0;
      if (r.job) { log("claimed", r.job.isin, `P${r.job.priority}`); await work(r.job); continue; }
      if (r.paused) log("paused in admin");
    } catch (e) { fails++; log("website not reachable:", e.message); }
    await sleep(Math.min(15 * 60_000, IDLE_MS * 2 ** Math.min(fails, 4)));
  }
  log("stopped");

}
