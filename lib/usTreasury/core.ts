// US Treasury benchmark (migration shared with the Bund: app.benchmark_curve). Pure functions: parsing, validation, picking complete curves, status.
//
// Primary: Federal Reserve Board, FEDS 2006-28 fitted curve (feds200628.csv). A staff research product, not an official release; it can be delayed or revised.
//   SVENPYnn = fitted par yields (coupon-equivalent), the default 30-point benchmark.  SVENYnn = fitted zero-coupon yields (continuously compounded), kept separate.
// Cross-check: US Department of the Treasury, Daily Treasury Par Yield Curve Rates, published at selected tenors only (1, 2, 3, 5, 7, 10, 20, 30 years). Stored separately, never
// merged with the Fed curve and never interpolated into it.
import { MATURITIES } from "../bundCurve/core";

export const FED_URL = "https://www.federalreserve.gov/data/yield-curve-tables/feds200628.csv";
export const FED_SOURCE = "Board of Governors of the Federal Reserve System, FEDS 2006-28 (feds200628.csv)";
export const FED_ATTRIBUTION = "Source: Board of Governors of the Federal Reserve System";
export const TREASURY_SOURCE = "U.S. Department of the Treasury, Daily Treasury Par Yield Curve Rates";
export const TREASURY_TENORS = [1, 2, 3, 5, 7, 10, 20, 30];
export const treasuryUrl = (yyyymm: string) => `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${yyyymm}`;

export type FedType = "PAR" | "ZERO";
export const FED_TYPES: FedType[] = ["PAR", "ZERO"];
const PREFIX: Record<FedType, string> = { PAR: "SVENPY", ZERO: "SVENY" };
export const fedSeriesId = (t: FedType, years: number) => `${PREFIX[t]}${String(years).padStart(2, "0")}`;

const MIN_PCT = -2, MAX_PCT = 15;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUM_RE = /^-?\d+(\.\d+)?$/;

export type Point = { value: number; seriesId: string };
export type DayCurve = { curveType: string; date: string; values: Map<number, Point> };
export type FedParse = { curves: DayCurve[]; errors: string[]; rows: number; incompleteDays: number };

/** Number of most recent daily rows looked at. About 7 weeks: enough for the latest complete day and the one a week earlier, small enough to keep every run light. */
export const KEEP_ROWS = 35;
/** Complete days saved per curve type on each import (history is kept; this only bounds how far back a single run reaches). */
export const SAVE_DAYS = 10;

/** Parses the Fed CSV: a few note lines, a legend, then a header row starting with "Date" and one row per day. "NA" means no value and is never filled. */
export function parseFedCsv(text: string, keepRows = KEEP_ROWS): FedParse {
  const r: FedParse = { curves: [], errors: [], rows: 0, incompleteDays: 0 };
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const h = lines.findIndex((l) => /^"?Date"?,/.test(l));
  if (h < 0) { r.errors.push("Not the Federal Reserve yield-curve CSV (no Date header row)"); return r; }
  const head = lines[h].split(",").map((x) => x.replace(/"/g, "").trim());
  const col = new Map<string, number>(head.map((n, i) => [n, i]));
  for (const t of FED_TYPES) for (const y of MATURITIES) if (!col.has(fedSeriesId(t, y))) { r.errors.push(`Missing column ${fedSeriesId(t, y)}`); }
  if (r.errors.length) return r;
  const rows = lines.slice(h + 1).filter((l) => /^\d{4}-\d{2}-\d{2},/.test(l.trim())).slice(-keepRows);
  const seen = new Map<string, string>();
  const days: Record<FedType, DayCurve[]> = { PAR: [], ZERO: [] };
  for (const l of rows) {
    const c = l.split(",").map((x) => x.trim());
    const date = c[0];
    if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) { r.errors.push(`Bad date "${date}"`); continue; }
    if (seen.has(date) && seen.get(date) !== l) r.errors.push(`Duplicate date with different values: ${date}`);
    if (seen.has(date)) continue;
    seen.set(date, l); r.rows++;
    for (const t of FED_TYPES) {
      const values = new Map<number, Point>(); let bad = false;
      for (const y of MATURITIES) {
        const id = fedSeriesId(t, y), raw = (c[col.get(id)!] ?? "").trim();
        if (raw === "" || raw === "NA") continue;
        const n = Number(raw);
        if (!NUM_RE.test(raw) || !Number.isFinite(n)) { r.errors.push(`Not a number "${raw}" in ${id} on ${date}`); bad = true; continue; }
        if (n < MIN_PCT || n > MAX_PCT) { r.errors.push(`Value ${n} outside ${MIN_PCT}..${MAX_PCT} percent (wrong unit?) in ${id} on ${date}`); bad = true; continue; }
        values.set(y, { value: n, seriesId: id });
      }
      if (bad) continue;
      if (values.size === MATURITIES.length) days[t].push({ curveType: t, date, values }); else r.incompleteDays++;
    }
  }
  for (const t of FED_TYPES) r.curves.push(...days[t].sort((a, b) => a.date.localeCompare(b.date)).slice(-SAVE_DAYS));
  return r;
}

export type TreasuryParse = { days: DayCurve[]; errors: string[]; entries: number; incompleteDays: number };

/** Parses the Treasury Atom/OData XML feed (m:properties with d:NEW_DATE and d:BC_<n>YEAR). Months (BC_6MONTH) and the duplicate BC_30YEARDISPLAY field are ignored. */
export function parseTreasuryXml(text: string): TreasuryParse {
  const r: TreasuryParse = { days: [], errors: [], entries: 0, incompleteDays: 0 };
  const blocks = [...text.matchAll(/<m:properties>([\s\S]*?)<\/m:properties>/g)].map((m) => m[1]);
  if (!blocks.length) { if (!/<feed[\s>]/.test(text)) r.errors.push("Not the Treasury XML feed"); return r; }
  const byDate = new Map<string, DayCurve>();
  for (const b of blocks) {
    r.entries++;
    const d = /<d:NEW_DATE[^>]*>(\d{4}-\d{2}-\d{2})T/.exec(b)?.[1];
    if (!d || Number.isNaN(Date.parse(d))) { r.errors.push("Entry without a valid NEW_DATE"); continue; }
    const values = new Map<number, Point>();
    for (const m of b.matchAll(/<d:BC_(\d+)YEAR(?=[\s>])[^>]*>([^<]*)</g)) {
      const years = Number(m[1]), raw = m[2].trim();
      if (!TREASURY_TENORS.includes(years) || raw === "") continue;
      const n = Number(raw);
      if (!NUM_RE.test(raw) || !Number.isFinite(n) || n < MIN_PCT || n > MAX_PCT) { r.errors.push(`Bad value "${raw}" for BC_${years}YEAR on ${d}`); continue; }
      values.set(years, { value: n, seriesId: `BC_${years}YEAR` });
    }
    const prev = byDate.get(d);
    if (prev) { if (JSON.stringify([...prev.values]) !== JSON.stringify([...values])) r.errors.push(`Duplicate date with different values: ${d}`); continue; }
    byDate.set(d, { curveType: "PAR_SELECTED", date: d, values });
  }
  for (const c of byDate.values()) { if (TREASURY_TENORS.every((y) => c.values.has(y))) r.days.push(c); else r.incompleteDays++; }
  r.days.sort((a, b) => a.date.localeCompare(b.date));
  return r;
}

/** Fed research data is posted about once a week (usually Tuesday, up to the previous Friday), so on a Monday the newest day is normally 10 days old. Older than 12 days = stale. */
export const FED_STALE_DAYS = 12;
export type UsStatus = "current" | "stale" | "incomplete" | "failed";
export function usStatus(latestDate: string | null, count: number, lastImportFailed: boolean, now: Date): UsStatus {
  if (!latestDate) return "failed";
  if (count < 30) return "incomplete";
  if (lastImportFailed) return "failed";
  return (now.getTime() - Date.parse(latestDate + "T00:00:00Z")) / 864e5 <= FED_STALE_DAYS ? "current" : "stale";
}

/** Treasury daily values: current when the newest day is at most 5 days old (covers a weekend plus a holiday). */
export const treasuryFresh = (latestDate: string | null, now: Date) => !!latestDate && (now.getTime() - Date.parse(latestDate + "T00:00:00Z")) / 864e5 <= 5;

/** Fed fitted par minus Treasury published par at the same date and tenor, in bp. Different methodologies: a difference is expected, not an error. */
export function compareBp(fed: Map<number, number>, tsy: Map<number, number>) {
  return TREASURY_TENORS.filter((y) => fed.has(y) && tsy.has(y)).map((y) => ({ years: y, fed: fed.get(y)!, treasury: tsy.get(y)!, diffBp: Math.round((fed.get(y)! - tsy.get(y)!) * 100) }));
}
