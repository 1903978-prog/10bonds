# "Refresh prices" button: what LM op model has to do

The 10BONDS admin page has a **Refresh prices** button. Clicking it adds a row to
`app.refresh_requests` in the **10BONDS Neon database** (the same database LM op model
already writes `public_bonds` into). 10BONDS never calls LM op model and holds no
credential for it. LM op model checks the table and does the work.

## Table (created by 10BONDS)

```
app.refresh_requests (
  id bigserial primary key,
  requested_at timestamptz,
  requested_by text,
  status text  -- 'pending' | 'running' | 'done' | 'failed'
  picked_up_at timestamptz,
  finished_at timestamptz,
  note text    -- short plain result, shown on the admin page
)
```
Select and update on this one table are granted to every login of the 10BONDS
database, so the export login (`PUBLIC_EXPORT_DATABASE_URL`) can use it as is.

## Change in LM op model (server/publicBondExport.ts, one new step)

1. On a timer, connect with `PUBLIC_EXPORT_DATABASE_URL` and claim one request:
   ```sql
   update app.refresh_requests set status = 'running', picked_up_at = now()
   where id = (select id from app.refresh_requests where status = 'pending'
               order by id limit 1 for update skip locked)
   returning id;
   ```
   No row: stop (nothing else is touched).
2. Run the existing price refresh pass (the same one the daily 03:00 run starts,
   trigger "manual", through the heavy-job queue), then the public bond export.
3. Mark it finished:
   `update app.refresh_requests set status = 'done', finished_at = now(), note = '<N bonds refreshed, M exported>' where id = $1`
   (on error: `status = 'failed'`, note = the plain reason).
4. A row left `running` for more than 3 hours is set back to `failed` with note "timed out".

## Cost to decide (LM op model's Neon rule)

Every check wakes the 10BONDS Neon compute (about 5 minutes awake per check).
- Every 15 minutes: the 10BONDS database never sleeps (about USD 5-8 a month extra on that project).
- Every hour: about 2 hours awake a day (about USD 1 a month). **Recommended default.**
The LM op model database is not touched by the check itself.
