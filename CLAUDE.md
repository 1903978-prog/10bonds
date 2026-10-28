# Rules for sessions working in this repo

Owner: Livio (no coding background). Keep answers short and plain. Saving his time comes first.

## GitHub Actions (cost and email noise)
- Nothing runs on a push to a `claude/**` or other session branch. Workflows trigger only on: `pull_request` (ready for review, not drafts), push to `main`, a nightly schedule, or manual dispatch.
- "Checks" (`ci.yml`) runs on PRs that are ready for review and before each deploy. A newer commit cancels the older run. Docs-only changes (`**.md`, `docs/**`) skip it. Do not mark a PR ready until it is meant to ship.
- Live checks (`*-live-check.yml`) are one nightly run (04:10-04:50 UTC) plus manual dispatch. Never on every push, never while a deploy is running. To test a new live check, run it by hand once.
- Do not add `on: push` with `paths:` to a workflow. Do not add `workflow_run` on "Deploy to Fly" for anything heavy.
- Temporary or one-off workflows (tmp, probe, diag): delete them in the same branch before merging.
- Never re-run a failed workflow just to see if it passes. Find the cause (test bug, missing secret, site mid-deploy, flaky timing) and fix it, or remove the check if it is redundant.
- Run only the tests for the modules you touched (`npx vitest run <file>`); CI runs the full suite.

## Deploy
- `deploy.yml` ("Deploy to Fly") is the only deploy path from a session: sessions cannot run `flyctl` or reach fly.dev. It runs on push to `main` except docs, workflow files and live-check scripts. It tries the Fly build twice, checks the site after release and rolls back by itself.
- Livio's "ship it" is needed before pushing to `main`. Do not edit `fly.toml` memory or machine size without his word.

## Notifications
- Failures on branches and PR checks must not reach Livio. GitHub's per-run failure emails are an account setting (https://github.com/settings/notifications, Actions section), not controlled by the repo. A nightly live-check failure on production is the only one he should hear about.
