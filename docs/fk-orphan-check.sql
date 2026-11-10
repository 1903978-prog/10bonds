-- Read-only: counts rows that break each link added by draft PR #497 (docs/fk-register.md).
-- Run against production with any login that can read schema app, BEFORE release. Changes nothing.
-- A table that does not exist yet in production makes its line fail: run the lines one by one in that case.
select 'weekly_email_sends.user_id -> users' link, count(*) orphans from app.weekly_email_sends s where not exists (select 1 from app.users u where u.id = s.user_id)
union all select 'consents.user_id -> users', count(*) from app.consents c where c.user_id is not null and not exists (select 1 from app.users u where u.id = c.user_id)
union all select 'bond_import_rows.batch_id -> bond_import_batches', count(*) from app.bond_import_rows r where not exists (select 1 from app.bond_import_batches b where b.id = r.batch_id)
union all select 'broker_tariffs.broker_id -> broker_profiles', count(*) from app.broker_tariffs t where not exists (select 1 from app.broker_profiles p where p.id = t.broker_id)
union all select 'risk_spread_reviews.version_id -> risk_premium_versions', count(*) from app.risk_spread_reviews r where r.version_id is not null and not exists (select 1 from app.risk_premium_versions v where v.id = r.version_id)
union all select 'risk_calc_runs.version_id -> risk_premium_versions', count(*) from app.risk_calc_runs r where not exists (select 1 from app.risk_premium_versions v where v.id = r.version_id)
union all select 'risk_calc_results.version_id -> risk_premium_versions', count(*) from app.risk_calc_results r where not exists (select 1 from app.risk_premium_versions v where v.id = r.version_id)
union all select 'events.visitor_id -> visitors', count(*) from app.events e where not exists (select 1 from app.visitors v where v.visitor_id = e.visitor_id)
union all select 'credit_research_jobs.claimed_by -> credit_research_workers', count(*) from app.credit_research_jobs j where j.claimed_by is not null and not exists (select 1 from app.credit_research_workers w where w.worker_id = j.claimed_by)
union all select 'credit_research_runs.worker_id -> credit_research_workers', count(*) from app.credit_research_runs r where r.worker_id is not null and not exists (select 1 from app.credit_research_workers w where w.worker_id = r.worker_id)
union all select 'bond_credit_analysis_history.isin -> bond_credit_analysis', count(*) from app.bond_credit_analysis_history h where not exists (select 1 from app.bond_credit_analysis a where a.isin = h.isin)
union all select 'pe_runs.bes_run_id -> bes_runs', count(*) from app.pe_runs p where p.bes_run_id is not null and not exists (select 1 from app.bes_runs b where b.id = p.bes_run_id)
union all select 'efficient_portfolio_holdings.bes_run_id -> bes_runs', count(*) from app.efficient_portfolio_holdings h where h.bes_run_id is not null and not exists (select 1 from app.bes_runs b where b.id = h.bes_run_id);

-- Existing foreign keys that are not validated (should be none).
select conrelid::regclass, conname from pg_constraint where connamespace = 'app'::regnamespace and contype = 'f' and not convalidated;
