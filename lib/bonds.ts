import postgres from "postgres";
import { cleanPgUrl } from "./pgUrl";
import type { PublicBond } from "./types";
import { SAMPLE_BONDS } from "./sample-bonds";
import { bondNotch } from "./ratings";
import { correctedMin } from "./minOverrides";
import { applyFilter, DEFAULT_FILTER, minInvestmentOf, type BondFilter } from "./bondFilter";
import { judge, missingColumns, type DataHealth } from "./dataHealth";
import { cleanSd, findOutliers, OUTLIER_SD, type Outlier } from "./outliers";
import { liveOutlierSd } from "./riskPremium/store";

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
let cache: { at: number; rated: PublicBond[]; source: "live" | "sample"; unrated: number; total: number; bySd: Map<number, { bonds: PublicBond[]; outliers: Outlier[] }> } | null = null;

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
    cache = { at: Date.now(), rated: SAMPLE_BONDS, source: "sample", unrated: 0, total: SAMPLE_BONDS.length, bySd: new Map() };
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
  const bonds: PublicBond[] = modelled.map((r) => ({
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
  }));
  // Unrated bonds never appear on the site (the owner, 18/10/2026).
  const current = dropStale(bonds);
  const rated = current.filter((b) => bondNotch(b) !== null);
  // Likely subordinated or hybrid bonds (by name, or a statistical yield outlier) are left out too, in outlierCut (the owner, 20/10/2026).
  const [{ total }] = await client`select count(*)::int total from public_bonds`;
  cache = { at: Date.now(), rated, source: "live", unrated: current.length - rated.length, total: Number(total), bySd: new Map() };
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
