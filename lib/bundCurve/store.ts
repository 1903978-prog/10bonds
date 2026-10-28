import { accountsSql } from "../accounts";
import { type CurvePoint, type CurveType, CURVE_TYPES, MATURITIES, MAX_MOVE_BP, SOURCE, completeCurves, curveStatus, latestComplete, maxMoveBp, nextRun, withChange, type ParseResult, type Status } from "./core";

// Storage of the official Bund curve (migration id: bund_curve_001, additive). One row per curve type, observation date and maturity; history is kept.
// A curve is written in one transaction, so readers see all 30 points of a date or none. A failed or invalid import never touches saved rows.
let ready: Promise<void> | null = null;
export function bundTablesReady(): Promise<void> {
  ready ??= (async () => {
    const s = await accountsSql();
    await s`create table if not exists app.bund_curve (
      curve_type text not null check (curve_type in ('ZAR','ZST')), observation_date date not null, maturity_years smallint not null check (maturity_years between 1 and 30),
      yield_percent numeric(8,4) not null, series_id text not null, source text not null, fetched_at timestamptz not null default now(), status text not null default 'valid',
      primary key (curve_type, observation_date, maturity_years))`;
    await s`create table if not exists app.bund_imports (
      id bigserial primary key, started_at timestamptz not null default now(), trigger text not null, ok boolean not null, message text not null,
      zar_date date, zst_date date, inserted integer not null default 0, updated integer not null default 0, unchanged integer not null default 0)`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

export type ImportResult = { ok: boolean; message: string; zarDate: string | null; zstDate: string | null; inserted: number; updated: number; unchanged: number };

const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

async function savedCurve(type: CurveType, date: string): Promise<Map<number, number>> {
  const s = await accountsSql();
  const rows = await s`select maturity_years, yield_percent from app.bund_curve where curve_type = ${type} and observation_date = ${date}`;
  return new Map(rows.map((r) => [Number(r.maturity_years), Number(r.yield_percent)]));
}
async function latestSavedBefore(type: CurveType, date: string): Promise<{ date: string; values: Map<number, number> } | null> {
  const s = await accountsSql();
  const [r] = await s`select observation_date d from app.bund_curve where curve_type = ${type} and observation_date < ${date} group by 1 having count(*) = 30 order by 1 desc limit 1`;
  return r ? { date: iso(r.d), values: await savedCurve(type, iso(r.d)) } : null;
}

async function log(trigger: string, r: ImportResult) {
  const s = await accountsSql();
  await s`insert into app.bund_imports (trigger, ok, message, zar_date, zst_date, inserted, updated, unchanged) values (${trigger}, ${r.ok}, ${r.message}, ${r.zarDate}, ${r.zstDate}, ${r.inserted}, ${r.updated}, ${r.unchanged})`;
}

/** The one pipeline for the weekly job, "Refresh now" and the manual CSV import. Saves the latest complete curve of each family, or nothing. */
export async function ingest(parsed: ParseResult, trigger: string, fetchedAt = new Date()): Promise<ImportResult> {
  await bundTablesReady();
  const fail = async (message: string): Promise<ImportResult> => { const r = { ok: false, message, zarDate: null, zstDate: null, inserted: 0, updated: 0, unchanged: 0 }; await log(trigger, r); return r; };
  if (parsed.errors.length) return fail(`Rejected, nothing saved: ${parsed.errors.slice(0, 3).join(" | ")}${parsed.errors.length > 3 ? ` (+${parsed.errors.length - 3} more)` : ""}`);
  const zar = latestComplete(parsed.obs, "ZAR");
  if (!zar) return fail(`Rejected, nothing saved: no date with all 30 annual-coupon maturities (${completeCurves(parsed.obs).length} complete days found)`);
  const picked = [zar, latestComplete(parsed.obs, "ZST")].filter((c): c is NonNullable<typeof c> => !!c);
  for (const c of picked) {
    const prev = await latestSavedBefore(c.type, c.date);
    if (prev) {
      const move = maxMoveBp(new Map([...c.values].map(([y, o]) => [y, o.value])), prev.values);
      if (move > MAX_MOVE_BP) return fail(`Rejected, nothing saved: ${c.type} ${c.date} differs from saved ${prev.date} by ${move} bp at one maturity (limit ${MAX_MOVE_BP})`);
    }
  }
  const s = await accountsSql();
  let inserted = 0, updated = 0, unchanged = 0;
  await s.begin(async (tx) => {
    for (const c of picked) {
      const old = new Map((await tx`select maturity_years, yield_percent from app.bund_curve where curve_type = ${c.type} and observation_date = ${c.date}`).map((r) => [Number(r.maturity_years), Number(r.yield_percent)]));
      for (const y of MATURITIES) {
        const o = c.values.get(y)!;
        if (!old.has(y)) inserted++; else if (Math.abs(old.get(y)! - o.value) < 1e-9) { unchanged++; continue; } else updated++;
        await tx`insert into app.bund_curve (curve_type, observation_date, maturity_years, yield_percent, series_id, source, fetched_at, status)
          values (${c.type}, ${c.date}, ${y}, ${o.value}, ${o.seriesId}, ${SOURCE}, ${fetchedAt}, 'valid')
          on conflict (curve_type, observation_date, maturity_years) do update set yield_percent = excluded.yield_percent, fetched_at = excluded.fetched_at`;
      }
    }
  });
  const zst = picked.find((c) => c.type === "ZST");
  const r: ImportResult = { ok: true, zarDate: zar.date, zstDate: zst?.date ?? null, inserted, updated, unchanged,
    message: `Saved ZAR ${zar.date}${zst ? `, ZST ${zst.date}` : " (no complete zero-coupon curve in this download)"}: ${inserted} new, ${updated} revised, ${unchanged} unchanged` };
  await log(trigger, r);
  return r;
}

// ---- reads (used by the admin page, the Knowledge page, Bond Efficiency and the admin Spread column) ----
export type Curve = { type: CurveType; asOf: string; fetchedAt: string; previousAsOf: string | null; points: CurvePoint[]; seriesIds: string[] };

/** Latest complete 30-point curve of a family (or the one for `date`), with the change against the curve a week earlier. Null when nothing is saved. */
export async function getBundCurve(type: CurveType = "ZAR", date?: string): Promise<Curve | null> {
  await bundTablesReady();
  const s = await accountsSql();
  const [d] = date
    ? await s`select observation_date d from app.bund_curve where curve_type = ${type} and observation_date = ${date} group by 1 having count(*) = 30`
    : await s`select observation_date d from app.bund_curve where curve_type = ${type} group by 1 having count(*) = 30 order by 1 desc limit 1`;
  if (!d) return null;
  const asOf = iso(d.d);
  const rows = await s`select maturity_years, yield_percent, series_id, fetched_at from app.bund_curve where curve_type = ${type} and observation_date = ${asOf} order by maturity_years`;
  const [w] = await s`select observation_date d from app.bund_curve where curve_type = ${type} and observation_date <= (${asOf}::date - 7) group by 1 having count(*) = 30 order by 1 desc limit 1`;
  const previousAsOf = w ? iso(w.d) : null;
  const prev = previousAsOf ? await savedCurve(type, previousAsOf) : null;
  return { type, asOf, previousAsOf, fetchedAt: new Date(rows[0].fetched_at).toISOString(), seriesIds: rows.map((r) => String(r.series_id)),
    points: withChange(new Map(rows.map((r) => [Number(r.maturity_years), Number(r.yield_percent)])), prev) };
}

/** Plain {years, ytm} points for lib/bundSpread.ts-style interpolation; null when no official curve is saved. */
export async function getBundBenchmarkPoints(): Promise<{ asOf: string; points: { years: number; ytm: number }[] } | null> {
  const c = await getBundCurve("ZAR");
  return c ? { asOf: c.asOf, points: c.points.map((p) => ({ years: p.years, ytm: p.yield })) } : null;
}

export async function bundStatus(now = new Date()) {
  await bundTablesReady();
  const s = await accountsSql();
  const zar = await getBundCurve("ZAR"), zst = await getBundCurve("ZST");
  const [last] = await s`select * from app.bund_imports order by id desc limit 1`;
  const [lastOk] = await s`select started_at from app.bund_imports where ok order by id desc limit 1`;
  const imports = await s`select id, started_at, trigger, ok, message from app.bund_imports order by id desc limit 8`;
  const dates = await s`select curve_type, count(distinct observation_date)::int n, min(observation_date) first, max(observation_date) last from app.bund_curve group by 1`;
  return { zar, zst, status: curveStatus(zar?.asOf ?? null, zar?.points.length ?? 0, last ? !last.ok : false, now) as Status,
    lastSuccess: lastOk ? new Date(lastOk.started_at).toISOString() : null, nextRefresh: nextRun(now).toISOString(), imports, history: dates };
}
export { CURVE_TYPES };
