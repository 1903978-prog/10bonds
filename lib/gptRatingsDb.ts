import { accountsSql } from "./accounts";
import type { GptRating } from "./gptRatings";
import type { Detail } from "./provisionalScenarios";

// Admin only (the owner, 24/10/2026): GPT's ratings pasted back on the finder, one row per ISIN (the newest paste wins).
// Never shown to customers.

export type SavedGptRating = GptRating & { at: string; model?: string | null };

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`
      create table if not exists app.gpt_ratings (
        isin text primary key,
        rating text not null,
        basis text,
        pasted_at timestamptz not null default now()
      )`;
    await s`alter table app.gpt_ratings add column if not exists issuer_rating text`;
    await s`alter table app.gpt_ratings alter column rating drop not null`;
    await s`alter table app.gpt_ratings add column if not exists risk_pay text`;
    await s`alter table app.gpt_ratings add column if not exists detail text`;
    await s`alter table app.gpt_ratings add column if not exists full_answer text`;
    await s`alter table app.gpt_ratings add column if not exists model text`;
    await s`alter table app.gpt_ratings add column if not exists prompt_version text`;
    await s`create table if not exists app.llm_calls (id bigserial primary key, isin text not null, provider text not null, model text not null, ok boolean not null, at timestamptz not null default now())`;
    await s`create table if not exists app.bond_runs (id bigserial primary key, isin text not null, at timestamptz not null default now(), provider text not null, model text not null, skill_version text not null, grounded boolean not null default false, raw text not null, parsed jsonb, parsed_ok boolean not null default false)`;
    await s`create index if not exists bond_runs_isin_at on app.bond_runs (isin, at desc)`;
    await s`create table if not exists app.llm_settings (key text primary key, value text not null)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

function parseDetail(v: string | null): Detail | null {
  try { return v ? (JSON.parse(v) as Detail) : null; } catch { return null; }
}

export async function loadGptRatings(): Promise<Record<string, SavedGptRating>> {
  const s = await sql();
  const rows = await s<{ isin: string; rating: string | null; issuer_rating: string | null; risk_pay: string | null; detail: string | null; basis: string | null; pasted_at: Date; model: string | null; full_answer: string | null }[]>`select isin, rating, issuer_rating, risk_pay, detail, basis, pasted_at, model, full_answer from app.gpt_ratings`;
  return Object.fromEntries(rows.map((r) => [r.isin, { rating: r.rating, issuerRating: r.issuer_rating, riskPay: r.risk_pay, detail: parseDetail(r.detail), basis: r.basis, at: new Date(r.pasted_at).toISOString(), model: r.model, answer: r.full_answer }]));
}

const grade = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 12) : "");
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Saves (or replaces) each ISIN's rating; returns how many were saved. */
export async function saveGptRatings(raw: unknown): Promise<number> {
  const rows = Object.entries((raw ?? {}) as Record<string, Partial<GptRating>>)
    .filter(([isin, r]) => ISIN.test(isin) && (grade(r?.rating) || grade(r?.issuerRating)))
    .slice(0, 500)
    .map(([isin, r]) => ({ isin, rating: grade(r.rating) || null, issuer_rating: grade(r.issuerRating) || null, basis: typeof r.basis === "string" && r.basis.trim() ? r.basis.trim().slice(0, 200) : null }));
  if (!rows.length) return 0;
  const s = await sql();
  await s`
    insert into app.gpt_ratings ${s(rows, "isin", "rating", "issuer_rating", "basis")}
    on conflict (isin) do update set rating = excluded.rating, issuer_rating = excluded.issuer_rating, risk_pay = null, detail = null, full_answer = null, basis = excluded.basis, pasted_at = now()`;
  return rows.length;
}

/** Provisional scenario values (ranges as text, stored Risk Pay): one row per ISIN, replacing that ISIN's earlier row. */
export async function saveScenarioRatings(rows: { isin: string; rating: string; issuerRating: string; riskPay: string; basis: string; detail: string | null }[]): Promise<number> {
  const clean = rows.filter((r) => ISIN.test(r.isin)).map((r) => ({ isin: r.isin, rating: r.rating.slice(0, 40), issuer_rating: r.issuerRating.slice(0, 40), risk_pay: r.riskPay.slice(0, 40), basis: r.basis.slice(0, 600), detail: r.detail ? r.detail.slice(0, 1500) : null }));
  if (!clean.length) return 0;
  const s = await sql();
  await s`
    insert into app.gpt_ratings ${s(clean, "isin", "rating", "issuer_rating", "risk_pay", "detail", "basis")}
    on conflict (isin) do update set rating = excluded.rating, issuer_rating = excluded.issuer_rating, risk_pay = excluded.risk_pay, detail = excluded.detail, basis = excluded.basis, pasted_at = now()`;
  return clean.length;
}

/** Spreadsheet import: fills IR / BR / Risk Pay only where the saved row has nothing; a different saved value is never overwritten. */
export async function mergeImportedRatings(rows: { isin: string; issuerRating: string | null; rating: string | null; riskPay: string | null }[], basis: string): Promise<{ filled: number; kept: number }> {
  const clean = rows.filter((r) => ISIN.test(r.isin));
  if (!clean.length) return { filled: 0, kept: 0 };
  const have = await loadGptRatings();
  const cut = (v: string | null, n: number) => (v ? v.slice(0, n) : null);
  let filled = 0;
  let kept = 0;
  const out: { isin: string; rating: string | null; issuer_rating: string | null; risk_pay: string | null; basis: string | null }[] = [];
  for (const r of clean) {
    const old = have[r.isin];
    const next = { rating: old?.rating ?? null, issuer_rating: old?.issuerRating ?? null, risk_pay: old?.riskPay ?? null };
    let changed = false;
    for (const [k, v, o] of [["issuer_rating", r.issuerRating, old?.issuerRating], ["rating", r.rating, old?.rating], ["risk_pay", r.riskPay, old?.riskPay]] as const) {
      if (!v) continue;
      if (!o) { next[k] = cut(v, 40); filled++; changed = true; }
      else if (o !== v) kept++;
    }
    if (changed) out.push({ isin: r.isin, ...next, basis: old?.basis ?? cut(basis, 600) });
  }
  if (!out.length) return { filled, kept };
  const s = await sql();
  await s`
    insert into app.gpt_ratings ${s(out, "isin", "rating", "issuer_rating", "risk_pay", "basis")}
    on conflict (isin) do update set rating = excluded.rating, issuer_rating = excluded.issuer_rating, risk_pay = excluded.risk_pay, basis = excluded.basis, pasted_at = now()`;
  return { filled, kept };
}

// ---- API calculator (admin only): settings, daily cap and storing one answer ----

export type LlmSettings = { provider: "gemini" | "openai" | "anthropic"; model: string; dailyCap: number; instructions: string };
export const SKILL_MAX = 100_000;
const DEFAULTS: LlmSettings = { provider: "gemini", model: "gemini-3.6-flash", dailyCap: 50, instructions: "" };

export async function loadLlmSettings(): Promise<LlmSettings> {
  const s = await sql();
  const rows = await s<{ key: string; value: string }[]>`select key, value from app.llm_settings`;
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const provider = m.provider === "anthropic" || m.provider === "openai" ? m.provider : "gemini";
  const cap = Number(m.daily_cap);
  return { provider, model: m.model?.slice(0, 80) || (provider === "anthropic" ? "claude-sonnet-5-5" : provider === "openai" ? "gpt-4o" : DEFAULTS.model), dailyCap: Number.isFinite(cap) && cap >= 0 ? Math.min(cap, 5000) : DEFAULTS.dailyCap, instructions: m.instructions ?? "" };
}

export async function saveLlmSettings(v: Partial<LlmSettings>): Promise<void> {
  const rows = [
    v.provider ? { key: "provider", value: v.provider } : null,
    typeof v.model === "string" && v.model.trim() ? { key: "model", value: v.model.trim().slice(0, 80) } : null,
    typeof v.dailyCap === "number" && v.dailyCap >= 0 ? { key: "daily_cap", value: String(Math.min(Math.floor(v.dailyCap), 5000)) } : null,
    typeof v.instructions === "string" ? { key: "instructions", value: v.instructions.slice(0, SKILL_MAX) } : null,
  ].filter((r): r is { key: string; value: string } => !!r);
  if (!rows.length) return;
  const s = await sql();
  await s`insert into app.llm_settings ${s(rows, "key", "value")} on conflict (key) do update set value = excluded.value`;
}

/** Calls made today by this provider, failed ones included. A day runs on Pacific time because Google's free quota resets at midnight there. */
export async function llmCallsToday(provider: string): Promise<number> {
  const s = await sql();
  const [r] = await s<{ n: string }[]>`select count(*) as n from app.llm_calls where provider = ${provider} and at >= date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles'`;
  return Number(r?.n ?? 0);
}

export async function logLlmCall(isin: string, provider: string, model: string, ok: boolean): Promise<void> {
  const s = await sql();
  await s`insert into app.llm_calls (isin, provider, model, ok) values (${isin}, ${provider}, ${model}, ${ok})`;
}

/** Stores one API answer like a pasted rating, plus the model and prompt version. */
export async function saveApiRating(isin: string, r: GptRating, model: string, promptVersion: string): Promise<boolean> {
  if (!ISIN.test(isin) || !(grade(r.rating) || grade(r.issuerRating) || r.riskPay)) return false;
  const s = await sql();
  const row = { isin, rating: grade(r.rating) || null, issuer_rating: grade(r.issuerRating) || null, basis: r.basis ? r.basis.slice(0, 200) : null, risk_pay: r.riskPay ? r.riskPay.slice(0, 40) : null, full_answer: r.answer ? r.answer.slice(0, 20000) : null, model: model.slice(0, 80), prompt_version: promptVersion.slice(0, 20) };
  await s`
    insert into app.gpt_ratings ${s(row, "isin", "rating", "issuer_rating", "basis", "risk_pay", "full_answer", "model", "prompt_version")}
    on conflict (isin) do update set rating = excluded.rating, issuer_rating = excluded.issuer_rating, risk_pay = excluded.risk_pay, full_answer = excluded.full_answer, detail = null, basis = excluded.basis, model = excluded.model, prompt_version = excluded.prompt_version, pasted_at = now()`;
  return true;
}

// ---- The three skill texts (admin page /admin/skills). IR/BR is the same text the calculator sends (key "instructions"). ----

export type SkillKey = "irbr" | "lr_gov" | "lr_corp";
const SKILL_DB_KEY: Record<SkillKey, string> = { irbr: "instructions", lr_gov: "skill_lr_gov", lr_corp: "skill_lr_corp" };

export async function loadSkills(): Promise<Record<SkillKey, string>> {
  const s = await sql();
  const rows = await s<{ key: string; value: string }[]>`select key, value from app.llm_settings where key in ('instructions', 'skill_lr_gov', 'skill_lr_corp')`;
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { irbr: m.instructions ?? "", lr_gov: m.skill_lr_gov ?? "", lr_corp: m.skill_lr_corp ?? "" };
}

export async function saveSkill(key: SkillKey, text: string): Promise<void> {
  const s = await sql();
  const value = text.slice(0, SKILL_MAX);
  await s`insert into app.llm_settings (key, value) values (${SKILL_DB_KEY[key]}, ${value}) on conflict (key) do update set value = excluded.value`;
}

// ---- $bonds runs: one row per run (history kept), plus the three table cells ----

/** Saves one run (raw answer, parsed JSON, date, skill version). With parsed cells it also fills IR, BR and Risk Pay in the table. */
export async function saveBondsRun(r: { isin: string; provider: string; model: string; skillVersion: string; grounded: boolean; raw: string; parsed: Record<string, unknown> | null; cells: { ir: string | null; br: string | null; riskPay: string | null } }): Promise<void> {
  if (!ISIN.test(r.isin)) return;
  const s = await sql();
  const ok = !!r.parsed && !!(r.cells.ir || r.cells.br || r.cells.riskPay);
  await s`insert into app.bond_runs (isin, provider, model, skill_version, grounded, raw, parsed, parsed_ok) values (${r.isin}, ${r.provider}, ${r.model.slice(0, 80)}, ${r.skillVersion}, ${r.grounded}, ${r.raw.slice(0, 200000)}, ${r.parsed ? s.json(r.parsed as never) : null}, ${ok})`;
  if (!ok) return;
  const row = { isin: r.isin, rating: r.cells.br, issuer_rating: r.cells.ir, risk_pay: r.cells.riskPay, basis: "$bonds skill (provisional)", full_answer: r.raw.slice(0, 200000), model: r.model.slice(0, 80), prompt_version: r.skillVersion.slice(0, 20) };
  await s`
    insert into app.gpt_ratings ${s(row, "isin", "rating", "issuer_rating", "risk_pay", "basis", "full_answer", "model", "prompt_version")}
    on conflict (isin) do update set rating = coalesce(excluded.rating, app.gpt_ratings.rating), issuer_rating = coalesce(excluded.issuer_rating, app.gpt_ratings.issuer_rating), risk_pay = coalesce(excluded.risk_pay, app.gpt_ratings.risk_pay), full_answer = excluded.full_answer, detail = null, basis = excluded.basis, model = excluded.model, prompt_version = excluded.prompt_version, pasted_at = now()`;
}
