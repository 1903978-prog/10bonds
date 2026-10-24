import { accountsSql } from "./accounts";
import type { PublicBond } from "./types";

// Bonds and issuers a customer never wants to see (the owner, 24/10/2026): the search builds the portfolio without
// them. One row per bond (ISIN) or issuer (name as the data has it).

export type ExclusionKind = "bond" | "issuer";
export type Exclusion = { kind: ExclusionKind; value: string; label: string };
export const MAX_EXCLUSIONS = 200;

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`
      create table if not exists app.user_exclusions (
        user_id bigint not null references app.users(id) on delete cascade,
        kind text not null check (kind in ('bond','issuer')),
        value text not null,
        label text not null,
        created_at timestamptz not null default now(),
        primary key (user_id, kind, value)
      )`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

export async function listExclusions(userId: number): Promise<Exclusion[]> {
  const s = await sql();
  return s<Exclusion[]>`select kind, value, label from app.user_exclusions where user_id = ${userId} order by created_at desc`;
}

/** Fails open (nothing excluded) if the accounts database cannot be reached, so the search keeps working. */
export async function exclusionsOrNone(userId: number): Promise<Exclusion[]> {
  return listExclusions(userId).catch((e) => {
    console.error("[blacklist]", (e as Error).message);
    return [];
  });
}

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function cleanExclusion(raw: unknown): Exclusion | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const kind = r.kind === "bond" || r.kind === "issuer" ? r.kind : null;
  const value = text(r.value, 200);
  if (!kind || !value) return null;
  if (kind === "bond" && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(value)) return null;
  return { kind, value, label: text(r.label, 200) ?? value };
}

/** false when the list is full. */
export async function addExclusion(userId: number, e: Exclusion): Promise<boolean> {
  const s = await sql();
  const [{ n }] = await s<{ n: number }[]>`select count(*)::int as n from app.user_exclusions where user_id = ${userId}`;
  if (n >= MAX_EXCLUSIONS) return false;
  await s`insert into app.user_exclusions (user_id, kind, value, label) values (${userId}, ${e.kind}, ${e.value}, ${e.label}) on conflict do nothing`;
  return true;
}

export async function removeExclusion(userId: number, kind: ExclusionKind, value: string): Promise<void> {
  const s = await sql();
  await s`delete from app.user_exclusions where user_id = ${userId} and kind = ${kind} and value = ${value}`;
}

const issuerOf = (b: PublicBond) => b.issuer ?? b.name;

/** A test for the bonds to leave out, or null when nothing is excluded. */
export function excludedBy(list: Exclusion[]): ((b: PublicBond) => boolean) | null {
  if (!list.length) return null;
  const isins = new Set(list.filter((e) => e.kind === "bond").map((e) => e.value));
  const issuers = new Set(list.filter((e) => e.kind === "issuer").map((e) => e.value));
  return (b) => isins.has(b.isin) || issuers.has(issuerOf(b));
}
