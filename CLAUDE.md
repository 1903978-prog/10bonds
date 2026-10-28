# Rules for every session on this repo

## GitHub Actions (cost target: under 0.50 USD/day across all repos)
- No workflow runs on `push` to `claude/**` or any session branch. Push triggers exist only for `main` (deploy, engine precompute).
- Checks (`ci.yml`) run only on the pull request that ships to `main`, and on manual dispatch. Newer commits cancel older runs (concurrency group). Docs-only changes (`*.md`, `docs/**`, images, workflow files) skip CI.
- Live, link, BES-tile, frontier and similar checks are `workflow_dispatch` only, never on push or pull request. The one scheduled live check is `nightly-live-check.yml`; the check after a deploy is the post-deploy steps inside `deploy.yml`.
- Never start a check while a deploy runs. Deploys go one at a time (`concurrency: deploy`, never cancel a running deploy). Nothing runs during the nightly build window 00:10-04:00 UTC.
- Never re-run a failed workflow to "see if it passes". Read the log, find the cause, fix it or remove the check.
- Do not add a new workflow without stating its trigger and estimated minutes per day in the pull request. Temporary probe workflows go on a branch, are triggered by `workflow_dispatch`, and are deleted before merge.
- Failures on branches and PR checks send no e-mail. Only a nightly live-check failure on production sends one summary e-mail (through the app, `/api/ops/alert`).
- Times to the owner are in Bangkok time and/or CET, never UTC alone.
