// Is the bond copy still fresh and shaped as the site expects? lm-op-model rebuilds public_bonds every working day;
// if that stops, the site would keep showing old yields quietly. These checks make it loud instead.

/** Yields older than this (counted from the newest quote in the copy) are "out of date". 4 days covers a weekend. */
export const STALE_ALERT_DAYS = 4;

/** Columns the site reads from public_bonds. If one disappears, values would turn into blanks without an error. */
export const REQUIRED_COLUMNS = [
  "isin", "name", "issuer", "country", "currency", "coupon", "maturity",
  "rating_sp", "rating_moodys", "rating_fitch", "rating_resolved",
  "gross_ytm", "modified_duration", "ytm_as_of",
] as const;

export function missingColumns(present: Iterable<string>): string[] {
  const have = new Set(present);
  return REQUIRED_COLUMNS.filter((c) => !have.has(c));
}

/** Whole days between the newest yield date and now (0 when the date is in the future or today). */
export function ageDays(asOf: string | null, now = Date.now()): number | null {
  if (!asOf) return null;
  const t = Date.parse(asOf);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

export function isStale(asOf: string | null, now = Date.now()): boolean {
  const d = ageDays(asOf, now);
  return d !== null && d > STALE_ALERT_DAYS;
}

export type DataHealth = {
  ok: boolean;
  source: "live" | "sample" | null;
  newest: string | null;
  ageDays: number | null;
  stale: boolean;
  missingColumns: string[];
  duplicateIsins: number;
  rows: number;
  problems: string[];
};

/** Puts the raw facts together into one verdict, with each problem written out in plain words. */
export function judge(f: { source: "live" | "sample" | null; newest: string | null; columns: string[]; rows: number; duplicateIsins: number }, now = Date.now()): DataHealth {
  const missing = f.source === "live" ? missingColumns(f.columns) : [];
  const days = ageDays(f.newest, now);
  const stale = f.source === "live" && isStale(f.newest, now);
  const problems: string[] = [];
  if (f.source === null) problems.push("Bond data is not connected.");
  if (missing.length) problems.push(`The bond table lost columns the site reads: ${missing.join(", ")}.`);
  if (stale) problems.push(`Newest yield is ${days} days old (limit ${STALE_ALERT_DAYS}): the daily copy from lm-op-model has probably stopped.`);
  if (f.source === "live" && f.rows === 0) problems.push("The bond table is empty.");
  if (f.duplicateIsins > 0) problems.push(`${f.duplicateIsins} ISIN(s) appear more than once in the bond table.`);
  return { ok: problems.length === 0, source: f.source, newest: f.newest, ageDays: days, stale, missingColumns: missing, duplicateIsins: f.duplicateIsins, rows: f.rows, problems };
}
