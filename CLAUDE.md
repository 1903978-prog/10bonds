# GitHub Actions rules (permanent, Livio 28/10/2026 — target under 50 cents/day across all repos)

- No workflow runs on push to `claude/**` or any session branch. Allowed triggers: `schedule`, `workflow_dispatch`, `pull_request` into the shipping branch only (with `paths-ignore: ["**.md", "docs/**"]`), and `workflow_run` after a successful deploy.
- Every check has a `concurrency` group with `cancel-in-progress: true` so a newer commit cancels older runs (backups/deploys: `false`).
- Live / link / tile checks: one scheduled run per night plus one run after a successful deploy; never on every push, never while a deploy is in progress.
- Deploys: sessions run `fly deploy` directly. No workflow may deploy on push (a "Deploy to Fly" workflow, if kept, is manual-only).
- A failing check is diagnosed from its logs and fixed at the cause (or removed if redundant). Never re-run a failed workflow just to see if it passes.
- Failure emails: only a nightly live-check failure on the production site may email Livio (one summary, sent by the app). Branch and PR check failures never email him.
- Live checks are `workflow_dispatch` only. The one scheduled live check is `nightly-live-check.yml` (14:30 Bangkok), which e-mails one summary through the app (`/api/ops/alert`) only when it fails. The check after a deploy is the post-deploy steps inside `deploy.yml` (with rollback).
- Never start a check while a deploy runs, and nothing runs during the nightly build window 00:10-04:00 UTC (07:10-11:00 Bangkok).
- A new workflow must state its trigger and estimated minutes per day in its pull request. Temporary probe workflows are manual and deleted before merge.
- Times to the owner are in Bangkok time and/or CET, never UTC alone.
