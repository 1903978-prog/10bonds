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
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

export async function loadGptRatings(): Promise<Record<string, SavedGptRating>> {
  const s = await sql();
  const rows = await s<{ isin: string; rating: string; basis: string | null; pasted_at: Date }[]>`select isin, rating, basis, pasted_at from app.gpt_ratings`;
  return Object.fromEntries(rows.map((r) => [r.isin, { rating: r.rating, basis: r.basis, at: new Date(r.pasted_at).toISOString() }]));
}

const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Saves (or replaces) each ISIN's rating; returns how many were saved. */
export async function saveGptRatings(raw: unknown): Promise<number> {
  const rows = Object.entries((raw ?? {}) as Record<string, Partial<GptRating>>)
    .filter(([isin, r]) => ISIN.test(isin) && typeof r?.rating === "string" && r.rating.trim())
    .slice(0, 500)
    .map(([isin, r]) => ({ isin, rating: r.rating!.trim().slice(0, 12), basis: typeof r.basis === "string" && r.basis.trim() ? r.basis.trim().slice(0, 200) : null }));
  if (!rows.length) return 0;
  const s = await sql();
  await s`
    insert into app.gpt_ratings ${s(rows, "isin", "rating", "basis")}
    on conflict (isin) do update set rating = excluded.rating, basis = excluded.basis, pasted_at = now()`;
  return rows.length;
}
