import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

/**
 * Links between tables that were kept only in code, now enforced by the database (secval audit A-DB-04, 07 Nov 2026;
 * full relationship register: docs/fk-register.md, 08 Nov 2026). Each one was checked against the code that writes and
 * deletes those rows:
 *  - weekly e-mail sends belong to an account and go when it is deleted (deleteUser did not remove them);
 *  - a consent record stays as proof but no longer points at a deleted account (as trial codes already do);
 *  - imported rows belong to their import batch; tariffs to a broker profile (profiles are never deleted);
 *  - a spread review keeps its text when the risk-premium draft it named is deleted;
 *  - a risk calculation run and its results name the curve version used (only the active one; versions with runs are never deleted);
 *  - usage events belong to a visitor (recordEvents writes the visitor first; forgetting a visitor removes its events);
 *  - a research job's claim and a research run name a worker (the claim call registers the worker first; workers are never deleted);
 *  - an archived credit analysis belongs to the current analysis of that ISIN (it is copied from it; analyses are never deleted);
 *  - a net-spread run and the slider holdings name the bond-efficiency run they used; old runs are pruned, so the name is cleared.
 * Left in code on purpose: links to the bond copy (ISINs come and go daily, other login), consents -> visitors (visitors are
 * purged after 13 months while consent proof is kept), risk_premium_audit (append-only, names deleted drafts).
 *
 * Added in two stages on a live database: start-up only adds each rule NOT VALID (no row changes); the approved repair step
 * then handles old rows exactly as the rule would have (`cleanup`) and validates, one transaction per link.
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
  {
    name: "risk_calc_runs_version_id_fkey", table: "risk_calc_runs", column: "version_id", parent: "risk_premium_versions", parentColumn: "id",
    onDelete: "no action",
  },
  {
    name: "risk_calc_results_version_id_fkey", table: "risk_calc_results", column: "version_id", parent: "risk_premium_versions", parentColumn: "id",
    onDelete: "no action", index: "risk_calc_results_version_idx",
  },
  {
    // Old events whose visitor row is missing get the visitor back (first and last seen from the events): no event is deleted.
    name: "events_visitor_id_fkey", table: "events", column: "visitor_id", parent: "visitors", parentColumn: "visitor_id",
    onDelete: "cascade", index: "events_visitor_idx",
    cleanup: "insert into app.visitors (visitor_id, first_seen, last_seen) select e.visitor_id, min(e.at), max(e.at) from app.events e where not exists (select 1 from app.visitors v where v.visitor_id = e.visitor_id) group by e.visitor_id on conflict (visitor_id) do nothing",
  },
  {
    // Workers that claimed a job before the workers table existed get their row back (never deleted, nothing lost).
    name: "credit_research_jobs_claimed_by_fkey", table: "credit_research_jobs", column: "claimed_by", parent: "credit_research_workers", parentColumn: "worker_id",
    onDelete: "set null", index: "credit_research_jobs_claimed_by_idx",
    cleanup: "insert into app.credit_research_workers (worker_id, last_seen) select j.claimed_by, max(coalesce(j.claimed_at, j.updated_at)) from app.credit_research_jobs j where j.claimed_by is not null and not exists (select 1 from app.credit_research_workers w where w.worker_id = j.claimed_by) group by j.claimed_by on conflict (worker_id) do nothing",
  },
  {
    name: "credit_research_runs_worker_id_fkey", table: "credit_research_runs", column: "worker_id", parent: "credit_research_workers", parentColumn: "worker_id",
    onDelete: "no action", index: "credit_research_runs_worker_idx",
    cleanup: "insert into app.credit_research_workers (worker_id, last_seen) select r.worker_id, max(r.at) from app.credit_research_runs r where r.worker_id is not null and not exists (select 1 from app.credit_research_workers w where w.worker_id = r.worker_id) group by r.worker_id on conflict (worker_id) do nothing",
  },
  {
    name: "bond_credit_analysis_history_isin_fkey", table: "bond_credit_analysis_history", column: "isin", parent: "bond_credit_analysis", parentColumn: "isin",
    onDelete: "no action",
  },
  {
    name: "pe_runs_bes_run_id_fkey", table: "pe_runs", column: "bes_run_id", parent: "bes_runs", parentColumn: "id",
    onDelete: "set null", index: "pe_runs_bes_run_idx",
    cleanup: "update app.pe_runs p set bes_run_id = null where p.bes_run_id is not null and not exists (select 1 from app.bes_runs b where b.id = p.bes_run_id)",
  },
  {
    name: "efficient_portfolio_holdings_bes_run_id_fkey", table: "efficient_portfolio_holdings", column: "bes_run_id", parent: "bes_runs", parentColumn: "id",
    onDelete: "set null", index: "efficient_portfolio_holdings_bes_run_idx",
    cleanup: "update app.efficient_portfolio_holdings h set bes_run_id = null where h.bes_run_id is not null and not exists (select 1 from app.bes_runs b where b.id = h.bes_run_id)",
  },
];

/**
 * Start-up step (runs at every boot, from several modules): for each link whose two tables exist, creates its index and adds
 * the rule as NOT VALID. It never changes, adds or deletes a row and never validates: NOT VALID checks new and updated rows
 * only, so old rows that break a link stay as they are. Repairing old rows and validating is a separate, approved step
 * (`repairAndValidateLinks`, run by scripts/db-link-repair.ts), so a deploy alone cannot modify production data.
 * Note: once a rule exists, its delete rule applies to every row, old or new (for example pruning a scoring run clears
 * the run id on holdings that still point at it).
 */
export async function ensureLinks(sql: Sql, links: Link[] = LINKS, lockTimeout = "5s"): Promise<void> {
  for (const l of links) {
    const [r] = await sql`
      select to_regclass(${"app." + l.table}) as child, to_regclass(${"app." + l.parent}) as parent,
             exists (select 1 from pg_constraint where conname = ${l.name} and connamespace = 'app'::regnamespace) as present`;
    if (!r?.child || !r?.parent) continue;
    if (r.present && !l.index) continue;
    try {
      // Wait at most `lockTimeout` for each table lock, so a busy table never stalls start-up; the next start tries again.
      await sql.begin(async (tx) => {
        await tx.unsafe(`set local lock_timeout = '${lockTimeout.replace(/[^0-9a-z]/gi, "")}'`);
        if (l.index) await tx.unsafe(`create index if not exists ${l.index} on app.${l.table} (${l.column})`);
        if (!r.present) {
          await tx.unsafe(
            `alter table app.${l.table} add constraint ${l.name} foreign key (${l.column}) references app.${l.parent} (${l.parentColumn}) on delete ${l.onDelete} not valid`,
          );
        }
      });
    } catch (e) {
      const code = String((e as { code?: string }).code);
      // 42710 / 23505 / 42P07: another process added the same rule or index at the same moment.
      if (["42710", "23505", "42P07"].includes(code)) continue;
      if (code === "55P03") { console.error(`[db-links] ${l.name}: table busy, rule not added this time (next start retries)`); continue; }
      throw e;
    }
  }
}

/** Read-only: how many existing rows break each link (rows the repair would touch). Links whose tables are missing are skipped. */
export async function linkViolations(sql: Sql | postgres.TransactionSql, links: Link[] = LINKS): Promise<{ name: string; rows: number; validated: boolean | null }[]> {
  const out: { name: string; rows: number; validated: boolean | null }[] = [];
  for (const l of links) {
    const [r] = await sql`select to_regclass(${"app." + l.table}) as child, to_regclass(${"app." + l.parent}) as parent,
      (select convalidated from pg_constraint where conname = ${l.name} and connamespace = 'app'::regnamespace) as validated`;
    if (!r?.child || !r?.parent) continue;
    const [c] = await sql.unsafe(
      `select count(*)::int as n from app.${l.table} c where c.${l.column} is not null and not exists (select 1 from app.${l.parent} p where p.${l.parentColumn} = c.${l.column})`,
    );
    out.push({ name: l.name, rows: Number(c.n), validated: r.validated ?? null });
  }
  return out;
}

/** Thrown inside the repair transaction to undo everything (verification failed). */
export class RepairRolledBack extends Error {}

/**
 * The approved data step (never run at start-up). Everything runs in ONE transaction at REPEATABLE READ: for each link, repair
 * the old rows that break it (`cleanup`: same effect as the delete rule, or re-creating a missing parent) and validate the rule.
 * `hooks.before` runs first and `hooks.verify` last, inside the same transaction, before anything is committed. Because of the snapshot it sees only this
 * repair's own changes, not live traffic. If a link does not validate or `verify` throws, nothing at all is kept.
 * Adds the rules first if a start-up has not done it yet.
 */
export async function repairAndValidateLinks(
  sql: Sql,
  links: Link[] = LINKS,
  hooks: {
    before?: (tx: postgres.TransactionSql) => Promise<void>;
    verify?: (tx: postgres.TransactionSql, result: { name: string; repaired: number }[]) => Promise<void>;
    lockTimeout?: string;
  } = {},
): Promise<{ name: string; repaired: number; validated: boolean }[]> {
  await ensureLinks(sql, links, hooks.lockTimeout);
  return (await sql.begin("isolation level repeatable read", async (tx) => {
    if (hooks.before) await hooks.before(tx);
    const done: { name: string; repaired: number }[] = [];
    for (const l of links) {
      const [r] = await tx`select convalidated from pg_constraint where conname = ${l.name} and connamespace = 'app'::regnamespace`;
      if (!r) {
        const [t] = await tx`select to_regclass(${"app." + l.table}) is not null and to_regclass(${"app." + l.parent}) is not null as both`;
        if (t?.both) throw new RepairRolledBack(`${l.name}: the rule could not be added (table busy?); nothing was repaired, run again`);
        continue; // a table of this link does not exist in this database
      }
      if (r.convalidated) { done.push({ name: l.name, repaired: 0 }); continue; }
      const res = l.cleanup ? await tx.unsafe(l.cleanup) : null;
      await tx.unsafe(`alter table app.${l.table} validate constraint ${l.name}`);
      done.push({ name: l.name, repaired: res?.count ?? 0 });
    }
    if (hooks.verify) await hooks.verify(tx, done);
    return done.map((d) => ({ ...d, validated: true }));
  })) as { name: string; repaired: number; validated: boolean }[];
}

/**
 * Tables with no link to another table of this database, by design (secval rule AD-01: reported as `standaloneTables`,
 * only tables with no foreign key count, at most half of all tables). Each reason says why no foreign key fits.
 * risk_premium_audit is listed although it names a version: an append-only audit must keep the id of a deleted draft.
 * Every table is classified in docs/fk-register.md (A linked, C independent, D external or special design).
 */
export const STANDALONE_TABLES: Record<string, string> = {
  settings: "key/value settings of the app",
  bond_import_settings: "key/value settings of the bond import",
  broker_settings: "key/value settings of the broker pages",
  credit_research_settings: "key/value settings of credit research",
  credit_worker_kb: "key/value knowledge for the research worker",
  bond_code_counters: "counters that hand out bond codes",
  efficient_portfolio_migrations: "log of one-time data migrations",
  shortlist_seeds: "one-time seed markers",
  credit_research_tokens: "hashed worker access tokens, linked to nothing",
  refresh_requests: "requests read by lm-op-model (another app), named by the admin's name only",
  best_bonds: "ranking rebuilt from the bond copy, which lives under another login (no foreign key possible)",
  frontier_cache: "cache computed from the bond copy",
  bond_daily_prices: "daily prices of bonds from the copy; bonds leave the copy, history stays",
  bond_price_weeks: "weekly price ranges of bonds from the copy; history outlives the bond",
  ytm_history: "daily yields of bonds from the copy; history outlives the bond",
  daily_counts: "anonymous daily page counts",
  assessment_evidence: "published evidence per ISIN of the bond copy (other login)",
  credit_reference_cases: "reference cases per ISIN, some for bonds not in the copy",
  correction_requests: "public correction form: ISIN and the sender's e-mail, no account needed",
  outreach: "outreach e-mail drafts to firms, not accounts",
  shortlists: "admin shortlists holding ISIN lists of the bond copy",
  seo_actions: "SEO to-do status by key",
  seo_backlinks: "backlinks found for the public site",
  seo_daily_stats: "daily search-engine statistics",
  seo_manual: "manual SEO ratings with the admin's e-mail",
  seo_opportunities: "SEO keyword opportunities",
  risk_premium_audit: "append-only audit of curve changes: keeps the id of a draft after the draft is deleted",
  benchmark_curve: "Bund yield curve imported from the Bundesbank",
  benchmark_imports: "log of Bund curve imports",
  historical_default_probabilities: "published default-rate reference tables",
  email_log: "log of sent e-mails, address masked, linked to nothing on purpose",
  pe_reference_samples: "net-spread reference samples per bond-copy batch (batch id of the copy, other login)",
  plan_features: "feature matrix per plan",
  plan_limits: "key/value search limits per plan",
  portfolio_builds: "log of portfolio build runs",
  risk_band_config: "key/value risk band settings",
  seo_daily: "daily search-engine totals",
  llm_settings: "key/value AI settings",
  gpt_ratings: "ratings per ISIN of the bond copy (other login)",
  llm_calls: "AI call counter per ISIN of the bond copy (other login)",
  bond_runs: "AI research runs per ISIN of the bond copy (other login); history outlives the bond",
};
