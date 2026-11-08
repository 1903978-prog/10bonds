# 10bonds: database relationship register

08 Nov 2026. Owner: the 10bonds engineering thread. This follows the five-app relationship audit standard (categories A to E, metrics A to E). The Secval "Audit database foreign-key coverage" thread keeps the shared standard and the consolidated register.

## Evidence and its limits

- **Measured (repository):** the app's own setup code was run against an empty Postgres 16. `lib/schema.db.test.ts` builds every table the code creates, and a new test fails if a `create table` in `lib/` or `app/` is not built. The result is `docs/database-schema.txt`: 82 tables in schema `app`, 45 foreign keys, all validated, all indexed.
- **Production, measured by the Secval auditor** (read-only, 08 Nov 2026 04:51 UTC):
  - schema `app`: 83 tables, 32 foreign keys (all validated), 27 tables in a foreign key;
  - schema `public`: 1 table (`public_bonds`), no foreign key.
- **Reconciled:** the repository build of `main` (before #497's links) gives exactly 32 foreign keys and 27 linked tables. The foreign keys match production.
  - The repository builds 82 `app` tables. Production has 83: the extra one is `bond_prices_daily`, which no code in this repository creates or has ever created. It is category **E** (section 1).
- **Not measured by this thread:** this workspace has no production login, so orphan counts are **UNVERIFIED**. Run `docs/fk-orphan-check.sql` (read-only) on production before releasing #497.
- **Schemas in scope:** `app` (login `tenbonds_app`) and `public`. `public.public_bonds` is the daily bond copy, written by lm-op-model and read by 10bonds with a read-only login (`tenbonds_reader`). It is listed here as category D.
- **Correction:** until 08 Nov 2026 the tracked schema file listed 63 tables. 19 tables made on first use by other features were missing from it. Earlier reports of "63 tables" to Secval undercounted.
- **How candidates were found:**
  1. Every column whose name suggests a reference: `*_id`, `isin`, `*_by`, `*email`, `bond_code`, `batch*`, `version*`, `worker*`, `visitor*`, `*keyword*`.
  2. Every `insert`, `update` and `delete` on those tables in `lib/` and `app/`, read to see whether the parent row always exists and what happens when it is deleted.
  3. Limitation: references hidden inside JSON columns (for example `shortlists.isins`, `best_bonds.bond`) were not inspected value by value.

## Metrics

| Metric | Today (code on `main`) | With draft PR #497 released |
|---|---|---|
| A. Table classification (production 84 tables) | 83 / 84 = 98.8% (`bond_prices_daily` unresolved) | same |
| B. Required FK enforcement | 32 / 45 = 71% | 45 / 45 = 100% |
| C. Candidate discovery | 103 / 103 = 100% resolved (see limitation above) | same |
| D. Independent tables | 42 / 84 = 50% (C: 26, D: 16 incl. public_bonds) | same |

Metric B "today" matches production (32 validated foreign keys, measured by the auditor). The figures after release come from the repository build; they become verified only after release and a new production read.

**One-line summary:** Required FKs: 45 | Validated: 32 (production) | Missing: 13 (all in draft #497) | Coverage: 32/45 = 71% now, 45/45 = 100% after release (not verified) | Independent tables: 42 | Classification: 83/84 = 98.8%

**E. FK implementation backlog:**
- Confirmed required FKs already valid: 32 (fresh build of `main`; production UNVERIFIED).
- Confirmed required FKs missing: 13, all added by draft PR #497:
  - 5 found 07 Nov;
  - 8 found 08 Nov.
- Existing FKs not validated or invalid: 0 in the fresh build; production UNVERIFIED (second query in `docs/fk-orphan-check.sql`).
- Candidates awaiting investigation: 0.
- Justified non-FK relationships: 58 (section 4).
- Orphan-data issues: 13 links with possible orphans in production, counts UNVERIFIED. Only 3 of them change or remove existing data on release (see section 3).

## 1. Tables by category

Categories:
- **A**: has at least one enforced FK, as child or parent.
- **B**: a required FK is missing.
- **C**: independent; no FK needed.
- **D**: its relationship points outside this database login, or cannot be a local FK.
- **E**: unresolved.

With #497 there are no B or E tables. On `main` today, these tables are B: they are on one side of a missing link.
- Already in category A (they have another FK), with one missing link each: `risk_calc_runs`, `risk_calc_results`, `events`, `pe_runs`, `efficient_portfolio_holdings`, `risk_premium_versions`, `users`.
- No FK at all yet: `weekly_email_sends`, `consents`, `bond_import_rows`, `bond_import_batches`, `broker_tariffs`, `broker_profiles`, `risk_spread_reviews`, `visitors`, `credit_research_jobs`, `credit_research_runs`, `credit_research_workers`, `bond_credit_analysis`, `bond_credit_analysis_history`.

**A, FK-linked (41):**
- `bes_bonds`, `bes_runs`, `bond_codes`, `bond_credit_analysis`, `bond_credit_analysis_history`
- `bond_import_batches`, `bond_import_rows`, `broker_profiles`, `broker_tariffs`, `consents`
- `credit_research_jobs`, `credit_research_runs`, `credit_research_workers`, `discount_codes`, `efficient_portfolio_holdings`
- `efficient_portfolio_jobs`, `efficient_portfolio_positions`, `efficient_portfolio_snapshots`, `events`, `pe_positions`
- `pe_runs`, `pro_access`, `risk_calc_results`, `risk_calc_runs`, `risk_premium_versions`
- `risk_spread_reviews`, `search_usage`, `seo_assessments`, `seo_criterion_results`, `seo_guide_backups`
- `seo_guide_log`, `seo_guides`, `seo_keyword_history`, `seo_keywords`, `seo_people`
- `seo_shares`, `trial_codes`, `user_exclusions`, `users`, `visitors`
- `weekly_email_sends`

**E, unresolved (1):** `bond_prices_daily`. It is in production (auditor's list, 08 Nov 05:02 UTC) but has never been in this repository's code or history; the code's daily prices live in `bond_daily_prices`. It was probably written by another app or made by hand. To close it, we need its columns, row count and latest write (asked from the auditor). Then classify it, or propose dropping it (a production change, so it needs approval).

**C, independent (26):** each holds no reference to another row.

| Table | Why no FK |
|---|---|
| settings, bond_import_settings, broker_settings, credit_research_settings, llm_settings, plan_limits, risk_band_config | key/value settings |
| credit_worker_kb | key/value knowledge for the research worker |
| plan_features | feature matrix per plan |
| bond_code_counters | counters that hand out bond codes |
| efficient_portfolio_migrations, shortlist_seeds | one-time migration and seed markers |
| credit_research_tokens | hashed worker access tokens; a token is not tied to a worker on purpose |
| frontier_cache | computed cache by key |
| daily_counts, seo_daily, seo_daily_stats | anonymous daily totals |
| seo_actions, seo_backlinks, seo_opportunities | SEO to-do and research lists |
| benchmark_curve, benchmark_imports | Bund yield curve and its import log |
| historical_default_probabilities | published default-rate reference tables |
| email_log | send log, address masked; linked to nothing so it can't reveal an account |
| portfolio_builds | log of build runs |
| outreach | e-mail drafts to firms, not accounts |

**D, external reference or special design (16):**

| Table | Relationship that is not a local FK, and why |
|---|---|
| public.public_bonds | the bond copy itself: written daily by lm-op-model's export, read-only for 10bonds; parent of the 20 ISIN references in section 4, which cannot be FKs because bonds leave the copy daily while 10bonds keeps their history |
| best_bonds, bond_daily_prices, bond_price_weeks, ytm_history | ISIN of the bond copy: lm-op-model's table, other login, bonds leave daily while history stays |
| assessment_evidence, credit_reference_cases, gpt_ratings, llm_calls, bond_runs | same: ISIN of the bond copy |
| correction_requests | ISIN of the bond copy, plus the sender's e-mail (public form, no account) |
| shortlists | ISIN lists of the bond copy, stored as JSON |
| pe_reference_samples | batch id of a bond copy (a signature, not a row) |
| refresh_requests | read and updated by lm-op-model (another app); names the admin by name |
| seo_manual | names the admin by e-mail; admins come from the `ADMIN_EMAILS` setting, not from table rows |
| risk_premium_audit | append-only audit: names a curve version but must keep the id after a draft is deleted, so an FK (which would block or clear it) does not fit |

## 2. Enforced relationships (45 with #497)

Every one is validated and indexed in the fresh build. Columns: child → parent, delete rule. Status: E = enforced on `main`; #497 = added by the draft.

| # | Child.column | Parent.column | On delete | Status | Business purpose |
|---|---|---|---|---|---|
| 1 | discount_codes.user_id | users.id | cascade | E | code issued to an account |
| 2 | discount_codes.created_by | users.id | set null | E | admin who made it |
| 3 | trial_codes.created_by | users.id | set null | E | admin who made it |
| 4 | trial_codes.redeemed_by | users.id | set null | E | account that used it |
| 5 | events.user_id | users.id | set null | E | signed-in usage |
| 6 | search_usage.user_id | users.id | cascade | E | search counter per account |
| 7 | pro_access.user_id | users.id | cascade | E | Pro access per account |
| 8 | user_exclusions.user_id | users.id | cascade | E | an account's excluded bonds and issuers |
| 9-10 | seo_guides.author_id, reviewer_id | seo_people.id | set null | E | guide authors |
| 11 | seo_guide_log.guide_id | seo_guides.id | cascade | E | guide edit log |
| 12 | seo_guide_backups.guide_id | seo_guides.id | cascade | E | guide backups |
| 13 | seo_shares.guide_id | seo_guides.id | set null | E | shared guide links |
| 14 | seo_criterion_results.assessment_id | seo_assessments.id | cascade | E | SEO scores per assessment |
| 15 | seo_keyword_history.keyword_id | seo_keywords.id | cascade | E | keyword rank history |
| 16 | risk_calc_results.run_id | risk_calc_runs.id | cascade | E | results of a calculation run |
| 17-26 | efficient_portfolio_positions.bond_1 … bond_10 | bond_codes.bond_code | no action | E | bonds of a portfolio row |
| 27 | efficient_portfolio_positions.snapshot_id | efficient_portfolio_snapshots.id | cascade | E | rows of a snapshot |
| 28 | efficient_portfolio_holdings.snapshot_id | efficient_portfolio_snapshots.id | cascade | E | holdings of a snapshot |
| 29 | efficient_portfolio_holdings.bond_code | bond_codes.bond_code | no action | E | bond held |
| 30 | efficient_portfolio_jobs.snapshot_id | efficient_portfolio_snapshots.id | set null | E | job that built it |
| 31 | bes_bonds.run_id | bes_runs.id | cascade | E | bonds of an efficiency run |
| 32 | pe_positions.run_id | pe_runs.id | cascade | E | positions of a net-spread run |
| 33 | weekly_email_sends.user_id | users.id | cascade | #497 | weekly e-mail per account (deleteUser left them behind) |
| 34 | consents.user_id | users.id | set null | #497 | consent proof stays, account link cleared |
| 35 | bond_import_rows.batch_id | bond_import_batches.id | cascade | #497 | rows of an import |
| 36 | broker_tariffs.broker_id | broker_profiles.id | no action | #497 | tariffs of a broker (profiles never deleted) |
| 37 | risk_spread_reviews.version_id | risk_premium_versions.id | set null | #497 | review keeps its text when a draft is deleted |
| 38 | risk_calc_runs.version_id | risk_premium_versions.id | no action | #497 | curve used by a run: only the active one, and versions with runs are never deleted (only drafts are) |
| 39 | risk_calc_results.version_id | risk_premium_versions.id | no action | #497 | same, copied per result |
| 40 | events.visitor_id | visitors.visitor_id | cascade | #497 | `recordEvents` writes the visitor first; `forgetVisitor` deletes both |
| 41 | credit_research_jobs.claimed_by | credit_research_workers.worker_id | set null | #497 | the claim call registers the worker before claiming; workers are never deleted |
| 42 | credit_research_runs.worker_id | credit_research_workers.worker_id | no action | #497 | a run is saved only by the worker holding the claim |
| 43 | bond_credit_analysis_history.isin | bond_credit_analysis.isin | no action | #497 | history is copied from the current analysis; analyses are never deleted |
| 44 | pe_runs.bes_run_id | bes_runs.id | set null | #497 | efficiency run used; old runs are pruned, so the name is cleared |
| 45 | efficient_portfolio_holdings.bes_run_id | bes_runs.id | set null | #497 | same |

The 07 Nov note in `lib/dbLinks.ts` said a research run "can be saved before its worker's first heartbeat". The code does not support that: the claim call always registers the worker first. Rows 41 and 42 correct it.

## 3. Orphan data and what release does to it

Orphan counts in production: **UNVERIFIED**. Get them with `docs/fk-orphan-check.sql` before release. How each new link handles rows that already break it:

| Link | What release does to existing breaking rows | Data lost |
|---|---|---|
| 33 weekly_email_sends.user_id | deletes sends of deleted accounts | yes, rows deleted (needs approval) |
| 34 consents.user_id | clears the dead account id; the consent text stays | id cleared (needs approval) |
| 37 risk_spread_reviews.version_id | clears the dead version id | id cleared (needs approval) |
| 44, 45 bes_run_id | clears names of runs already pruned | id cleared (needs approval) |
| 40 events.visitor_id | re-creates the missing visitor row, first and last seen taken from its events | none |
| 41, 42 worker ids | re-creates the missing worker row | none |
| 35, 36, 38, 39, 43 | none. If old rows break the link, the rule stays "not valid" (checks new rows only) and the error is logged | none |

Nothing runs until the release is approved. Each link is added the safe way:
1. Repair the rows that already break it.
2. Add the rule as `NOT VALID` (instant).
3. Validate it, which reads the old rows without blocking writes.

## 4. Justified non-FK relationships (58)

| Group | Columns | Count | Why no FK |
|---|---|---|---|
| ISIN of the bond copy | `isin` in assessment_evidence, best_bonds, bond_codes, bond_credit_analysis, bond_daily_prices, bond_import_rows, bond_price_weeks, correction_requests, credit_reference_cases, credit_research_jobs, credit_research_runs, efficient_portfolio_holdings, gpt_ratings, llm_calls, bond_runs, risk_calc_results, risk_spread_reviews, ytm_history, bes_bonds; plus `credit_research_workers.current_isin` | 20 | parent is `public.public_bonds`: lm-op-model's table under another login, rebuilt daily, bonds leave while history stays |
| Bond-copy batch id | `batch_id` in efficient_portfolio_snapshots, efficient_portfolio_jobs, bes_runs, pe_runs, pe_reference_samples | 5 | a signature of a copy, not a row |
| Arrays | pe_positions.isins, pe_positions.bond_codes, seo_guides.related_keywords | 3 | Postgres has no FK on array elements |
| JSON | shortlists ISIN lists, best_bonds.bond | 2 | values inside JSON |
| Admin identity | bond_credit_analysis.human_validated_by, broker_tariffs.created_by, broker_tariffs.approved_by, refresh_requests.requested_by, risk_premium_audit.by_email, risk_premium_versions.created_by, risk_premium_versions.activated_by, risk_spread_reviews.by_email, seo_assessments.by_email, seo_guide_log.by_email, seo_manual.by_email, bes_runs.requested_by | 12 | admins come from the `ADMIN_EMAILS` setting; the text is kept as an audit record even if the account goes |
| External services | users.stripe_customer_id, users.stripe_subscription_id, discount_codes.stripe_coupon_id, discount_codes.stripe_promo_id | 4 | Stripe ids |
| E-mail of non-accounts | correction_requests.email, outreach.email | 2 | public form and firms, not accounts |
| Retention conflict | consents.visitor_id → visitors | 1 | visitors are purged after 13 months while consent proof must stay; an FK would delete or blank the proof |
| Audit | risk_premium_audit.version_id → risk_premium_versions | 1 | append-only; must keep the id of a deleted draft |
| Free text | seo_guides.primary_keyword → seo_keywords.keyword | 1 | a guide's keyword need not be a tracked keyword |
| Copy of a linked value | efficient_portfolio_holdings.isin (copy of bond_codes.isin via the bond_code FK) | 1 | covered by FK 29. Optional hardening: a composite FK (bond_code, isin), not needed for integrity of the link itself |
| Version labels | bond_credit_analysis.version, consents.version, pro_access.declaration_version, users.terms_version, risk_premium_versions.version, credit_research_workers.version | 6 | labels of code or text versions, not rows |
| **Total** | | **58** | |

Candidates: 45 required + 58 justified = 103, all resolved.

## 5. Approvals outstanding

- **Release of draft PR #497** needs Livio's explicit approval. It changes production data in the 3 cases marked in section 3.
- Secval rule AD-01 allowed at most half of all tables to be listed as standalone. Of the 84 production tables, 41 are listed in `lib/dbLinks.ts` as standalone (49%), plus `public.public_bonds`. Livio's 08 Nov standard makes independent tables descriptive (metric D), not a penalty. The Secval auditor decides which rule applies.
