import { accountsSql } from "./accounts";
import type { GptRating } from "./gptRatings";

// Admin only (the owner, 24/10/2026): GPT's ratings pasted back on the finder, one row per ISIN (the newest paste wins).
// Never shown to customers.

export type SavedGptRating = GptRating & { at: string };

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
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

export async function loadGptRatings(): Promise<Record<string, SavedGptRating>> {
  const s = await sql();
  const rows = await s<{ isin: string; rating: string | null; issuer_rating: string | null; risk_pay: string | null; basis: string | null; pasted_at: Date }[]>`select isin, rating, issuer_rating, risk_pay, basis, pasted_at from app.gpt_ratings`;
  return Object.fromEntries(rows.map((r) => [r.isin, { rating: r.rating, issuerRating: r.issuer_rating, riskPay: r.risk_pay, basis: r.basis, at: new Date(r.pasted_at).toISOString() }]));
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
    on conflict (isin) do update set rating = excluded.rating, issuer_rating = excluded.issuer_rating, risk_pay = null, basis = excluded.basis, pasted_at = now()`;
  return rows.length;
}

/** Provisional scenario values (ranges as text, stored Risk Pay): one row per ISIN, replacing that ISIN's earlier row. */
export async function saveScenarioRatings(rows: { isin: string; rating: string; issuerRating: string; riskPay: string; basis: string }[]): Promise<number> {
  const clean = rows.filter((r) => ISIN.test(r.isin)).map((r) => ({ isin: r.isin, rating: r.rating.slice(0, 40), issuer_rating: r.issuerRating.slice(0, 40), risk_pay: r.riskPay.slice(0, 40), basis: r.basis.slice(0, 600) }));
  if (!clean.length) return 0;
  const s = await sql();
  await s`
    insert into app.gpt_ratings ${s(clean, "isin", "rating", "issuer_rating", "risk_pay", "basis")}
    on conflict (isin) do update set rating = excluded.rating, issuer_rating = excluded.issuer_rating, risk_pay = excluded.risk_pay, basis = excluded.basis, pasted_at = now()`;
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
