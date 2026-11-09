# Release dossier: 10bonds PR #497 (database links)

09 Nov 2026. 10bonds thread. **Status: technically ready; NO-GO until Livio approves.** The rehearsal on an isolated production copy passed (gate 8). The latest backup and restore test passed (gate 3); a fresh one runs right before the repair.

PR: https://github.com/1903978-prog/10bonds/pull/497 · branch `claude/project-thread-7z33df` · base `main` at `4c77d79` (PR #496, merged and deployed 07 Nov). The head SHA is the one on the PR at approval time; this dossier was written at `aa688aa`, and later commits on the branch touch only documentation. No other app depends on this release. Secval only reads it.

## 1. What changes, in order

### Step 1: deploy (the normal Fly deploy of `main` after merge)

Start-up writes the following to the schema. These are schema changes, not row changes.
- 13 foreign keys added as `NOT VALID`. Old rows are not checked; new and updated rows are.
- 6 indexes, created only if missing: `risk_calc_results_version_idx`, `events_visitor_idx`, `credit_research_jobs_claimed_by_idx`, `credit_research_runs_worker_idx`, `pe_runs_bes_run_idx`, `efficient_portfolio_holdings_bes_run_idx`. The 3 links from 07 Nov reuse indexes that already exist or that this PR adds the same way.

Start-up changes no rows and validates nothing (`ensureLinks`, lib/dbLinks.ts; proven by the test "start-up adds the rules without touching old rows").

Locks:
- Adding a `NOT VALID` foreign key takes a brief lock on the two tables.
- `create index` (not concurrent) blocks writes to that table while it builds. The table sizes for the 6 indexes are **UNVERIFIED**; the rehearsal (gate 8) measures the time.

**Row changes the app makes by itself after the deploy** (delete rules of the new keys, part of normal operation):
- Every time a bond-efficiency run is pruned (about 1 to 2 times a day), `bes_run_id` is set to empty on the holdings and net-spread runs that still name it. That is about 3,320 holdings per pruned run. This is the fix that stops new dead references; scores are not touched.
- Deleting an account now also deletes its weekly-e-mail send rows (before, they were left behind), and empties `consents.user_id`, keeping the consent text.
- Deleting a visitor deletes its events. `forgetVisitor` already did this; the 13-month purge only removes visitors whose events are already purged.
- Deleting a risk-premium draft empties `risk_spread_reviews.version_id`.
- `claimJob` adds a worker row if one is missing. The claim route already does this first, so in practice nothing changes.

### Step 2: the repair (a production data migration; needs its own explicit approval)

Run once, after step 1:

```
REPAIR_DATABASE_URL=<app login> npx vite-node -c vitest.config.ts scripts/db-link-repair.ts            # read-only check
REPAIR_DATABASE_URL=<app login> npx vite-node -c vitest.config.ts scripts/db-link-repair.ts --apply    # repair + validate
```

- One transaction per link: repair the old rows, then `VALIDATE`. If validation fails, that link's repair rolls back.
- `--apply` fingerprints all tables before and after (row count and hash, with and without the repaired columns).
- It exits 1 if anything outside the expected changes moved, or if a link did not validate.

Expected row changes, measured read-only on production. These counts change daily, so use the read-only check's numbers at run time.

| Table | Change | Rows (09 Nov 02:39 UTC) | Data lost |
|---|---|---:|---|
| efficient_portfolio_holdings | `bes_run_id` set to empty where the run was pruned | 80,200 (+ about 3,320 per pruned run until release) | the id of a run that no longer exists; scores, holdings and snapshots stay |
| pe_runs | `bes_run_id` set to empty where the run was pruned | 3 | same |
| visitors | rows re-created for events whose visitor is missing (first/last seen from their events) | 32 (for 673 events) | none; they get new visitor numbers |
| weekly_email_sends | delete sends of deleted accounts | 0 | none at today's count |
| consents | empty `user_id` of deleted accounts | 0 | none at today's count |
| risk_spread_reviews | empty `version_id` of deleted drafts | 0 | none at today's count |
| credit_research_workers | re-create missing workers | 0 | none |
| the other 6 links | nothing; validate only | 0 | none |

**No DELETE runs at today's counts.** The one DELETE in the repair (weekly sends of deleted accounts) currently matches 0 rows. Every portfolio snapshot and historical record is kept. Old snapshots are not trimmed; that is a separate future decision.

### Step 3: verify

- `docs/fk-orphan-check.sql` returns 0 on all 13 links.
- Its last query returns no foreign key that is not validated.
- Production has 45 validated foreign keys (32 + 13).
- The published slider snapshots show the same portfolios and scores before and after: compare `efficient_portfolio_positions` and the holdings' `bes_score` for status `published`. The repair touches neither, and the fingerprint proves it.

## 2. Current scores and historical scores

- **Current (verified):** the 4 published snapshots have 0 dead references. 16,730 holdings point at live runs, and their copied scores equal the run's `bes_bonds` (0 differences, production read 09 Nov 01:35).
- **Historical (cannot be re-checked):** the 80,200 holdings in superseded snapshots carry scores copied from runs 12 to 29, which were pruned. Those scores stay as recorded history, but they can no longer be re-derived from their source run. The repair does not change them.

## 3. Rollback

- **Step 1 (deploy):** `scripts/fly-rollback.sh` returns to the previous release. The 13 rules can stay; the old code works with them. To remove them, run `alter table app.<table> drop constraint <name>;` for each of the 13 names in lib/dbLinks.ts `LINKS`, and drop the 6 indexes.
- **Step 2 (repair):** the emptied ids pointed at deleted runs and the re-created visitors are new rows, so there is nothing useful to restore. If an exact restore is still wanted: take the backup right before step 2, then copy the old `bes_run_id` values back from that backup by primary key `(snapshot_id, portfolio_id, horizon, ord)`, and delete the 32 visitor rows created at the step-2 time.

## 4. Tests on the release head

- Full suite against a real Postgres 16: 162 files, 1078 tests pass (`aa688aa`).
- `tsc` 0 errors; lint 0 errors.
- The schema test passes on a fresh database and on a rerun.
- Repair tests on local data, including orphans in 3 links:
  - `scripts/db-link-repair.ts --apply` reported exactly the expected changes (pe_runs: link column only; visitors: +1);
  - `docs/db-link-repair-dryrun.sql` reported holdings and pe_runs as link column only, visitors +1, 0 constraints not validated, then rolled back.

## 5. Release gates (EENDIGO AEOS section 10)

| # | Gate | Status |
|---|---|---|
| 1 | Correct scope | PASS: 13 links, repair tool, docs; nothing else |
| 2 | Exact commit SHA | the PR head at approval time |
| 3 | No unapproved bundled changes / backup | **PASS for the last nightly run.** Production `app.settings` (read 09 Nov 02:50 UTC): `backup_last_ok_at` and `backup_restore_test_ok_at` both 2026-11-08T16:20:51Z. Both keys are written by the last step of `.github/workflows/backup.yml`, which runs only after `scripts/backup-accounts.sh` succeeds: it dumps the app schema, encrypts the dump, decrypts it, `pg_restore`s it into an empty Postgres, and checks every table and row count. At release: run that job once more right before step 2 (manual dispatch) |
| 4 | Automated tests | PASS (section 4) |
| 5 | Independent review | PENDING: the Secval audit thread is reviewing |
| 6 | Security | PASS: no new endpoint, secret or permission; the repair runs with the app's own login |
| 7 | Migration assessment | PASS: section 1 lists every schema and row change |
| 8 | Rehearsal on an isolated production copy | **PASS**, by the Secval audit thread on Neon branch `repair-dryrun-497-2026-11-09`, copied from production 09 Nov 02:45:44 UTC; production not touched. Before the repair: holdings 80,200, events 673, pe_runs 3, other links 0. Afterwards: holdings (100,390 rows) and pe_runs (8 rows) changed only in the link column; visitors 3 → 35 (+32); the other 80 tables have identical fingerprints; 45 of 45 foreign keys validated. Output: `/mnt/project-files/10bonds/db-link-repair-dryrun-output-2026-11-09.md`. The branch still exists; deleting it is part of the approval request. |
| 9 | Environment compatibility | PASS: Postgres features used (NOT VALID, VALIDATE) exist in Neon's Postgres 16 |
| 10 | Rollback written | PASS (section 3) |
| 11 | Post-deploy monitoring | step 3 checks; nightly live check |
| 12 | Written release approval | REQUIRED: Livio, for step 1 (merge + deploy) and step 2 (repair) |

**Visible side effect to know before approving:** production has only 3 visitor rows today, because visitors are counted only with cookie consent. The repair re-creates 32 visitors dated 18 to 26 Oct 2026, so admin visitor lists will show 35. The alternative is deleting the 673 orphan events instead, which loses history. Keeping them follows the instruction to preserve historical records.

**Approvals needed from Livio:**
1. Merge and deploy #497. That is step 1: schema only, no rows changed.
2. Run the repair (step 2): about 80,000 dead run ids emptied and 32 visitor rows re-created, no deletes at today's counts.
3. Delete the rehearsal branch `repair-dryrun-497-2026-11-09` in Neon (a throwaway copy).
