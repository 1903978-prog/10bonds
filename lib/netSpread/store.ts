import { accountsConfigured, accountsSql } from "../accounts";
import { assignBondCodes, bondCodeTablesReady, codesFor } from "../bondCodes";
import { batchIdOf, besTablesReady, runBes } from "../bes/store";
import { RISK_MATRIX_VERSION } from "../riskMatrix";
import { buildAll, NS_METHOD, type BesBond, type PositionResult, type PreviousPortfolio, type Reference, type HorizonName } from "./build";
import { REFERENCE_POLICY } from "./reference";
import { HORIZON_NAMES } from "./build";
import { TERMS } from "../limits";
import type { BondSource } from "../bonds";
import { bandsKey } from "../riskBandsServe";
import { loadBandConfig, loadStoredBands } from "../riskBandsStore";

// Storage and daily run of Methodology 5 ("Portfolio Efficiency Optimization", owner brief 28/10/2026). Migration id: portfolio_efficiency_001 (additive tables
// app.pe_*). Written only by scripts/portfolio-efficiency.ts on a runner; the website only reads the published run. A run is published in ONE transaction
// after all 90 rows exist, so readers never see a half-written run; a position that failed keeps its last valid result, flagged stale.

export const FILTER = "EUR:100k";
let ready: Promise<void> | null = null;
export function peTablesReady(): Promise<void> {
  ready ??= (async () => {
    const s = await accountsSql();
    await bondCodeTablesReady();
    await besTablesReady();
    await s`create table if not exists app.pe_runs (
      id bigserial primary key, batch_id text not null, bes_run_id bigint, status text not null check (status in ('requested','running','published','failed','superseded')),
      trigger text not null, requested_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz, runtime_ms integer,
      method text, matrix_version text, reference_version text, filter_key text not null default 'EUR:100k', price_as_of timestamptz, stats jsonb, error text)`;
    await s`create table if not exists app.pe_positions (
      run_id bigint not null references app.pe_runs(id) on delete cascade, row_no smallint not null check (row_no between 1 and 90),
      horizon text not null, position smallint not null, duration_target numeric not null, allowed smallint[] not null,
      status text not null check (status in ('optimal','uncertified','infeasible','error')), data_status text not null,
      isins text[] not null default '{}', bond_codes text[] not null default '{}',
      ytm numeric(10,4), duration numeric(8,3), avg_risk numeric(5,2), risk_min smallint, risk_max smallint,
      gross_spread_bp numeric(10,2), credit_loss_bp numeric(10,2), net_spread_bp numeric(10,2), avg_bond_bes numeric(5,1),
      portfolio_bes numeric(5,1), portfolio_bes_status text not null, portfolio_bes_reason text, opportunity_pct numeric(5,1),
      candidates integer, solver_seconds numeric(8,1), repeat_of smallint, checks jsonb, bonds jsonb, previous jsonb,
      stale boolean not null default false, failure text, calculated_at timestamptz not null default now(),
      primary key (run_id, row_no), unique (run_id, horizon, position))`;
    await s`create table if not exists app.pe_reference_samples (
      version text not null, filter_key text not null, horizon text not null, position smallint not null, batch_id text not null,
      sampled_at timestamptz not null default now(), nets real[] not null, primary key (version, filter_key, horizon, position, batch_id))`;
    await s`create index if not exists pe_runs_status on app.pe_runs (status, id desc)`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

/** Bond-level figures of the published Bond Efficiency run for exactly this price batch, or null when that run is for other prices. */
export async function loadBes(batch: string): Promise<{ runId: number; bonds: Map<string, BesBond> } | null> {
  await peTablesReady();
  const s = await accountsSql();
  const [run] = await s`select id, batch_id from app.bes_runs where status = 'published' order by id desc limit 1`;
  if (!run || String(run.batch_id) !== batch) return null;
  const rows = await s`select isin, credit_adjusted_spread_bp, gross_spread_bp, annual_expected_loss_bp, efficiency_score, efficiency_status from app.bes_bonds where run_id = ${run.id} and credit_adjusted_spread_bp is not null`;
  const bonds = new Map<string, BesBond>();
  for (const r of rows) {
    const status = String(r.efficiency_status);
    bonds.set(String(r.isin), { isin: String(r.isin), netSpreadBp: Number(r.credit_adjusted_spread_bp), grossSpreadBp: Number(r.gross_spread_bp), annualLossBp: Number(r.annual_expected_loss_bp), bes: r.efficiency_score === null ? null : Number(r.efficiency_score), status: status === "limited" ? "limited" : "valid" });
  }
  return { runId: Number(run.id), bonds };
}

/** Reference samples of earlier price batches (never today's), per position. */
async function loadReference(batch: string): Promise<(h: HorizonName, p: number) => Reference> {
  const s = await accountsSql();
  const rows = await s`select horizon, position, batch_id, nets from app.pe_reference_samples where version = ${REFERENCE_POLICY.version} and filter_key = ${FILTER} and batch_id <> ${batch}`;
  const m = new Map<string, { days: Set<string>; samples: number[] }>();
  for (const r of rows) {
    const k = `${r.horizon}:${r.position}`;
    const e = m.get(k) ?? m.set(k, { days: new Set(), samples: [] }).get(k)!;
    e.days.add(String(r.batch_id));
    for (const x of r.nets as number[]) e.samples.push(Number(x));
  }
  return (h, p) => { const e = m.get(`${h}:${p}`); return e ? { days: e.days.size, samples: e.samples } : null; };
}

/** The earlier methodology's published portfolios (Efficient Database), as ISIN lists per horizon and position, for the old-versus-new table. */
async function loadPrevious(src: BondSource): Promise<Map<string, PreviousPortfolio>> {
  const s = await accountsSql();
  const out = new Map<string, PreviousPortfolio>();
  // Positions the published snapshot does not hold (it needs 90/90) fall back to the stored lists of the live methodology for this price batch.
  const f = { currency: "EUR", size: "100k" } as const;
  const cfg = await loadBandConfig();
  for (const t of TERMS) {
    const got = await loadStoredBands(bandsKey(src, f, t.duration, cfg));
    if (!got) continue;
    for (const b of got.data.bands) if (b.status === "ok") out.set(`${HORIZON_NAMES[t.key]}:${b.k}`, { isins: [...b.isins], source: `stored lists of the live methodology${got.stale ? " (older prices)" : ""}` });
  }
  const [snap] = await s`select id, methodology from app.efficient_portfolio_snapshots where filter_key = ${FILTER} and status = 'published'`.catch(() => []);
  if (!snap) return out;
  const seen = new Set<string>();
  const rows = await s`select r.horizon, r.position, h.isin from app.efficient_portfolio_positions r join app.efficient_portfolio_holdings h on h.snapshot_id = r.snapshot_id and h.portfolio_id = r.portfolio_id and h.horizon = r.horizon where r.snapshot_id = ${snap.id} order by r.row_no, h.ord`;
  for (const r of rows) {
    const k = `${r.horizon}:${r.position}`;
    if (!seen.has(k)) { seen.add(k); out.set(k, { isins: [], source: `Efficient Database snapshot ${snap.id} (${snap.methodology})` }); }
    out.get(k)!.isins.push(String(r.isin));
  }
  return out;
}

export type PeRunResult = { status: "published" | "skipped" | "failed"; runId: number | null; message: string; stats?: Record<string, unknown> };

export async function runPe(src: BondSource, trigger: string, force = false, log: (m: string) => void = () => {}): Promise<PeRunResult> {
  await peTablesReady();
  const s = await accountsSql();
  const bonds = src.bonds;
  const batch = batchIdOf(bonds);
  let bes = await loadBes(batch);
  if (!bes) {
    log("Bond Efficiency run for this price batch missing: running it first");
    const r = await runBes(bonds, `pe-${trigger}`, false);
    if (r.status === "failed") return { status: "failed", runId: null, message: `Bond Efficiency run failed: ${r.message}` };
    bes = await loadBes(batch);
    if (!bes) return { status: "skipped", runId: null, message: "No Bond Efficiency run for this price batch yet; nothing optimised." };
  }
  const requested = await s`select id from app.pe_runs where status = 'requested' order by id`;
  const [done] = await s`select id from app.pe_runs where status = 'published' and batch_id = ${batch} and bes_run_id = ${bes.runId} and method = ${NS_METHOD} and matrix_version = ${RISK_MATRIX_VERSION} limit 1`;
  if (done && !requested.length && !force) return { status: "skipped", runId: Number(done.id), message: `Batch ${batch} already optimised (run #${done.id}).` };
  const [busy] = await s`select id from app.pe_runs where status = 'running' and started_at > now() - interval '60 minutes' limit 1`;
  if (busy) return { status: "skipped", runId: Number(busy.id), message: `Another optimisation is running (run #${busy.id}).` };
  await s`update app.pe_runs set status = 'failed', error = 'Interrupted', finished_at = now() where status = 'running'`;
  const t0 = Date.now();
  const [run] = await s`insert into app.pe_runs (batch_id, bes_run_id, status, trigger, started_at, method, matrix_version, reference_version, filter_key) values (${batch}, ${bes.runId}, 'running', ${requested.length ? "admin" : trigger}, now(), ${NS_METHOD}, ${RISK_MATRIX_VERSION}, ${REFERENCE_POLICY.version}, ${FILTER}) returning id`;
  const id = Number(run.id);
  try {
    await assignBondCodes();
    const [previous, reference, last] = await Promise.all([
      loadPrevious(src), loadReference(batch),
      s`select p.* from app.pe_positions p join app.pe_runs r on r.id = p.run_id where r.status = 'published' and p.stale = false and p.status in ('optimal','uncertified')`,
    ]);
    const results = await buildAll({ bonds, bes: bes.bonds, seedKey: batch, previous, reference, onProgress: (n) => { if (n % 10 === 0) log(`${n}/90 positions`); } });
    const codes = await codesFor([...new Set(results.flatMap((r) => r.isins))]);
    const lastBy = new Map(last.map((r) => [`${r.horizon}:${r.position}`, r]));
    const rows = results.map((r) => toDb(id, r, codes, lastBy.get(`${r.horizon}:${r.position}`)));
    await s.begin(async (tx) => {
      for (let i = 0; i < rows.length; i += 30) await tx`insert into app.pe_positions ${tx(rows.slice(i, i + 30) as never)}`;
    });
    const stats = statsOf(results);
    // Today's sample becomes history for later batches (a run is never compared with its own sample for the Portfolio BES).
    await s.begin(async (tx) => {
      for (const r of results) if (r.sample.length) await tx`insert into app.pe_reference_samples (version, filter_key, horizon, position, batch_id, nets) values (${REFERENCE_POLICY.version}, ${FILTER}, ${r.horizon}, ${r.position}, ${batch}, ${r.sample as never}) on conflict (version, filter_key, horizon, position, batch_id) do update set nets = excluded.nets, sampled_at = now()`;
      await tx`update app.pe_runs set status = 'superseded' where status = 'published' and filter_key = ${FILTER}`;
      await tx`update app.pe_runs set status = 'superseded', finished_at = now() where status = 'requested'`;
      await tx`update app.pe_runs set status = 'published', finished_at = now(), runtime_ms = ${Date.now() - t0}, price_as_of = ${bonds.reduce<string | null>((m, b) => (b.ytmAsOf && (!m || b.ytmAsOf > m) ? b.ytmAsOf : m), null)}, stats = ${tx.json(stats as never)} where id = ${id}`;
      await tx`delete from app.pe_runs where id not in (select id from app.pe_runs order by id desc limit 8) and status in ('superseded','failed')`;
    });
    return { status: "published", runId: id, message: `Run #${id}: ${stats.optimal}/90 proven optimal, ${stats.infeasible} infeasible, ${stats.errors} errors, ${stats.calibrated} with calibrated Portfolio BES.`, stats };
  } catch (e) {
    await s`update app.pe_runs set status = 'failed', finished_at = now(), error = ${(e as Error).message.slice(0, 500)} where id = ${id}`;
    return { status: "failed", runId: id, message: (e as Error).message };
  }
}

function statsOf(rs: PositionResult[]) {
  const done = rs.filter((r) => r.metrics);
  const imp = rs.filter((r) => r.previous?.reproducible && r.previous.feasibleUnderSameRules && r.previous.improvementBp != null).map((r) => r.previous!.improvementBp!).sort((a, b) => a - b);
  const avg = (xs: number[]) => (xs.length ? Math.round((100 * xs.reduce((s, x) => s + x, 0)) / xs.length) / 100 : null);
  return {
    total: rs.length, optimal: rs.filter((r) => r.status === "optimal").length, uncertified: rs.filter((r) => r.status === "uncertified").length,
    infeasible: rs.filter((r) => r.status === "infeasible").length, errors: rs.filter((r) => r.status === "error").length,
    calibrated: rs.filter((r) => r.portfolioBes.status === "calibrated").length, withoutCalibration: done.length - rs.filter((r) => r.portfolioBes.status === "calibrated").length,
    meanNetBp: avg(done.map((r) => r.metrics!.netSpreadBp)), solverSeconds: Math.round(rs.reduce((s, r) => s + r.seconds, 0) * 10) / 10,
    compared: imp.length, meanImprovementBp: avg(imp), medianImprovementBp: imp.length ? imp[Math.floor(imp.length / 2)] : null, maxImprovementBp: imp.length ? imp[imp.length - 1] : null,
    changed: rs.filter((r) => r.previous && (r.previous.added.length || r.previous.removed.length)).length,
    regressions: rs.filter((r) => r.previous?.regression).map((r) => `${r.horizon}:${r.position}`),
  };
}

const toDb = (run: number, r: PositionResult, codes: Map<string, string>, prev: Record<string, unknown> | undefined) => {
  // A position that could not be solved keeps its last valid result, marked stale with the reason; it is never shown as current.
  if (r.status === "error" && prev) {
    return { ...prev, run_id: run, row_no: r.rowNo, stale: true, failure: r.failure, calculated_at: prev.calculated_at };
  }
  const m = r.metrics;
  return {
    run_id: run, row_no: r.rowNo, horizon: r.horizon, position: r.position, duration_target: r.duration, allowed: r.allowed, status: r.status, data_status: r.dataStatus,
    isins: r.isins, bond_codes: r.isins.map((i) => codes.get(i) ?? ""), ytm: m?.ytm ?? null, duration: m?.duration ?? null, avg_risk: m?.avgRisk ?? null, risk_min: m?.minRisk ?? null, risk_max: m?.maxRisk ?? null,
    gross_spread_bp: m?.grossSpreadBp ?? null, credit_loss_bp: m?.creditLossBp ?? null, net_spread_bp: m?.netSpreadBp ?? null, avg_bond_bes: m?.avgBondBes ?? null,
    portfolio_bes: r.portfolioBes.score, portfolio_bes_status: r.portfolioBes.status, portfolio_bes_reason: r.portfolioBes.reason, opportunity_pct: r.opportunityPct,
    candidates: r.candidates, solver_seconds: r.seconds, repeat_of: r.repeatOf, checks: JSON.stringify(r.checks), bonds: JSON.stringify(r.bonds), previous: r.previous ? JSON.stringify(r.previous) : null,
    stale: false, failure: r.failure,
  };
};

// ---- Reading (admin and the public figure) ----
export async function publishedRun() {
  if (!accountsConfigured()) return null;
  await peTablesReady();
  const s = await accountsSql();
  return (await s`select * from app.pe_runs where status = 'published' and filter_key = ${FILTER} order by id desc limit 1`)[0] ?? null;
}
export async function runPositions(runId: number) {
  const s = await accountsSql();
  return s`select * from app.pe_positions where run_id = ${runId} order by row_no`;
}
export async function recentRuns(limit = 10) {
  await peTablesReady();
  const s = await accountsSql();
  return s`select id, batch_id, status, trigger, requested_at, started_at, finished_at, runtime_ms, method, matrix_version, reference_version, error, stats from app.pe_runs order by id desc limit ${limit}`;
}
export async function requestRecalc(by: string) {
  await peTablesReady();
  const s = await accountsSql();
  const [open] = await s`select id from app.pe_runs where status in ('requested','running') limit 1`;
  if (open) return { ok: false as const, message: "A recalculation is already requested or running." };
  await s`insert into app.pe_runs (batch_id, status, trigger, method, filter_key) values ('requested', 'requested', ${`admin:${by}`}, ${NS_METHOD}, ${FILTER})`;
  return { ok: true as const, message: "Recalculation requested. It runs within about 3 hours (next scheduled job)." };
}
