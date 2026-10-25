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
  return withAsOf(applyFilter(all.bonds, f), all.source);
}

async function loadAllBonds(sd?: number): Promise<BondSource> {
  const k = sd ?? (await currentOutlierSd());
  if (!cache || Date.now() - cache.at >= CACHE_MS) await reload();
  return withAsOf(outlierCut(k).bonds, cache!.source);
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
  const mapped: (PublicBond & { flaggedDormant: unknown })[] = modelled.map((r) => ({
    flaggedDormant: r.dormant,
    isin: r.isin,
    name: r.name,
    issuer: cleanIssuer(r.issuer),
    country: r.country,
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
    seniority: typeof r.seniority === "string" && r.seniority.trim() ? r.seniority.trim() : null,
    issueDate: isoDay(r.issue_date),
    callable: typeof r.callable === "boolean" ? r.callable : null,
  }));
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

function withAsOf(bonds: PublicBond[], source: "live" | "sample"): BondSource {
  const dates = bonds.map((b) => b.ytmAsOf).filter((d): d is string => !!d).sort();
  return { bonds, source, asOf: dates.at(-1) ?? null };
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

/** Counts over the whole copy (not only what the site shows), for the admin page. The copy holds yields, not prices. */
export async function bondDataStats(): Promise<{
  total: number; withYtm: number; withRating: number; ytmLast24h: number; newestYtm: string | null; shownOnSite: number;
} | null> {
  const client = db();
  if (!client) return null;
  const [r] = await client`
    select count(*) total,
           count(gross_ytm) with_ytm,
           count(*) filter (where coalesce(rating_resolved, rating_sp, rating_moodys, rating_fitch) is not null) with_rating,
           count(*) filter (where gross_ytm is not null and ytm_as_of > now() - interval '24 hours') ytm_24h,
           max(ytm_as_of) newest
    from public_bonds`;
  const shown = await loadAllBonds().then((d) => d.bonds.length).catch(() => 0);
  return {
    total: Number(r.total),
    withYtm: Number(r.with_ytm),
    withRating: Number(r.with_rating),
    ytmLast24h: Number(r.ytm_24h),
    newestYtm: r.newest ? new Date(r.newest).toISOString() : null,
    shownOnSite: shown,
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

/** Admin only: every bond in the copy maturing on one of these days (hidden or not), to match a list of bonds to ISINs. */
export async function bondsMaturingOn(days: string[]): Promise<{ isin: string; name: string | null; issuer: string | null; currency: string | null; maturity: string }[]> {
  const client = db();
  if (!client) return [];
  const rows = await client`select isin, name, issuer, currency, maturity from public_bonds where maturity::date in ${client(days)}`;
  return rows.map((r) => ({ isin: r.isin, name: r.name, issuer: r.issuer, currency: r.currency, maturity: isoDay(r.maturity) ?? "" }));
}
