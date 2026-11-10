# #497 repair dry run on an isolated copy of 10bonds production

The Secval auditor thread ran this on 09 Nov 2026, about 02:50 UTC.

**Where it ran:** Neon project round-rain-83749143, branch `repair-dryrun-497-2026-11-09` (br-broad-heart-b2wms24c, endpoint ep-proud-dream-b2ca3zb8). The branch was copied from production at 02:45:44 UTC, parent LSN 1/284D410. Production itself was not touched.

**Script:** /mnt/project-files/10bonds/db-link-repair-dryrun.sql (aa688aa).
- psql could not be used because this container has no direct Postgres network. I ran the same 58 statements, in order, as one transaction through the Neon SQL API.
- I ran it as role tenbonds_app, which owns all 83 app tables; neondb_owner got "must be owner". The statements were split mechanically; only `begin` and `rollback` were dropped.
- The API commits at the end, so the repaired state now stays on this disposable branch. It was never kept on production.
- One extra final select was added: the count of FKs and validated FKs.

## 1. Rows breaking each link before the repair
| link | rows |
|---|---:|
| efficient_portfolio_holdings_bes_run_id_fkey | 80200 |
| events_visitor_id_fkey | 673 |
| pe_runs_bes_run_id_fkey | 3 |
| other 10 links | 0 each |

The 10 links at 0 are: bond_credit_analysis_history_isin, bond_import_rows_batch_id, broker_tariffs_broker_id, consents_user_id, credit_research_jobs_claimed_by, credit_research_runs_worker_id, risk_calc_results_version_id, risk_calc_runs_version_id, risk_spread_reviews_version_id and weekly_email_sends_user_id.

## 2. Tables whose fingerprint changed
Fingerprints covered all 83 app tables: row count plus an order-independent md5, taken with and without the repaired columns.

| table | rows before | rows after | change |
|---|---:|---:|---|
| efficient_portfolio_holdings | 100390 | 100390 | only the link column |
| pe_runs | 8 | 8 | only the link column |
| visitors | 3 | 35 | rows added (32 reconstructed) |

No other table changed. weekly_email_sends, consents and risk_spread_reviews were also untouched, because they had 0 broken rows.

## 3. Constraints not validated afterwards
None. The app schema ends with 45 FKs, all 45 validated (32 before plus 13 new).

The result matches the owner's expectation exactly.
