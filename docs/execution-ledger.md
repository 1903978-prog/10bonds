# Execution ledger — 8-hour audit and fix window

Window: starts 11 Nov 2026 17:40 UTC (00:40 Bangkok, 12 Nov), ends 12 Nov 2026 01:40 UTC (08:40 Bangkok).
Rule: only non-destructive changes; no production data repair without an approval recorded in docs/livio-asks.md; no real payments; no new spend.
Out of scope (owned by the "Recover database referential integrity" thread): Fly deploy retry, link-check failures, Greek sovereign card, admin SEO API 404s, weekly-email error, hydration #418, Stripe test mode, credit research handover.

## Workstreams
| ID | Workstream | Owner | State |
|---|---|---|---|
| W1 | Runtime audit on a local throwaway instance (all roles) | runtime agent | running |
| W2 | Surface inventory and calculation recompute | inventory agent | running |
| W3 | Requirements register from the project chat | auditor agent | running |

## Entries
| Time (UTC) | Item | Result | Evidence |
|---|---|---|---|
| 11 Nov 2026 17:43 | lib/noPublicSolve.test.ts mocked a module bondsAnswer does not import; 5 tests failed when ACCOUNTS_DATABASE_URL is set | Fixed, PR #503 | `npx vitest run lib/noPublicSolve.test.ts` 5/5 |
| 11 Nov 2026 17:42 | Baseline: tsc clean, eslint 0 errors/10 warnings, vitest 1068 pass | Recorded | local run |
| 11 Nov 2026 17:42 | Production read-only: health, ready, data (16,154 rows, fresh), billing live, ranking 2,889 bonds 0 unrated | OK | GET only |
| 11 Nov 2026 18:36 | DEFECT D-01: CI "schema.db.test" failed once with "duplicate key ... pg_type_typname_nsp_index" (create table app.daily_counts). Cause: the four *.db.test.ts files ran in parallel on one empty database and each created the same tables at once (reproduced locally: 4 parallel runs fail on an empty database) | Fixed: those files now run one after the other (vitest.config.ts); account setup also takes a database lock so two app instances starting together cannot race (lib/accounts.ts). Not fixed by re-running | Fresh database, 4 DB test files, run twice: 18/18 pass both times. Same 4 files in parallel before the fix: duplicate-key failures |

## 12 Nov 2026: release recovery (owner: "Recover database referential integrity" thread)
| Time (UTC) | ID | Item | Result | Evidence |
|---|---|---|---|---|
| 12 Nov 2026 01:40 | 10B-0001 | P0 application defect, not a Fly problem: deploy run 43085083481 (8daefa1) was cancelled at the 15-min job limit with the new machine stuck at 1/2 checks (/api/ready). Cause: #505 made startup wait without limit on `pg_advisory_lock` over Neon's pooler; the pooler (transaction mode) keeps the server session after the client closes, so the lock is never released and the next setup waits forever, and the pages never render | Fixed on this branch: direct (non-pooler) host for the lock, `pg_try_advisory_lock` with a 20 s limit, explicit unlock, setup runs anyway if the lock cannot be had. Deploy job limit 15 → 25 min (the build alone took ~10 min) | Old code with a held lock: "still waiting after 10s" (reproduced locally). New code: lib/setupLock.db.test.ts 2/2 (held lock: setup finishes in 0.6 s; lock released after). Full suite on local Postgres 16: 167 files, 1,098 pass; tsc 0; eslint 0 on changed files |
| 12 Nov 2026 02:25 | 10B-0003 | Deploy run 43137438471 (bceec21) failed before touching any machine: "found multiple image versions". The cancelled 11 Nov release left its never-healthy new machine 784ee4e5a317d8 (image deployment-01M761DD…) next to the serving machine d8911715b70d98 (deployment-01M75V9F…), and Fly refuses blue-green while two images exist. Production kept serving the old machine | Fix on branch: deploy step removes only machines that are unhealthy and not on the single serving image; removes nothing if no machine is healthy or healthy machines disagree (lib/flyLeftovers.ts) | lib/flyLeftovers.test.ts 5/5 (incl. the 11 Nov case); script on a sample list picks only the stuck machine |
| 12 Nov 2026 02:50 | 10B-0004 | Deploy run 43141135643 (bab36915) stopped again before touching machines. The cleanup step logged "healthy machines run different images: refusing to choose": the cancelled 11 Nov machine 784ee4e5a317d8 (8daefa1) turned healthy and has been serving next to d8911715b70d98 (old release). Production serves two versions side by side; live SHA per machine NOT VERIFIED (no Fly access here) | Fix on branch: deploy input `remove_machine` removes ONE named machine, only if another healthy machine keeps serving (canRemoveNamed). Plan: remove 784ee4e5a317d8 (never passed release checks), then deploy bab36915+ | lib/flyLeftovers.test.ts 8/8; script on the 12 Nov case allows only with the other machine healthy |
