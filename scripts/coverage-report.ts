// TEMPORARY, read-only data coverage report (SELECT only). Prints markdown tables. Delete after use.
import postgres from "postgres";
import { cleanPgUrl } from "@/lib/pgUrl";
import { accountsSql } from "@/lib/accounts";
import { classifyRow } from "@/lib/classify";
import { cleanIssuer } from "@/lib/issuer";
import { correctedMin } from "@/lib/minOverrides";
import { dormantReason } from "@/lib/dormant";
import { minInvestmentOf, DEFAULT_FILTER } from "@/lib/bondFilter";
import { couponTypeOf } from "@/lib/bondFacts";
import { bondNotch, bondRisk } from "@/lib/ratings";
import { rankOfText, isExcludedRank } from "@/lib/seniority";
import { issuerVerified, issuerGroupOf } from "@/lib/issuerGroups";
import { sectorOf, UNCLASSIFIED } from "@/lib/sectors";
import { importedSeniorityMap } from "@/lib/bondImportDb";
import { screenPrices, type PriceMeta } from "@/lib/priceIntegrity";
import { priceMetaOf, loadBondsFor } from "@/lib/bonds";
import { FIXED_BENCHMARKS, setOfficialBenchmark } from "@/lib/bes/benchmarkTables";
import { allowedClasses, MATRIX_POSITIONS } from "@/lib/riskMatrix";
import { candidatesOf } from "@/lib/coherentFrontier";
import { activePolicy } from "@/lib/coherence";
import { TERMS } from "@/lib/limits";
import type { PublicBond } from "@/lib/types";

const num = (v: unknown): number | null => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const isoDay = (v: unknown): string | null => { if (!v) return null; const d = v instanceof Date ? v : new Date(String(v)); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); };
const TODAY = new Date().toISOString().slice(0, 10);
const DAY = 86_400_000;
const calDays = (d: string) => Math.max(0, Math.floor((Date.parse(TODAY) - Date.parse(d)) / DAY));
function tradingDays(d: string): number { // weekdays after d up to and including today
  let n = 0;
  for (let t = Date.parse(d) + DAY; t <= Date.parse(TODAY); t += DAY) { const w = new Date(t).getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}
const bucket = (d: string | null): "td5" | "d30" | "old" | "none" => { if (!d) return "none"; if (tradingDays(d) <= 5) return "td5"; if (calDays(d) <= 30) return "d30"; return "old"; };
const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) + "%" : "-");
const median = (xs: string[]) => { const s = [...xs].sort(); return s.length ? s[Math.floor(s.length / 2)] : "-"; };

const url = process.env.DATABASE_URL!;
const db = postgres(cleanPgUrl(url), { ssl: "require", max: 1, prepare: false, onnotice: () => {} });
const cols = (await db`select column_name from information_schema.columns where table_name = 'public_bonds' order by ordinal_position`).map((r) => r.column_name as string);
const has = (c: string) => cols.includes(c);
console.log(`# Data coverage run ${TODAY}\n\nColumns of public_bonds: ${cols.join(", ")}\n`);
const freqCol = cols.find((c) => /freq|payments|coupon_per/.test(c)) ?? null;
const issuerIdCol = cols.find((c) => /issuer_id|issuer_group|parent/.test(c)) ?? null;
console.log(`Detected: coupon frequency column = ${freqCol ?? "NONE"}; issuer id column = ${issuerIdCol ?? "NONE (site uses lib/issuerGroups.ts name table)"}; price_as_of column = ${has("price_as_of")}\n`);
const raw = await db`select * from public_bonds`;
const imported = await importedSeniorityMap().catch(() => new Map<string, string>());

// official EUR benchmark as the BES job loads it
let eurNote = "interim table (owner supplied)";
try {
  const { getBundBenchmarkPoints } = await import("@/lib/bundCurve/store");
  const c = await getBundBenchmarkPoints();
  if (c && c.points.length === 30) { setOfficialBenchmark("EUR", c.asOf, c.points, "Bundesbank ZAR", "bundesbank-zar"); eurNote = `OFFICIAL Bundesbank ZAR, as of ${c.asOf}`; }
} catch (e) { eurNote = "interim (official load failed: " + (e as Error).message + ")"; }
const bench = (cur: string) => { const t = FIXED_BENCHMARKS[cur]; return t ? { min: t.points[0].years, max: t.points[t.points.length - 1].years, label: cur === "EUR" ? eurNote : t.official ? "official" : "INTERIM owner table " + t.version } : null; };

// BES published run
const as = await accountsSql();
const [run] = await as`select id, batch_id, finished_at, price_as_of, method from app.bes_runs where status = 'published' order by id desc limit 1`;
const besRows = run ? await as`select isin, efficiency_status, benchmark_source, gross_spread_bp, annual_expected_loss_bp, credit_adjusted_spread_bp, efficiency_score from app.bes_bonds where run_id = ${run.id}` : [];
const bes = new Map(besRows.map((r) => [String(r.isin), r]));
console.log(`BES run #${run?.id} method ${run?.method} finished ${run?.finished_at?.toISOString?.() ?? run?.finished_at}; price_as_of ${run?.price_as_of?.toISOString?.() ?? run?.price_as_of}; ${besRows.length} bonds scored rows\n`);

type Rec = {
  isin: string; cur: string; b: PublicBond; r: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  priceDate: string | null; ytmDate: string | null; years: number | null;
  f: Record<string, boolean>; eligible: boolean; fresh: boolean; why: string[];
};
const metaAll = new Map<string, PriceMeta>();
const recs: Rec[] = raw.map((r) => {
  const issuer = cleanIssuer(r.issuer);
  const cls = classifyRow(r, issuer);
  const b = {
    isin: r.isin, name: r.name, issuer, country: cls.country, countrySource: cls.countrySource, feedSector: cls.sectorSource === "feed" ? cls.sector : null, currency: r.currency,
    coupon: num(r.coupon), maturity: isoDay(r.maturity), ratingSp: r.rating_sp, ratingMoodys: r.rating_moodys, ratingFitch: r.rating_fitch, ratingResolved: r.rating_resolved,
    lrScore: num(r.lr_score), grossYtm: num(r.gross_ytm), modifiedDuration: num(r.modified_duration), ytmAsOf: r.ytm_as_of ? new Date(r.ytm_as_of).toISOString() : null,
    minInvestment: correctedMin(r.isin, r.issuer, r.currency, minInvestmentOf(num(r.min_denomination), num(r.min_lot), r.currency)), cleanPrice: num(r.clean_price),
    couponType: couponTypeOf(r.coupon_type, num(r.coupon), r.structure_modelled),
    seniority: typeof r.seniority === "string" && r.seniority.trim() ? r.seniority.trim() : (imported.get(r.isin) ?? null),
    callable: typeof r.callable === "boolean" ? r.callable : null,
  } as PublicBond;
  metaAll.set(r.isin, priceMetaOf(r));
  const ytmDate = isoDay(r.ytm_as_of);
  const priceDate = has("price_as_of") ? (isoDay(r.price_as_of) ?? null) : ytmDate;
  const years = b.maturity ? (Date.parse(b.maturity) - Date.parse(TODAY)) / (365.25 * DAY) : null;
  const bc = bench(r.currency);
  const f = {
    price: b.grossYtm != null /* no clean_price column exists: the dated yield quote is the price proxy */, ytm: b.grossYtm != null, duration: b.modifiedDuration != null,
    risk: bondRisk(b) != null,
    seniority: b.seniority != null,
    issuer: issuerVerified(b), sector: sectorOf(b) !== UNCLASSIFIED,
    minorder: b.minInvestment != null,
    benchmark: !!bc && years != null && years > 0.25,
    netspread: (bes.get(r.isin)?.credit_adjusted_spread_bp ?? null) !== null,
  };
  return { isin: r.isin, cur: r.currency, b, r, priceDate, ytmDate, years, f, eligible: true, fresh: true, why: [] };
});
// site eligibility rules
const sane = new Set(screenPrices(recs.filter((x) => x.b.cleanPrice != null).map((x) => x.b), metaAll, Date.now()).ok.map((b) => b.isin));
const newest = recs.reduce((m, x) => (x.ytmDate && x.ytmDate > m ? x.ytmDate : m), "");
for (const x of recs) {
  if (dormantReason(x.b, x.r.dormant)) x.why.push("dormant");
  if (!x.b.maturity || x.b.maturity <= TODAY) x.why.push("matured/no maturity");
  if (x.r.structure_modelled === false) x.why.push("structure not modelled");
  if (isExcludedRank(x.b) && x.b.seniority) x.why.push("subordinated");
  if (x.b.cleanPrice != null && !sane.has(x.isin)) x.why.push("price fails sanity");
  if (!(x.b.grossYtm != null && x.b.grossYtm > 0)) x.why.push("no positive yield");
  x.eligible = !x.why.length;
  x.fresh = !!x.ytmDate && (Date.parse(newest) - Date.parse(x.ytmDate)) / DAY <= 10;
}

const CURS = ["EUR", "USD"] as const;
const grp = (c: string) => (c === "EUR" || c === "USD" ? c : "other");
const total = (c: string) => recs.filter((x) => (c === "ALL" ? true : grp(x.cur) === c));
console.log(`Bonds in copy: ${recs.length} (EUR ${total("EUR").length}, USD ${total("USD").length}, other ${total("other").length}). Newest yield date in copy ${newest}. Ages measured against today ${TODAY} (trading day = Mon-Fri, no holiday calendar).\n`);

// ---- Section 1: presence and age per field
type FieldDef = { name: string; ok: (x: Rec) => boolean; date?: (x: Rec) => string | null; note?: string };
const D = (x: Rec) => x.priceDate;
const fields: FieldDef[] = [
  { name: "1a Price (clean_price)", ok: (x) => x.b.cleanPrice != null, date: D, note: `column clean_price exists: ${has("clean_price")}; price_as_of exists: ${has("price_as_of")}` },
  { name: "1b YTM (gross_ytm)", ok: (x) => x.f.ytm, date: (x) => x.ytmDate, note: "ytm_as_of" },
  { name: "2a Maturity date", ok: (x) => !!x.b.maturity },
  { name: "2b Coupon", ok: (x) => x.b.coupon != null },
  { name: "2c Coupon frequency", ok: (x) => (freqCol ? x.r[freqCol] != null && x.r[freqCol] !== "" : false), note: freqCol ?? "NO COLUMN" },
  { name: "3 Duration", ok: (x) => x.f.duration, date: (x) => x.ytmDate, note: "ytm_as_of" },
  { name: "4 10bonds risk score lr_score", ok: (x) => x.b.lrScore != null, date: (x) => (has("lr_as_of") ? isoDay(x.r.lr_as_of) : null), note: "lr_as_of" },
  { name: "5a Agency fallback risk (any S&P/Moody/Fitch)", ok: (x) => bondNotch({ ...x.b, lrScore: null }) != null },
  { name: "5b Risk used today (lr or agency)", ok: (x) => x.f.risk },
  { name: "6a Seniority raw copy", ok: (x) => typeof x.r.seniority === "string" && x.r.seniority.trim() !== "" },
  { name: "6b Seniority incl. admin import", ok: (x) => x.f.seniority },
  { name: "7a Consolidated issuer id (site group table)", ok: (x) => x.f.issuer, note: issuerIdCol ?? "lib/issuerGroups.ts" },
  { name: "7b Sector (group table or feed)", ok: (x) => x.f.sector },
  { name: "8 Minimum order size", ok: (x) => x.f.minorder },
  { name: "9 Benchmark curve point (curve exists, maturity known)", ok: (x) => x.f.benchmark },
  { name: "10a Dormant flag column non-null", ok: (x) => x.r.dormant !== null && x.r.dormant !== undefined },
  { name: "11a Gross spread (BES run)", ok: (x) => (bes.get(x.isin)?.gross_spread_bp ?? null) !== null },
  { name: "11b Expected loss (BES run)", ok: (x) => (bes.get(x.isin)?.annual_expected_loss_bp ?? null) !== null },
  { name: "11c Net spread (BES run)", ok: (x) => x.f.netspread },
  { name: "11d BES score (BES run)", ok: (x) => (bes.get(x.isin)?.efficiency_score ?? null) !== null },
];
for (const c of ["EUR", "USD", "other"]) {
  const set = total(c);
  console.log(`\n## Field coverage: ${c} (${set.length} bonds)\n\n| Field | Present | % | Newest | Median | Oldest | ≤5 trading d | ≤30 d | older | no date | Date source |\n|---|---:|---:|---|---|---|---:|---:|---:|---:|---|`);
  for (const f of fields) {
    const have = set.filter(f.ok);
    let cells = "| n/a | n/a | n/a | - | - | - | - |";
    if (f.date) {
      const ds = have.map(f.date!).filter((d): d is string => !!d).sort();
      const bk = { td5: 0, d30: 0, old: 0, none: 0 };
      for (const x of have) bk[bucket(f.date!(x))]++;
      cells = `| ${ds[ds.length - 1] ?? "-"} | ${median(ds)} | ${ds[0] ?? "-"} | ${bk.td5} (${pct(bk.td5, have.length)}) | ${bk.d30} (${pct(bk.d30, have.length)}) | ${bk.old} (${pct(bk.old, have.length)}) | ${bk.none} |`;
    }
    console.log(`| ${f.name} | ${have.length} | ${pct(have.length, set.length)} ${cells} ${f.note ?? "no date column"} |`);
  }
  console.log(`\nDormant: flag true ${set.filter((x) => x.r.dormant === true).length}; min order > 200k (site rule) ${set.filter((x) => dormantReason(x.b, null)).length}; matured ${set.filter((x) => x.b.maturity && x.b.maturity <= TODAY).length}; structure not modelled ${set.filter((x) => x.r.structure_modelled === false).length}; subordinated ${set.filter((x) => x.b.seniority && isExcludedRank(x.b)).length}; price fails sanity ${set.filter((x) => x.f.price && !sane.has(x.isin)).length}`);
}
console.log("\n## Benchmark curves in use");
for (const c of CURS) { const b = bench(c); console.log(`- ${c}: ${b ? `${b.min}-${b.max} years, ${b.label}` : "none"}`); }
const bsrc = new Map<string, number>(); for (const r of besRows) { const k = `${r.benchmark_source ?? "(none)"}`; bsrc.set(k, (bsrc.get(k) ?? 0) + 1); }
console.log("- BES run benchmark_source counts: " + [...bsrc].map(([k, v]) => `${k}=${v}`).join("; "));
console.log("- Other currencies: no benchmark curve at all. Years-to-maturity beyond the curve end use the flat end yield (flagged Limited in BES).");
for (const c of CURS) { const b = bench(c); if (!b) continue; const s = total(c).filter((x) => x.f.benchmark); console.log(`- ${c} bonds with curve: inside ${b.min}-${b.max}y ${s.filter((x) => x.years! >= b.min && x.years! <= b.max).length}, below ${s.filter((x) => x.years! < b.min).length}, beyond ${s.filter((x) => x.years! > b.max).length}`); }

// ---- Section 2: portfolio-ready
const need = ["price", "ytm", "duration", "risk", "seniority", "issuer", "sector", "minorder", "benchmark"] as const;
const allFields = (x: Rec) => need.every((k) => x.f[k]);
const split = (xs: Rec[]) => { const o = { td5: 0, d30: 0, old: 0, none: 0 }; for (const x of xs) o[bucket(x.priceDate)]++; return o; };
console.log("\n## Portfolio-ready bonds (all 9 fields present; price age = days since price date)\n\n| Set | Currency | Bonds | Ready | % | Price ≤5 trading d | ≤30 d | older | no date |\n|---|---|---:|---:|---:|---:|---:|---:|---:|");
for (const c of CURS) {
  const set = total(c);
  const a = set.filter(allFields), e = a.filter((x) => x.eligible), o = e.filter((x) => x.f.netspread && x.fresh);
  for (const [n, xs] of [["A fields only", a], ["B + site rules (not dormant/matured/sub/sane price)", e], ["C + fresh yield (≤10 d) + BES net spread = optimizer-ready", o]] as const) {
    const s = split(xs); console.log(`| ${n} | ${c} | ${set.length} | ${xs.length} | ${pct(xs.length, set.length)} | ${s.td5} | ${s.d30} | ${s.old} | ${s.none} |`);
  }
}
console.log("\n## Candidate set the optimizer really uses (loadBondsFor filter → candidatesOf per term → has BES net spread)\n\n| Filter | Term | Duration | Candidates | with net spread | Price ≤5td | ≤30d | older |\n|---|---|---:|---:|---:|---:|---:|---:|");
const byIsin = new Map(recs.map((x) => [x.isin, x]));
for (const cur of CURS) {
  for (const size of ["100k", "1k"] as const) {
    if (cur === "USD" && size === "100k" && false) continue;
    const src = await loadBondsFor({ currency: cur, size });
    const union = new Set<string>();
    for (const t of TERMS) {
      const cs = candidatesOf(src.bonds, t.duration, false);
      const ns = cs.filter((c) => bes.get(c.b.isin)?.credit_adjusted_spread_bp != null);
      ns.forEach((c) => union.add(c.b.isin));
      const s = split(ns.map((c) => byIsin.get(c.b.isin)!).filter(Boolean));
      console.log(`| ${cur} ${size} (${src.bonds.length} bonds loaded) | ${t.key} | ${t.duration} | ${cs.length} | ${ns.length} | ${s.td5} | ${s.d30} | ${s.old} |`);
    }
    const s = split([...union].map((i) => byIsin.get(i)!).filter(Boolean));
    console.log(`| ${cur} ${size} | UNION of terms | - | - | ${union.size} | ${s.td5} | ${s.d30} | ${s.old} |`);
  }
}

// ---- Section 3: matrix
const WIN = { short: { d: 2, w: 0.2 }, mid: { d: 4, w: 0.2 }, long: { d: 10, w: 0.3 } } as const;
const inWin = (x: Rec, h: keyof typeof WIN) => { const d = x.b.modifiedDuration; return d != null && d >= WIN[h].d * (1 - WIN[h].w) - 1e-9 && d <= WIN[h].d * (1 + WIN[h].w) + 1e-9; };
const readyOpt = (x: Rec) => allFields(x) && x.eligible;
for (const c of CURS) {
  console.log(`\n## Matrix ${c}: risk class × horizon = ready bonds (distinct issuer groups). Ready = 9 fields + site rules (set B). Windows: Short 1.6-2.4, Medium 3.2-4.8, Long 7-13 duration.\n\n| Risk | Short | Medium | Long |\n|---|---|---|---|`);
  const pool = total(c).filter(readyOpt);
  for (let r = 1; r <= 10; r++) {
    const cell = (h: keyof typeof WIN) => { const xs = pool.filter((x) => bondRisk(x.b) === r && inWin(x, h)); return `${xs.length} (${new Set(xs.map((x) => issuerGroupOf(x.b))).size})`; };
    console.log(`| ${r} | ${cell("short")} | ${cell("mid")} | ${cell("long")} |`);
  }
}

// ---- Section 4: fillable positions and gaps
const cap = activePolicy().maxPerSector, perIssuer = activePolicy().maxPerIssuer;
function fillable(pool: Rec[], h: keyof typeof WIN, pos: number): boolean {
  const ok = new Set(allowedClasses(pos));
  const sect = new Map<string, Set<string>>();
  for (const x of pool) if (inWin(x, h) && ok.has(bondRisk(x.b) ?? 0)) { const s = sectorOf(x.b); (sect.get(s) ?? sect.set(s, new Set()).get(s)!).add(issuerGroupOf(x.b)); }
  let capacity = 0; for (const g of sect.values()) capacity += Math.min(cap, g.size * perIssuer);
  return capacity >= 10;
}
const GAPS: [string, (x: Rec) => boolean][] = [
  ["no dated yield quote (no price column exists)", (x) => !x.f.price], ["no/negative yield", (x) => !x.f.ytm || !(x.b.grossYtm! > 0)], ["no duration", (x) => !x.f.duration],
  ["no risk score (unrated, no 10bonds score)", (x) => !x.f.risk], ["no seniority", (x) => !x.f.seniority],
  ["issuer not in consolidated group table", (x) => !x.f.issuer], ["no sector", (x) => !x.f.sector], ["no minimum order size", (x) => !x.f.minorder],
  ["no benchmark point", (x) => !x.f.benchmark], ["no BES net spread", (x) => !x.f.netspread], ["yield older than 10 days", (x) => !x.fresh],
  ["site rule exclusion (dormant/matured/sub/bad price)", (x) => !x.eligible],
];
const gapRows: Record<string, Record<string, number>> = {};
console.log(`\n## Positions that can be filled at all (necessary test: 10 distinct issuers, ≤${cap} per sector, classes allowed by the matrix, duration window). Optimizer-ready pool = set C.\n`);
for (const c of CURS) {
  const all = total(c);
  const base = all.filter((x) => GAPS.every(([, fail]) => !fail(x)));
  let ok0 = 0; const unfilled: [keyof typeof WIN, number][] = [];
  for (const h of Object.keys(WIN) as (keyof typeof WIN)[]) for (let p = 1; p <= MATRIX_POSITIONS; p++) { if (fillable(base, h, p)) ok0++; else unfilled.push([h, p]); }
  const noGap = (h: keyof typeof WIN, p: number) => fillable(all, h, p);
  console.log(`- ${c}: ${ok0} of 90 positions fillable today from the optimizer-ready pool (${base.length} bonds); ${unfilled.length} not. Upper bound with every gap fixed (all ${all.length} bonds, but only those with a positive yield-free facts ignored): ${unfilled.filter(([h, p]) => !noGap(h, p)).length} still not fillable by anything.`);
  for (const [name, fail] of GAPS) {
    const only = all.filter((x) => fail(x) && GAPS.every(([n2, f2]) => n2 === name || !f2(x)));
    const pool = [...base, ...only];
    const unlocked = unfilled.filter(([h, p]) => fillable(pool, h, p)).length;
    (gapRows[name] ??= {})[c] = unlocked; gapRows[name][c + "_only"] = only.length; gapRows[name][c + "_fail"] = all.filter(fail).length;
  }
}
console.log("\n## Gaps ranked by positions unlocked if ONLY that gap were fixed (bonds failing only that gap are added to the pool)\n\n| Gap | EUR positions unlocked | EUR bonds failing | EUR failing ONLY this | USD positions unlocked | USD bonds failing | USD failing ONLY this | Total positions |\n|---|---:|---:|---:|---:|---:|---:|---:|");
for (const [name, v] of Object.entries(gapRows).sort((a, b) => (b[1].EUR + b[1].USD) - (a[1].EUR + a[1].USD))) console.log(`| ${name} | ${v.EUR} | ${v.EUR_fail} | ${v.EUR_only} | ${v.USD} | ${v.USD_fail} | ${v.USD_only} | ${v.EUR + v.USD} |`);
// how many bonds fail each field (all-bonds basis), and combos of the first missing field
console.log("\n## Why bonds are not optimizer-ready: first failing gap (EUR / USD)\n\n| First failing gap | EUR | USD |\n|---|---:|---:|");
for (const [name, fail] of GAPS) {
  const cnt = (c: string) => total(c).filter((x) => { for (const [n, f] of GAPS) { if (f(x)) return n === name; } return false; }).length;
  console.log(`| ${name} | ${cnt("EUR")} | ${cnt("USD")} |`);
}
await db.end();
await new Promise((r) => setTimeout(r, 1500));
process.exit(0);
