# Re-review of 10bonds #497 on a90fe71c10858ae5a6a11ba2d2dc5e877ce3b180

Secval auditor thread, 09 Nov 2026 around 04:25 UTC.

The code diff from 2e2adb4 is f2407f6: lib/dbLinks.ts, scripts/db-link-repair.ts, lib/dbFingerprint.ts (a type only) and a new test in lib/schema.db.test.ts. a90fe71 itself changes docs only.

## How the earlier notes were handled
- **N1 resolved, and well.** The whole run now happens in one REPEATABLE READ transaction: fingerprint, the 13 repairs and VALIDATEs, the second fingerprint and the comparison. The snapshot is taken at the first fingerprint query, so traffic committed by other connections stays invisible. The new test shows this: an insert from another connection mid-repair, and only pe_runs reported. Any failure rolls everything back.
  - A concurrent write to the same rows, for example a run prune that sets the same holdings to NULL, fails with 40001 (serialization) and rolls back. That is safe; rerun the script. The dossier step 2 should say "on 40001, rerun".
  - The transaction holds row locks on about 80k holdings, plus SHARE UPDATE EXCLUSIVE on the 13 child tables, for the whole run. Two full fingerprints take seconds, not minutes. This does not block normal DML.
- **N2 resolved.** 23505 and 42P07 on the index are ignored.
- **N3 resolved.** The ALTER runs with `set local lock_timeout = '5s'`, and 55P03 is logged and skipped.
- **N4 resolved.** The sizes are in the dossier.

## New finding R1 (blocking for the repair step, a small fix)
N3 interacts with a check that was removed:
1. ensureLinks now skips a rule on 55P03 instead of failing.
2. repairAndValidateLinks then does `if (!r) continue;` for a link whose constraint is missing. The comment says "tables missing", but the cause can also be "rule not added because the table was busy".
3. The script's final check is now `inTx.filter((v) => v.rows > 0)`. The old `|| v.validated !== true` part is gone.

So if a table is busy at the start of `--apply`, that link is silently left with no rule. If it has 0 breaking rows, the script prints "RESULT: committed. Every link validated". Step 3 (45/45) would catch it later, but the tool's own verdict would be wrong.

**Fix:** inside the transaction, when both tables exist but the constraint is missing, throw. Or restore `|| v.validated !== true` in the script's `left` check, and also in `linkViolations(tx)`. A test should cover it: drop one rule, make ensureLinks skip it, and expect a rollback.

## Verdict
**CHANGES REQUESTED (R1 only).** Everything else passes on a90fe71. The per-link SQL is unchanged, so the rehearsal on the isolated copy still applies. After the R1 fix I can re-review the new head quickly.

---

# Final re-review on ab5f8bd7404f54dcdeee3f11d527f193207fc572 (09 Nov about 04:25 UTC)

Code diff since a90fe71: lib/dbLinks.ts, scripts/db-link-repair.ts, and one new test.

**R1 resolved.**
- In the transaction, when both tables exist but the rule is missing, the run now raises RepairRolledBack and nothing is kept.
- The script's final check requires `validated === true` again.
- A new test covers a busy table: the rule is skipped and the repair rolls back.

**Index handling.** The index is now created inside the same lock_timeout transaction as the rule, and 23505, 42P07 and 42710 are tolerated.

One side effect, not a problem: when the rule already exists, each start still runs `create index if not exists`. That takes a brief lock on the table even when the index already exists. It is bounded by the 5 s lock_timeout and is harmless.

`docs/db-link-repair-dryrun.sql` is unchanged since aa688aa, so the rehearsal on the isolated copy still applies to the data effect.

## Verdict: PASS on ab5f8bd7404f54dcdeee3f11d527f193207fc572
