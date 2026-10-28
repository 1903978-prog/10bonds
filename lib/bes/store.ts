import { accountsSql } from "../accounts";
import type { PublicBond } from "../types";
import { setOfficialBenchmark } from "./benchmarkTables";
import { BES_METHOD, BES_REFERENCE_VERSION, benchmarkReport, calculateBes, type BesRow } from "./calc";
import { SP_CORPORATE, SP_CORPORATE_SOURCE, SP_CORPORATE_VERSION, SP_CORPORATE_YEARS } from "./spReference";
import { SOVEREIGN_RATES, SOVEREIGN_YEARS } from "../sovereign";
import { DEFAULT_RATES, DEFAULT_YEARS } from "../seo/defaultRates";

// Storage of Bond Efficiency runs (migration id: bond_efficiency_001, additive). The website only READS the published run; runs are written by
// scripts/bes-run.ts on a runner (never in the web process). A run is published in one transaction after all rows are inserted, so readers never
// see a half-written run and the previous published run stays available meanwhile.

let ready: Promise<void> | null = null;
export function besTablesReady(): Promise<void> {
  ready ??= (async () => {
    const s = await accountsSql();
    await s`create table if not exists app.bes_runs (
      id bigserial primary key, batch_id text not null, status text not null check (status in ('requested','running','published','failed','superseded')),
      trigger text not null, requested_by text, requested_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz,
      runtime_ms integer, method text, reference_version text, price_as_of timestamptz, stats jsonb, error text)`;
    await s`create table if not exists app.bes_bonds (
      run_id bigint not null references app.bes_runs(id) on delete cascade, isin text not null, bond_code text,
      risk_class smallint, rating_equivalent text, currency text, issuer_type text, sector text, rank text,
      years_left numeric(8,4), ytm numeric(10,4), benchmark_yield numeric(10,4), benchmark_source text, gross_spread_bp numeric(10,2),
      cumulative_pd numeric(12,8), annual_equivalent_pd numeric(12,8), lgd numeric(6,4), cumulative_loss numeric(12,8), annual_expected_loss_bp numeric(10,2),
      benchmark_loss_bp numeric(10,2), liquidity_cost_bp numeric(10,2), credit_adjusted_spread_bp numeric(10,2), fully_adjusted_spread_bp numeric(10,2),
      sp_cumulative_pd numeric(12,8), peer_group text, efficiency_peer_count integer, efficiency_score numeric(5,1), efficiency_status text not null,
      notes text[], primary key (run_id, isin))`;
    await s`create index if not exists bes_bonds_status on app.bes_bonds (run_id, efficiency_status)`;
    await s`create index if not exists bes_runs_status on app.bes_runs (status, id desc)`;
    await s`create table if not exists app.historical_default_probabilities (
      data_version text not null, source_agency text not null, report_title text not null, published date, observation_period text, issuer_category text not null,
      currency_obligation text, rating_category text not null, horizon_years integer not null, cumulative_pd numeric(10,6) not null, table_id text,
      source_url text, validation_status text not null, usage_rights text not null, primary key (data_version, issuer_category, rating_category, horizon_years))`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

/** Writes the versioned PD reference rows (idempotent). Customers never see them. */
export async function loadPdReference(): Promise<number> {
  await besTablesReady();
  const s = await accountsSql();
  const rows: Record<string, unknown>[] = [];
  const src = SP_CORPORATE_SOURCE;
  for (const [cat, pct] of SP_CORPORATE) SP_CORPORATE_YEARS.forEach((h, i) => rows.push({ data_version: SP_CORPORATE_VERSION, source_agency: src.agency, report_title: src.report, published: src.published, observation_period: src.period, issuer_category: "corporate", currency_obligation: null, rating_category: cat, horizon_years: h, cumulative_pd: pct[i] / 100, table_id: "Table 24", source_url: src.url, validation_status: "verified against source PDF 28/10/2026 (1/5/10-year anchors match the brief)", usage_rights: src.usageRights }));
  for (const [cat, pct] of SOVEREIGN_RATES) SOVEREIGN_YEARS.forEach((h, i) => rows.push({ data_version: "sp-sov-fc-2025-t16", source_agency: "S&P Global Ratings", report_title: "2025 Annual Global Sovereign Default and Rating Transition Study", published: "2026-03-04", observation_period: "1975-2025", issuer_category: "sovereign", currency_obligation: "foreign-currency", rating_category: cat, horizon_years: h, cumulative_pd: pct[i] / 100, table_id: "Table 16", source_url: "https://www.spglobal.com/ratings/en/regulatory/article/-/view/sourceId/101672087", validation_status: "supplied by the owner 27/10/2026, not re-verified against the PDF (source blocked from the sandbox)", usage_rights: "unresolved - internal use only" }));
  for (const [cat, , pct] of DEFAULT_RATES) DEFAULT_YEARS.forEach((h, i) => rows.push({ data_version: "combined-2026-10", source_agency: "10BONDS combined from public historical default studies", report_title: "lib/seo/defaultRates.ts", published: null, observation_period: "see docs/handover/default-rates.md", issuer_category: "corporate", currency_obligation: null, rating_category: cat, horizon_years: h, cumulative_pd: pct[i] / 100, table_id: null, source_url: null, validation_status: "in production use (this is the table BES uses)", usage_rights: "own derived table, customer wording: based on public historical default studies" }));
  for (let i = 0; i < rows.length; i += 500) {
    await s`insert into app.historical_default_probabilities ${s(rows.slice(i, i + 500))} on conflict (data_version, issuer_category, rating_category, horizon_years) do update set cumulative_pd = excluded.cumulative_pd, validation_status = excluded.validation_status`;
  }
  return rows.length;
}

export const batchIdOf = (bonds: PublicBond[]): string => {
  const newest = bonds.reduce<string | null>((m, b) => (b.ytmAsOf && (!m || b.ytmAsOf > m) ? b.ytmAsOf : m), null);
  return `${newest ?? "none"}|${bonds.length}`;
};

export type RunResult = { status: "published" | "skipped" | "failed"; runId: number | null; message: string; counts?: Record<string, number> };

/** Official benchmark curves saved by the import jobs replace the owner's tables; if one is missing the owner's table stays as the flagged fallback. */
async function loadOfficialBenchmarks(): Promise<void> {
  try {
    const { getBundBenchmarkPoints } = await import("../bundCurve/store");
    const c = await getBundBenchmarkPoints();
    if (c && c.points.length === 30) setOfficialBenchmark("EUR", c.asOf, c.points, "Deutsche Bundesbank annual-coupon Bund yields (BBSIS ZAR)", "bundesbank-zar");
  } catch (e) { console.error("[bes] official Bund curve not available, using the fallback table:", (e as Error).message); }
  try {
    const { getUsBenchmarkPoints } = await import("../usTreasury/store");
    const c = await getUsBenchmarkPoints();
    if (c && c.points.length === 30) setOfficialBenchmark("USD", c.asOf, c.points, "Federal Reserve fitted US Treasury par yields (SVENPY01-30)", "fed-par");
  } catch (e) { console.error("[bes] official US Treasury curve not available, using the interim table:", (e as Error).message); }
}

export async function runBes(bonds: PublicBond[], trigger: string, force = false): Promise<RunResult> {
  await besTablesReady();
  const s = await accountsSql();
  const batch = batchIdOf(bonds);
  const requested = await s`select id from app.bes_runs where status = 'requested' order by id`;
  const [done] = await s`select id from app.bes_runs where status = 'published' and batch_id = ${batch} and method = ${BES_METHOD} limit 1`;
  if (done && !requested.length && !force) return { status: "skipped", runId: Number(done.id), message: `Batch ${batch} already calculated (run #${done.id}).` };
  const t0 = Date.now();
  const [run] = await s`insert into app.bes_runs (batch_id, status, trigger, started_at, method, reference_version) values (${batch}, 'running', ${requested.length ? "admin" : trigger}, now(), ${BES_METHOD}, ${BES_REFERENCE_VERSION}) returning id`;
  const id = Number(run.id);
  try {
    await loadPdReference();
    await loadOfficialBenchmarks();
    const rows = calculateBes(bonds);
    // Permanent codes are assigned by the Efficient Database job; BES only reads them (null until a bond has one).
    const codes = new Map((await s`select isin, bond_code from app.bond_codes`.catch(() => [])).map((r) => [String(r.isin), String(r.bond_code)]));
    await s.begin(async (tx) => {
      for (let i = 0; i < rows.length; i += 400) {
        const chunk = rows.slice(i, i + 400).map((r) => toDb(id, r, codes.get(r.isin) ?? null));
        await tx`insert into app.bes_bonds ${tx(chunk)}`;
      }
    });
    const counts = { total: rows.length, valid: 0, limited: 0, unavailable: 0 };
    for (const r of rows) counts[r.status]++;
    const scored = rows.filter((r) => r.bes !== null);
    const nets = rows.map((r) => r.netSpreadBp).filter((x): x is number => x !== null).sort((a, b) => a - b);
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const med = (xs: number[]) => (xs.length ? xs[Math.floor(xs.length / 2)] : null);
    const bs = scored.map((r) => r.bes!).sort((a, b) => a - b);
    const newest = bonds.reduce<string | null>((m, b) => (b.ytmAsOf && (!m || b.ytmAsOf > m) ? b.ytmAsOf : m), null);
    const today = new Date().toISOString().slice(0, 10);
    const stats = { ...counts, benchmarks: benchmarkReport(bonds, rows, today), meanNetBp: mean(nets), medianNetBp: med(nets), meanBes: mean(bs), medianBes: med(bs), invalidInputs: rows.filter((r) => r.status === "unavailable" && r.notes.some((n) => /Stale|plausible|possible price error/.test(n))).length };
    await s.begin(async (tx) => {
      await tx`update app.bes_runs set status = 'superseded' where status = 'published'`;
      await tx`update app.bes_runs set status = 'superseded', finished_at = now() where status = 'requested'`;
      await tx`update app.bes_runs set status = 'published', finished_at = now(), runtime_ms = ${Date.now() - t0}, price_as_of = ${newest}, stats = ${tx.json(stats)} where id = ${id}`;
      await tx`delete from app.bes_runs where id not in (select id from app.bes_runs order by id desc limit 5) and status in ('superseded','failed')`;
    });
    return { status: "published", runId: id, message: `Run #${id}: ${counts.valid} valid, ${counts.limited} limited, ${counts.unavailable} unavailable of ${counts.total}.`, counts };
  } catch (e) {
    await s`update app.bes_runs set status = 'failed', finished_at = now(), error = ${(e as Error).message.slice(0, 500)} where id = ${id}`;
    return { status: "failed", runId: id, message: (e as Error).message };
  }
}

const toDb = (run: number, r: BesRow, code: string | null) => ({
  run_id: run, isin: r.isin, bond_code: code, risk_class: r.riskClass, rating_equivalent: r.ratingEquivalent, currency: r.currency, issuer_type: r.issuerType, sector: r.sector, rank: r.rank,
  years_left: r.yearsLeft, ytm: r.ytm, benchmark_yield: r.benchmarkYield, benchmark_source: r.benchmarkSource, gross_spread_bp: r.grossSpreadBp,
  cumulative_pd: r.cumulativePd, annual_equivalent_pd: r.annualPd, lgd: r.lgd, cumulative_loss: r.cumulativeLoss, annual_expected_loss_bp: r.annualLossBp,
  benchmark_loss_bp: r.benchmarkLossBp, liquidity_cost_bp: r.liquidityCostBp, credit_adjusted_spread_bp: r.netSpreadBp, fully_adjusted_spread_bp: r.fullyAdjustedBp,
  sp_cumulative_pd: r.spCumulativePd, peer_group: r.peerGroup, efficiency_peer_count: r.peerCount, efficiency_score: r.bes, efficiency_status: r.status, notes: r.notes,
});

/** Customer-safe read for the bond card: the score and its plain label only (no spreads, no default figures). */
export async function besPublic(codeOrIsin: string): Promise<{ score: number | null; status: string; label: string | null; peers: number } | null> {
  await besTablesReady();
  const s = await accountsSql();
  const [r] = await s`
    select b.efficiency_score, b.efficiency_status, b.efficiency_peer_count from app.bes_bonds b
    join app.bes_runs r on r.id = b.run_id and r.status = 'published'
    where b.isin = ${codeOrIsin} or b.bond_code = ${codeOrIsin} limit 1`;
  if (!r) return null;
  const score = r.efficiency_score === null ? null : Number(r.efficiency_score);
  const { besLabel } = await import("./math");
  return { score, status: String(r.efficiency_status), label: score === null ? null : besLabel(score), peers: Number(r.efficiency_peer_count) };
}
