// Fills sector and issuer group (parent) per issuer from free public sources, on a runner (never in the web process).
// Order per issuer not in the hand-made table: name rules -> OpenFIGI (ISIN -> full name, ticker) -> SEC EDGAR (ticker/name -> SIC -> sector)
// -> GLEIF (name -> LEI -> ultimate parent). Throttled, checkpointed in lib/issuerEnrich/issuerEnrichment.json (re-run continues).
// Usage: DATABASE_URL=... npx vite-node -c vitest.config.ts scripts/issuer-enrich.ts   (BUDGET_MIN limits the run, default 150)
import postgres from "postgres";
import fs from "node:fs";
import { cleanPgUrl } from "@/lib/pgUrl";
import { issuerKey } from "@/lib/ranking";
import { groupInfo } from "@/lib/issuerGroups";
import { ENRICHED, type Enriched } from "@/lib/issuerEnrich/data";
import { sectorOfSic } from "@/lib/issuerEnrich/sic";
import { sectorOfName } from "@/lib/issuerEnrich/nameRules";
import { UNCLASSIFIED } from "@/lib/sectors";

const OUT = "lib/issuerEnrich/issuerEnrichment.json";
const REPORT = "docs/issuer-enrichment-report.md";
const UA = "10bonds.com data research 1903978@gmail.com";
const BUDGET_MS = Number(process.env.BUDGET_MIN ?? 150) * 60_000;
const t0 = Date.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const over = () => Date.now() - t0 > BUDGET_MS;

type Entry = Enriched & { tried?: string[]; figiName?: string; ticker?: string };
type Row = { issuer: string; currency: string; isin: string; bonds: number };

async function getJson(url: string, init?: RequestInit, tries = 3): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { ...init, headers: { "User-Agent": UA, Accept: "application/json", ...(init?.headers ?? {}) } });
      if (r.status === 429 || r.status >= 500) { await sleep(5000 * (i + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await sleep(3000); }
  }
  return null;
}

const SUFFIX = /\b(co|corp|corporation|company|inc|incorporated|llc|lp|holdings?|group|plc|ltd|limited|sa|nv|ag|se|spa|ab|asa|oyj|the|of|and)\b/g;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(SUFFIX, " ").replace(/\s+/g, " ").trim();
const sameName = (a: string, b: string) => { const x = norm(a), y = norm(b); return !!x && x === y; };

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(cleanPgUrl(url), { max: 1 });
  const rows = (await sql`select issuer, currency, min(isin) isin, count(*)::int bonds from public_bonds where issuer is not null and trim(issuer) <> '' group by 1, 2`) as unknown as Row[];
  const bondsAll = (await sql`select issuer, isin, currency, seniority, call_date, name from public_bonds`) as unknown as { issuer: string | null; isin: string; currency: string; seniority: string | null; call_date: unknown; name: string }[];
  await sql.end();

  // keep the previous run's findings as the checkpoint, then measure "before" with the hand-made table only
  const prev: Record<string, Entry> = JSON.parse(fs.readFileSync(OUT, "utf8")).issuers ?? {};
  for (const k of Object.keys(ENRICHED)) delete ENRICHED[k];
  const sectorBefore = (b: { issuer: string | null; isin: string }) => groupInfo(b).sector;
  const before: Record<string, { total: number; sector: number }> = {};
  for (const b of bondsAll) { const c = (before[b.currency] ??= { total: 0, sector: 0 }); c.total++; if (sectorBefore(b)) c.sector++; }

  const byKey = new Map<string, Row>();
  for (const r of rows) { const k = issuerKey({ issuer: r.issuer, isin: r.isin }); const cur = byKey.get(k); if (!cur || r.bonds > cur.bonds) byKey.set(k, { ...r, bonds: (cur?.bonds ?? 0) + r.bonds }); else cur.bonds += r.bonds; }
  const todo = [...byKey.entries()].filter(([k, r]) => !k.startsWith("isin:") && !groupInfo({ issuer: r.issuer, isin: r.isin }).sector).sort((a, b) => b[1].bonds - a[1].bonds);
  console.log(`issuers ${byKey.size} · without a sector in the table ${todo.length}`);

  const out: Record<string, Entry> = { ...prev };
  const save = (note: string) => { fs.writeFileSync(OUT, JSON.stringify({ version: `enrich-${new Date().toISOString().slice(0, 10)}`, generatedAt: new Date().toISOString(), issuers: out }, null, 0)); console.log(`saved (${note}) · ${Object.keys(out).length} issuers`); };

  // 1. name rules (instant)
  for (const [k, r] of todo) { const s = sectorOfName(r.issuer); if (s && !out[k]?.sector) out[k] = { ...(out[k] ?? {}), sector: s, sectorSource: "name-rule" }; }

  // 2. OpenFIGI: full name and ticker per issuer (one ISIN each), 10 per request, 25 requests a minute without a key
  const needFigi = todo.filter(([k]) => !out[k]?.tried?.includes("figi") && !out[k]?.sector);
  const figiHeaders: Record<string, string> = { "Content-Type": "application/json", ...(process.env.OPENFIGI_KEY ? { "X-OPENFIGI-APIKEY": process.env.OPENFIGI_KEY } : {}) };
  for (let i = 0; i < needFigi.length && !over(); i += 10) {
    const part = needFigi.slice(i, i + 10);
    const res = await getJson("https://api.openfigi.com/v3/mapping", { method: "POST", headers: figiHeaders, body: JSON.stringify(part.map(([, r]) => ({ idType: "ID_ISIN", idValue: r.isin }))) });
    part.forEach(([k], j) => {
      const d = res?.[j]?.data?.[0];
      const e: Entry = (out[k] ??= {});
      e.tried = [...(e.tried ?? []), "figi"];
      if (d) { e.figiName = d.name; e.ticker = d.ticker; }
    });
    if ((i / 10) % 20 === 19) save("figi");
    await sleep(2600);
  }
  save("figi done");

  // 3. SEC EDGAR: ticker (or exact name) -> CIK -> SIC -> sector
  const tickers = await getJson("https://www.sec.gov/files/company_tickers.json");
  const byTicker = new Map<string, { cik: number; title: string }>(), byTitle = new Map<string, { cik: number; title: string }>();
  for (const v of Object.values((tickers ?? {}) as Record<string, { cik_str: number; ticker: string; title: string }>)) { byTicker.set(v.ticker.toUpperCase(), { cik: v.cik_str, title: v.title }); byTitle.set(norm(v.title), { cik: v.cik_str, title: v.title }); }
  console.log(`SEC tickers ${byTicker.size}`);
  const sicCache = new Map<number, number | null>();
  for (const [k, r] of todo) {
    if (over()) break;
    const e = out[k]; if (!e || e.sector || e.tried?.includes("sec")) continue;
    e.tried = [...(e.tried ?? []), "sec"];
    const hit = (e.ticker && byTicker.get(e.ticker.toUpperCase())) || byTitle.get(norm(e.figiName ?? r.issuer)) || byTitle.get(norm(r.issuer));
    if (!hit) continue;
    // a ticker hit must also look like the same company (first word of the names agree)
    const a = norm(e.figiName ?? r.issuer).split(" ")[0], b = norm(hit.title).split(" ")[0];
    if (a !== b && !sameName(e.figiName ?? r.issuer, hit.title)) continue;
    if (!sicCache.has(hit.cik)) { const s = await getJson(`https://data.sec.gov/submissions/CIK${String(hit.cik).padStart(10, "0")}.json`); sicCache.set(hit.cik, s?.sic ? Number(s.sic) : null); await sleep(150); }
    const sec = sectorOfSic(sicCache.get(hit.cik));
    if (sec) { e.sector = sec; e.sectorSource = "sec-sic"; }
  }
  save("sec done");

  // 4. GLEIF: LEI and ultimate parent (exact normalised name match only)
  for (const [k, r] of todo) {
    if (over()) break;
    const e = (out[k] ??= {}); if (e.tried?.includes("gleif")) continue;
    e.tried = [...(e.tried ?? []), "gleif"];
    const names = [r.issuer, e.figiName].filter(Boolean) as string[];
    for (const nm of names) {
      const q = await getJson(`https://api.gleif.org/api/v1/lei-records?filter%5Bentity.legalName%5D=${encodeURIComponent(nm)}&page%5Bsize%5D=5`);
      await sleep(1100);
      const rec = (q?.data ?? []).find((d: any) => sameName(d?.attributes?.entity?.legalName?.name ?? "", nm)) ?? (q?.data?.length === 1 ? null : null);
      if (!rec) continue;
      e.lei = rec.id;
      const up = await getJson(`https://api.gleif.org/api/v1/lei-records/${rec.id}/ultimate-parent`);
      await sleep(1100);
      const pn: string | undefined = up?.data?.attributes?.entity?.legalName?.name;
      if (pn && !sameName(pn, nm)) { e.parentName = pn; e.parent = issuerKey({ issuer: pn, isin: r.isin }); }
      break;
    }
    if (Object.keys(out).length % 50 === 0) save("gleif");
  }
  // a parent's sector is the child's when the child still has none
  for (const [k] of todo) { const e = out[k]; if (e && !e.sector && e.parent) { const ps = groupInfo({ issuer: e.parentName ?? "", isin: "XX" }).sector ?? out[e.parent]?.sector; if (ps) { e.sector = ps; e.sectorSource = "gleif-parent"; } } }
  for (const e of Object.values(out)) delete e.figiName; // names are working data only
  save("final");

  // report: coverage after (ENRICHED now holds the result)
  for (const k of Object.keys(ENRICHED)) delete ENRICHED[k];
  Object.assign(ENRICHED, out);
  const after: Record<string, { total: number; sector: number; unclassified: number }> = {};
  for (const b of bondsAll) { const c = (after[b.currency] ??= { total: 0, sector: 0, unclassified: 0 }); c.total++; if (groupInfo(b).sector) c.sector++; else c.unclassified++; }
  const unresolved = todo.filter(([k]) => !out[k]?.sector).slice(0, 60);
  const withLei = todo.filter(([k]) => out[k]?.lei).length, withParent = todo.filter(([k]) => out[k]?.parent).length;
  const bySource: Record<string, number> = {};
  for (const [k] of todo) { const s = out[k]?.sectorSource ?? "none"; bySource[s] = (bySource[s] ?? 0) + 1; }
  const seniorityEmpty = (cur: string) => bondsAll.filter((b) => b.currency === cur && !(b.seniority ?? "").trim()).length;
  const lines = [
    `# Issuer enrichment report ${new Date().toISOString().slice(0, 10)}`, "",
    `Issuers: ${byKey.size} · not in the hand-made table: ${todo.length} · issuers with an LEI: ${withLei} · with a GLEIF ultimate parent different from themselves: ${withParent}`,
    `Sector source for the ${todo.length} issuers: ${JSON.stringify(bySource)}`, "",
    "## Bonds with a sector, before → after", "| Currency | Bonds | Before | After | Still Unclassified |", "|---|---:|---:|---:|---:|",
    ...["USD", "EUR"].map((c) => `| ${c} | ${after[c]?.total} | ${before[c]?.sector} (${((100 * before[c].sector) / before[c].total).toFixed(1)}%) | ${after[c]?.sector} (${((100 * after[c].sector) / after[c].total).toFixed(1)}%) | ${after[c]?.unclassified} |`), "",
    `Seniority empty in the copy: EUR ${seniorityEmpty("EUR")}, USD ${seniorityEmpty("USD")}. Bonds with a first call date: ${bondsAll.filter((b) => b.call_date).length}.`, "",
    "## Issuers still without a sector (largest first)", ...unresolved.map(([, r]) => `- ${r.issuer} (${r.currency}, ${r.bonds} bonds)`),
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  void UNCLASSIFIED;
}
main().catch((e) => { console.error(e); process.exit(1); });
