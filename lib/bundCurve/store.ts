import { accountsSql } from "../accounts";
import { MATURITIES, MAX_MOVE_BP, SOURCE, completeCurves, curveStatus, latestComplete, maxMoveBp, nextRun, withChange, type CurvePoint, type CurveType, type ParseResult, type Status } from "./core";

// One generic benchmark-curve store for every government curve (migration id: benchmark_curve_001, additive): German Bund (DE_BUND, Bundesbank) now,
// US Treasury (US_TSY, Federal Reserve) next, same pattern. One row per benchmark, curve type, observation date and maturity; history is kept.
// A curve is written in one transaction, so readers see all 30 points of a date or none. A failed or invalid import never touches saved rows.
let ready: Promise<void> | null = null;
export function benchmarkTablesReady(): Promise<void> {
  ready ??= (async () => {
    const s = await accountsSql();
    await s`drop table if exists app.bund_curve, app.bund_imports`; // first-draft tables from test runs of this feature, replaced by the generic ones below
    await s`create table if not exists app.benchmark_curve (
      benchmark text not null, country text not null, currency text not null, curve_type text not null,
      observation_date date not null, maturity_years smallint not null check (maturity_years between 1 and 30),
      yield_percent numeric(8,4) not null, source text not null, series_id text not null, fetched_at timestamptz not null default now(),
      status text not null default 'valid', basis text not null default 'published' check (basis in ('published','estimated')),
      primary key (benchmark, curve_type, observation_date, maturity_years))`;
    await s`create table if not exists app.benchmark_imports (
      id bigserial primary key, benchmark text not null, started_at timestamptz not null default now(), trigger text not null, ok boolean not null, message text not null,
      dates jsonb, inserted integer not null default 0, updated integer not null default 0, unchanged integer not null default 0)`;
    await s`create index if not exists benchmark_imports_b on app.benchmark_imports (benchmark, id desc)`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

/** What an importer hands to `ingestCurves`: complete 30-point curves, one date each. */
export type CurveInput = { curveType: string; date: string; values: Map<number, { value: number; seriesId: string }>; basis?: "published" | "estimated" };
export type BenchmarkDef = { benchmark: string; country: string; currency: string; source: string; required: string; maxMoveBp?: number };
export const DE_BUND: BenchmarkDef = { benchmark: "DE_BUND", country: "Germany", currency: "EUR", source: SOURCE, required: "ZAR" };

export type ImportResult = { ok: boolean; message: string; dates: Record<string, string>; inserted: number; updated: number; unchanged: number };

const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

async function savedCurve(b: string, type: string, date: string): Promise<Map<number, number>> {
  const s = await accountsSql();
  const rows = await s`select maturity_years, yield_percent from app.benchmark_curve where benchmark = ${b} and curve_type = ${type} and observation_date = ${date}`;
  return new Map(rows.map((r) => [Number(r.maturity_years), Number(r.yield_percent)]));
}
async function latestSavedBefore(b: string, type: string, date: string) {
  const s = await accountsSql();
  const [r] = await s`select observation_date d from app.benchmark_curve where benchmark = ${b} and curve_type = ${type} and observation_date < ${date} group by 1 having count(*) = 30 order by 1 desc limit 1`;
  return r ? { date: iso(r.d), values: await savedCurve(b, type, iso(r.d)) } : null;
}
async function log(b: string, trigger: string, r: ImportResult) {
  const s = await accountsSql();
  await s`insert into app.benchmark_imports (benchmark, trigger, ok, message, dates, inserted, updated, unchanged) values (${b}, ${trigger}, ${r.ok}, ${r.message}, ${JSON.stringify(r.dates)}::jsonb, ${r.inserted}, ${r.updated}, ${r.unchanged})`;
}

/** The one save pipeline for every benchmark, weekly job, "Refresh now" and manual import: refuses a jump above the limit versus the last saved curve, saves all or nothing. */
export async function ingestCurves(def: BenchmarkDef, curves: CurveInput[], trigger: string, fetchedAt = new Date()): Promise<ImportResult> {
  await benchmarkTablesReady();
  const fail = async (message: string): Promise<ImportResult> => { const r = { ok: false, message, dates: {}, inserted: 0, updated: 0, unchanged: 0 }; await log(def.benchmark, trigger, r); return r; };
  const req = curves.find((c) => c.curveType === def.required);
  if (!req) return fail(`Rejected, nothing saved: no date with all 30 ${def.required} maturities`);
  const limit = def.maxMoveBp ?? MAX_MOVE_BP;
  for (const c of curves) {
    const prev = await latestSavedBefore(def.benchmark, c.curveType, c.date);
    if (prev) {
      const move = maxMoveBp(new Map([...c.values].map(([y, o]) => [y, o.value])), prev.values);
      if (move > limit) return fail(`Rejected, nothing saved: ${c.curveType} ${c.date} differs from saved ${prev.date} by ${move} bp at one maturity (limit ${limit})`);
    }
  }
  const s = await accountsSql();
  let inserted = 0, updated = 0, unchanged = 0;
  await s.begin(async (tx) => {
    const rows: { curve_type: string; observation_date: string; maturity_years: number; yield_percent: number; series_id: string; basis: string }[] = [];
    for (const c of curves) {
      const old = new Map((await tx`select maturity_years, yield_percent from app.benchmark_curve where benchmark = ${def.benchmark} and curve_type = ${c.curveType} and observation_date = ${c.date}`).map((r) => [Number(r.maturity_years), Number(r.yield_percent)]));
      for (const y of MATURITIES) {
        const o = c.values.get(y)!;
        if (!old.has(y)) inserted++; else if (Math.abs(old.get(y)! - o.value) < 1e-9) { unchanged++; continue; } else updated++;
        rows.push({ curve_type: c.curveType, observation_date: c.date, maturity_years: y, yield_percent: o.value, series_id: o.seriesId, basis: c.basis ?? "published" });
      }
    }
    // One statement for all changed points (a week of two curves is hundreds of rows; one round trip each is minutes on a remote database).
    if (rows.length) await tx`insert into app.benchmark_curve (benchmark, country, currency, curve_type, observation_date, maturity_years, yield_percent, source, series_id, fetched_at, status, basis)
      select ${def.benchmark}, ${def.country}, ${def.currency}, t.curve_type, t.observation_date, t.maturity_years, t.yield_percent, ${def.source}, t.series_id, ${fetchedAt}, 'valid', t.basis
      from jsonb_to_recordset(${tx.json(rows)}) as t(curve_type text, observation_date date, maturity_years smallint, yield_percent numeric, series_id text, basis text)
      on conflict (benchmark, curve_type, observation_date, maturity_years) do update set yield_percent = excluded.yield_percent, fetched_at = excluded.fetched_at`;
  });
  const dates = Object.fromEntries(curves.map((c) => [c.curveType, c.date]));
  const r: ImportResult = { ok: true, dates, inserted, updated, unchanged,
    message: `Saved ${curves.map((c) => `${c.curveType} ${c.date}`).join(", ")}: ${inserted} new, ${updated} revised, ${unchanged} unchanged` };
  await log(def.benchmark, trigger, r);
  return r;
}

/** Bund pipeline: latest complete annual-coupon curve (required) and latest complete zero-coupon curve (optional), each of one date only. */
export async function ingest(parsed: ParseResult, trigger: string, fetchedAt = new Date()): Promise<ImportResult> {
  await benchmarkTablesReady();
  if (parsed.errors.length) {
    const r = { ok: false, message: `Rejected, nothing saved: ${parsed.errors.slice(0, 3).join(" | ")}${parsed.errors.length > 3 ? ` (+${parsed.errors.length - 3} more)` : ""}`, dates: {}, inserted: 0, updated: 0, unchanged: 0 };
    await log(DE_BUND.benchmark, trigger, r); return r;
  }
  const zar = latestComplete(parsed.obs, "ZAR");
  if (!zar) {
    const r = { ok: false, message: `Rejected, nothing saved: no date with all 30 annual-coupon maturities (${completeCurves(parsed.obs).length} complete days found)`, dates: {}, inserted: 0, updated: 0, unchanged: 0 };
    await log(DE_BUND.benchmark, trigger, r); return r;
  }
  const curves = [zar, latestComplete(parsed.obs, "ZST")].filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ curveType: c.type as string, date: c.date, values: new Map([...c.values].map(([y, o]) => [y, { value: o.value, seriesId: o.seriesId }])) }));
  return ingestCurves(DE_BUND, curves, trigger, fetchedAt);
}

// ---- reads (used by the admin pages, the Knowledge page, Bond Efficiency and the admin Spread column) ----
export type Curve = { benchmark: string; curveType: string; currency: string; asOf: string; fetchedAt: string; previousAsOf: string | null; points: CurvePoint[]; seriesIds: string[]; basis: string };

/** Latest complete 30-point curve of a benchmark and type (or the one for `date`), with the change against the curve a week earlier. Null when nothing is saved. */
export async function getCurve(benchmark: string, curveType: string, date?: string): Promise<Curve | null> {
  await benchmarkTablesReady();
  const s = await accountsSql();
  const [d] = date
    ? await s`select observation_date d from app.benchmark_curve where benchmark = ${benchmark} and curve_type = ${curveType} and observation_date = ${date} group by 1 having count(*) = 30`
    : await s`select observation_date d from app.benchmark_curve where benchmark = ${benchmark} and curve_type = ${curveType} group by 1 having count(*) = 30 order by 1 desc limit 1`;
  if (!d) return null;
  const asOf = iso(d.d);
  const rows = await s`select maturity_years, yield_percent, series_id, fetched_at, currency, basis from app.benchmark_curve where benchmark = ${benchmark} and curve_type = ${curveType} and observation_date = ${asOf} order by maturity_years`;
  const [w] = await s`select observation_date d from app.benchmark_curve where benchmark = ${benchmark} and curve_type = ${curveType} and observation_date <= (${asOf}::date - 7) group by 1 having count(*) = 30 order by 1 desc limit 1`;
  const previousAsOf = w ? iso(w.d) : null;
  const prev = previousAsOf ? await savedCurve(benchmark, curveType, previousAsOf) : null;
  return { benchmark, curveType, currency: String(rows[0].currency), asOf, previousAsOf, fetchedAt: new Date(rows[0].fetched_at).toISOString(), seriesIds: rows.map((r) => String(r.series_id)),
    basis: rows.some((r) => r.basis === "estimated") ? "estimated" : "published", points: withChange(new Map(rows.map((r) => [Number(r.maturity_years), Number(r.yield_percent)])), prev) };
}

export const getBundCurve = (type: CurveType = "ZAR", date?: string) => getCurve(DE_BUND.benchmark, type, date);

/** Plain {years, ytm} points of the official EUR benchmark (Bund annual-coupon yields); null when no official curve is saved. For interpolation as in lib/bundSpread.ts. */
export async function getBundBenchmarkPoints(): Promise<{ asOf: string; points: { years: number; ytm: number }[] } | null> {
  const c = await getBundCurve("ZAR");
  return c ? { asOf: c.asOf, points: c.points.map((p) => ({ years: p.years, ytm: p.yield })) } : null;
}

export async function benchmarkStatus(benchmark: string, primaryType: string, secondaryType: string, now = new Date()) {
  await benchmarkTablesReady();
  const s = await accountsSql();
  const primary = await getCurve(benchmark, primaryType), secondary = await getCurve(benchmark, secondaryType);
  const [last] = await s`select ok from app.benchmark_imports where benchmark = ${benchmark} order by id desc limit 1`;
  const [lastOk] = await s`select started_at from app.benchmark_imports where benchmark = ${benchmark} and ok order by id desc limit 1`;
  const imports = await s`select id, started_at, trigger, ok, message from app.benchmark_imports where benchmark = ${benchmark} order by id desc limit 8`;
  const history = await s`select curve_type, count(distinct observation_date)::int n, min(observation_date) first, max(observation_date) last from app.benchmark_curve where benchmark = ${benchmark} group by 1`;
  return { primary, secondary, status: curveStatus(primary?.asOf ?? null, primary?.points.length ?? 0, last ? !last.ok : false, now) as Status,
    lastSuccess: lastOk ? new Date(lastOk.started_at).toISOString() : null, nextRefresh: nextRun(now).toISOString(), imports, history };
}
export const bundStatus = async (now = new Date()) => { const r = await benchmarkStatus(DE_BUND.benchmark, "ZAR", "ZST", now); return { ...r, zar: r.primary, zst: r.secondary }; };
