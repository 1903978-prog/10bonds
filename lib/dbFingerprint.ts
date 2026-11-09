import type postgres from "postgres";

type Sql = ReturnType<typeof postgres> | postgres.TransactionSql;

/** Columns the link repair may change (lib/dbLinks.ts cleanups). Every other column of every table must stay identical. */
export const REPAIR_COLUMNS: Record<string, string[]> = {
  consents: ["user_id"],
  risk_spread_reviews: ["version_id"],
  pe_runs: ["bes_run_id"],
  efficient_portfolio_holdings: ["bes_run_id"],
};

export type TableFingerprint = { rows: number; hash: string; hashWithoutRepairColumns: string };

/**
 * Read-only fingerprint of every table in schema app: row count, a hash of all rows (order-independent), and the same hash
 * without the columns the repair may change. Used before and after the link repair to prove that only the expected rows changed.
 */
export async function fingerprint(sql: Sql): Promise<Record<string, TableFingerprint>> {
  const tables = await sql`select relname from pg_class where relnamespace = 'app'::regnamespace and relkind = 'r' order by relname collate "C"`;
  const out: Record<string, TableFingerprint> = {};
  for (const { relname } of tables) {
    const t = String(relname);
    const drop = REPAIR_COLUMNS[t] ?? [];
    const minus = drop.length ? ` - array[${drop.map((c) => `'${c}'`).join(",")}]::text[]` : "";
    const [r] = await sql.unsafe(`
      select count(*)::int as rows,
             coalesce(md5(string_agg(a, '' order by a)), '') as hash,
             coalesce(md5(string_agg(b, '' order by b)), '') as hash2
      from (select md5(to_jsonb(t)::text) as a, md5((to_jsonb(t)${minus})::text) as b from app.${t} t) s`);
    out[t] = { rows: Number(r.rows), hash: String(r.hash), hashWithoutRepairColumns: String(r.hash2) };
  }
  return out;
}

/** Tables whose rows or contents differ between two fingerprints, with the row-count change and whether only repair columns changed. */
export function compareFingerprints(before: Record<string, TableFingerprint>, after: Record<string, TableFingerprint>) {
  const changes: { table: string; rowsBefore: number; rowsAfter: number; onlyRepairColumns: boolean }[] = [];
  for (const t of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = before[t], a = after[t];
    if (b && a && b.hash === a.hash) continue;
    changes.push({ table: t, rowsBefore: b?.rows ?? 0, rowsAfter: a?.rows ?? 0, onlyRepairColumns: !!b && !!a && b.rows === a.rows && b.hashWithoutRepairColumns === a.hashWithoutRepairColumns });
  }
  return changes.sort((x, y) => x.table.localeCompare(y.table));
}
