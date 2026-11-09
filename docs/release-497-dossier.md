# Release dossier: 10bonds PR #497 (database links)

09 Nov 2026. 10bonds thread. **Status: technically ready; NO-GO until Livio approves.** The rehearsal on an isolated production copy passed (gate 8). The latest backup and restore test passed (gate 3); a fresh one runs right before the repair.

PR: https://github.com/1903978-prog/10bonds/pull/497 · branch `claude/project-thread-7z33df` · base `main` at `4c77d79` (PR #496, merged and deployed 07 Nov). Code was last changed in the commit that fixed the re-review note R1 (see gate 5). The repair statements are unchanged since `aa688aa`, which the rehearsal used: `docs/db-link-repair-dryrun.sql` is identical, and a test keeps it equal to the code. The release head is the PR head named in the consolidated release request, and the independent review must be on that exact SHA. No other app depends on this release. Secval only reads it.

## 0. Current production measurements (read-only, not results of this release)

| Measure | Value | Source |
|---|---|---|
| Foreign keys in `app` | 32, all validated | Secval audit thread, 08 Nov 04:51 UTC |
| Required links validated | 32 / 45 = 71% | register (`docs/fk-register.md`) |
| Holdings with a dead `bes_run_id` | 80,200 (all in superseded snapshots; published snapshots: 0) | 09 Nov 02:39 UTC |
| `pe_runs` with a dead `bes_run_id` | 3 | 09 Nov 02:39 UTC |
| Events whose visitor row is missing | 673, from 32 visitors (18 to 26 Oct 2026, none since) | 09 Nov 02:39 UTC |
| Other 10 new links | 0 rows breaking them | 09 Nov 02:45 (rehearsal copy) |
| Last backup and real restore test | 08 Nov 2026 16:20:51 UTC | `app.settings`, read 09 Nov 02:50 UTC |

## 1. What changes, in order

### Step 1: immediate schema changes at deploy (the normal Fly deploy of `main` after merge)

Start-up writes the following to the schema. These are schema changes, not row changes.
- 13 foreign keys added as `NOT VALID`. Old rows are not checked; new and updated rows are.
- 6 indexes, created only if missing: `risk_calc_results_version_idx`, `events_visitor_idx`, `credit_research_jobs_claimed_by_idx`, `credit_research_runs_worker_idx`, `pe_runs_bes_run_idx`, `efficient_portfolio_holdings_bes_run_idx`. The 3 links from 07 Nov reuse indexes that already exist or that this PR adds the same way.

Start-up changes no rows and validates nothing (`ensureLinks`, lib/dbLinks.ts; proven by the test "start-up adds the rules without touching old rows").

Locks:
- Adding a `NOT VALID` foreign key, and creating its index, take a lock on the table. Start-up waits at most 5 seconds for each (`lock_timeout`). If the table is busy, it logs that, skips that link and tries again at the next start.
- `create index` (not concurrent) blocks writes to that table while it builds. The audit thread measured production on 09 Nov: none of these indexes exist yet, and the largest table is `efficient_portfolio_holdings` with 100,390 rows. So each build takes about a second.
- Two modules creating the same index at the same moment is handled (error 23505/42P07 is ignored, because the index then exists).

### Future operational effects of the new keys (from the deploy on, automatically, as part of normal operation)

These are the delete rules of the new keys:
- Every time a bond-efficiency run is pruned (about 1 to 2 times a day), `bes_run_id` is set to empty on the holdings and net-spread runs that still name it. That is about 3,320 holdings per pruned run. This is the fix that stops new dead references; scores are not touched.
- Deleting an account now also deletes its weekly-e-mail send rows (before, they were left behind), and empties `consents.user_id`, keeping the consent text.
- Deleting a visitor deletes its events. `forgetVisitor` already did this; the 13-month purge only removes visitors whose events are already purged.
- Deleting a risk-premium draft empties `risk_spread_reviews.version_id`.
- `claimJob` adds a worker row if one is missing. The claim route already does this first, so in practice nothing changes.

### Step 2: the historical-data repair (a production data migration; separately approved, never run by a deploy)

Run once, after step 1:

```
REPAIR_DATABASE_URL=<app login> npx vite-node -c vitest.config.ts scripts/db-link-repair.ts            # read-only check
REPAIR_DATABASE_URL=<app login> npx vite-node -c vitest.config.ts scripts/db-link-repair.ts --apply    # repair + validate
```

- **All or nothing, in ONE transaction at REPEATABLE READ.** It fingerprints every table (row count and hash, with and without the repaired columns), then for each link repairs the old rows and runs `VALIDATE`. It then fingerprints again and compares, inside the same transaction, before anything is committed.
- Live traffic committed by other connections during the run (new events, visitors, scoring runs, weekly sends) is invisible to the transaction's snapshot. So the comparison judges only the repair's own changes, and normal traffic cannot cause a false failure.
- If a link does not validate, a rule could not be added (busy table), or anything outside the expected changes moved, the whole repair rolls back and nothing is kept. The script then exits 1 and can simply be run again.
- If a scoring run is pruned at the same moment, Postgres may stop the repair with a serialization error (40001). Nothing is kept; run it again.
- Tested: "the repair is all-or-nothing, judges only its own changes (not live traffic), and rolls everything back when verification fails" in lib/schema.db.test.ts.
- Recommended anyway: run it at a quiet hour, outside the 02:15 UTC backup, the scoring runs and the Monday weekly send. That keeps row locks on the holdings it updates short. Concurrent writes do not touch the same rows: the repaired holdings are only in superseded snapshots.

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

### Step 3: post-release acceptance criteria (expected after steps 1 and 2; these are targets, not current production results)

- 45 / 45 required foreign keys exist and are validated (today: 32 / 45).
- `docs/fk-orphan-check.sql` returns 0 on all 13 links (today: 80,200 + 673 + 3 breaking rows), and its last query lists no foreign key that is not validated.
- The published slider snapshots show the same portfolios and scores before and after: compare `efficient_portfolio_positions` and the holdings' `bes_score` for status `published`. The repair touches neither, and the fingerprint proves it.

## 2. Current scores and historical scores

- **Current (verified):** the 4 published snapshots have 0 dead references. 16,730 holdings point at live runs, and their copied scores equal the run's `bes_bonds` (0 differences, production read 09 Nov 01:35).
- **Historical (cannot be re-checked):** the 80,200 holdings in superseded snapshots carry scores copied from runs 12 to 29, which were pruned. Those scores stay as recorded history, but they can no longer be re-derived from their source run. The repair does not change them.

## 3. Rollback

- **Step 1 (deploy):** `scripts/fly-rollback.sh` returns to the previous release. The 13 rules can stay; the old code works with them. To remove them, run `alter table app.<table> drop constraint <name>;` for each of the 13 names in lib/dbLinks.ts `LINKS`, and drop the 6 indexes.
- **Step 2 (repair):** the emptied ids pointed at deleted runs and the re-created visitors are new rows, so there is nothing useful to restore. If an exact restore is still wanted: take the backup right before step 2, then copy the old `bes_run_id` values back from that backup by primary key `(snapshot_id, portfolio_id, horizon, ord)`, and delete the 32 visitor rows created at the step-2 time.

## 4. Tests on the release head

- Full suite against a real Postgres 16: 162 files, 1080 tests pass (release head).
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
| 5 | Independent review (PASS) | Review of `2e2adb4`: PASS WITH NOTES (`docs/evidence/review-497-2e2adb4-2026-11-09.md`). The notes were fixed in the next head: N1 (live traffic made the check fail) is fixed by the single-transaction repair; N2 and N3 by the index-race and lock-timeout handling; N4 index sizes are recorded above. Re-review of `a90fe71`: one note, R1 (a rule skipped on a busy table could still end in "committed"). Fixed: the repair now refuses inside its transaction when a rule is missing, the script also checks that every link is validated, and index creation has the same 5-second lock limit. Test added: "the repair rolls back when a rule could not be added (busy table)". Final re-review of `ab5f8bd7`: **PASS** (`docs/evidence/review-497-final-ab5f8bd7-2026-11-09.md`). Commits after `ab5f8bd7` change only files under `docs/`. |
| 6 | Security | PASS: no new endpoint, secret or permission; the repair runs with the app's own login |
| 7 | Migration assessment | PASS: section 1 lists every schema and row change |
| 8 | Rehearsal on an isolated production copy | **PASS**, by the Secval audit thread on Neon branch `repair-dryrun-497-2026-11-09`, copied from production 09 Nov 02:45:44 UTC; production not touched. Before the repair: holdings 80,200, events 673, pe_runs 3, other links 0. Afterwards: holdings (100,390 rows) and pe_runs (8 rows) changed only in the link column; visitors 3 → 35 (+32); the other 80 tables have identical fingerprints; 45 of 45 foreign keys validated. Output kept in the repository: `docs/evidence/db-link-repair-dryrun-output-2026-11-09.md` (and the reconciliation read in `docs/evidence/bes-orphan-reconcile-output-2026-11-09.md`). The branch still exists; deleting it is part of the approval request. |
| 9 | Environment compatibility | PASS: Postgres features used (NOT VALID, VALIDATE) exist in Neon's Postgres 16 |
| 10 | Rollback written | PASS (section 3) |
| 11 | Post-deploy monitoring | step 3 checks; nightly live check |
| 12 | Written release approval | REQUIRED: Livio, for step 1 (merge + deploy) and step 2 (repair) |

**Visible side effect to know before approving:** the production copy has only 3 visitor rows today. The repair re-creates 32 visitors dated 18 to 26 Oct 2026, so admin visitor lists will show 35. The alternative is deleting the 673 orphan events instead, which loses history. Keeping them follows the instruction to preserve historical records.

**Approvals needed from Livio:**
1. Merge and deploy #497. That is step 1: schema only, no rows changed.
2. Run the repair (step 2): about 80,000 dead run ids emptied and 32 visitor rows re-created, no deletes at today's counts.
3. Delete the rehearsal branch `repair-dryrun-497-2026-11-09` in Neon (a throwaway copy). Its evidence is already kept in the repository (`docs/evidence/`), so deleting it loses nothing.
