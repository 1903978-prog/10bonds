# bes-orphan-reconcile.sql output (10bonds production)

The Secval auditor ran this read-only. Neon project round-rain-83749143, branch production, database neondb.
Run 09 Nov 2026 about 01:35 UTC inside SET TRANSACTION READ ONLY. Nothing was written.

## Q1 Totals
holdings 97030 | no_run_id 3420 | live_run 16730 | dead_run 76880

## Q2 Dead references by snapshot status
All are superseded snapshots. No published snapshot is affected.
- EUR:100k: 22 snapshots, 19140 dead
- EUR:1k: 23 snapshots, 17320 dead
- USD:100k: 23 snapshots, 20180 dead
- USD:1k: 23 snapshots, 20240 dead
- Total: 91 snapshots, 76880 dead

## Q3 Snapshots (116 rows; the newest 60 were read)
- 123-126, published 08 Nov 09:29-09:53: run 33, 0 dead.
- 107-122, superseded: runs 29-32, 0 dead.
- 103-106, superseded (06 Nov 03:09): run 28, all 3320 holdings dead.
  - 870 + 870 + 720 + 860 = 3320. That is exactly the growth since 08 Nov (76880 - 73560 = 3320).
- 99-102: run 27, all dead. 95-98: run 26, all dead. 91-94: run 25, all dead.
- 80-90: run 24, all dead. Run 24 was reused by 11 snapshots on 03-04 Nov.
- 76-79: run 23. 72-75: run 22. 68-71: run 21. 67: run 20. All of them dead.
- Rows 61-116 (older ids) were not printed.

Batch check on the published set:
- EUR snapshots 123-124 have data_as_of 08 Nov 05:00:15. That equals run 33's batch.
- USD snapshots 125-126 have data_as_of 07 Nov 22:23:18. That is run 32's batch, yet they carry run 33.
- The same cross-batch pattern is in older pairs. For example 120 EUR:1k has data_as_of 07 Nov 22:22:12 and carries run 32 (batch 07 Nov 22:23:18).

## Q4 Runs kept
| id | status | batch_id | requested_at | finished_at | trigger |
|---|---|---|---|---|---|
| 33 | published | 2026-11-08T05:00:15.226Z\|10649 | 11-08 08:55:54 | 08:56:06 | pe-schedule |
| 32 | superseded | 2026-11-07T22:23:18.932Z\|10650 | 11-08 00:43:54 | 00:44:07 | schedule |
| 31 | superseded | 2026-11-07T05:00:16.838Z\|10507 | 11-07 08:43:28 | 08:43:44 | pe-schedule |
| 30 | superseded | 2026-11-06T22:27:48.919Z\|10507 | 11-06 23:14:57 | 23:15:09 | schedule |
| 29 | superseded | 2026-11-06T05:00:16.941Z\|10125 | 11-06 09:19:14 | 09:19:27 | pe-schedule |

## Q5 Dead run ids
lowest 12 | highest 28 | distinct 17 | oldest kept 29

## Q6 pe_runs pointing at a deleted bes_run
| id | status | bes_run_id | requested_at | finished_at |
|---|---|---|---|---|
| 28 | superseded | 26 | 11-05 02:58:20 | 02:59:19 |
| 29 | superseded | 27 | 11-05 09:25:25 | 09:26:09 |
| 30 | superseded | 28 | 11-06 02:58:35 | 02:59:19 |

## Q7 Score copies on live run ids
checked 16730 | score_differs 0
