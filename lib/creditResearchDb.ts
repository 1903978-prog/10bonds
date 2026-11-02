import { createHash, randomBytes } from "node:crypto";
import { accountsSql } from "./accounts";
import { loadCreditAnalysis } from "./creditAnalysisDb";
import { isIsin } from "./creditResearchSchema";
import { scoreResearch, SCORING_VERSION, type ResearchFacts } from "./creditScoring";

// Credit research queue (owner, 1/11/2026). One durable job per ISIN. The web process only writes small queue rows; all research
// (downloads, Ollama, extraction) runs in the worker on the owner's computer, which talks to /api/credit-worker/* over HTTPS.
// IR / BR are written to app.bond_credit_analysis (one atomic upsert + audit copy of the previous row); the ranking columns
// (effective_grade, exclusion) are never touched here, so the portfolio algorithm is unaffected.

export const FRESH_DAYS = 30;
export const LEASE_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
const AGING_HOURS_PER_PRIORITY = 6; // a P3 job outranks a brand-new P0 job after 18 hours: nothing starves

type Sql = Awaited<ReturnType<typeof accountsSql>>;
let ready: Promise<void> | null = null;
async function sql(): Promise<Sql> {
  const s = await accountsSql();
  ready ??= (async () => {
    await loadCreditAnalysis("XS0000000000"); // makes sure app.bond_credit_analysis exists (created by lib/creditAnalysisDb.ts)
    await s`
      create table if not exists app.credit_research_jobs (
        isin text primary key,
        priority smallint not null default 0,
        status text not null default 'queued',
        stage text,
        exposure_count integer not null default 1,
        first_exposed_at timestamptz not null default now(),
        last_exposed_at timestamptz not null default now(),
        account_exposed boolean not null default false,
        attempts integer not null default 0,
        next_attempt_at timestamptz not null default now(),
        claimed_by text, claimed_at timestamptz, lease_until timestamptz,
        last_error text, result_hash text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        completed_at timestamptz
      )`;
    await s`create index if not exists credit_research_jobs_pick on app.credit_research_jobs (status, next_attempt_at)`;
    await s`create table if not exists app.credit_research_workers (worker_id text primary key, model text, current_isin text, stage text, host text, last_seen timestamptz not null default now())`;
    await s`create table if not exists app.credit_research_tokens (token_hash text primary key, label text, created_at timestamptz not null default now(), revoked_at timestamptz, last_used_at timestamptz)`;
    await s`create table if not exists app.credit_research_settings (key text primary key, value text not null)`;
    await s`create table if not exists app.credit_research_runs (id bigserial primary key, isin text not null, worker_id text, at timestamptz not null default now(), ok boolean not null, model text, ms integer, tokens_in integer, tokens_out integer, sources integer, error text)`;
    await s`create table if not exists app.bond_credit_analysis_history (id bigserial primary key, isin text not null, archived_at timestamptz not null default now(), row jsonb not null)`;
    await s`create index if not exists bond_credit_analysis_history_isin on app.bond_credit_analysis_history (isin, archived_at desc)`;
  })().catch((e) => { ready = null; throw e; });
  await ready;
  return s;
}

// ---- 1. Enqueue the bonds of a search ----

const lastSeen = new Map<string, number>();
const SAME_LIST_MS = 5 * 60_000;

/**
 * Called after every Top 10 answer, never awaited by the search. Skips lists seen in the last 5 minutes (page refreshes), then one SQL
 * statement: bonds with a current assessment are left alone, the rest get a job (P0 no assessment, P1 stale) or, if a job exists,
 * only its exposure data and priority are updated (at most one exposure counted per ISIN every 10 minutes).
 */
export function enqueueFromSearch(isins: string[], account: boolean): void {
  const list = [...new Set(isins.filter(isIsin))].slice(0, 10);
  if (!list.length) return;
  const key = list.slice().sort().join(",") + (account ? "#a" : "");
  const now = Date.now();
  if ((lastSeen.get(key) ?? 0) > now - SAME_LIST_MS) return;
  lastSeen.set(key, now);
  if (lastSeen.size > 500) for (const [k, t] of lastSeen) if (t < now - SAME_LIST_MS) lastSeen.delete(k);
  void enqueueIsins(list, account).catch((e) => { lastSeen.delete(key); console.error("[credit-research] enqueue", (e as Error).message); });
}

export async function enqueueIsins(list: string[], account: boolean, forcePriority?: number): Promise<number> {
  const s = await sql();
  const rows = await s<{ isin: string }[]>`
    with want as (
      select v.isin,
        a.isin is not null and (a.issuer_rating_min is not null or a.issuer_rating is not null or a.bond_rating_min is not null or a.bond_rating is not null) as has,
        coalesce(a.rating_assessment_date >= current_date - (case when a.rating_verification_status = 'review_required' then 1 else ${FRESH_DAYS}::int end), false) as fresh
      from unnest(${list}::text[]) as v(isin) left join app.bond_credit_analysis a on a.isin = v.isin)
    insert into app.credit_research_jobs as j (isin, priority, account_exposed)
    select isin, coalesce(${forcePriority ?? null}::int, case when has then 1 else 0 end), ${account}::boolean from want where ${forcePriority !== undefined}::boolean or not (has and fresh)
    on conflict (isin) do update set
      exposure_count = j.exposure_count + case when j.last_exposed_at < now() - interval '10 minutes' then 1 else 0 end,
      last_exposed_at = case when j.last_exposed_at < now() - interval '10 minutes' then now() else j.last_exposed_at end,
      account_exposed = j.account_exposed or excluded.account_exposed,
      priority = least(j.priority, excluded.priority),
      status = case when j.status = 'done' then 'queued' else j.status end,
      next_attempt_at = case when j.status = 'done' then now() else j.next_attempt_at end,
      attempts = case when j.status = 'done' then 0 else j.attempts end,
      updated_at = now()
    returning isin`;
  return rows.length;
}

// ---- 2. Worker side: tokens, claim, heartbeat, complete, fail ----

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createWorkerToken(label: string): Promise<string> {
  const s = await sql();
  const token = "crw_" + randomBytes(32).toString("hex");
  await s`insert into app.credit_research_tokens (token_hash, label) values (${hash(token)}, ${label.slice(0, 60)})`;
  return token;
}
export async function revokeWorkerTokens(): Promise<void> {
  const s = await sql();
  await s`update app.credit_research_tokens set revoked_at = now() where revoked_at is null`;
}
export async function tokenValid(authHeader: string | null): Promise<boolean> {
  const t = /^Bearer (crw_[a-f0-9]{64})$/.exec(authHeader ?? "")?.[1];
  if (!t) return false;
  const s = await sql();
  const r = await s`update app.credit_research_tokens set last_used_at = now() where token_hash = ${hash(t)} and revoked_at is null returning 1`;
  return r.length > 0;
}

export async function isPaused(): Promise<boolean> {
  const s = await sql();
  const [r] = await s<{ value: string }[]>`select value from app.credit_research_settings where key = 'paused'`;
  return r?.value === "1";
}
export async function setPaused(p: boolean): Promise<void> {
  const s = await sql();
  await s`insert into app.credit_research_settings (key, value) values ('paused', ${p ? "1" : "0"}) on conflict (key) do update set value = excluded.value`;
}

const clean = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

export async function touchWorker(workerId: string, info: { model?: unknown; host?: unknown; isin?: string | null; stage?: unknown }) {
  const s = await sql();
  await s`
    insert into app.credit_research_workers (worker_id, model, host, current_isin, stage, last_seen)
    values (${clean(workerId, 60)}, ${clean(info.model, 80)}, ${clean(info.host, 80)}, ${info.isin ?? null}, ${clean(info.stage, 40) || null}, now())
    on conflict (worker_id) do update set model = excluded.model, host = excluded.host, current_isin = excluded.current_isin, stage = excluded.stage, last_seen = now()`;
}

export type Claimed = { isin: string; priority: number; attempts: number; leaseMinutes: number };

/** Hands the most urgent job to the worker (aging keeps low priorities moving). A job whose lease ran out (worker died) is handed out again. */
export async function claimJob(workerId: string): Promise<Claimed | null> {
  const s = await sql();
  const [j] = await s<{ isin: string; priority: number; attempts: number }[]>`
    with pick as (
      select isin from app.credit_research_jobs
      where (status = 'queued' and next_attempt_at <= now() and attempts < ${MAX_ATTEMPTS}) or (status = 'processing' and lease_until < now() and attempts < ${MAX_ATTEMPTS})
      order by (extract(epoch from now() - created_at) / 3600.0 - ${AGING_HOURS_PER_PRIORITY} * priority) desc, account_exposed desc, last_exposed_at desc
      limit 1 for update skip locked)
    update app.credit_research_jobs j set status = 'processing', claimed_by = ${workerId}, claimed_at = now(), lease_until = now() + ${LEASE_MINUTES} * interval '1 minute',
      attempts = j.attempts + 1, stage = 'claimed', updated_at = now()
    from pick where j.isin = pick.isin returning j.isin, j.priority, j.attempts`;
  return j ? { isin: j.isin, priority: j.priority, attempts: j.attempts, leaseMinutes: LEASE_MINUTES } : null;
}

export async function heartbeat(workerId: string, isin: string, stage: string): Promise<boolean> {
  const s = await sql();
  const r = await s`update app.credit_research_jobs set stage = ${clean(stage, 40)}, lease_until = now() + ${LEASE_MINUTES} * interval '1 minute', updated_at = now()
    where isin = ${isin} and status = 'processing' and claimed_by = ${workerId} returning 1`;
  return r.length > 0;
}

export async function failJob(workerId: string, isin: string, error: string, usage: { model?: string; ms?: number } = {}): Promise<boolean> {
  const s = await sql();
  const [j] = await s<{ attempts: number }[]>`select attempts from app.credit_research_jobs where isin = ${isin} and status = 'processing' and claimed_by = ${workerId}`;
  if (!j) return false;
  const backoffMin = Math.min(720, 5 * 2 ** (j.attempts - 1));
  await s`update app.credit_research_jobs set status = case when attempts >= ${MAX_ATTEMPTS} then 'failed' else 'queued' end, last_error = ${clean(error, 500)},
    next_attempt_at = now() + ${backoffMin} * interval '1 minute', claimed_by = null, lease_until = null, updated_at = now() where isin = ${isin}`;
  await s`insert into app.credit_research_runs (isin, worker_id, ok, model, ms, error) values (${isin}, ${workerId}, false, ${clean(usage.model, 80)}, ${usage.ms ?? null}, ${clean(error, 500)})`;
  return true;
}

export type CompleteResult = { ok: true; duplicate: boolean; ir: [number, number]; br: [number, number]; status: string } | { ok: false; error: string; code: number };

/** Scores the validated facts and publishes IR + BR as ONE atomic version: the previous row is archived and replaced in a single transaction. */
export async function completeJob(workerId: string, facts: ResearchFacts, usage: { model: string; ms: number; tokensIn: number; tokensOut: number }): Promise<CompleteResult> {
  const s = await sql();
  const [job] = await s<{ status: string; claimed_by: string | null; result_hash: string | null }[]>`select status, claimed_by, result_hash from app.credit_research_jobs where isin = ${facts.isin}`;
  if (!job) return { ok: false, error: "unknown job", code: 404 };
  const scored = scoreResearch(facts);
  const resultHash = hash(JSON.stringify({ facts, v: SCORING_VERSION }));
  if (job.status === "done" && job.result_hash === resultHash) return { ok: true, duplicate: true, ir: [scored.irMin, scored.irMax], br: [scored.brMin, scored.brMax], status: scored.status };
  if (job.status !== "processing" || job.claimed_by !== workerId) return { ok: false, error: "job is not claimed by this worker", code: 409 };
  const research = { facts, scored, usage, publishedAt: new Date().toISOString() };
  await s.begin(async (tx) => {
    await tx`insert into app.bond_credit_analysis_history (isin, row) select isin, to_jsonb(t) from app.bond_credit_analysis t where isin = ${facts.isin}`;
    await tx`
      insert into app.bond_credit_analysis as a (isin, issuer_rating_min, issuer_rating_max, bond_rating_min, bond_rating_max, rating_assessment_date, rating_verification_status, detail, version)
      values (${facts.isin}, ${scored.irMin}, ${scored.irMax}, ${scored.brMin}, ${scored.brMax}, current_date, ${scored.status}, ${tx.json({ research } as never)}, ${SCORING_VERSION})
      on conflict (isin) do update set issuer_rating_min = excluded.issuer_rating_min, issuer_rating_max = excluded.issuer_rating_max, issuer_rating = null,
        bond_rating_min = excluded.bond_rating_min, bond_rating_max = excluded.bond_rating_max, bond_rating = null,
        rating_assessment_date = current_date, rating_verification_status = excluded.rating_verification_status,
        detail = coalesce(a.detail, '{}'::jsonb) || jsonb_build_object('research', excluded.detail -> 'research'), version = excluded.version, updated_at = now()`;
    await tx`update app.credit_research_jobs set status = 'done', stage = 'published', result_hash = ${resultHash}, last_error = null, claimed_by = null, lease_until = null, completed_at = now(), updated_at = now() where isin = ${facts.isin}`;
    await tx`insert into app.credit_research_runs (isin, worker_id, ok, model, ms, tokens_in, tokens_out, sources) values (${facts.isin}, ${workerId}, true, ${usage.model}, ${usage.ms}, ${usage.tokensIn}, ${usage.tokensOut}, ${facts.evidence.length})`;
  });
  return { ok: true, duplicate: false, ir: [scored.irMin, scored.irMax], br: [scored.brMin, scored.brMax], status: scored.status };
}

// ---- 3. Reading: admin overview and the public list update ----

export async function overview() {
  const s = await sql();
  const [c] = await s<Record<string, string>[]>`
    select count(*) filter (where status = 'queued') queued, count(*) filter (where status = 'processing') processing, count(*) filter (where status = 'failed') failed,
      count(*) filter (where status = 'done') done, count(*) filter (where status = 'done' and completed_at > now() - interval '1 day') done_today,
      count(*) filter (where status = 'queued' and priority = 0) p0, count(*) filter (where status = 'queued' and priority = 1) p1,
      count(*) filter (where status = 'queued' and priority = 2) p2, count(*) filter (where status = 'queued' and priority = 3) p3
    from app.credit_research_jobs`;
  const [a] = await s<Record<string, string>[]>`
    select count(*) total, count(*) filter (where issuer_rating_min is not null or issuer_rating is not null) with_ir, count(*) filter (where bond_rating_min is not null or bond_rating is not null) with_br,
      count(*) filter (where rating_verification_status = 'validated') validated, count(*) filter (where rating_verification_status = 'review_required') review
    from app.bond_credit_analysis`;
  const workers = await s`select worker_id, model, current_isin, stage, host, last_seen, last_seen > now() - interval '3 minutes' as online from app.credit_research_workers order by last_seen desc limit 10`;
  const jobs = await s`
    select j.isin, j.priority, j.status, j.stage, j.exposure_count, j.attempts, j.last_error, j.updated_at, a.issuer_rating_min, a.issuer_rating_max, a.bond_rating_min, a.bond_rating_max, a.rating_verification_status
    from app.credit_research_jobs j left join app.bond_credit_analysis a on a.isin = j.isin order by j.updated_at desc limit 40`;
  const [avg] = await s<{ ms: string | null }[]>`select avg(ms)::int as ms from app.credit_research_runs where ok and at > now() - interval '7 days'`;
  return { jobs: c, analyses: a, workers, recent: jobs, avgMs: avg?.ms ? Number(avg.ms) : null, paused: await isPaused() };
}

export async function retryFailed(): Promise<number> {
  const s = await sql();
  const r = await s`update app.credit_research_jobs set status = 'queued', attempts = 0, next_attempt_at = now(), last_error = null, updated_at = now() where status = 'failed' returning 1`;
  return r.length;
}

/** The ISINs waiting for research or being researched right now (small and cheap: the lists poll it). */
export async function pendingIsins(limit = 100): Promise<string[]> {
  const s = await sql();
  const r = await s<{ isin: string }[]>`select isin from app.credit_research_jobs where status in ('queued', 'processing') order by updated_at desc limit ${limit}`;
  return r.map((x) => x.isin);
}

/** Compact IR / BR texts for a few ISINs plus which of them are still waiting for research (the lists poll this). */
export async function publicRatings(isins: string[]) {
  const list = [...new Set(isins.filter(isIsin))].slice(0, 50);
  if (!list.length) return { ratings: {}, pending: [] as string[] };
  const s = await sql();
  const rows = await s<Record<string, unknown>[]>`select isin, issuer_rating_min, issuer_rating_max, issuer_rating, bond_rating_min, bond_rating_max, bond_rating, rating_assessment_date, rating_verification_status from app.bond_credit_analysis where isin in ${s(list)}`;
  const pend = await s<{ isin: string }[]>`select isin from app.credit_research_jobs where isin in ${s(list)} and status in ('queued', 'processing')`;
  const { irText, brText } = await import("./creditRow");
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const ratings: Record<string, { ir: string | null; br: string | null; status: string | null; at: string | null }> = {};
  for (const r of rows) {
    const sc = { issuerRatingMin: num(r.issuer_rating_min), issuerRatingMax: num(r.issuer_rating_max), issuerRating: num(r.issuer_rating), bondRatingMin: num(r.bond_rating_min), bondRatingMax: num(r.bond_rating_max), bondRating: num(r.bond_rating) };
    ratings[String(r.isin)] = { ir: irText(sc), br: brText(sc), status: (r.rating_verification_status as string) ?? null, at: r.rating_assessment_date ? new Date(String(r.rating_assessment_date)).toISOString().slice(0, 10) : null };
  }
  return { ratings, pending: pend.map((p) => p.isin) };
}
