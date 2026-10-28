import { accountsConfigured, accountsSql } from "./accounts";
import { loadBondIdentities } from "./bonds";

// Permanent bond codes (owner, 28/10/2026): three-letter currency + five digits, a separate sequence per currency (EUR00001, USD00001, ...).
// The first assignment sorts each currency alphabetically (normalized issuer, then security name, maturity, ISIN); later bonds are appended with
// the next number and no code is ever changed, reused or deleted. Codes live in app.bond_codes keyed by ISIN (the bond copy itself is read-only
// for the site), so a price update or a name correction cannot touch them. The allocator runs in one transaction and locks the currency's counter.

export const CODE_RE = /^[A-Z]{3}[0-9]{5}$/;
export const MAX_SEQ = 99999;
export const WARN_SEQ = 95000;

export type BondIdentity = { isin: string; name: string | null; issuer: string | null; currency: string | null; maturity: string | null };
export const normName = (s: string | null) => (s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const codeOf = (currency: string, seq: number) => `${currency}${String(seq).padStart(5, "0")}`;
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Deterministic order of new bonds: normalized issuer, security name, maturity, ISIN. */
export function orderForCodes(bonds: BondIdentity[]): BondIdentity[] {
  return [...bonds].sort((a, b) => cmp(normName(a.issuer), normName(b.issuer)) || cmp(normName(a.name), normName(b.name)) || cmp(a.maturity ?? "", b.maturity ?? "") || cmp(a.isin, b.isin));
}

/** The new codes for bonds that have none: per currency, from the counter's next number. Throws before using number 100000 (capacity needs a reviewed extension). */
export function planCodes(missing: BondIdentity[], last: Record<string, number>): { isin: string; currency: string; seq: number; code: string }[] {
  const next = { ...last };
  const out: { isin: string; currency: string; seq: number; code: string }[] = [];
  for (const b of orderForCodes(missing)) {
    const cur = b.currency;
    if (!cur || !/^[A-Z]{3}$/.test(cur)) continue; // no usable currency: no code until the copy has one
    const seq = (next[cur] ?? 0) + 1;
    if (seq > MAX_SEQ) throw new Error(`Bond code capacity reached for ${cur} (${cur}${MAX_SEQ}). An extension (six digits) must be reviewed and approved before more ${cur} bonds get codes.`);
    next[cur] = seq;
    out.push({ isin: b.isin, currency: cur, seq, code: codeOf(cur, seq) });
  }
  return out;
}

export async function bondCodeTablesReady(): Promise<void> {
  const s = await accountsSql();
  await s`create table if not exists app.bond_code_counters (currency text primary key check (currency ~ '^[A-Z]{3}$'), last_seq integer not null default 0 check (last_seq between 0 and 99999))`;
  await s`create table if not exists app.bond_codes (
    isin text primary key,
    bond_code text not null unique,
    currency text not null,
    seq integer not null check (seq between 1 and 99999),
    assigned_at timestamptz not null default now(),
    check (bond_code ~ '^[A-Z]{3}[0-9]{5}$'),
    check (bond_code = currency || lpad(seq::text, 5, '0')),
    unique (currency, seq))`;
}

export type CodeRun = { total: number; assigned: number; withoutCurrency: number; perCurrency: Record<string, { codes: number; last: number }> };

/** Gives every bond in the copy a code if it has none (safe to run any time, also two at once). Existing codes are never touched. */
export async function assignBondCodes(identities?: BondIdentity[] | null): Promise<CodeRun | null> {
  if (!accountsConfigured()) return null;
  const bonds = identities ?? (await loadBondIdentities());
  if (!bonds) return null;
  await bondCodeTablesReady();
  const s = await accountsSql();
  let assigned = 0;
  await s.begin(async (tx) => {
    const currencies = [...new Set(bonds.map((b) => b.currency).filter((c): c is string => !!c && /^[A-Z]{3}$/.test(c)))].sort();
    for (const c of currencies) await tx`insert into app.bond_code_counters (currency) values (${c}) on conflict do nothing`;
    // Counters are locked first and in a fixed order, so two imports at once wait for each other instead of clashing.
    const locked = currencies.length ? await tx`select currency, last_seq from app.bond_code_counters where currency in ${tx(currencies)} order by currency for update` : [];
    const have = new Set((await tx`select isin from app.bond_codes`).map((r) => String(r.isin)));
    const missing = bonds.filter((b) => !have.has(b.isin));
    if (!missing.length) return;
    const plan = planCodes(missing, Object.fromEntries(locked.map((r) => [String(r.currency), Number(r.last_seq)])));
    if (plan.length) await tx`insert into app.bond_codes ${tx(plan.map((p) => ({ isin: p.isin, bond_code: p.code, currency: p.currency, seq: p.seq })))}`;
    for (const c of currencies) {
      const top = Math.max(0, ...plan.filter((p) => p.currency === c).map((p) => p.seq));
      if (top) await tx`update app.bond_code_counters set last_seq = ${top} where currency = ${c}`;
    }
    assigned = plan.length;
  });
  return { ...(await codeSummary()), total: bonds.length, assigned, withoutCurrency: bonds.filter((b) => !b.currency || !/^[A-Z]{3}$/.test(b.currency)).length };
}

export async function codeSummary(): Promise<CodeRun> {
  await bondCodeTablesReady();
  const s = await accountsSql();
  const rows = await s`select currency, count(*)::int n, max(seq)::int top from app.bond_codes group by currency order by currency`;
  return { total: 0, assigned: 0, withoutCurrency: 0, perCurrency: Object.fromEntries(rows.map((r) => [String(r.currency), { codes: Number(r.n), last: Number(r.top) }])) };
}

export async function codesFor(isins: string[]): Promise<Map<string, string>> {
  if (!isins.length) return new Map();
  const s = await accountsSql();
  const rows = await s`select isin, bond_code from app.bond_codes where isin in ${s(isins)}`;
  return new Map(rows.map((r) => [String(r.isin), String(r.bond_code)]));
}
