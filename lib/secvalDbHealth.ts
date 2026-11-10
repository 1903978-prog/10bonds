import { timingSafeEqual, createHash } from "node:crypto";

/**
 * Database report for secval (the owner's monitoring tool), GET /api/secval/db-health. Contract:
 * anti-hacker docs/database-check.md. Counts and yes/no only: never row data, table names or column names.
 * Off (404) unless the Fly secret SECVAL_DBCHECK_TOKEN is set. A value the site cannot tell is null, never guessed.
 */

export type DbHealthReport = {
  version: 1;
  engine: "postgresql";
  checkedAt: string;
  tables: number;
  tablesWithoutPrimaryKey: number;
  foreignKeys: number;
  foreignKeysWithoutIndex: number;
  /** Tables that take part in at least one foreign key, as child or parent. */
  tablesInLinks: number;
  /** Tables with no foreign key that are standalone by design, each listed with its reason in lib/dbLinks.ts. */
  standaloneTables: number;
  orphanRows: number | null;
  uniqueConstraints: number;
  checkConstraints: number;
  pendingMigrations: number | null;
  lastBackupAt: string | null;
  lastRestoreTestAt: string | null;
  integrityOk: boolean | null;
};

/** Settings keys written by the nightly backup job (.github/workflows/backup.yml) after its restore test passed. */
export const BACKUP_KEYS = { backup: "backup_last_ok_at", restore: "backup_restore_test_ok_at" } as const;

/** Constant-time token check (hashing first so different lengths take the same time). */
export function tokenOk(header: string | null, token: string | undefined): boolean {
  if (!token) return false;
  const m = /^Bearer\s+(.+)$/i.exec(header ?? "");
  if (!m) return false;
  const a = createHash("sha256").update(m[1]!.trim()).digest();
  const b = createHash("sha256").update(token).digest();
  return timingSafeEqual(a, b);
}

const iso = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

export type DbHealthDeps = {
  /** Runs a read-only query on the site's own database (schema app); throws when it is not reachable. */
  query: (text: "tables" | "constraints" | "fkNoIndex" | "linked" | "standalone") => Promise<Record<string, unknown>[]>;
  /** The site's own start-up schema setup finished (that setup is how this site applies schema changes). */
  schemaReady: () => Promise<boolean>;
  setting: (key: string) => Promise<string | null>;
  /** Ranked bonds (app.best_bonds) whose ISIN is not in the bond copy, or null when the copy cannot be read. */
  orphanRankings: () => Promise<number | null>;
  /** The bond copy passes the site's own daily data check (fresh, complete, no duplicate ISIN). */
  bondCopyOk: () => Promise<boolean>;
};

export async function buildReport(d: DbHealthDeps, now = new Date()): Promise<DbHealthReport> {
  const [t] = await d.query("tables");
  const cons = await d.query("constraints");
  const [fk] = await d.query("fkNoIndex");
  const [linked] = await d.query("linked");
  const [standalone] = await d.query("standalone");
  const count = (k: string) => Number(cons.find((r) => r.contype === k)?.n ?? 0);
  const ready = await d.schemaReady().catch(() => false);
  const orphans = await d.orphanRankings().catch(() => null);
  const copyOk = await d.bondCopyOk().catch(() => false);
  return {
    version: 1,
    engine: "postgresql",
    checkedAt: now.toISOString(),
    tables: Number(t?.tables ?? 0),
    tablesWithoutPrimaryKey: Number(t?.tables_without_pk ?? 0),
    foreignKeys: count("f"),
    foreignKeysWithoutIndex: Number(fk?.n ?? 0),
    tablesInLinks: Number(linked?.n ?? 0),
    standaloneTables: Number(standalone?.n ?? 0),
    // Every link inside schema app is a foreign key (enforced, 0 broken). The one link kept in code is best_bonds -> bond copy.
    orphanRows: orphans,
    uniqueConstraints: count("u"),
    checkConstraints: count("c"),
    pendingMigrations: ready ? 0 : null,
    lastBackupAt: iso(await d.setting(BACKUP_KEYS.backup).catch(() => null)),
    lastRestoreTestAt: iso(await d.setting(BACKUP_KEYS.restore).catch(() => null)),
    // The catalogue queries ran (else this function threw), and the bond copy passes the site's own check.
    integrityOk: copyOk,
  };
}

let cached: { at: number; report: Promise<DbHealthReport> } | null = null;

/** The report, worked out at most once a minute; callers arriving while it is being worked out share that one run. */
export function cachedReport(d: DbHealthDeps, now = Date.now()): Promise<DbHealthReport> {
  if (cached && now - cached.at < 60_000) return cached.report;
  const report = buildReport(d, new Date(now));
  const entry = { at: now, report };
  cached = entry;
  report.catch(() => { if (cached === entry) cached = null; });
  return report;
}

export function resetDbHealthCache() {
  cached = null;
}
