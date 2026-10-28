// Official German Bund benchmark curve (Deutsche Bundesbank, dataset BBSIS). Pure functions: parsing, validation, picking the latest complete
// curve, week-on-week change and the Monday 09:00 Europe/Berlin schedule. No network and no database here (see store.ts and fetch.ts).
//
// ZAR = yields derived from the term structure for Bunds with annual coupons (the coupon-bond benchmark).
// ZST = Svensson zero-coupon (spot) rates (for discounting). The two are never mixed or treated as the same thing.

export type CurveType = "ZAR" | "ZST";
export const CURVE_TYPES: CurveType[] = ["ZAR", "ZST"];
export const MATURITIES = Array.from({ length: 30 }, (_, i) => i + 1);
export const SOURCE = "Deutsche Bundesbank, dataset BBSIS";
export const ATTRIBUTION = "Source: Deutsche Bundesbank";

export const seriesId = (type: CurveType, years: number) => `BBSIS.D.I.${type}.ZI.EUR.S1311.B.A604.R${String(years).padStart(2, "0")}XX.R.A.A._Z._Z.A`;
const ID_RE = /^BBSIS\.D\.I\.(ZAR|ZST)\.ZI\.EUR\.S1311\.B\.A604\.R(\d{2})XX\.R\.A\.A\._Z\._Z\.A$/;

export type Obs = { type: CurveType; years: number; date: string; value: number; seriesId: string };
export type ParseResult = { obs: Obs[]; errors: string[]; missing: number; ignored?: number };

const MIN_PCT = -2, MAX_PCT = 15;

function addObs(r: ParseResult, seen: Map<string, number>, id: string, date: string, raw: string) {
  const m = ID_RE.exec(id.trim());
  // The wildcard download also returns fractional maturities (e.g. R005X = 0.5 years) of the same family: not integer years, so not used.
  if (!m && /^BBSIS\.D\.I\.(ZAR|ZST)\.ZI\.EUR\.S1311\.B\.A604\.R\d{3,4}[A-Z0-9]\.R\.A\.A\._Z\._Z\.A$/.test(id.trim())) { r.ignored = (r.ignored ?? 0) + 1; return; }
  if (!m) { r.errors.push(`Unexpected series id: ${id.slice(0, 80)}`); return; }
  const years = Number(m[2]);
  if (years < 1 || years > 30) { r.errors.push(`Maturity out of range: ${id}`); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) { r.errors.push(`Bad date "${date}" in ${id}`); return; }
  const v = raw.trim();
  if (v === "." || v === "") { r.missing++; return; } // "Kein Wert vorhanden": weekends, holidays. Never filled in.
  const n = Number(v.replace(",", "."));
  if (!/^-?\d+([.,]\d+)?$/.test(v) || !Number.isFinite(n)) { r.errors.push(`Not a number "${v}" in ${id} on ${date}`); return; }
  if (n < MIN_PCT || n > MAX_PCT) { r.errors.push(`Value ${n} outside ${MIN_PCT}..${MAX_PCT} percent (decimal fraction or wrong unit?) in ${id} on ${date}`); return; }
  const key = `${m[1]}|${years}|${date}`;
  const prev = seen.get(key);
  if (prev !== undefined) { if (prev !== n) r.errors.push(`Duplicate with different values: ${id} on ${date}`); return; }
  seen.set(key, n);
  r.obs.push({ type: m[1] as CurveType, years, date, value: n, seriesId: id.trim() });
}

/** Parses either the SDMX CSV (one row per observation, header starts with DATAFLOW) or the classic "wide" Bundesbank CSV (series in columns, comma decimals). */
export function parseBundesbankCsv(text: string): ParseResult {
  const r: ParseResult = { obs: [], errors: [], missing: 0 };
  const seen = new Map<string, number>();
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) { r.errors.push("Empty file"); return r; }
  const head = lines[0].split(";");
  if (head[0].trim() === "DATAFLOW") {
    const ix = (n: string) => head.indexOf(n);
    const iId = ix("BBK_ID"), iT = ix("TIME_PERIOD"), iV = ix("OBS_VALUE");
    if (iId < 0 || iT < 0 || iV < 0) { r.errors.push("SDMX CSV is missing BBK_ID, TIME_PERIOD or OBS_VALUE"); return r; }
    for (const l of lines.slice(1)) { const c = l.split(";"); if (c.length <= Math.max(iId, iT, iV)) { r.errors.push(`Short row: ${l.slice(0, 60)}`); continue; } addObs(r, seen, c[iId], c[iT], c[iV]); }
  } else {
    const ids = head.map((h) => h.replace(/"/g, "").trim());
    if (!ids.some((h) => ID_RE.test(h))) { r.errors.push("Not a Bundesbank BBSIS CSV (no ZAR/ZST series in the header)"); return r; }
    for (const l of lines.slice(1)) {
      const c = l.split(";");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c[0].trim())) continue; // metadata rows (title, unit, "Stand vom" ...)
      ids.forEach((id, i) => { if (i > 0 && ID_RE.test(id)) addObs(r, seen, id, c[0].trim(), c[i] ?? ""); });
    }
  }
  if (!r.obs.length && !r.errors.length) r.errors.push("No observations found");
  return r;
}

export type Complete = { type: CurveType; date: string; values: Map<number, Obs> };

/** Every observation date that has all 30 maturities, per curve type. Dates are never combined: a curve is one date or nothing. */
export function completeCurves(obs: Obs[]): Complete[] {
  const by = new Map<string, Complete>();
  for (const o of obs) {
    const k = `${o.type}|${o.date}`;
    let c = by.get(k); if (!c) by.set(k, (c = { type: o.type, date: o.date, values: new Map() }));
    c.values.set(o.years, o);
  }
  return [...by.values()].filter((c) => MATURITIES.every((y) => c.values.has(y))).sort((a, b) => a.date.localeCompare(b.date));
}

export const latestComplete = (obs: Obs[], type: CurveType): Complete | null => completeCurves(obs).filter((c) => c.type === type).pop() ?? null;

/** Largest single-maturity move (bp) between two curves; used to refuse an obviously broken download. */
export function maxMoveBp(a: Map<number, number>, b: Map<number, number>): number {
  let m = 0; for (const y of MATURITIES) { const x = a.get(y), z = b.get(y); if (x !== undefined && z !== undefined) m = Math.max(m, Math.abs(x - z) * 100); }
  return Math.round(m);
}
export const MAX_MOVE_BP = 100;

export type CurvePoint = { years: number; yield: number; previous: number | null; changeBp: number | null };

export function withChange(current: Map<number, number>, previous: Map<number, number> | null): CurvePoint[] {
  return MATURITIES.map((y) => {
    const v = current.get(y)!, p = previous?.get(y) ?? null;
    return { years: y, yield: v, previous: p, changeBp: p === null ? null : Math.round((v - p) * 100) };
  });
}

// ---- schedule: every Monday 09:00 Europe/Berlin (DST-correct) ----
const berlinParts = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { weekday: p.weekday, hour: Number(p.hour) % 24, minute: Number(p.minute) };
};
export const isBerlinMonday9 = (d: Date) => { const p = berlinParts(d); return p.weekday === "Mon" && p.hour === 9; };

/** The next Monday 09:00 Berlin strictly after `now`, as a UTC instant. GitHub cron is UTC only, so the job runs at 07:00 and 08:00 UTC and this decides. */
export function nextRun(now: Date): Date {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let day = 0; day < 15; day++) {
    for (const hour of [7, 8]) {
      const t = new Date(start + day * 864e5 + hour * 36e5);
      if (t > now && isBerlinMonday9(t) && berlinParts(t).minute === 0) return t;
    }
  }
  throw new Error("no next run found");
}

export type Status = "current" | "stale" | "incomplete" | "failed";
/** current: newest observation at most 5 days old (a Friday value is still current on Tuesday morning); stale: older. */
export function curveStatus(latestDate: string | null, count: number, lastImportFailed: boolean, now: Date): Status {
  if (!latestDate) return "failed";
  if (count < 30) return "incomplete";
  if (lastImportFailed) return "failed";
  const age = (now.getTime() - Date.parse(latestDate + "T00:00:00Z")) / 864e5;
  return age <= 5 ? "current" : "stale";
}
