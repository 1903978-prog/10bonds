import { accountsSql } from "../accounts";
import { benchmarkStatus, benchmarkTablesReady, getCurve, ingestCurves, type BenchmarkDef, type Curve, type ImportResult } from "../bundCurve/store";
import { maxMoveBp, MAX_MOVE_BP, nextRun, withChange, type CurvePoint } from "../bundCurve/core";
import { TREASURY_SOURCE, TREASURY_TENORS, FED_SOURCE, SAVE_DAYS, compareBp, treasuryFresh, usStatus, type DayCurve, type FedParse, type TreasuryParse } from "./core";

// Stored in the shared app.benchmark_curve table (see lib/bundCurve/store.ts), no new table:
//   US_TSY           PAR / ZERO        Federal Reserve fitted curves, all 30 maturities (PAR is the benchmark, ZERO is kept apart)
//   US_TSY_TREASURY  PAR_SELECTED      Treasury published par yields, 8 tenors only, stored separately and never merged with the Fed curve
export const US_TSY: BenchmarkDef = { benchmark: "US_TSY", country: "United States", currency: "USD", source: FED_SOURCE, required: "PAR" };
export const US_TREASURY_DAILY = { benchmark: "US_TSY_TREASURY", country: "United States", currency: "USD", curveType: "PAR_SELECTED" };

const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
const empty = { inserted: 0, updated: 0, unchanged: 0 };

async function logImport(benchmark: string, trigger: string, r: ImportResult) {
  const s = await accountsSql();
  await s`insert into app.benchmark_imports (benchmark, trigger, ok, message, dates, inserted, updated, unchanged) values (${benchmark}, ${trigger}, ${r.ok}, ${r.message}, ${JSON.stringify(r.dates)}::jsonb, ${r.inserted}, ${r.updated}, ${r.unchanged})`;
}

/** Fed curves: the latest complete days of PAR (required) and ZERO, saved all or nothing by the shared pipeline (100 bp jump guard, history kept). */
export async function ingestFed(p: FedParse, trigger: string, fetchedAt = new Date()): Promise<ImportResult> {
  await benchmarkTablesReady();
  if (p.errors.length) {
    const r: ImportResult = { ok: false, message: `Rejected, nothing saved: ${p.errors.slice(0, 3).join(" | ")}${p.errors.length > 3 ? ` (+${p.errors.length - 3} more)` : ""}`, dates: {}, ...empty };
    await logImport(US_TSY.benchmark, trigger, r); return r;
  }
  const curves = p.curves.map((c) => ({ curveType: c.curveType, date: c.date, values: c.values }));
  return ingestCurves(US_TSY, curves, trigger, fetchedAt);
}

/** Treasury published tenors (8 points per day) saved all or nothing, with the same jump guard on the tenors present. */
export async function ingestTreasury(p: TreasuryParse, trigger: string, fetchedAt = new Date()): Promise<ImportResult> {
  await benchmarkTablesReady();
  const T = US_TREASURY_DAILY, s = await accountsSql();
  const fail = async (message: string): Promise<ImportResult> => { const r: ImportResult = { ok: false, message, dates: {}, ...empty }; await logImport(T.benchmark, trigger, r); return r; };
  if (p.errors.length) return fail(`Rejected, nothing saved: ${p.errors.slice(0, 3).join(" | ")}`);
  const days = p.days.slice(-SAVE_DAYS);
  if (!days.length) return fail(`Rejected, nothing saved: no day with all ${TREASURY_TENORS.length} published tenors (${p.incompleteDays} incomplete)`);
  for (const d of days) {
    const [prev] = await s`select observation_date d from app.benchmark_curve where benchmark = ${T.benchmark} and curve_type = ${T.curveType} and observation_date < ${d.date} group by 1 order by 1 desc limit 1`;
    if (!prev) continue;
    const old = new Map((await s`select maturity_years, yield_percent from app.benchmark_curve where benchmark = ${T.benchmark} and curve_type = ${T.curveType} and observation_date = ${iso(prev.d)}`).map((r) => [Number(r.maturity_years), Number(r.yield_percent)]));
    const move = maxMoveBp(new Map([...d.values].map(([y, o]) => [y, o.value])), old);
    if (move > MAX_MOVE_BP) return fail(`Rejected, nothing saved: ${d.date} differs from saved ${iso(prev.d)} by ${move} bp at one tenor (limit ${MAX_MOVE_BP})`);
  }
  let inserted = 0, updated = 0, unchanged = 0;
  await s.begin(async (tx) => {
    const rows: { observation_date: string; maturity_years: number; yield_percent: number; series_id: string }[] = [];
    for (const d of days) {
      const old = new Map((await tx`select maturity_years, yield_percent from app.benchmark_curve where benchmark = ${T.benchmark} and curve_type = ${T.curveType} and observation_date = ${d.date}`).map((r) => [Number(r.maturity_years), Number(r.yield_percent)]));
      for (const y of TREASURY_TENORS) {
        const o = d.values.get(y)!;
        if (!old.has(y)) inserted++; else if (Math.abs(old.get(y)! - o.value) < 1e-9) { unchanged++; continue; } else updated++;
        rows.push({ observation_date: d.date, maturity_years: y, yield_percent: o.value, series_id: o.seriesId });
      }
    }
    if (rows.length) await tx`insert into app.benchmark_curve (benchmark, country, currency, curve_type, observation_date, maturity_years, yield_percent, source, series_id, fetched_at, status, basis)
      select ${T.benchmark}, ${T.country}, ${T.currency}, ${T.curveType}, t.observation_date, t.maturity_years, t.yield_percent, ${TREASURY_SOURCE}, t.series_id, ${fetchedAt}, 'valid', 'published'
      from jsonb_to_recordset(${tx.json(rows)}) as t(observation_date date, maturity_years smallint, yield_percent numeric, series_id text)
      on conflict (benchmark, curve_type, observation_date, maturity_years) do update set yield_percent = excluded.yield_percent, fetched_at = excluded.fetched_at`;
  });
  const r: ImportResult = { ok: true, dates: { [T.curveType]: days[days.length - 1].date }, inserted, updated, unchanged, message: `Saved Treasury published par yields up to ${days[days.length - 1].date} (${days.length} days): ${inserted} new, ${updated} revised, ${unchanged} unchanged` };
  await logImport(T.benchmark, trigger, r);
  return r;
}

export type UsImport = { ok: boolean; fed: ImportResult; treasury: ImportResult | null; message: string };

/** One run for the weekly job and "Refresh now": the Fed curves are required, the Treasury cross-check is independent (its failure is logged, the Fed save still stands). */
export async function ingestAll(fed: FedParse | Error, tsy: TreasuryParse | Error, trigger: string): Promise<UsImport> {
  const now = new Date();
  const fedR = fed instanceof Error
    ? await (async () => { await benchmarkTablesReady(); const r: ImportResult = { ok: false, message: `Not imported, saved curve kept: ${fed.message}`, dates: {}, ...empty }; await logImport(US_TSY.benchmark, trigger, r); return r; })()
    : await ingestFed(fed, trigger, now);
  const tsyR = tsy instanceof Error
    ? await (async () => { await benchmarkTablesReady(); const r: ImportResult = { ok: false, message: `Not imported, saved data kept: ${tsy.message}`, dates: {}, ...empty }; await logImport(US_TREASURY_DAILY.benchmark, trigger, r); return r; })()
    : await ingestTreasury(tsy, trigger, now);
  const message = `Federal Reserve: ${fedR.message}. Treasury: ${tsyR.message}.`;
  return { ok: fedR.ok, fed: fedR, treasury: tsyR, message };
}

// ---- reads (admin page; BES and Bond Card read the PAR curve for USD bonds) ----
export const getUsPar = (date?: string) => getCurve(US_TSY.benchmark, "PAR", date);
export const getUsZero = (date?: string) => getCurve(US_TSY.benchmark, "ZERO", date);

/** Plain {years, ytm} points of the USD benchmark (Fed fitted par yields, 1-30y); null when nothing is saved. Same shape as getBundBenchmarkPoints. */
export async function getUsBenchmarkPoints(): Promise<{ asOf: string; points: { years: number; ytm: number }[] } | null> {
  const c = await getUsPar();
  return c ? { asOf: c.asOf, points: c.points.map((p) => ({ years: p.years, ytm: p.yield })) } : null;
}

export type Selected = { asOf: string; previousAsOf: string | null; fetchedAt: string; points: CurvePoint[] };
/** Latest day with all published tenors, with the day a week earlier. Only the 8 published tenors; nothing is interpolated. */
export async function getTreasurySelected(date?: string): Promise<Selected | null> {
  await benchmarkTablesReady();
  const T = US_TREASURY_DAILY, s = await accountsSql(), n = TREASURY_TENORS.length;
  const [d] = date
    ? await s`select observation_date d from app.benchmark_curve where benchmark = ${T.benchmark} and observation_date = ${date} group by 1 having count(*) = ${n}`
    : await s`select observation_date d from app.benchmark_curve where benchmark = ${T.benchmark} group by 1 having count(*) = ${n} order by 1 desc limit 1`;
  if (!d) return null;
  const asOf = iso(d.d);
  const load = async (day: string) => await s`select maturity_years, yield_percent, fetched_at from app.benchmark_curve where benchmark = ${T.benchmark} and observation_date = ${day} order by maturity_years`;
  const rows = await load(asOf);
  const [w] = await s`select observation_date d from app.benchmark_curve where benchmark = ${T.benchmark} and observation_date <= (${asOf}::date - 7) group by 1 having count(*) = ${n} order by 1 desc limit 1`;
  const prev = w ? new Map((await load(iso(w.d))).map((r) => [Number(r.maturity_years), Number(r.yield_percent)])) : null;
  const cur = new Map(rows.map((r) => [Number(r.maturity_years), Number(r.yield_percent)]));
  const points = TREASURY_TENORS.map((y) => { const v = cur.get(y)!, p = prev?.get(y) ?? null; return { years: y, yield: v, previous: p, changeBp: p === null ? null : Math.round((v - p) * 100) }; });
  return { asOf, previousAsOf: w ? iso(w.d) : null, fetchedAt: new Date(rows[0].fetched_at).toISOString(), points };
}

export async function usDashboard(now = new Date()) {
  const base = await benchmarkStatus(US_TSY.benchmark, "PAR", "ZERO", now);
  const s = await accountsSql();
  const treasury = await getTreasurySelected();
  const tImports = await s`select id, started_at, trigger, ok, message from app.benchmark_imports where benchmark = ${US_TREASURY_DAILY.benchmark} order by id desc limit 4`;
  const [tLast] = await s`select ok from app.benchmark_imports where benchmark = ${US_TREASURY_DAILY.benchmark} order by id desc limit 1`;
  const par: Curve | null = base.primary;
  // Same-date comparison only: when the Fed curve is older than the Treasury day, the saved Treasury day with the Fed's date is used if it exists.
  const sameDay = par ? await getTreasurySelected(par.asOf) : null;
  const comparison = par && sameDay ? { date: par.asOf, rows: compareBp(new Map(par.points.map((p) => [p.years, p.yield])), new Map(sameDay.points.map((p) => [p.years, p.yield]))) } : null;
  const fedOk = !base.imports.length || base.imports[0].ok;
  return { ...base, par, zero: base.secondary, status: usStatus(par?.asOf ?? null, par?.points.length ?? 0, !fedOk, now), treasury, treasuryFresh: treasuryFresh(treasury?.asOf ?? null, now),
    treasuryLastFailed: tLast ? !tLast.ok : false, treasuryImports: tImports, comparison, nextRefresh: nextRun(now).toISOString() };
}
export { withChange };
export type { DayCurve };
