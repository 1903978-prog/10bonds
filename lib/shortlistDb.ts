import { accountsSql } from "./accounts";

// Admin only (the owner, 25/10/2026): named shortlists of ISINs ("LM #1", "LM #2", ...) for the Shortlist page and the
// dots on the Multi-year chart and the Heat map. Nothing here changes the bond copy, rankings or customer pages.

export type Shortlist = { id: number; name: string; isins: string[]; updatedAt: string; /** The owner's own bid price per ISIN (per 100 nominal). */ bids: Record<string, number> };

/** Shortlist 1, put in when the table is first made (the owner, 25/10/2026). */
const FIRST = { name: "LM #1", isins: ["XS2338570331", "FR0013482841", "DE000DK013Y7", "CH1578978947", "FR0013451416", "DE000HEL0Y75", "XS2629468278", "XS1218363270", "XS2073758885", "XS2317123052", "XS3022388980"] };

/** Shortlist 2 with the owner's bid prices (26/10/2026). */
const SECOND = {
  name: "Shortlist 2",
  isins: ["XS3517373109", "XS2338570331", "XS2073758885", "CH1578978947", "DE000DK013Y7", "DE000NLB55R1", "XS2012044454", "FR0013365640", "XS3022388980", "XS2975303483"],
  bids: { XS3517373109: 98.46, XS2338570331: 84.84, XS2073758885: 84.51, CH1578978947: 95.54, DE000DK013Y7: 97.17, DE000NLB55R1: 93.65, XS2012044454: 91.08, FR0013365640: 96.53, XS3022388980: 93.3, XS2975303483: 96.43 } as Record<string, number>,
};

export const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Pasted text (any separator) -> distinct upper-case ISINs in order, plus the pieces that are not ISINs. */
export function parseIsins(text: string): { isins: string[]; bad: string[] } {
  const parts = text.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const isins: string[] = [];
  const bad: string[] = [];
  for (const p of parts) {
    if (!ISIN_RE.test(p)) bad.push(p);
    else if (!isins.includes(p)) isins.push(p);
  }
  return { isins, bad };
}

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    const fresh = (await s`select to_regclass('app.shortlists') as t`)[0]?.t == null;
    await s`
      create table if not exists app.shortlists (
        id bigserial primary key,
        name text not null unique,
        isins text[] not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`;
    if (fresh) await s`insert into app.shortlists (name, isins) values (${FIRST.name}, ${FIRST.isins}) on conflict (name) do nothing`;
    await s`alter table app.shortlists add column if not exists bids jsonb not null default '{}'::jsonb`;
    await s`create table if not exists app.shortlist_seeds (key text primary key)`;
    // Seeded once, so a deleted Shortlist 2 stays deleted.
    if ((await s`insert into app.shortlist_seeds (key) values ('shortlist-2') on conflict do nothing returning key`).length) {
      await s`insert into app.shortlists (name, isins, bids) values (${SECOND.name}, ${SECOND.isins}, ${s.json(SECOND.bids as never)}) on conflict (name) do nothing`;
    }
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

export async function shortlistTablesReady(): Promise<void> {
  await sql();
}

type Row = { id: string; name: string; isins: string[]; updated_at: Date; bids: Record<string, number> | null };
const toList = (r: Row): Shortlist => ({ id: Number(r.id), name: r.name, isins: r.isins, updatedAt: new Date(r.updated_at).toISOString(), bids: r.bids ?? {} });

export async function loadShortlists(): Promise<Shortlist[]> {
  const s = await sql();
  return (await s<Row[]>`select id::text, name, isins, updated_at, bids from app.shortlists order by id`).map(toList);
}

/** Creates a shortlist; "exists" when the name is taken. */
export async function createShortlist(name: string, isins: string[]): Promise<Shortlist | "exists"> {
  const s = await sql();
  const r = await s<Row[]>`insert into app.shortlists (name, isins) values (${name}, ${isins}) on conflict (name) do nothing returning id::text, name, isins, updated_at, bids`;
  return r[0] ? toList(r[0]) : "exists";
}

/** Renames and/or replaces the ISINs; null when the id is unknown, "exists" when the new name belongs to another list. */
export async function updateShortlist(id: number, name: string, isins: string[], bids?: Record<string, number>): Promise<Shortlist | null | "exists"> {
  const s = await sql();
  const clash = await s`select 1 from app.shortlists where name = ${name} and id <> ${id}`;
  if (clash.length) return "exists";
  const r = await s<Row[]>`update app.shortlists set name = ${name}, isins = ${isins}, bids = ${bids ? s.json(bids as never) : s`bids`}, updated_at = now() where id = ${id} returning id::text, name, isins, updated_at, bids`;
  return r[0] ? toList(r[0]) : null;
}

export async function deleteShortlist(id: number): Promise<boolean> {
  const s = await sql();
  return (await s`delete from app.shortlists where id = ${id} returning id`).length > 0;
}

/** Keeps only valid bid prices (positive numbers) for ISINs in the list. */
export function cleanBids(raw: unknown, isins: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === "object") for (const i of isins) {
    const v = Number((raw as Record<string, unknown>)[i]);
    if (Number.isFinite(v) && v > 0 && v < 1000) out[i] = Math.round(v * 1000) / 1000;
  }
  return out;
}
