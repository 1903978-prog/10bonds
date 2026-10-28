import { classifyRow } from "./classify";
import postgres from "postgres";
import { cleanPgUrl } from "./pgUrl";
import type { PublicBond } from "./types";
import { SAMPLE_BONDS } from "./sample-bonds";
import { hasRealRating } from "./ratings";
import { correctedMin } from "./minOverrides";
import { dormantReason } from "./dormant";
import { applyFilter, DEFAULT_FILTER, minInvestmentOf, type BondFilter } from "./bondFilter";
import { couponTypeOf } from "./bondFacts";
import { judge, missingColumns, type DataHealth } from "./dataHealth";
import { cleanSd, findOutliers, OUTLIER_SD, type Outlier } from "./outliers";
import { liveOutlierSd } from "./riskPremium/store";
import { screenPrices, type FlaggedBond, type PriceMeta } from "./priceIntegrity";

// The public site only ever READS one table, with a read-only login.
// It has no connection details for the main app and no way to write anywhere.
let sql: ReturnType<typeof postgres> | null = null;
function db() {
  if (!process.env.DATABASE_URL) return null;
  sql ??= postgres(cleanPgUrl(process.env.DATABASE_URL), { ssl: "require", max: 3, idle_timeout: 20, prepare: false });
  return sql;
}

// The copy changes once a day, so one read an hour is plenty (and keeps the database asleep most of the time).
const CACHE_MS = 60 * 60 * 1000;
// `rated` is every bond the site may show before the outlier rule; the rule's result is kept per number of standard
// deviations (the admin can preview other values), and cleared with the hourly reload.
let cache: { at: number; rated: PublicBond[]; source: "live" | "sample"; unrated: number; total: number; priceFlagged: FlaggedBond[]; bySd: Map<number, { bonds: PublicBond[]; outliers: Outlier[] }> } | null = null;

/** The number of standard deviations users get (admin setting), or the default when it cannot be read. */
export async function currentOutlierSd(): Promise<number> {
  return liveOutlierSd().catch(() => OUTLIER_SD.default);
}

function outlierCut(sd: number) {
  const c = cache!;
  const k = cleanSd(sd);
  let hit = c.bySd.get(k);
  if (!hit) {
    const outliers = c.source === "sample" ? [] : findOutliers(c.rated, k);
    const gone = new Set(outliers.map((o) => o.bond.isin));
    hit = { bonds: gone.size ? c.rated.filter((b) => !gone.has(b.isin)) : c.rated, outliers };
    c.bySd.set(k, hit);
  }
  return hit;
}

export type BondSource = { bonds: PublicBond[]; source: "live" | "sample"; asOf: string | null };

/** EUR bonds, any minimum size: what every page shows unless the visitor picks other filters. */
export async function loadBonds(): Promise<BondSource> {
  return loadBondsFor(DEFAULT_FILTER);
}

/** The bonds for one choice of currency and minimum order size. */
export async function loadBondsFor(f: BondFilter, sd?: number): Promise<BondSource> {
  const all = await loadAllBonds(sd);
  // The same filter on the same copy gives the same array (it is the key of the per-copy caches that other modules keep).
  let byFilter = filtered.get(all.bonds);
  if (!byFilter) filtered.set(all.bonds, (byFilter = new Map()));
  const fk = `${f.currency}|${f.size}`;
  let bonds = byFilter.get(fk);
  if (!bonds) byFilter.set(fk, (bonds = applyFilter(all.bonds, f)));
  return withAsOf(bonds, all.source);
}
const filtered = new WeakMap<object, Map<string, PublicBond[]>>();

async function loadAllBonds(sd?: number): Promise<BondSource> {
  const k = sd ?? (await currentOutlierSd());
  await ensureLoaded();
  return withAsOf(outlierCut(k).bonds, cache!.source);
}

// One read at a time: before this, every request that found the copy missing (after a restart) or an hour old read and
// processed the whole table itself, so a busy minute held a dozen copies in memory and stalled the server. Now the first
// asker reads, the others wait for that read, and an hour-old copy keeps being served while the new one is read.
let loading: Promise<void> | null = null;
function startReload(): Promise<void> {
  loading ??= reload().finally(() => { loading = null; });
  return loading;
}
async function ensureLoaded(): Promise<void> {
  if (!cache) return startReload();
  if (Date.now() - cache.at >= CACHE_MS) startReload().catch((e) => console.error("[bonds] refresh failed:", (e as Error).message));
}

async function reload() {

  const client = db();
  if (!client) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_SAMPLE_DATA !== "1") {
      throw new Error("Bond data is not connected yet.");
    }
    cache = { at: Date.now(), rated: SAMPLE_BONDS.filter(hasRealRating), source: "sample", unrated: 0, total: SAMPLE_BONDS.length, priceFlagged: [], bySd: new Map() };
    return;
  }

  // Every column the copy has (min_denomination / min_lot arrive with a later export); filters are applied below.
  // Bonds whose cash flows the main app could not model (inflation-linked, step-up, floating) are left out.
  const rows = (await client`
    select * from public_bonds
    where gross_ytm is not null and modified_duration is not null
      and (maturity is null or maturity > current_date)
  `);
  // A renamed or dropped column would turn into blanks (no rating, no maturity) without any error: refuse instead.
  const missing = rows.length ? missingColumns(rows.columns.map((c) => c.name)) : [];
  if (missing.length) throw new Error(`Bond table is missing columns: ${missing.join(", ")}`);
  const modelled = rows.filter((r) => r.structure_modelled !== false);
  // Imported seniority (admin switch, lib/bondImportDb.ts) only fills bonds whose copy has none; the copy's own value always wins.
  const importedSeniority = await import("./bondImportDb").then((m) => m.importedSeniorityMap()).catch(() => new Map<string, string>());
  const mapped = modelled.map((r) => rowToBond(r, importedSeniority));
  // Bonds with a minimum above 200,000 EUR / USD stay in the database but are dormant: never shown or used (the owner, 21/10/2026).
  const bonds: PublicBond[] = mapped.filter((b) => !dormantReason(b, b.flaggedDormant)).map(({ flaggedDormant: _, ...b }) => b);
  // Unrated bonds never appear on the site (the owner, 18/10/2026).
  // A price that fails the sanity checks (lib/priceIntegrity.ts) keeps the bond out of every ranking; the admin sees the list.
  const meta = new Map<string, PriceMeta>(modelled.map((r) => [r.isin, priceMetaOf(r)]));
  const screened = screenPrices(dropStale(bonds), meta, newestQuote(bonds));
  const current = screened.ok;
  const rated = current.filter(hasRealRating);
  // Likely subordinated or hybrid bonds (by name, or a statistical yield outlier) are left out too, in outlierCut (the owner, 20/10/2026).
  const [{ total }] = await client`select count(*)::int total from public_bonds`;
  cache = { at: Date.now(), rated, source: "live", unrated: current.length - rated.length, total: Number(total), priceFlagged: screened.flagged, bySd: new Map() };
}

/** One `public_bonds` row as the site's bond (flaggedDormant = the copy's own dormant flag, applied by the caller). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a raw database row
function rowToBond(r: Record<string, any>, importedSeniority: Map<string, string>): PublicBond & { flaggedDormant: unknown } {
  const issuer = cleanIssuer(r.issuer);
  const cls = classifyRow(r, issuer);
  return {
    flaggedDormant: r.dormant,
    isin: r.isin,
    name: r.name,
    issuer,
    country: cls.country,
    countrySource: cls.countrySource,
    feedSector: cls.sectorSource === "feed" ? cls.sector : null,
    currency: r.currency,
    coupon: num(r.coupon),
    maturity: isoDay(r.maturity),
    ratingSp: r.rating_sp,
    ratingMoodys: r.rating_moodys,
    ratingFitch: r.rating_fitch,
    ratingResolved: r.rating_resolved,
    lrScore: num(r.lr_score),
    grossYtm: num(r.gross_ytm),
    modifiedDuration: num(r.modified_duration),
    ytmAsOf: r.ytm_as_of ? new Date(r.ytm_as_of).toISOString() : null,
    minInvestment: correctedMin(r.isin, r.issuer, r.currency, minInvestmentOf(num(r.min_denomination), num(r.min_lot), r.currency)),
    cleanPrice: num(r.clean_price),
    high52w: num(r.high_52w),
    low52w: num(r.low_52w),
    couponType: couponTypeOf(r.coupon_type, num(r.coupon), r.structure_modelled),
    seniority: typeof r.seniority === "string" && r.seniority.trim() ? r.seniority.trim() : (importedSeniority.get(r.isin) ?? null),
    issueDate: isoDay(r.issue_date),
    callable: typeof r.callable === "boolean" ? r.callable : null,
  };
}

/** Admin only: the bonds of the WHOLE copy with these ISINs, exactly as the site would hold them, with why the site would hide each (null = shown). Bonds not in the copy are simply absent. */
export async function loadBondsByIsin(isins: string[]): Promise<{ bond: PublicBond; why: string | null }[]> {
  const client = db();
  if (!client || !isins.length) return [];
  const rows = await client`select * from public_bonds where upper(trim(isin)) in ${client(isins)}`;
  const importedSeniority = await import("./bondImportDb").then((m) => m.importedSeniorityMap()).catch(() => new Map<string, string>());
  return rows.map((r) => {
    const { flaggedDormant: _, ...bond } = rowToBond(r, importedSeniority);
    return { bond, why: whyHidden(r) };
  });
}

/** Optional price facts the copy may carry (docs/handover/price-integrity.md). */
export function priceMetaOf(r: Record<string, unknown>): PriceMeta {
  return {
    source: typeof r.price_source === "string" && r.price_source.trim() ? r.price_source.trim() : null,
    asOf: r.price_as_of ? new Date(r.price_as_of as string).toISOString() : null,
    stale: typeof r.price_stale === "boolean" ? r.price_stale : null,
    confirmed: typeof r.price_confirmed === "boolean" ? r.price_confirmed : null,
  };
}

function newestQuote(bonds: PublicBond[]): number {
  const t = bonds.map((b) => (b.ytmAsOf ? Date.parse(b.ytmAsOf) : NaN)).filter(Number.isFinite);
  return t.length ? Math.max(...t) : Date.now();
}

/** Bonds left out because their stored price failed the checks (admin only). */
export async function loadPriceFlagged(): Promise<FlaggedBond[]> {
  await loadAllBonds();
  return cache?.priceFlagged ?? [];
}

/** Price audit over the WHOLE copy (every bond, shown or not): counts per currency by problem. Admin only. */
export async function priceAudit(): Promise<{ total: number; withPrice: number; bySource: Record<string, number>; perCurrency: Record<string, { total: number; withPrice: number; flagged: number }>; reasons: Record<string, number>; flagged: FlaggedBond[] } | null> {
  const client = db();
  if (!client) return null;
  const rows = await client`select * from public_bonds`;
  const meta = new Map<string, PriceMeta>();
  const bySource: Record<string, number> = {};
  const all: PublicBond[] = rows.map((r) => {
    const m = priceMetaOf(r);
    meta.set(r.isin, m);
    if (num(r.clean_price) != null) bySource[m.source ?? "(no source)"] = (bySource[m.source ?? "(no source)"] ?? 0) + 1;
    return {
      isin: r.isin, name: r.name, issuer: r.issuer, country: r.country, currency: r.currency, coupon: num(r.coupon), maturity: isoDay(r.maturity),
      ratingSp: null, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: num(r.gross_ytm), modifiedDuration: num(r.modified_duration),
      ytmAsOf: r.ytm_as_of ? new Date(r.ytm_as_of).toISOString() : null, cleanPrice: num(r.clean_price), couponType: couponTypeOf(r.coupon_type, num(r.coupon), r.structure_modelled),
    };
  });
  const { flagged } = screenPrices(all, meta, newestQuote(all));
  const perCurrency: Record<string, { total: number; withPrice: number; flagged: number }> = {};
  for (const b of all) {
    const c = (perCurrency[b.currency] ??= { total: 0, withPrice: 0, flagged: 0 });
    c.total++;
    if (b.cleanPrice != null) c.withPrice++;
  }
  const reasons: Record<string, number> = {};
  for (const f of flagged) {
    perCurrency[f.currency].flagged++;
    for (const x of f.reasons) reasons[x] = (reasons[x] ?? 0) + 1;
  }
  return { total: all.length, withPrice: all.filter((b) => b.cleanPrice != null).length, bySource, perCurrency, reasons, flagged };
}

// A yield whose quote is more than this many days older than the newest one in the copy is stale and left out.
export const STALE_DAYS = 10;

/** Leave out bonds whose yield date is well behind the rest of the copy (a price that stopped updating). */
export function dropStale(bonds: PublicBond[]): PublicBond[] {
  const times = bonds.map((b) => (b.ytmAsOf ? Date.parse(b.ytmAsOf) : NaN)).filter(Number.isFinite);
  if (!times.length) return bonds;
  const limit = Math.max(...times) - STALE_DAYS * 86_400_000;
  return bonds.filter((b) => !b.ytmAsOf || Date.parse(b.ytmAsOf) >= limit);
}

const asOfOf = new WeakMap<object, string | null>();
function withAsOf(bonds: PublicBond[], source: "live" | "sample"): BondSource {
  let asOf = asOfOf.get(bonds);
  if (asOf === undefined) {
    asOf = null;
    for (const b of bonds) if (b.ytmAsOf && (asOf === null || b.ytmAsOf > asOf)) asOf = b.ytmAsOf;
    asOfOf.set(bonds, asOf);
  }
  return { bonds, source, asOf };
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isoDay(v: unknown): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Every bond the site can show, all currencies, plus how many of the whole copy were left out
 * (unrated with a current yield, and the rest: no yield, matured, stale or not modelled). For the bond map.
 */
/** The bonds left out as likely risky structures (lib/outliers.ts), for checks and the admin. */
export async function loadOutliers(sd?: number): Promise<Outlier[]> {
  const k = sd ?? (await currentOutlierSd());
  await loadAllBonds(k);
  return outlierCut(k).outliers;
}

export async function loadAllShown(): Promise<BondSource & { unrated: number; total: number }> {
  const all = await loadAllBonds();
  return { ...all, unrated: cache?.unrated ?? 0, total: cache?.total ?? all.bonds.length };
}

import { cleanIssuer } from "./issuer";
export { cleanIssuer };

/** Counts over the whole copy (not only what the site shows), for the admin page. Age uses the quote's own time (price_as_of) when the copy has it, else the yield date. */
export type PriceFreshness = { basis: "price_as_of" | "ytm_as_of"; total: number; last24h: number; last48h: number; olderThan7d: number; noDate: number; newest: string | null; oldest: string | null };

export async function bondDataStats(): Promise<{
  total: number; withYtm: number; withRating: number; ytmLast24h: number; newestYtm: string | null; shownOnSite: number; freshness: PriceFreshness;
} | null> {
  const client = db();
  if (!client) return null;
  const cols = await client`select column_name from information_schema.columns where table_name = 'public_bonds' and column_name = 'price_as_of'`;
  const basis = cols.length ? "price_as_of" : "ytm_as_of";
  const [r] = await client`
    select count(*) total,
           count(gross_ytm) with_ytm,
           count(*) filter (where coalesce(rating_resolved, rating_sp, rating_moodys, rating_fitch) is not null) with_rating,
           count(*) filter (where gross_ytm is not null and ytm_as_of > now() - interval '24 hours') ytm_24h,
           max(ytm_as_of) newest
    from public_bonds`;
  const [f] = await client`
    select count(*) filter (where d > now() - interval '24 hours') h24,
           count(*) filter (where d > now() - interval '48 hours') h48,
           count(*) filter (where d <= now() - interval '7 days') d7,
           count(*) filter (where d is null) nodate,
           max(d) newest, min(d) oldest
    from (select ${client.unsafe(basis === "price_as_of" ? "coalesce(price_as_of, ytm_as_of)" : "ytm_as_of")} d from public_bonds) t`;
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  const shown = await loadAllBonds().then((d) => d.bonds.length).catch(() => 0);
  return {
    total: Number(r.total),
    withYtm: Number(r.with_ytm),
    withRating: Number(r.with_rating),
    ytmLast24h: Number(r.ytm_24h),
    newestYtm: r.newest ? new Date(r.newest).toISOString() : null,
    shownOnSite: shown,
    freshness: { basis, total: Number(r.total), last24h: Number(f.h24), last48h: Number(f.h48), olderThan7d: Number(f.d7), noDate: Number(f.nodate), newest: iso(f.newest), oldest: iso(f.oldest) },
  };
}

/** Freshness and shape of the bond copy, for /api/health/data and the daily data watch. Numbers only, no bond details. */
export async function bondDataHealth(now = Date.now()): Promise<DataHealth> {
  const client = db();
  if (!client) {
    const sample = process.env.NODE_ENV !== "production" || process.env.ALLOW_SAMPLE_DATA === "1";
    return judge({ source: sample ? "sample" : null, newest: null, columns: [], rows: sample ? SAMPLE_BONDS.length : 0, duplicateIsins: 0 }, now);
  }
  const cols = await client`select column_name from information_schema.columns where table_name = 'public_bonds'`;
  const [r] = await client`
    select count(*) total, max(ytm_as_of) newest,
           (select count(*) from (select isin from public_bonds group by isin having count(*) > 1) d) dups
    from public_bonds`;
  return judge({
    source: "live",
    newest: r.newest ? new Date(r.newest).toISOString() : null,
    columns: cols.map((c) => String(c.column_name)),
    rows: Number(r.total),
    duplicateIsins: Number(r.dups),
  }, now);
}

export type CopyBond = { isin: string; name: string | null; issuer: string | null; currency: string | null; maturity: string; why: string | null };

/** Why a bond in the copy is not shown on the site (null = it passes the copy-level rules; the outlier cut and stale rule come later). */
function whyHidden(r: Record<string, unknown>): string | null {
  if (r.gross_ytm == null || r.modified_duration == null) return "no yield or duration in the copy";
  if (r.maturity && new Date(String(r.maturity)) <= new Date()) return "already matured";
  if (r.structure_modelled === false) return "structure not modelled (floating, step-up, inflation-linked or similar)";
  if (dormantReason({ currency: String(r.currency ?? ""), minInvestment: minInvestmentOf(num(r.min_denomination), num(r.min_lot), String(r.currency ?? "")) } as never, r.dormant)) return "dormant (minimum investment above 200,000)";
  if (!hasRealRating({ ratingSp: r.rating_sp, ratingMoodys: r.rating_moodys, ratingFitch: r.rating_fitch, ratingResolved: r.rating_resolved, lrScore: num(r.lr_score) } as never)) return "no rating from S&P, Moody's or Fitch";
  return null;
}

/** Admin only: bonds of the WHOLE copy (no site filters) with one of these ISINs, or maturing within 4 days of one of these days. */
export async function bondsForScenarios(isins: string[], days: string[]): Promise<CopyBond[]> {
  const client = db();
  if (!client) return [];
  const cols = client`isin, name, issuer, currency, maturity, gross_ytm, modified_duration, structure_modelled, dormant, min_denomination, min_lot, rating_sp, rating_moodys, rating_fitch, rating_resolved, lr_score`;
  const parts = await Promise.all([
    client`select ${cols} from public_bonds where upper(trim(isin)) in ${client(isins)}`,
    ...days.map((d) => client`select ${cols} from public_bonds where maturity::date between (${d}::date - 4) and (${d}::date + 4)`),
  ]);
  const seen = new Map<string, CopyBond>();
  for (const r of parts.flat()) {
    const isin = String(r.isin).trim().toUpperCase();
    if (!seen.has(isin)) seen.set(isin, { isin, name: r.name, issuer: r.issuer, currency: r.currency, maturity: isoDay(r.maturity) ?? "", why: whyHidden(r) });
  }
  return [...seen.values()];
}

/** Admin only: what the bond copy holds for these ISINs (to compare an imported spreadsheet with the site's data). */
export async function siteBondsByIsin(isins: string[]): Promise<Record<string, { issuer: string | null; coupon: number | null; maturity: string | null; price: number | null; ytm: number | null; duration: number | null; seniority: string | null; ratingSp: string | null; ratingMoodys: string | null; ratingFitch: string | null; dormant: boolean }>> {
  const client = db();
  if (!client || !isins.length) return {};
  const rows = await client`select * from public_bonds where isin in ${client(isins)}`;
  return Object.fromEntries(rows.map((r) => [r.isin, {
    issuer: r.issuer ?? null,
    coupon: num(r.coupon),
    maturity: isoDay(r.maturity),
    price: num(r.clean_price),
    ytm: num(r.gross_ytm),
    duration: num(r.modified_duration),
    seniority: typeof r.seniority === "string" && r.seniority.trim() ? r.seniority.trim() : null,
    ratingSp: r.rating_sp ?? null,
    ratingMoodys: r.rating_moodys ?? null,
    ratingFitch: r.rating_fitch ?? null,
    dormant: Boolean(dormantReason({ currency: r.currency, minInvestment: correctedMin(r.isin, r.issuer, r.currency, minInvestmentOf(num(r.min_denomination), num(r.min_lot), r.currency)) }, r.dormant)),
  }]));
}

/** Identity of EVERY bond in the copy (shown or not), for the permanent bond codes (lib/bondCodes.ts). Null when the copy is not connected. */
export async function loadBondIdentities(): Promise<{ isin: string; name: string | null; issuer: string | null; currency: string | null; maturity: string | null }[] | null> {
  const client = db();
  if (!client) return null;
  const rows = await client`select isin, name, issuer, currency, maturity from public_bonds`;
  return rows.map((r) => ({ isin: String(r.isin).trim().toUpperCase(), name: r.name ?? null, issuer: r.issuer ?? null, currency: r.currency ? String(r.currency).trim().toUpperCase() : null, maturity: isoDay(r.maturity) }));
}
