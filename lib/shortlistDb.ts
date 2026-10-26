import { accountsSql } from "./accounts";

// Admin only (the owner, 25/10/2026): named shortlists of ISINs ("LM #1", "LM #2", ...) for the Shortlist page and the
// dots on the Multi-year chart and the Heat map. Nothing here changes the bond copy, rankings or customer pages.

export type Shortlist = { id: number; name: string; isins: string[]; updatedAt: string };

/** Shortlist 1, put in when the table is first made (the owner, 25/10/2026). */
const FIRST = { name: "LM #1", isins: ["XS2338570331", "FR0013482841", "DE000DK013Y7", "CH1578978947", "FR0013451416", "DE000HEL0Y75", "XS2629468278", "XS1218363270", "XS2073758885", "XS2317123052", "XS3022388980"] };

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

type Row = { id: string; name: string; isins: string[]; updated_at: Date };
const toList = (r: Row): Shortlist => ({ id: Number(r.id), name: r.name, isins: r.isins, updatedAt: new Date(r.updated_at).toISOString() });

export async function loadShortlists(): Promise<Shortlist[]> {
  const s = await sql();
  return (await s<Row[]>`select id::text, name, isins, updated_at from app.shortlists order by id`).map(toList);
}

/** Creates a shortlist; "exists" when the name is taken. */
export async function createShortlist(name: string, isins: string[]): Promise<Shortlist | "exists"> {
  const s = await sql();
  const r = await s<Row[]>`insert into app.shortlists (name, isins) values (${name}, ${isins}) on conflict (name) do nothing returning id::text, name, isins, updated_at`;
  return r[0] ? toList(r[0]) : "exists";
}

/** Renames and/or replaces the ISINs; null when the id is unknown, "exists" when the new name belongs to another list. */
export async function updateShortlist(id: number, name: string, isins: string[]): Promise<Shortlist | null | "exists"> {
  const s = await sql();
  const clash = await s`select 1 from app.shortlists where name = ${name} and id <> ${id}`;
  if (clash.length) return "exists";
  const r = await s<Row[]>`update app.shortlists set name = ${name}, isins = ${isins}, updated_at = now() where id = ${id} returning id::text, name, isins, updated_at`;
  return r[0] ? toList(r[0]) : null;
}

export async function deleteShortlist(id: number): Promise<boolean> {
  const s = await sql();
  return (await s`delete from app.shortlists where id = ${id} returning id`).length > 0;
}
