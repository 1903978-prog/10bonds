import { createHash } from "node:crypto";
import { accountsConfigured, accountsSql } from "./accounts";
import { assignBondCodes, bondCodeTablesReady, codesFor } from "./bondCodes";
import { loadBondsFor } from "./bonds";
import type { BondFilter } from "./bondFilter";
import { signatureOf } from "./bestTable";
import { GROUP_TABLE_VERSION } from "./issuerGroups";
import { TERMS } from "./limits";
import { MAX_SPREAD } from "./riskWindow";
import { bondRisk } from "./ratings";
import { configSignature } from "./riskBands";
import { loadStoredBands } from "./riskBandsStore";
import { specConfig } from "./netSpread/config";
import { allowedFor, PORTFOLIO_SPEC } from "./portfolioSpec";
import { bandsKey } from "./riskBandsServe";
import type { StoredBands } from "./riskBandsBuild";
import type { SliderPosition } from "./sliderPortfolios";
import { assemble, EMPTY_POLICY, HORIZONS, METHOD_VERSION, snapshotProblems, type Assembled, type Horizon, type SnapshotRow } from "./sliderSnapshotBuild";

// The persistent 90-position slider database (owner, 28/10/2026). Migration id: efficient_portfolio_snapshots_001 (created additively, like the other
// app tables). A snapshot is built from the stored band lists in a few seconds (no solver), checked row by row, and published only when
// all 90 rows are valid. Publishing swaps the one active snapshot inside a single transaction, so readers never see old and new mixed.

export const MIGRATION_ID = "efficient_portfolio_snapshots_001";
export const filterKey = (f: Pick<BondFilter, "currency" | "size">) => `${f.currency}:${f.size}`;
export const DEFAULT_FILTER = { currency: "EUR", size: "100k" } as const;
const STALE_JOB_MS = 30 * 60_000;
const KEEP_INCOMPLETE = 10;

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await bondCodeTablesReady();
    await s`create table if not exists app.efficient_portfolio_migrations (id text primary key, applied_at timestamptz not null default now())`;
    await s`create table if not exists app.efficient_portfolio_snapshots (
      id bigserial primary key,
      batch_id text not null,
      input_fingerprint text not null,
      filter_key text not null,
      methodology text not null,
      empty_policy text not null,
      status text not null check (status in ('published','incomplete','superseded','failed')),
      data_as_of timestamptz,
      calculated_at timestamptz not null default now(),
      published_at timestamptz,
      runtime_ms integer,
      filled_count integer not null default 0,
      distinct_portfolios integer not null default 0,
      error text,
      report jsonb)`;
    await s`create unique index if not exists efficient_portfolio_snapshots_one_active on app.efficient_portfolio_snapshots (filter_key) where status = 'published'`;
    await s`create unique index if not exists efficient_portfolio_snapshots_once on app.efficient_portfolio_snapshots (input_fingerprint) where status <> 'failed'`;
    await s`create table if not exists app.efficient_portfolio_positions (
      snapshot_id bigint not null references app.efficient_portfolio_snapshots(id) on delete cascade,
      row_no smallint not null check (row_no between 1 and 90),
      horizon text not null check (horizon in ('SHORT','MEDIUM','LONG')),
      position smallint not null check (position between 1 and 30),
      duration_target numeric not null,
      avg_ytm numeric, avg_duration numeric, avg_risk numeric, expected_loss numeric, worst_risk numeric,
      risk_min smallint, risk_max smallint, risk_spread smallint, risk_consistency text check (risk_consistency in ('PASS','FAIL')),
      check (not filled or (risk_consistency = 'PASS' and risk_spread <= 2)),
      band_min numeric not null, band_max numeric not null,
      optimal boolean not null default false,
      filled boolean not null default false,
      status text,
      error text,
      portfolio_id text,
      shared_with smallint, mapped_from smallint,
      bond_1 text references app.bond_codes(bond_code), bond_2 text references app.bond_codes(bond_code), bond_3 text references app.bond_codes(bond_code), bond_4 text references app.bond_codes(bond_code), bond_5 text references app.bond_codes(bond_code), bond_6 text references app.bond_codes(bond_code), bond_7 text references app.bond_codes(bond_code), bond_8 text references app.bond_codes(bond_code), bond_9 text references app.bond_codes(bond_code), bond_10 text references app.bond_codes(bond_code),
      primary key (snapshot_id, row_no),
      unique (snapshot_id, horizon, position))`;
    await s`alter table app.efficient_portfolio_positions add column if not exists status text`;
    await s`create table if not exists app.efficient_portfolio_holdings (
      snapshot_id bigint not null references app.efficient_portfolio_snapshots(id) on delete cascade,
      portfolio_id text not null,
      horizon text not null,
      ord smallint not null,
      isin text not null,
      bond_code text references app.bond_codes(bond_code),
      issuer text, name text, currency text, coupon numeric, maturity text, rating text,
      ytm numeric, duration numeric, risk numeric, clean_price numeric, price_as_of text,
      primary key (snapshot_id, portfolio_id, horizon, ord))`;
    await s`create table if not exists app.efficient_portfolio_jobs (
      id bigserial primary key,
      snapshot_id bigint references app.efficient_portfolio_snapshots(id) on delete set null,
      trigger text not null,
      batch_id text,
      status text not null check (status in ('running','done','skipped','failed')),
      attempt integer not null default 1,
      started_at timestamptz not null default now(),
      finished_at timestamptz,
      message text,
      log jsonb)`;
    await s`insert into app.efficient_portfolio_migrations (id) values (${MIGRATION_ID}) on conflict do nothing`;
  })().catch((e) => { ready = null; throw e; });
  await ready;
  return s;
}

/** Creates the tables (repeatable); also called by the schema test. */
export const sliderTablesReady = async () => { await sql(); };

async function progress(jobId: number, message: string) {
  try { const s = await sql(); await s`update app.efficient_portfolio_jobs set message = ${message} where id = ${jobId} and status = 'running'`; } catch { /* progress is cosmetic */ }
}

const pidHash = (key: string) => createHash("sha1").update(key).digest("hex").slice(0, 16);

export type BuildResult = { status: "published" | "incomplete" | "skipped" | "failed"; snapshotId: number | null; message: string; filled: number; blockers: string[] };

/** Inputs of the current price batch: three stored sets (exact batch only) and the bond rows, or the reason they are not ready. */
async function inputs(f: Pick<BondFilter, "currency" | "size">) {
  const bf = { ...f } as BondFilter;
  const src = await loadBondsFor(bf);
  const cfg = specConfig();
  const sets: (StoredBands | null)[] = [];
  const notes: string[] = [];
  for (const t of TERMS) {
    const got = await loadStoredBands(bandsKey(src, bf, t.duration, cfg));
    if (!got) notes.push(`${t.key}: no stored lists`);
    else if (got.stale) notes.push(`${t.key}: stored lists are for older prices (precompute not run for this batch yet)`);
    sets.push(got && !got.stale ? got.data : null);
  }
  const batch = signatureOf(src);
  const fingerprint = [batch, configSignature(cfg), GROUP_TABLE_VERSION, METHOD_VERSION, EMPTY_POLICY, filterKey(f)].join("|");
  return { src, cfg, sets, notes, batch, fingerprint };
}

async function once(trigger: string, f: Pick<BondFilter, "currency" | "size">, force: boolean, attempt: number, jobId: number): Promise<BuildResult> {
  const s = await sql();
  const t0 = Date.now();
  const { src, cfg, sets, notes, batch, fingerprint } = await inputs(f);
  if (src.source !== "live") return { status: "skipped", snapshotId: null, message: "Sample data, not a real price batch", filled: 0, blockers: [] };
  await s`update app.efficient_portfolio_jobs set batch_id = ${batch} where id = ${jobId}`;
  // The automatic run waits until the precompute job has saved the lists of this exact batch; it never saves a half-ready snapshot.
  if (!force && notes.length) return { status: "skipped", snapshotId: null, message: `Waiting for the stored lists of this price batch (${notes.join("; ")})`, filled: 0, blockers: [] };
  const existing = await s`select id, status from app.efficient_portfolio_snapshots where input_fingerprint = ${fingerprint} and status <> 'failed'`;
  if (existing[0] && !(force && existing[0].status === "incomplete"))
    return { status: "skipped", snapshotId: Number(existing[0].id), message: `This price batch is already ${existing[0].status} (snapshot ${existing[0].id}); nothing to do`, filled: 0, blockers: [] };
  await progress(jobId, "Assigning bond codes");
  await assignBondCodes();
  const a: Assembled = assemble(sets, src.bonds, cfg, EMPTY_POLICY, (h) => { void progress(jobId, `${HORIZONS[h]} 30/30 checked`); });
  const codes = await codesFor([...new Set(a.rows.flatMap((r) => r.isins))]);
  const noCode = [...new Set(a.rows.flatMap((r) => r.isins).filter((i) => !codes.has(i)))];
  if (noCode.length) throw new Error(`${noCode.length} selected bonds have no bond code (${noCode.slice(0, 3).join(", ")}...)`);
  const problems = snapshotProblems(a.rows);
  const publish = problems.length === 0;
  const report = { problems, blockers: a.blockers, notes, attempt, bands: configSignature(cfg), spec: PORTFOLIO_SPEC.version, matrix: PORTFOLIO_SPEC.matrixVersion, repeats: a.rows.filter((r) => r.sharedWith !== null).map((r) => `${r.horizon}:${r.position}=${r.sharedWith}`) };
  const byIsin = new Map(src.bonds.map((b) => [b.isin, b]));
  const id = await s.begin(async (tx) => {
    if (existing[0]) await tx`delete from app.efficient_portfolio_snapshots where id = ${existing[0].id}`;
    const ins = await tx`insert into app.efficient_portfolio_snapshots (batch_id, input_fingerprint, filter_key, methodology, empty_policy, status, data_as_of, runtime_ms, filled_count, distinct_portfolios, error, report)
      values (${batch}, ${fingerprint}, ${filterKey(f)}, ${METHOD_VERSION}, ${EMPTY_POLICY}, 'incomplete', ${src.asOf}, ${Date.now() - t0}, ${a.filled}, ${a.distinct}, ${publish ? null : problems.concat(notes).join(" | ")}, ${tx.json(report as never)})
      on conflict do nothing returning id`;
    if (!ins[0]) return null; // another run saved the same batch a moment ago
    const sid = Number(ins[0].id);
    const rows = a.rows.map((r) => ({ snapshot_id: sid, row_no: r.rowNo, horizon: r.horizon, position: r.position, duration_target: r.durationTarget, avg_ytm: r.ytm, avg_duration: r.duration, avg_risk: r.risk, risk_min: r.riskMin, risk_max: r.riskMax, risk_spread: r.riskSpread, risk_consistency: r.riskConsistency, expected_loss: r.expectedLoss, worst_risk: r.worstRisk, band_min: r.bandMin, band_max: r.bandMax, optimal: r.optimal, filled: r.filled, status: r.status, error: r.error, portfolio_id: r.portfolioId ? pidHash(r.horizon + r.portfolioId) : null, shared_with: r.sharedWith, mapped_from: r.mappedFrom, ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`bond_${i + 1}`, [...r.isins].map((x) => codes.get(x)!).sort()[i] ?? null])) }));
    await tx`insert into app.efficient_portfolio_positions ${tx(rows)}`;
    const seen = new Set<string>();
    const hold: Record<string, unknown>[] = [];
    for (const r of a.rows) {
      if (!r.portfolioId) continue;
      const pid = pidHash(r.horizon + r.portfolioId);
      if (seen.has(r.horizon + pid)) continue;
      seen.add(r.horizon + pid);
      r.isins.forEach((isin, ord) => {
        const b = byIsin.get(isin)!;
        hold.push({ snapshot_id: sid, portfolio_id: pid, horizon: r.horizon, ord: ord + 1, isin, bond_code: codes.get(isin), issuer: b.issuer, name: b.name, currency: b.currency, coupon: b.coupon, maturity: b.maturity, rating: b.ratingResolved, ytm: b.grossYtm, duration: b.modifiedDuration, risk: bondRisk(b), clean_price: b.cleanPrice ?? null, price_as_of: b.ytmAsOf });
      });
    }
    if (hold.length) await tx`insert into app.efficient_portfolio_holdings ${tx(hold as never)}`;
    if (publish) {
      await tx`update app.efficient_portfolio_snapshots set status = 'superseded' where filter_key = ${filterKey(f)} and status = 'published'`;
      await tx`update app.efficient_portfolio_snapshots set status = 'published', published_at = now() where id = ${sid}`;
    }
    await tx`delete from app.efficient_portfolio_snapshots where status = 'incomplete' and filter_key = ${filterKey(f)} and id not in (select id from app.efficient_portfolio_snapshots where status = 'incomplete' and filter_key = ${filterKey(f)} order by id desc limit ${KEEP_INCOMPLETE})`;
    return sid;
  });
  if (id === null) return { status: "skipped", snapshotId: null, message: "The same price batch was saved by another run", filled: 0, blockers: [] };
  await s`update app.efficient_portfolio_jobs set snapshot_id = ${id} where id = ${jobId}`;
  active.delete(filterKey(f));
  return publish
    ? { status: "published", snapshotId: id, message: `Published snapshot ${id}: ${a.filled}/90 valid, ${a.rows.filter((r) => r.status === "INFEASIBLE").length} infeasible (no list exists under the approved rules)`, filled: a.filled, blockers: [] }
    : { status: "incomplete", snapshotId: id, message: `Not published: ${a.filled}/90 valid, ${a.rows.filter((r) => r.status === "ERROR" || r.status === "PENDING").length} unresolved. The previous snapshot (if any) stays active.`, filled: a.filled, blockers: [...a.blockers, ...notes] };
}

const transient = (e: unknown) => /timeout|ECONN|terminat|reset|too many|57P0|08\d\d\d|53300/i.test((e as Error)?.message ?? "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One build for the current price batch: idempotent (the same batch is never saved twice), restartable (a run that died is marked failed after
 * 30 minutes and the next run starts fresh), retried on transient database errors, and it never touches the active snapshot unless all 90 rows pass.
 * `force` re-checks a batch whose snapshot is incomplete (after the precompute job filled the missing lists).
 */
export async function buildSnapshot(trigger: "auto" | "admin" | "script", f: Pick<BondFilter, "currency" | "size"> = DEFAULT_FILTER, force = false): Promise<BuildResult> {
  if (!accountsConfigured()) return { status: "skipped", snapshotId: null, message: "Database not connected", filled: 0, blockers: [] };
  const s = await sql();
  await s`update app.efficient_portfolio_jobs set status = 'failed', finished_at = now(), message = 'Run interrupted (server restart or timeout)' where status = 'running' and started_at < now() - ${STALE_JOB_MS / 1000} * interval '1 second'`;
  const running = await s`select id from app.efficient_portfolio_jobs where status = 'running' limit 1`;
  if (running[0]) return { status: "skipped", snapshotId: null, message: "Another build is running", filled: 0, blockers: [] };
  const job = await s`insert into app.efficient_portfolio_jobs (trigger, status) values (${trigger}, 'running') returning id`;
  const jobId = Number(job[0].id);
  let last = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await once(trigger, f, force, attempt, jobId);
      await s`update app.efficient_portfolio_jobs set status = ${r.status === "failed" ? "failed" : r.status === "skipped" ? "skipped" : "done"}, attempt = ${attempt}, finished_at = now(), message = ${r.message}, log = ${s.json({ blockers: r.blockers, filled: r.filled } as never)} where id = ${jobId}`;
      return r;
    } catch (e) {
      last = (e as Error).message;
      console.error(`[slider-snapshot] attempt ${attempt} failed:`, last);
      if (!transient(e) || attempt === 3) break;
      await sleep(2000 * 2 ** (attempt - 1));
    }
  }
  await s`update app.efficient_portfolio_jobs set status = 'failed', finished_at = now(), message = ${last} where id = ${jobId}`;
  return { status: "failed", snapshotId: null, message: last, filled: 0, blockers: [] };
}

// ---- Reading ----

export type ActiveSnapshot = {
  id: number; batchId: string; dataAsOf: string | null; publishedAt: string; methodology: string;
  horizons: Record<"short" | "mid" | "long", SliderPosition[]>;
};
const KEYS = ["short", "mid", "long"] as const;
const active = new Map<string, { at: number; id: number; v: ActiveSnapshot }>();
const CHECK_MS = 20_000;

const toPosition = (r: Record<string, unknown>, isins: string[]): SliderPosition => {
  const ok = r.filled === true && r.avg_ytm !== null;
  const k = Number(r.position);
  return {
    position: k, target: null,
    query: ok ? { ytm: Number(r.avg_ytm), risk: 10, guard: true, band: k } : null,
    ytm: ok ? Number(r.avg_ytm) : null, expectedLoss: ok ? Number(r.expected_loss) : null, avgRisk: ok ? Math.round(Number(r.avg_risk) * 10) / 10 : null,
    worstRisk: ok ? Number(r.worst_risk) : null, isins, sameAs: ok && r.shared_with != null ? Number(r.shared_with) : null, unavailable: !ok,
    riskMin: ok ? Number(r.risk_min) : null, riskMax: ok ? Number(r.risk_max) : null,
    band: { min: Number(r.band_min), max: Number(r.band_max) }, optimal: ok ? r.optimal === true : undefined,
    classes: [...allowedFor(k)], slot: k,
  };
};

/** The published snapshot for a filter as slider positions per horizon (ISINs left empty), or null when none is published. Kept in memory per server and re-checked every 20 s. */
export async function activeSnapshot(f: Pick<BondFilter, "currency" | "size">): Promise<ActiveSnapshot | null> {
  if (!accountsConfigured()) return null;
  const key = filterKey(f);
  const hit = active.get(key);
  if (hit && Date.now() - hit.at < CHECK_MS) return hit.v;
  try {
    const s = await sql();
    const head = await s`select id, batch_id, data_as_of, published_at, methodology from app.efficient_portfolio_snapshots where filter_key = ${key} and status = 'published'`;
    if (!head[0]) { active.delete(key); return null; }
    const id = Number(head[0].id);
    if (hit && hit.id === id) { hit.at = Date.now(); return hit.v; }
    const rows = await s`select * from app.efficient_portfolio_positions where snapshot_id = ${id} order by row_no`;
    // Served only if every position still passes today's rules (a snapshot from before a rule, or edited, is never shown); the older one stays for diagnostics.
    const badRow = (r: Record<string, unknown>) => r.status === "INFEASIBLE" ? r.filled === true
      : r.status !== "VALID" || r.filled !== true || r.risk_consistency !== "PASS" || Number(r.risk_spread) > MAX_SPREAD || Number(r.risk_max) - Number(r.risk_min) > MAX_SPREAD;
    if (rows.length !== 90 || rows.some(badRow)) {
      console.error(`[slider-snapshot] snapshot ${id} fails the current rules; not served`);
      active.delete(key);
      return null;
    }
    const horizons = { short: [], mid: [], long: [] } as unknown as ActiveSnapshot["horizons"];
    for (const r of rows) horizons[KEYS[HORIZONS.indexOf(r.horizon as Horizon)]].push(toPosition(r, []));
    const v: ActiveSnapshot = { id, batchId: String(head[0].batch_id), dataAsOf: head[0].data_as_of ? new Date(head[0].data_as_of as string).toISOString() : null, publishedAt: new Date(head[0].published_at as string).toISOString(), methodology: String(head[0].methodology), horizons };
    active.set(key, { at: Date.now(), id, v });
    return v;
  } catch (e) {
    console.error("[slider-snapshot] read failed:", (e as Error).message);
    return hit?.v ?? null;
  }
}

/** Admin: the ISINs per position of the active snapshot (public readers get none). */
export async function holdingsOf(snapshotId: number): Promise<Map<string, string[]>> {
  const s = await sql();
  const rows = await s`select r.horizon, r.position, h.isin from app.efficient_portfolio_positions r join app.efficient_portfolio_holdings h on h.snapshot_id = r.snapshot_id and h.portfolio_id = r.portfolio_id and h.horizon = r.horizon where r.snapshot_id = ${snapshotId} order by r.row_no, h.ord`;
  const m = new Map<string, string[]>();
  for (const r of rows) { const k = `${r.horizon}:${r.position}`; (m.get(k) ?? m.set(k, []).get(k)!).push(String(r.isin)); }
  return m;
}

export async function snapshotList(limit = 30) {
  const s = await sql();
  return s`select id, batch_id, filter_key, status, methodology, empty_policy, data_as_of, calculated_at, published_at, runtime_ms, filled_count, distinct_portfolios, error from app.efficient_portfolio_snapshots order by id desc limit ${limit}`;
}
export async function snapshotRows(id: number) {
  const s = await sql();
  return s`select * from app.efficient_portfolio_positions where snapshot_id = ${id} order by row_no`;
}
export async function snapshotReport(id: number) {
  const s = await sql();
  return (await s`select report from app.efficient_portfolio_snapshots where id = ${id}`)[0]?.report ?? null;
}
export async function rowDetail(id: number, rowNo: number) {
  const s = await sql();
  const r = (await s`select * from app.efficient_portfolio_positions where snapshot_id = ${id} and row_no = ${rowNo}`)[0];
  if (!r) return null;
  const bonds = r.portfolio_id ? await s`select ord, isin, issuer, name, currency, coupon, maturity, rating, ytm, duration, risk, clean_price, price_as_of from app.efficient_portfolio_holdings where snapshot_id = ${id} and portfolio_id = ${r.portfolio_id} and horizon = ${r.horizon} order by ord` : [];
  const snap = (await s`select batch_id, methodology, calculated_at, data_as_of from app.efficient_portfolio_snapshots where id = ${id}`)[0];
  const shared = r.portfolio_id ? await s`select position from app.efficient_portfolio_positions where snapshot_id = ${id} and horizon = ${r.horizon} and portfolio_id = ${r.portfolio_id} and row_no <> ${rowNo} order by position` : [];
  return { row: r, bonds, snapshot: snap, sharedWith: shared.map((x) => Number(x.position)) };
}
export async function jobHistory(limit = 40) {
  const s = await sql();
  return s`select id, snapshot_id, trigger, batch_id, status, attempt, started_at, finished_at, message, log from app.efficient_portfolio_jobs order by id desc limit ${limit}`;
}
export async function lastPriceBatch() {
  const s = await sql();
  const r = await s`select batch_id, data_as_of, calculated_at from app.efficient_portfolio_snapshots order by id desc limit 1`;
  return r[0] ?? null;
}

export type { SnapshotRow };
