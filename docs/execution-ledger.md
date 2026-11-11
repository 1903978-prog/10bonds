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
