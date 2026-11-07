import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

/**
 * Links between tables that were kept only in code, now enforced by the database (secval audit A-DB-04, 07 Nov 2026).
 * Each one was checked against the code that writes and deletes those rows:
 *  - weekly e-mail sends belong to an account and go when it is deleted (deleteUser did not remove them);
 *  - a consent record stays as proof but no longer points at a deleted account (as trial codes already do);
 *  - imported rows belong to their import batch; tariffs to a broker profile (profiles are never deleted);
 *  - a spread review keeps its text when the risk-premium draft it named is deleted.
 * Left in code on purpose: links to the bond copy (ISINs come and go daily), consents -> visitors (visitors are purged
 * after 13 months while consent proof is kept), risk_premium_audit (append-only, names deleted drafts), credit research
 * runs -> workers (a run can be saved before its worker's first heartbeat).
 *
 * Added the safe way on a live database: rows that already break a link are first handled exactly as the new rule would
 * have handled them (`cleanup`), the constraint is added NOT VALID (instant, checks new rows only), then validated
 * (reads old rows without blocking writes). A validation that still fails is logged and the constraint stays NOT VALID.
 */
export type Link = {
  name: string;
  table: string;
  column: string;
  parent: string;
  parentColumn: string;
  onDelete: "cascade" | "set null" | "no action";
  /** Index on the linking column, when no existing index starts with it. */
  index?: string;
  /** One-time repair of rows that already break the link, same effect as the delete rule. */
  cleanup?: string;
};

export const LINKS: Link[] = [
  {
    name: "weekly_email_sends_user_id_fkey", table: "weekly_email_sends", column: "user_id", parent: "users", parentColumn: "id",
    onDelete: "cascade", index: "weekly_email_sends_user_idx",
    cleanup: "delete from app.weekly_email_sends s where not exists (select 1 from app.users u where u.id = s.user_id)",
  },
  {
    name: "consents_user_id_fkey", table: "consents", column: "user_id", parent: "users", parentColumn: "id",
    onDelete: "set null",
    cleanup: "update app.consents c set user_id = null where c.user_id is not null and not exists (select 1 from app.users u where u.id = c.user_id)",
  },
  {
    name: "bond_import_rows_batch_id_fkey", table: "bond_import_rows", column: "batch_id", parent: "bond_import_batches", parentColumn: "id",
    onDelete: "cascade",
  },
  {
    name: "broker_tariffs_broker_id_fkey", table: "broker_tariffs", column: "broker_id", parent: "broker_profiles", parentColumn: "id",
    onDelete: "no action", index: "broker_tariffs_broker_idx",
  },
  {
    name: "risk_spread_reviews_version_id_fkey", table: "risk_spread_reviews", column: "version_id", parent: "risk_premium_versions", parentColumn: "id",
    onDelete: "set null", index: "risk_spread_reviews_version_idx",
    cleanup: "update app.risk_spread_reviews r set version_id = null where r.version_id is not null and not exists (select 1 from app.risk_premium_versions v where v.id = r.version_id)",
  },
];

/** Adds every link whose two tables exist and that is not there yet. Safe to run at every start and from several modules. */
export async function ensureLinks(sql: Sql, links: Link[] = LINKS): Promise<void> {
  for (const l of links) {
    const [r] = await sql`
      select to_regclass(${"app." + l.table}) as child, to_regclass(${"app." + l.parent}) as parent,
             exists (select 1 from pg_constraint where conname = ${l.name} and connamespace = 'app'::regnamespace) as present`;
    if (!r?.child || !r?.parent) continue;
    if (l.index) await sql.unsafe(`create index if not exists ${l.index} on app.${l.table} (${l.column})`);
    if (r.present) continue;
    try {
      await sql.begin(async (tx) => {
        if (l.cleanup) await tx.unsafe(l.cleanup);
        await tx.unsafe(
          `alter table app.${l.table} add constraint ${l.name} foreign key (${l.column}) references app.${l.parent} (${l.parentColumn}) on delete ${l.onDelete} not valid`,
        );
      });
    } catch (e) {
      // Another process added it at the same moment: nothing to do.
      if ((e as { code?: string }).code === "42710") continue;
      throw e;
    }
    try {
      await sql.unsafe(`alter table app.${l.table} validate constraint ${l.name}`);
    } catch (e) {
      console.error(`[db-links] ${l.name}: old rows still break the link, kept NOT VALID:`, (e as Error).message);
    }
  }
}
