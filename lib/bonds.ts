import postgres from "postgres";
import { cleanPgUrl } from "./pgUrl";
import type { PublicBond } from "./types";
import { SAMPLE_BONDS } from "./sample-bonds";
import { bondNotch } from "./ratings";

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
let cache: { at: number; bonds: PublicBond[]; source: "live" | "sample" } | null = null;

export type BondSource = { bonds: PublicBond[]; source: "live" | "sample"; asOf: string | null };

export async function loadBonds(): Promise<BondSource> {
  if (cache && Date.now() - cache.at < CACHE_MS) return withAsOf(cache.bonds, cache.source);

  const client = db();
  if (!client) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_SAMPLE_DATA !== "1") {
      throw new Error("Bond data is not connected yet.");
    }
    cache = { at: Date.now(), bonds: SAMPLE_BONDS, source: "sample" };
    return withAsOf(SAMPLE_BONDS, "sample");
  }

  // Bonds whose cash flows the main app could not model (inflation-linked, step-up, floating) are left out.
  // If the column cannot be read, fall back to the plain list rather than showing nothing.
  const rows = await client`
    select isin, name, issuer, country, currency, coupon, maturity,
           rating_sp, rating_moodys, rating_fitch, rating_resolved,
           gross_ytm, modified_duration, ytm_as_of
    from public_bonds
    where gross_ytm is not null and modified_duration is not null
      and (maturity is null or maturity > current_date)
      and currency = 'EUR'
      and coalesce(structure_modelled, true)
  `.catch((e) => {
    console.error("[bonds] structure filter unavailable:", (e as Error).message);
    return client`
      select isin, name, issuer, country, currency, coupon, maturity,
             rating_sp, rating_moodys, rating_fitch, rating_resolved,
             gross_ytm, modified_duration, ytm_as_of
      from public_bonds
      where gross_ytm is not null and modified_duration is not null
        and (maturity is null or maturity > current_date)
        and currency = 'EUR'
    `;
  });
  const bonds: PublicBond[] = rows.map((r) => ({
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
    grossYtm: num(r.gross_ytm),
    modifiedDuration: num(r.modified_duration),
    ytmAsOf: r.ytm_as_of ? new Date(r.ytm_as_of).toISOString() : null,
  }));
  // Unrated bonds never appear on the site (Livio, 18/10/2026).
  const fresh = dropStale(bonds).filter((b) => bondNotch(b) !== null);
  cache = { at: Date.now(), bonds: fresh, source: "live" };
  return withAsOf(fresh, "live");
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

import { cleanIssuer } from "./issuer";
export { cleanIssuer };
