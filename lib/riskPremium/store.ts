import { accountsConfigured, accountsSql } from "../accounts";
import { V1_CURVE, type CurveConfig, type CurveRating } from "./curve";
import { activationProblems, type CurveVersion, type VersionStatus } from "./versions";
import type { Evaluation } from "./evaluate";
import { cleanSd, OUTLIER_SD } from "../outliers";
import { cleanMatrix, setSpreadMatrix, type SpreadMatrix } from "../stepGap";

// Risk premium model data in schema "app": curve versions, the audit trail of every change, admin decisions on
// exceptional spreads, and recorded calculation runs (every evaluated bond with the version it used).
// Version 1.0 is seeded once as the active version. Active and archived versions are never edited or deleted;
// changes are new drafts, which only take effect when the admin activates them.

type Sql = Awaited<ReturnType<typeof accountsSql>>;

let ready: Promise<void> | null = null;
async function db(): Promise<Sql> {
  const s = await accountsSql();
  ready ??= setup(s).catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

/** For the schema test: builds the tables. */
export async function riskTablesReady() {
  await db();
}

async function setup(s: Sql) {
  await s`
    create table if not exists app.risk_premium_versions (
      id bigserial primary key,
      version text not null unique,
      status text not null default 'draft' check (status in ('draft','active','archived')),
      currency text not null default 'EUR',
      issuer_category text not null default 'corporate',
      min_maturity numeric not null,
      max_maturity numeric not null,
      floor text not null,
      exceptional_bp numeric not null,
      premiums jsonb not null,
      notes text,
      justification text,
      created_at timestamptz not null default now(),
      created_by text,
      activated_at timestamptz,
      activated_by text
    )`;
  await s`create unique index if not exists risk_premium_one_active on app.risk_premium_versions ((status)) where status = 'active'`;
  await s`
    create table if not exists app.risk_premium_audit (
      id bigserial primary key,
      at timestamptz not null default now(),
      by_email text not null,
      version_id bigint,
      action text not null,
      justification text,
      detail jsonb
    )`;
  await s`
    create table if not exists app.risk_spread_reviews (
      id bigserial primary key,
      isin text not null,
      decision text not null check (decision in ('approved','rejected')),
      note text not null,
      by_email text not null,
      at timestamptz not null default now(),
      version_id bigint
    )`;
  await s`create index if not exists risk_spread_reviews_isin on app.risk_spread_reviews (isin, at desc)`;
  await s`
    create table if not exists app.risk_calc_runs (
      id bigserial primary key,
      at timestamptz not null default now(),
      version_id bigint not null,
      signature text not null,
      data_as_of timestamptz,
      summary jsonb,
      unique (version_id, signature)
    )`;
  await s`
    create table if not exists app.risk_calc_results (
      run_id bigint not null references app.risk_calc_runs(id) on delete cascade,
      isin text not null,
      calculated_at timestamptz not null default now(),
      raw_ytm numeric,
      duration numeric,
      maturity_years numeric,
      rating text,
      rating_source text,
      required_bp numeric,
      benchmark_ytm numeric,
      spread_bp numeric,
      risk_adjusted_ytm numeric,
      surplus_bp numeric,
      status text not null,
      reason text,
      version_id bigint not null,
      primary key (run_id, isin)
    )`;
  // Seed Version 1.0 as the active curve the first time only. Never overwrites admin data.
  await s`
    insert into app.risk_premium_versions (version, status, currency, issuer_category, min_maturity, max_maturity, floor, exceptional_bp, premiums, notes, justification, created_by, activated_at, activated_by)
    select ${V1_CURVE.version}, 'active', ${V1_CURVE.currency}, ${V1_CURVE.issuerCategory}, ${V1_CURVE.minMaturity}, ${V1_CURVE.maxMaturity}, ${V1_CURVE.floor}, ${V1_CURVE.exceptionalBp},
      ${s.json(V1_CURVE.premiums as never)}, ${"Initial 10BONDS Risk Premium Curve: minimum spread over a maturity-matched Bund, ~5y EUR senior fixed-rate corporates."},
      ${"Initial specification (the owner, 20/10/2026)"}, 'seed', now(), 'seed'
    where not exists (select 1 from app.risk_premium_versions)`;
}

type VersionRow = {
  id: string; version: string; status: VersionStatus; currency: string; issuer_category: string; min_maturity: string; max_maturity: string;
  floor: string; exceptional_bp: string; premiums: Record<CurveRating, number>; notes: string | null; justification: string | null;
  created_at: Date; created_by: string | null; activated_at: Date | null; activated_by: string | null;
};

function toVersion(r: VersionRow): CurveVersion {
  return {
    id: Number(r.id),
    version: r.version,
    status: r.status,
    currency: "EUR",
    issuerCategory: "corporate",
    minMaturity: Number(r.min_maturity),
    maxMaturity: Number(r.max_maturity),
    floor: r.floor as CurveRating,
    exceptionalBp: Number(r.exceptional_bp),
    premiums: r.premiums,
    notes: r.notes,
    justification: r.justification,
    createdAt: r.created_at.toISOString(),
    createdBy: r.created_by,
    activatedAt: r.activated_at?.toISOString() ?? null,
    activatedBy: r.activated_by,
  };
}

export async function listVersions(): Promise<CurveVersion[]> {
  const s = await db();
  return (await s<VersionRow[]>`select * from app.risk_premium_versions order by id desc`).map(toVersion);
}

async function audit(s: Sql, by: string, action: string, versionId: number | null, justification: string | null, detail: unknown = null) {
  await s`insert into app.risk_premium_audit (by_email, version_id, action, justification, detail) values (${by}, ${versionId}, ${action}, ${justification}, ${detail === null ? null : s.json(detail as never)})`;
}

export async function createDraft(c: CurveConfig, notes: string | null, justification: string, by: string): Promise<number> {
  const s = await db();
  const [r] = await s<{ id: string }[]>`
    insert into app.risk_premium_versions (version, status, currency, issuer_category, min_maturity, max_maturity, floor, exceptional_bp, premiums, notes, justification, created_by)
    values (${c.version}, 'draft', ${c.currency}, ${c.issuerCategory}, ${c.minMaturity}, ${c.maxMaturity}, ${c.floor}, ${c.exceptionalBp}, ${s.json(c.premiums as never)}, ${notes}, ${justification}, ${by})
    returning id`;
  await audit(s, by, "create_draft", Number(r.id), justification, { version: c.version, premiums: c.premiums, minMaturity: c.minMaturity, maxMaturity: c.maxMaturity, floor: c.floor, exceptionalBp: c.exceptionalBp });
  return Number(r.id);
}

/** Change a draft. Returns false when the version is not a draft (active and archived versions never change). */
export async function updateDraft(id: number, c: CurveConfig, notes: string | null, justification: string, by: string): Promise<boolean> {
  const s = await db();
  const r = await s`
    update app.risk_premium_versions set version = ${c.version}, min_maturity = ${c.minMaturity}, max_maturity = ${c.maxMaturity}, floor = ${c.floor},
      exceptional_bp = ${c.exceptionalBp}, premiums = ${s.json(c.premiums as never)}, notes = ${notes}, justification = ${justification}
    where id = ${id} and status = 'draft'`;
  if (!r.count) return false;
  await audit(s, by, "edit_draft", id, justification, { version: c.version, premiums: c.premiums, minMaturity: c.minMaturity, maxMaturity: c.maxMaturity, floor: c.floor, exceptionalBp: c.exceptionalBp });
  return true;
}

export async function deleteDraft(id: number, justification: string, by: string): Promise<boolean> {
  const s = await db();
  const r = await s`delete from app.risk_premium_versions where id = ${id} and status = 'draft'`;
  if (r.count) await audit(s, by, "delete_draft", id, justification);
  return r.count > 0;
}

/** Activate a validated draft; the previously active version is archived (kept, unchanged). */
export async function activateVersion(id: number, justification: string, by: string): Promise<string[]> {
  const s = await db();
  const all = await listVersions();
  const problems = activationProblems(all.find((v) => v.id === id), all);
  if (problems.length) return problems;
  await s.begin(async (t) => {
    await t`update app.risk_premium_versions set status = 'archived' where status = 'active'`;
    await t`update app.risk_premium_versions set status = 'active', activated_at = now(), activated_by = ${by} where id = ${id} and status = 'draft'`;
    await t`insert into app.risk_premium_audit (by_email, version_id, action, justification) values (${by}, ${id}, 'activate', ${justification})`;
  });
  modeCache = null;
  return [];
}

/** Archive the active version: the risk-adjusted ranking then has no curve and the current ranking is used. */
export async function deactivateActive(justification: string, by: string): Promise<boolean> {
  const s = await db();
  const r = await s<{ id: string }[]>`update app.risk_premium_versions set status = 'archived' where status = 'active' returning id`;
  if (r.length) await audit(s, by, "deactivate", Number(r[0].id), justification);
  modeCache = null;
  return r.length > 0;
}

export type AuditRow = { id: number; at: string; by: string; versionId: number | null; action: string; justification: string | null; detail: unknown };
export async function listAudit(limit = 100): Promise<AuditRow[]> {
  const s = await db();
  const rows = await s`select * from app.risk_premium_audit order by id desc limit ${limit}`;
  return rows.map((r) => ({ id: Number(r.id), at: new Date(r.at).toISOString(), by: r.by_email, versionId: r.version_id === null ? null : Number(r.version_id), action: r.action, justification: r.justification, detail: r.detail }));
}

// Risk premium weight, in app.settings (the owner, 20/10/2026, replaces the on/off mode): 0 = users get the current
// ranking exactly; above 0 the active curve's premiums are scaled by it (1 = the curve as stored, up to MAX_WEIGHT)
// and the risk-adjusted ranking is used wherever the curve applies. Set with the yellow admin slider on the search page.
export const MAX_WEIGHT = 3;
const WEIGHT_KEY = "risk_premium_weight";

export async function getWeight(): Promise<number> {
  const s = await db();
  const [r] = await s<{ value: string }[]>`select value from app.settings where key = ${WEIGHT_KEY}`;
  const w = Number(r?.value);
  return Number.isFinite(w) ? Math.min(MAX_WEIGHT, Math.max(0, w)) : 0;
}

export async function setWeight(weight: number, justification: string, by: string) {
  const s = await db();
  const w = String(Math.round(Math.min(MAX_WEIGHT, Math.max(0, weight)) * 100) / 100);
  await s`insert into app.settings (key, value) values (${WEIGHT_KEY}, ${w}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  await audit(s, by, "weight", null, justification, { weight: Number(w) });
  modeCache = null;
}

// Outlier rule (lib/outliers.ts): how many standard deviations above its cohort's average yield a bond must be to be
// left out everywhere. Set with the yellow admin slider on the search page (the owner, 20/10/2026: 0.5 to 5, default 2).
const OUTLIER_SD_KEY = "outlier_sd";

export async function getOutlierSd(): Promise<number> {
  const s = await db();
  const [r] = await s<{ value: string }[]>`select value from app.settings where key = ${OUTLIER_SD_KEY}`;
  return cleanSd(r?.value);
}

export async function setOutlierSd(sd: number, justification: string, by: string) {
  const s = await db();
  const v = String(cleanSd(sd));
  await s`insert into app.settings (key, value) values (${OUTLIER_SD_KEY}, ${v}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  await audit(s, by, "outlier_sd", null, justification, { sd: Number(v) });
  modeCache = null;
}

// Spread rules matrix (lib/stepGap.ts, Methodology with spread rules, admin only): minimum extra bp per rating step and
// maturity, in app.settings as JSON. Null = the defaults.
const SPREAD_KEY = "spread_matrix";

export async function getSpreadMatrix(): Promise<SpreadMatrix | null> {
  const s = await db();
  const [r] = await s<{ value: string }[]>`select value from app.settings where key = ${SPREAD_KEY}`;
  try { return r ? cleanMatrix(JSON.parse(r.value)) : null; } catch { return null; }
}

export async function saveSpreadMatrix(m: SpreadMatrix, justification: string, by: string) {
  const s = await db();
  const v = JSON.stringify(m);
  await s`insert into app.settings (key, value) values (${SPREAD_KEY}, ${v}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  await audit(s, by, "spread_matrix", null, justification, { matrix: m });
  modeCache = null;
}

export type Review = { isin: string; decision: "approved" | "rejected"; note: string; by: string; at: string; versionId: number | null };

export async function addReview(isin: string, decision: "approved" | "rejected", note: string, versionId: number | null, by: string) {
  const s = await db();
  await s`insert into app.risk_spread_reviews (isin, decision, note, by_email, version_id) values (${isin}, ${decision}, ${note}, ${by}, ${versionId})`;
  await audit(s, by, `review_${decision}`, versionId, note, { isin });
  modeCache = null;
}

/** Latest decision per ISIN (older ones stay in the table as the audit trail). */
export async function latestReviews(): Promise<Review[]> {
  const s = await db();
  const rows = await s`select distinct on (isin) * from app.risk_spread_reviews order by isin, at desc, id desc`;
  return rows.map((r) => ({ isin: r.isin, decision: r.decision, note: r.note, by: r.by_email, at: new Date(r.at).toISOString(), versionId: r.version_id === null ? null : Number(r.version_id) }));
}

/** Record a calculation run once per (version, bond copy). Returns the run id. */
export async function recordRun(versionId: number, signature: string, dataAsOf: string | null, evaluations: Evaluation[], summary: unknown): Promise<number> {
  const s = await db();
  const [existing] = await s<{ id: string }[]>`select id from app.risk_calc_runs where version_id = ${versionId} and signature = ${signature}`;
  if (existing) return Number(existing.id);
  return s.begin(async (t) => {
    const [run] = await t<{ id: string }[]>`
      insert into app.risk_calc_runs (version_id, signature, data_as_of, summary) values (${versionId}, ${signature}, ${dataAsOf}, ${t.json(summary as never)})
      on conflict (version_id, signature) do nothing returning id`;
    if (!run) {
      const [again] = await t<{ id: string }[]>`select id from app.risk_calc_runs where version_id = ${versionId} and signature = ${signature}`;
      return Number(again.id);
    }
    const id = Number(run.id);
    for (let i = 0; i < evaluations.length; i += 500) {
      const rows = evaluations.slice(i, i + 500).map((e) => ({
        run_id: id, isin: e.isin, raw_ytm: e.ytm, duration: e.duration, maturity_years: e.maturityYears, rating: e.rating, rating_source: e.ratingSource,
        required_bp: e.requiredBp, benchmark_ytm: e.benchmarkYtm, spread_bp: e.spreadBp, risk_adjusted_ytm: e.riskAdjustedYtm, surplus_bp: e.surplusBp,
        status: e.status, reason: e.reason, version_id: e.versionId,
      }));
      await t`insert into app.risk_calc_results ${t(rows)} on conflict do nothing`;
    }
    return id;
  });
}

export async function listRuns(limit = 10) {
  const s = await db();
  const rows = await s`select r.id, r.at, r.version_id, v.version, r.data_as_of, (select count(*) from app.risk_calc_results x where x.run_id = r.id) n from app.risk_calc_runs r left join app.risk_premium_versions v on v.id = r.version_id order by r.id desc limit ${limit}`;
  return rows.map((r) => ({ id: Number(r.id), at: new Date(r.at).toISOString(), versionId: Number(r.version_id), version: r.version as string | null, dataAsOf: r.data_as_of ? new Date(r.data_as_of).toISOString() : null, bonds: Number(r.n) }));
}

// What the public ranking needs, cached for a minute so a slider move does not hit the database each time.
type Live = { weight: number; outlierSd: number; curve: CurveVersion | null; reviews: Map<string, "approved" | "rejected">; spreadMatrix: SpreadMatrix | null };
let modeCache: { at: number; live: Live } | null = null;

/** Mode, active curve and review decisions for the public ranking. Without an accounts database: shadow, no curve. */
export async function liveRiskConfig(): Promise<Live> {
  if (!accountsConfigured()) return { weight: 0, outlierSd: OUTLIER_SD.default, curve: null, reviews: new Map(), spreadMatrix: null };
  if (modeCache && Date.now() - modeCache.at < 60_000) return modeCache.live;
  const [weight, outlierSd, versions, reviews, spreadMatrix] = await Promise.all([getWeight(), getOutlierSd(), listVersions(), latestReviews(), getSpreadMatrix()]);
  const live: Live = { weight, outlierSd, curve: versions.find((v) => v.status === "active") ?? null, reviews: new Map(reviews.map((r) => [r.isin, r.decision])), spreadMatrix };
  modeCache = { at: Date.now(), live };
  setSpreadMatrix(live.spreadMatrix);
  return live;
}

/** The outlier setting users get (cached with the rest for a minute). */
export async function liveOutlierSd(): Promise<number> {
  return (await liveRiskConfig()).outlierSd;
}
