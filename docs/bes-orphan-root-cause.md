# 10bonds: the 76,880 dead portfolio-run references

09 Nov 2026. 10bonds thread. This was a read-only investigation; no data was changed.

## Answer

Every one of the 76,880 dead references is accounted for. All are in old, superseded portfolio snapshots that nobody sees on the site. The cause is a mismatch between two clean-up rules in the code: one keeps old snapshots forever, the other deletes the scoring runs those snapshots name. No score, portfolio or published page is wrong because of it.

## Evidence

Production was read on 09 Nov 2026 at about 01:35 UTC by the Secval audit thread, using `docs/bes-orphan-reconcile.sql` in a read-only transaction. Full output: `/mnt/project-files/10bonds/bes-orphan-reconcile-output-2026-11-09.md`.

**Q1, all 97,030 holdings rows:**

| Bucket | Rows |
|---|---|
| no run id | 3,420 |
| live run | 16,730 |
| dead run | 76,880 |

**Q2, where the dead rows are:** all 76,880 are in 91 superseded snapshots.

| Filter key | Dead rows |
|---|---|
| EUR:100k | 19,140 |
| EUR:1k | 17,320 |
| USD:100k | 20,180 |
| USD:1k | 20,240 |

None is in a published snapshot.

**Q4 and Q5, which runs:**
- Runs 29 to 33 still exist; run 33 is the published one.
- The dead ids are runs 12 to 28: 17 runs, all older than the oldest run kept.

**Growth, reconciled exactly:**
- On 08 Nov there were 73,560 dead rows; on 09 Nov there are 76,880. The difference is 3,320.
- Snapshots 103 to 106 named run 28, which was deleted when run 33 arrived. Their holdings are 870 + 870 + 720 + 860 = 3,320.

**Q6:** net-spread runs 28, 29 and 30 (all superseded) name the deleted runs 26, 27 and 28. Same cause.

**Q7:** the 16,730 holdings that point at a live run have scores identical to that run (0 differences). The score copies are faithful.

## Root cause, in the code

1. **Snapshots are kept forever.**
   - `lib/sliderSnapshot.ts` marks the previous published snapshot `superseded` when a new one is published, and never deletes it. Only `incomplete` snapshots are pruned.
   - Each snapshot keeps about 720 to 870 holdings rows. 116 snapshots are stored today. The admin page lists only the newest 30.
2. **Scoring runs are pruned.**
   - `lib/bes/store.ts` runs bond efficiency on the whole bond copy about twice a day: once on schedule, once before the net-spread run.
   - Each run deletes older superseded and failed runs, so only the 5 newest runs survive.
3. **The holding keeps the run's id after the run is gone.**
   - `applyBes` copies the score onto each holding and also writes `bes_run_id`.
   - No foreign key ties the two, so when the run is pruned the id is left pointing at nothing.
   - The id is written but never read by the app, so nothing visible broke.

Result: each run that is pruned leaves roughly 3,300 holdings rows with a dead id. That is about 3,300 more each day until something changes.

### Second suspect, checked and cleared

`applyBes` uses the latest published run without checking its price batch. The net-spread code does check.
- The auditor saw USD snapshots whose `data_as_of` (07 Nov 22:23) differs from run 33's batch (08 Nov 05:00).
- That is a difference of definition, not a wrong copy. A snapshot's `data_as_of` is the newest quote among its own bonds (USD quotes stop at the US close), while a run's batch id is the newest quote in the whole copy.
- Snapshots 125 and 126 were built on 08 Nov at 09:29 to 09:53, after run 33 (08:56), from the same copy.
- So no wrong scores were found. A batch check in `applyBes` would still make this impossible by design; it is proposed as hardening below and is not in any PR yet.

## Cleanup options (each one needs Livio's approval before it touches production)

| Option | What it does to production | What it fixes | Recommendation |
|---|---|---|---|
| **A. Clear the dead ids** (already in draft PR #497) | Sets `bes_run_id` to empty on about 76,880 holdings and 3 net-spread runs. Scores stay. Afterwards the foreign key (ON DELETE SET NULL) clears ids automatically whenever a run is pruned. | The dead references, now and in future | **Yes**: nothing is deleted |
| B. Keep a run while a snapshot names it | No production data change; the code keeps more runs (about 10,600 rows per run) | Dead references stop, at a storage cost | No: keeps data nobody reads |
| C. Retention for old snapshots, for example keep the newest 30 per filter key (what the admin page shows) | Deletes about 90,000 holdings rows plus their positions, in old superseded snapshots | Endless growth of the table | Livio's call. It deletes history, so it is a separate approval, not in #497 |
| D. Batch check in `applyBes` | Code only | Makes a cross-batch score copy impossible | Yes, as a draft PR (no production data change) |

**Next actions that need Livio:**
- Approve the release of #497 (option A), which is already in the consolidated release request.
- Decide whether old snapshots should have a retention limit (option C).
