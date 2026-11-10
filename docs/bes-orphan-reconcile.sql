-- Read-only reconciliation of efficient_portfolio_holdings.bes_run_id and pe_runs.bes_run_id that point at no bes_runs row.
-- 10bonds thread, 09 Nov 2026. Run in a read-only transaction. Changes nothing.
begin transaction read only;

-- Q1. Totals: every holding falls in exactly one bucket.
select count(*) as holdings,
       count(*) filter (where h.bes_run_id is null) as no_run_id,
       count(*) filter (where h.bes_run_id is not null and b.id is not null) as live_run,
       count(*) filter (where h.bes_run_id is not null and b.id is null) as dead_run
from app.efficient_portfolio_holdings h left join app.bes_runs b on b.id = h.bes_run_id;

-- Q2. Dead references by snapshot status (is the snapshot users see now affected?).
select s.status, s.filter_key, count(distinct s.id) as snapshots, count(*) as dead_holdings
from app.efficient_portfolio_holdings h
join app.efficient_portfolio_snapshots s on s.id = h.snapshot_id
where h.bes_run_id is not null and not exists (select 1 from app.bes_runs b where b.id = h.bes_run_id)
group by 1, 2 order by 1, 2;

-- Q3. Snapshot by snapshot (newest first): when it was made, its holdings, and the run ids they carry.
select s.id, s.status, s.filter_key, s.calculated_at, s.published_at, s.data_as_of,
       count(h.*) as holdings,
       count(h.*) filter (where h.bes_run_id is not null and b.id is null) as dead,
       array_agg(distinct h.bes_run_id) filter (where h.bes_run_id is not null) as run_ids
from app.efficient_portfolio_snapshots s
left join app.efficient_portfolio_holdings h on h.snapshot_id = s.id
left join app.bes_runs b on b.id = h.bes_run_id
group by s.id order by s.id desc;

-- Q4. Runs that still exist (the prune keeps the 5 newest superseded or failed runs, plus the published one).
select id, status, batch_id, requested_at, finished_at, trigger from app.bes_runs order by id desc;

-- Q5. Range of the dead run ids, compared with the oldest run still kept.
select min(h.bes_run_id) as lowest_dead, max(h.bes_run_id) as highest_dead, count(distinct h.bes_run_id) as distinct_dead,
       (select min(id) from app.bes_runs) as oldest_kept
from app.efficient_portfolio_holdings h
where h.bes_run_id is not null and not exists (select 1 from app.bes_runs b where b.id = h.bes_run_id);

-- Q6. Net-spread runs pointing at a deleted efficiency run.
select p.id, p.status, p.bes_run_id, p.requested_at, p.finished_at
from app.pe_runs p
where p.bes_run_id is not null and not exists (select 1 from app.bes_runs b where b.id = p.bes_run_id)
order by p.id;

-- Q7. Do the bond-efficiency scores copied onto holdings still match a live run? (Only possible for live run ids.)
select count(*) as checked,
       count(*) filter (where x.efficiency_score is distinct from h.bes_score) as score_differs
from app.efficient_portfolio_holdings h
join app.bes_bonds x on x.run_id = h.bes_run_id and x.isin = h.isin;

rollback;
