-- GENERATED from lib/dbLinkRepairSql.ts. Isolated copy of production ONLY (a Neon branch). Ends with ROLLBACK: nothing is kept.
-- psql "$BRANCH_URL" -v ON_ERROR_STOP=1 -f docs/db-link-repair-dryrun.sql
begin;
set local lock_timeout = '10s';
create temp table fp (t text, phase text, n bigint, h text, h2 text) on commit drop;
create temp table repair_cols (t text primary key, cols text[]) on commit drop;
insert into repair_cols values ('consents', array['user_id']::text[]), ('risk_spread_reviews', array['version_id']::text[]), ('pe_runs', array['bes_run_id']::text[]), ('efficient_portfolio_holdings', array['bes_run_id']::text[]);
create temp table broken (link text, n bigint) on commit drop;
create or replace function pg_temp.snap(p text) returns void language plpgsql as $f$
declare r record; c text[]; begin
  for r in select relname from pg_class where relnamespace = 'app'::regnamespace and relkind = 'r' loop
    select cols into c from repair_cols where t = r.relname;
    execute format('insert into fp select %L, %L, count(*), coalesce(md5(string_agg(a, '''' order by a)), ''''), coalesce(md5(string_agg(b, '''' order by b)), '''') from (select md5(to_jsonb(x)::text) a, md5((to_jsonb(x) - %L::text[])::text) b from app.%I x) s', r.relname, p, coalesce(c, '{}'), r.relname);
  end loop; end $f$;
insert into broken select 'weekly_email_sends_user_id_fkey', count(*) from app.weekly_email_sends c where c.user_id is not null and not exists (select 1 from app.users p where p.id = c.user_id);
insert into broken select 'consents_user_id_fkey', count(*) from app.consents c where c.user_id is not null and not exists (select 1 from app.users p where p.id = c.user_id);
insert into broken select 'bond_import_rows_batch_id_fkey', count(*) from app.bond_import_rows c where c.batch_id is not null and not exists (select 1 from app.bond_import_batches p where p.id = c.batch_id);
insert into broken select 'broker_tariffs_broker_id_fkey', count(*) from app.broker_tariffs c where c.broker_id is not null and not exists (select 1 from app.broker_profiles p where p.id = c.broker_id);
insert into broken select 'risk_spread_reviews_version_id_fkey', count(*) from app.risk_spread_reviews c where c.version_id is not null and not exists (select 1 from app.risk_premium_versions p where p.id = c.version_id);
insert into broken select 'risk_calc_runs_version_id_fkey', count(*) from app.risk_calc_runs c where c.version_id is not null and not exists (select 1 from app.risk_premium_versions p where p.id = c.version_id);
insert into broken select 'risk_calc_results_version_id_fkey', count(*) from app.risk_calc_results c where c.version_id is not null and not exists (select 1 from app.risk_premium_versions p where p.id = c.version_id);
insert into broken select 'events_visitor_id_fkey', count(*) from app.events c where c.visitor_id is not null and not exists (select 1 from app.visitors p where p.visitor_id = c.visitor_id);
insert into broken select 'credit_research_jobs_claimed_by_fkey', count(*) from app.credit_research_jobs c where c.claimed_by is not null and not exists (select 1 from app.credit_research_workers p where p.worker_id = c.claimed_by);
insert into broken select 'credit_research_runs_worker_id_fkey', count(*) from app.credit_research_runs c where c.worker_id is not null and not exists (select 1 from app.credit_research_workers p where p.worker_id = c.worker_id);
insert into broken select 'bond_credit_analysis_history_isin_fkey', count(*) from app.bond_credit_analysis_history c where c.isin is not null and not exists (select 1 from app.bond_credit_analysis p where p.isin = c.isin);
insert into broken select 'pe_runs_bes_run_id_fkey', count(*) from app.pe_runs c where c.bes_run_id is not null and not exists (select 1 from app.bes_runs p where p.id = c.bes_run_id);
insert into broken select 'efficient_portfolio_holdings_bes_run_id_fkey', count(*) from app.efficient_portfolio_holdings c where c.bes_run_id is not null and not exists (select 1 from app.bes_runs p where p.id = c.bes_run_id);
select link, n as rows_breaking_before from broken order by link;
select pg_temp.snap('before');
-- weekly_email_sends_user_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'weekly_email_sends_user_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.weekly_email_sends add constraint weekly_email_sends_user_id_fkey foreign key (user_id) references app.users (id) on delete cascade not valid; end if; end $d$;
delete from app.weekly_email_sends s where not exists (select 1 from app.users u where u.id = s.user_id);
alter table app.weekly_email_sends validate constraint weekly_email_sends_user_id_fkey;
-- consents_user_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'consents_user_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.consents add constraint consents_user_id_fkey foreign key (user_id) references app.users (id) on delete set null not valid; end if; end $d$;
update app.consents c set user_id = null where c.user_id is not null and not exists (select 1 from app.users u where u.id = c.user_id);
alter table app.consents validate constraint consents_user_id_fkey;
-- bond_import_rows_batch_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'bond_import_rows_batch_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.bond_import_rows add constraint bond_import_rows_batch_id_fkey foreign key (batch_id) references app.bond_import_batches (id) on delete cascade not valid; end if; end $d$;
alter table app.bond_import_rows validate constraint bond_import_rows_batch_id_fkey;
-- broker_tariffs_broker_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'broker_tariffs_broker_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.broker_tariffs add constraint broker_tariffs_broker_id_fkey foreign key (broker_id) references app.broker_profiles (id) on delete no action not valid; end if; end $d$;
alter table app.broker_tariffs validate constraint broker_tariffs_broker_id_fkey;
-- risk_spread_reviews_version_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'risk_spread_reviews_version_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.risk_spread_reviews add constraint risk_spread_reviews_version_id_fkey foreign key (version_id) references app.risk_premium_versions (id) on delete set null not valid; end if; end $d$;
update app.risk_spread_reviews r set version_id = null where r.version_id is not null and not exists (select 1 from app.risk_premium_versions v where v.id = r.version_id);
alter table app.risk_spread_reviews validate constraint risk_spread_reviews_version_id_fkey;
-- risk_calc_runs_version_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'risk_calc_runs_version_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.risk_calc_runs add constraint risk_calc_runs_version_id_fkey foreign key (version_id) references app.risk_premium_versions (id) on delete no action not valid; end if; end $d$;
alter table app.risk_calc_runs validate constraint risk_calc_runs_version_id_fkey;
-- risk_calc_results_version_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'risk_calc_results_version_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.risk_calc_results add constraint risk_calc_results_version_id_fkey foreign key (version_id) references app.risk_premium_versions (id) on delete no action not valid; end if; end $d$;
alter table app.risk_calc_results validate constraint risk_calc_results_version_id_fkey;
-- events_visitor_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'events_visitor_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.events add constraint events_visitor_id_fkey foreign key (visitor_id) references app.visitors (visitor_id) on delete cascade not valid; end if; end $d$;
insert into app.visitors (visitor_id, first_seen, last_seen) select e.visitor_id, min(e.at), max(e.at) from app.events e where not exists (select 1 from app.visitors v where v.visitor_id = e.visitor_id) group by e.visitor_id on conflict (visitor_id) do nothing;
alter table app.events validate constraint events_visitor_id_fkey;
-- credit_research_jobs_claimed_by_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'credit_research_jobs_claimed_by_fkey' and connamespace = 'app'::regnamespace) then alter table app.credit_research_jobs add constraint credit_research_jobs_claimed_by_fkey foreign key (claimed_by) references app.credit_research_workers (worker_id) on delete set null not valid; end if; end $d$;
insert into app.credit_research_workers (worker_id, last_seen) select j.claimed_by, max(coalesce(j.claimed_at, j.updated_at)) from app.credit_research_jobs j where j.claimed_by is not null and not exists (select 1 from app.credit_research_workers w where w.worker_id = j.claimed_by) group by j.claimed_by on conflict (worker_id) do nothing;
alter table app.credit_research_jobs validate constraint credit_research_jobs_claimed_by_fkey;
-- credit_research_runs_worker_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'credit_research_runs_worker_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.credit_research_runs add constraint credit_research_runs_worker_id_fkey foreign key (worker_id) references app.credit_research_workers (worker_id) on delete no action not valid; end if; end $d$;
insert into app.credit_research_workers (worker_id, last_seen) select r.worker_id, max(r.at) from app.credit_research_runs r where r.worker_id is not null and not exists (select 1 from app.credit_research_workers w where w.worker_id = r.worker_id) group by r.worker_id on conflict (worker_id) do nothing;
alter table app.credit_research_runs validate constraint credit_research_runs_worker_id_fkey;
-- bond_credit_analysis_history_isin_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'bond_credit_analysis_history_isin_fkey' and connamespace = 'app'::regnamespace) then alter table app.bond_credit_analysis_history add constraint bond_credit_analysis_history_isin_fkey foreign key (isin) references app.bond_credit_analysis (isin) on delete no action not valid; end if; end $d$;
alter table app.bond_credit_analysis_history validate constraint bond_credit_analysis_history_isin_fkey;
-- pe_runs_bes_run_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'pe_runs_bes_run_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.pe_runs add constraint pe_runs_bes_run_id_fkey foreign key (bes_run_id) references app.bes_runs (id) on delete set null not valid; end if; end $d$;
update app.pe_runs p set bes_run_id = null where p.bes_run_id is not null and not exists (select 1 from app.bes_runs b where b.id = p.bes_run_id);
alter table app.pe_runs validate constraint pe_runs_bes_run_id_fkey;
-- efficient_portfolio_holdings_bes_run_id_fkey
do $d$ begin if not exists (select 1 from pg_constraint where conname = 'efficient_portfolio_holdings_bes_run_id_fkey' and connamespace = 'app'::regnamespace) then alter table app.efficient_portfolio_holdings add constraint efficient_portfolio_holdings_bes_run_id_fkey foreign key (bes_run_id) references app.bes_runs (id) on delete set null not valid; end if; end $d$;
update app.efficient_portfolio_holdings h set bes_run_id = null where h.bes_run_id is not null and not exists (select 1 from app.bes_runs b where b.id = h.bes_run_id);
alter table app.efficient_portfolio_holdings validate constraint efficient_portfolio_holdings_bes_run_id_fkey;
select pg_temp.snap('after');
select b.t as table_name, b.n as rows_before, a.n as rows_after,
       case when b.n = a.n and b.h2 = a.h2 then 'only the link column' else 'rows added or removed' end as change
from fp b join fp a on a.t = b.t and a.phase = 'after' where b.phase = 'before' and b.h <> a.h order by 1;
select conrelid::regclass as not_validated from pg_constraint where connamespace = 'app'::regnamespace and contype = 'f' and not convalidated;
rollback;
