import { createHash, randomBytes } from "node:crypto";
import { accountsSql } from "./accounts";
import { loadCreditAnalysis } from "./creditAnalysisDb";
import { isIsin } from "./creditResearchSchema";
import { LBBW_CASE } from "./creditReferenceCases";
import { nextMissing, parameterReport } from "./creditParameters";
import { blockedMessage } from "./creditParameters";
import { evaluate, GATE_VERSION, sourceKey, sourceQuality, type GateOutcome } from "./creditGate";
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
    await s`create table if not exists app.credit_worker_kb (key text primary key, value jsonb not null, updated_at timestamp with time zone not null default now())`;
    await s`create table if not exists app.credit_research_settings (key text primary key, value text not null)`;
    await s`create table if not exists app.credit_research_runs (id bigserial primary key, isin text not null, worker_id text, at timestamptz not null default now(), ok boolean not null, model text, ms integer, tokens_in integer, tokens_out integer, sources integer, error text)`;
    await s`create table if not exists app.bond_credit_analysis_history (id bigserial primary key, isin text not null, archived_at timestamptz not null default now(), row jsonb not null)`;
    await s`create index if not exists bond_credit_analysis_history_isin on app.bond_credit_analysis_history (isin, archived_at desc)`;
    await ensurePublicationGate(s);
    await s`create table if not exists app.credit_reference_cases (isin text primary key, issuer text not null, lei text, status text not null default 'internal_provisional', source_label text not null, provided_on date, data jsonb not null, created_at timestamptz not null default now())`;
    await s`insert into app.credit_reference_cases (isin, issuer, lei, status, source_label, provided_on, data) values (${LBBW_CASE.isin}, ${LBBW_CASE.issuer}, ${LBBW_CASE.lei}, ${LBBW_CASE.status}, ${LBBW_CASE.sourceLabel}, ${LBBW_CASE.providedOn}, ${s.json(LBBW_CASE as never)}) on conflict (isin) do nothing`;
  })().catch((e) => { ready = null; throw e; });
  await ready;
  return s;
}

/** Creates (or checks) every credit-research table, the publication columns and the guard trigger. */
export async function creditResearchTablesReady(): Promise<void> { await sql(); }

// ---- Publication gate storage (owner, 2/11/2026): a rating is public only if publish_ir / publish_br are true, and the database itself
// refuses to keep them true unless the stored gate result allows it (or a person validated the rating). ----

async function ensurePublicationGate(s: Sql) {
  await s`alter table app.bond_credit_analysis
    add column if not exists publish_ir boolean not null default false,
    add column if not exists publish_br boolean not null default false,
    add column if not exists publication_status text not null default 'insufficient_evidence',
    add column if not exists gate jsonb,
    add column if not exists last_attempt jsonb,
    add column if not exists human_validated_at timestamptz,
    add column if not exists human_validated_by text`;
  await s`
    create or replace function app.credit_publish_guard() returns trigger language plpgsql as $$
    begin
      if new.human_validated_at is null then
        if new.publish_ir and coalesce((new.gate #>> '{ir,allowed}')::boolean, false) is not true then new.publish_ir := false; end if;
        if new.publish_br and (not new.publish_ir or coalesce((new.gate #>> '{br,allowed}')::boolean, false) is not true) then new.publish_br := false; end if;
      end if;
      if new.issuer_rating_min is null and new.issuer_rating is null then new.publish_ir := false; end if;
      if new.bond_rating_min is null and new.bond_rating is null then new.publish_br := false; end if;
      return new;
    end $$`;
  await s`drop trigger if exists credit_publish_guard on app.bond_credit_analysis`;
  await s`create trigger credit_publish_guard before insert or update on app.bond_credit_analysis for each row execute function app.credit_publish_guard()`;
  await reevaluateAll(s);
}

const gateJson = (g: GateOutcome) => ({ ir: g.ir, br: g.br, state: g.state, evaluatedAt: new Date().toISOString() });

/** Re-checks every stored assessment under the current gate (runs at start-up): a rating that does not pass is hidden at once. */
async function reevaluateAll(s: Sql) {
  const rows = await s<{ isin: string; facts: ResearchFacts | null; validated: boolean }[]>`
    select isin, detail #> '{research,facts}' as facts, human_validated_at is not null as validated from app.bond_credit_analysis where human_validated_at is null or gate is null`;
  for (const r of rows) {
    if (r.validated) continue;
    if (!r.facts) {
      await s`update app.bond_credit_analysis set publish_ir = false, publish_br = false, publication_status = 'insufficient_evidence',
        gate = ${s.json({ ir: { kind: "IR", allowed: false, reasons: ["No research facts are stored for this rating (it was not produced by the evidence pipeline)."], gateVersion: GATE_VERSION }, br: { kind: "BR", allowed: false, reasons: ["No research facts are stored for this rating."], gateVersion: GATE_VERSION }, state: "insufficient_evidence", evaluatedAt: new Date().toISOString() } as never)} where isin = ${r.isin}`;
      continue;
    }
    const g = evaluate(r.facts);
    await s`update app.bond_credit_analysis set gate = ${s.json(gateJson(g) as never)}, publication_status = ${g.state}, publish_ir = ${g.publishIr}, publish_br = ${g.publishBr} where isin = ${r.isin}`;
  }
}

/** A person validates a rating: the only way the status becomes VALIDATED. */
export async function validateRating(isin: string, by: string): Promise<boolean> {
  const s = await sql();
  const r = await s`update app.bond_credit_analysis set human_validated_at = now(), human_validated_by = ${by}, rating_verification_status = 'validated', publication_status = 'validated',
    publish_ir = (issuer_rating_min is not null or issuer_rating is not null), publish_br = (bond_rating_min is not null or bond_rating is not null) where isin = ${isin} returning 1`;
  return r.length > 0;
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

/** Shared memory of the research workers (verified issuer websites, dead hosts, cited figures per issuer). Small JSON values under short keys; the worker keeps a local copy as a fallback. */
export const KB_KEY = /^(domain|dead|fin):[A-Za-z0-9._:-]{2,120}$/;
const KB_MAX_BYTES = 200_000;
export async function kbGet(keys: string[]): Promise<Record<string, unknown>> {
  const s = await sql();
  const ok = keys.filter((k) => KB_KEY.test(k)).slice(0, 60);
  if (!ok.length) return {};
  const rows = await s<{ key: string; value: unknown }[]>`select key, value from app.credit_worker_kb where key in ${s(ok)}`;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
export async function kbPut(entries: Record<string, unknown>): Promise<{ saved: number; rejected: string[] }> {
  const s = await sql();
  let saved = 0; const rejected: string[] = [];
  for (const [k, v] of Object.entries(entries).slice(0, 60)) {
    const json = JSON.stringify(v ?? null);
    if (!KB_KEY.test(k) || v === null || typeof v !== "object" || json.length > KB_MAX_BYTES) { rejected.push(k.slice(0, 60)); continue; }
    await s`insert into app.credit_worker_kb (key, value, updated_at) values (${k}, ${json}::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`;
    saved++;
  }
  return { saved, rejected };
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

/** Stable fingerprint of the financial inputs (null when there are none). */
export function inputsFingerprint(f: ResearchFacts): string | null {
  const nums = Object.entries(f.metrics).filter(([, v]) => typeof v === "number").sort(([a], [b]) => a.localeCompare(b));
  const fac = Object.entries(f.factors ?? {}).filter(([, v]) => v && (v.origin === "accounts")).map(([k, v]) => [k, v!.value]).sort(([a], [b]) => String(a).localeCompare(String(b)));
  if (nums.length + fac.length < 2) return null;
  return hash(JSON.stringify({ nums, fac }));
}

/** Other ISINs of DIFFERENT issuers with the same financial inputs, unless this issuer's primary sources are all different from theirs (corroborated). */
export async function identicalInputsElsewhere(s: Awaited<ReturnType<typeof sql>>, f: ResearchFacts, h: string): Promise<string[]> {
  const rows = await s<{ isin: string; facts: ResearchFacts }[]>`select isin, detail #> '{research,facts}' as facts from app.bond_credit_analysis where isin <> ${f.isin} and detail #>> '{research,inputsHash}' = ${h} limit 20`;
  const mine = new Set(f.evidence.filter((e) => e.primary).map((e) => sourceKey(e.url)));
  const sameIssuer = (o: ResearchFacts) => !!f.issuer?.lei && f.issuer.lei === o.issuer?.lei;
  return rows.filter((r) => r.facts && !sameIssuer(r.facts)).filter((r) => r.facts.evidence.filter((e) => e.primary).some((e) => mine.has(sourceKey(e.url))) || mine.size === 0).map((r) => r.isin);
}

/** Other bonds already holding exactly the same IR and BR ranges (a sign that the research found nothing that tells the bonds apart). */
export async function identicalElsewhere(s: Awaited<ReturnType<typeof sql>>, isin: string, sc: { irMin: number; irMax: number; brMin: number; brMax: number }): Promise<string[]> {
  const r = await s<{ isin: string }[]>`select isin from app.bond_credit_analysis where isin <> ${isin} and issuer_rating_min = ${sc.irMin} and issuer_rating_max = ${sc.irMax} and bond_rating_min = ${sc.brMin} and bond_rating_max = ${sc.brMax} limit 20`;
  return r.map((x) => x.isin);
}

/** Scores the validated facts and publishes IR + BR as ONE atomic version: the previous row is archived and replaced in a single transaction. */
export async function completeJob(workerId: string, facts: ResearchFacts, usage: { model: string; ms: number; tokensIn: number; tokensOut: number }): Promise<CompleteResult> {
  const s = await sql();
  const [job] = await s<{ status: string; claimed_by: string | null; result_hash: string | null }[]>`select status, claimed_by, result_hash from app.credit_research_jobs where isin = ${facts.isin}`;
  if (!job) return { ok: false, error: "unknown job", code: 404 };
  const scored = scoreResearch(facts);
  const parameters = parameterReport(facts);
  const gate0 = evaluate(facts, scored);
  // Identical final ranges are only suspicious when the calculation is NOT independently supported (a bond that passes the gate may legitimately
  // match another issuer's score). Identical financial INPUTS for different issuers are flagged unless each has its own primary sources.
  const sameAs = gate0.ir.allowed ? [] : await identicalElsewhere(s, facts.isin, scored);
  const inputsHash = inputsFingerprint(facts);
  const twins = inputsHash ? await identicalInputsElsewhere(s, facts, inputsHash) : [];
  for (const [list, text] of [[sameAs, `same IR and BR ranges as ${sameAs.length} other bond(s) (${sameAs.slice(0, 3).join(", ")}): too little bond-specific data`], [twins, `identical financial inputs as ${twins.length} other issuer(s) (${twins.slice(0, 3).join(", ")}) without issuer-specific corroboration`]] as [string[], string][]) {
    if (list.length) { scored.status = "review_required"; scored.missing.push(text); }
  }
  if (twins.length) facts.conflicts = [...facts.conflicts, `Financial inputs identical to ${twins.length} other issuer(s) without separate primary sources.`];
  const resultHash = hash(JSON.stringify({ facts, v: SCORING_VERSION }));
  if (job.status === "done" && job.result_hash === resultHash) return { ok: true, duplicate: true, ir: [scored.irMin, scored.irMax], br: [scored.brMin, scored.brMax], status: scored.status };
  if (job.status !== "processing" || job.claimed_by !== workerId) return { ok: false, error: "job is not claimed by this worker", code: 409 };
  const gate = evaluate(facts, scored); // after the similarity notes above
  const research = { facts, scored, parameters, sameAs, twins, inputsHash, usage, publishedAt: new Date().toISOString() };
  await s.begin(async (tx) => {
    const [prev] = await tx<{ publish_ir: boolean; publish_br: boolean; human_validated_at: Date | null }[]>`select publish_ir, publish_br, human_validated_at from app.bond_credit_analysis where isin = ${facts.isin} for update`;
    // A validated or already-published rating is never replaced by a calculation that does not pass the gate (or by anything, if a person validated it):
    // the new attempt is only recorded next to it.
    const keepOld = !!prev && (!!prev.human_validated_at || ((prev.publish_ir || prev.publish_br) && !gate.publishIr));
    const attempt = { at: new Date().toISOString(), blocked: keepOld, state: gate.state, ir: [scored.irMin, scored.irMax], br: [scored.brMin, scored.brMax], reasons: gate.ir.reasons };
    if (keepOld) {
      await tx`update app.bond_credit_analysis set last_attempt = ${tx.json(attempt as never)}, updated_at = now() where isin = ${facts.isin}`;
    } else {
      await tx`insert into app.bond_credit_analysis_history (isin, row) select isin, to_jsonb(t) from app.bond_credit_analysis t where isin = ${facts.isin}`;
      await tx`
        insert into app.bond_credit_analysis as a (isin, issuer_rating_min, issuer_rating_max, bond_rating_min, bond_rating_max, rating_assessment_date, rating_verification_status, detail, version, gate, publication_status, publish_ir, publish_br, last_attempt)
        values (${facts.isin}, ${scored.irMin}, ${scored.irMax}, ${scored.brMin}, ${scored.brMax}, current_date, ${scored.status}, ${tx.json({ research } as never)}, ${SCORING_VERSION}, ${tx.json(gateJson(gate) as never)}, ${gate.state}, ${gate.publishIr}, ${gate.publishBr}, ${tx.json(attempt as never)})
        on conflict (isin) do update set issuer_rating_min = excluded.issuer_rating_min, issuer_rating_max = excluded.issuer_rating_max, issuer_rating = null,
          bond_rating_min = excluded.bond_rating_min, bond_rating_max = excluded.bond_rating_max, bond_rating = null,
          rating_assessment_date = current_date, rating_verification_status = excluded.rating_verification_status,
          detail = coalesce(a.detail, '{}'::jsonb) || jsonb_build_object('research', excluded.detail -> 'research'), version = excluded.version, updated_at = now(),
          gate = excluded.gate, publication_status = excluded.publication_status, publish_ir = excluded.publish_ir, publish_br = excluded.publish_br, last_attempt = excluded.last_attempt`;
    }
    if (sameAs.length) await tx`update app.bond_credit_analysis set rating_verification_status = 'review_required' where isin in ${tx(sameAs)} and rating_verification_status = 'provisional'`;
    await tx`update app.credit_research_jobs set status = 'done', stage = 'finished', result_hash = ${resultHash}, last_error = null, claimed_by = null, lease_until = null, completed_at = now(), updated_at = now() where isin = ${facts.isin}`;
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
    select j.isin, j.priority, j.status, j.stage, j.exposure_count, j.attempts, j.last_error, j.updated_at, a.issuer_rating_min, a.issuer_rating_max, a.bond_rating_min, a.bond_rating_max, a.rating_verification_status,
      a.detail #>> '{research,scored,coverage}' as coverage, a.detail #> '{research,facts}' as facts, a.detail #> '{research,scored}' as scored, a.publication_status, a.publish_ir, a.publish_br, a.gate, a.last_attempt, a.detail #> '{research,sameAs}' as same_as, a.detail #> '{research,scored,steps}' as steps, jsonb_array_length(coalesce(a.detail #> '{research,facts,evidence}', '[]'::jsonb)) as sources,
      (select string_agg(x, '; ') from jsonb_array_elements_text(coalesce(a.detail #> '{research,scored,missing}', '[]'::jsonb)) x) as missing
    from app.credit_research_jobs j left join app.bond_credit_analysis a on a.isin = j.isin order by j.updated_at desc limit 40`;
  const [avg] = await s<{ ms: string | null }[]>`select avg(ms)::int as ms from app.credit_research_runs where ok and at > now() - interval '7 days'`;
  // Parameters are always recomputed from the stored facts with the current list, so older rows show the same counts as new ones.
  const recent = (jobs as unknown as ({ isin: string; facts: unknown; scored: unknown } & Record<string, unknown>)[]).map(({ facts, scored, ...r }) => {
    const f = facts as ResearchFacts | null;
    if (!f) return { ...r, parameters: null, view: null };
    const parameters = parameterReport(f);
    const q = sourceQuality(f);
    const next = nextMissing(f, parameters);
    return { ...r, parameters, scored, facts: f, view: { issuer: f.issuer?.legalName ?? null, lei: f.issuer?.lei ?? null, primary: q.primary, reliable: q.reliable, sources: f.evidence.length, next, message: blockedMessage(r.publication_status as string | null, parameters, r.gate as { ir?: { reasons?: string[]; missingCritical?: string[] } } | null) } };
  });
  return { jobs: c, analyses: a, workers, recent, references: await referenceCases(), avgMs: avg?.ms ? Number(avg.ms) : null, paused: await isPaused() };
}

/** Labelled reference cases (internal teaching data, never public). */
export async function referenceCases() {
  const s = await sql();
  return s`select isin, issuer, lei, status, source_label, provided_on, data from app.credit_reference_cases order by created_at`;
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

/** Compact IR / BR texts for a few ISINs plus which of them are still waiting for research (the lists poll this).
 *  PUBLIC: only ratings whose publication flag is set by the gate (or by a person) are returned; IR and BR are separate flags. */
export async function publicRatings(isins: string[]) {
  const list = [...new Set(isins.filter(isIsin))].slice(0, 50);
  if (!list.length) return { ratings: {}, pending: [] as string[] };
  const s = await sql();
  const rows = await s<Record<string, unknown>[]>`select isin, issuer_rating_min, issuer_rating_max, issuer_rating, bond_rating_min, bond_rating_max, bond_rating, rating_assessment_date, publication_status, publish_ir, publish_br from app.bond_credit_analysis where isin in ${s(list)} and (publish_ir or publish_br)`;
  const pend = await s<{ isin: string }[]>`select isin from app.credit_research_jobs where isin in ${s(list)} and status in ('queued', 'processing')`;
  const { irText, brText } = await import("./creditRow");
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const ratings: Record<string, { ir: string | null; br: string | null; status: string | null; at: string | null }> = {};
  for (const r of rows) {
    const sc = { issuerRatingMin: num(r.issuer_rating_min), issuerRatingMax: num(r.issuer_rating_max), issuerRating: num(r.issuer_rating), bondRatingMin: num(r.bond_rating_min), bondRatingMax: num(r.bond_rating_max), bondRating: num(r.bond_rating) };
    ratings[String(r.isin)] = { ir: r.publish_ir ? irText(sc) : null, br: r.publish_br ? brText(sc) : null, status: (r.publication_status as string) ?? null, at: r.rating_assessment_date ? new Date(String(r.rating_assessment_date)).toISOString().slice(0, 10) : null };
  }
  return { ratings, pending: pend.map((p) => p.isin) };
}
