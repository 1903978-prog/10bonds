# GitHub Actions rules (permanent, Livio 28/10/2026 — target under 50 cents/day across all repos)

- No workflow runs on push to `claude/**` or any session branch. Allowed triggers: `schedule`, `workflow_dispatch`, `pull_request` into the shipping branch only (with `paths-ignore: ["**.md", "docs/**"]`), and `workflow_run` after a successful deploy.
- Every check has a `concurrency` group with `cancel-in-progress: true` so a newer commit cancels older runs (backups/deploys: `false`).
- Live / link / tile checks: one scheduled run per night plus one run after a successful deploy; never on every push, never while a deploy is in progress.
- DEPLOY RULE (Livio 28/10/2026, final, do not flip-flop): 10bonds deploys ONLY with `fly deploy` run by the owning session after merge. The GitHub "Deploy to Fly" workflow is manual-only and never runs on push or merge. No workflow builds, tests or deploys on merge to `main`. Fly apps (10bonds, lm-op-model, Nexus, security scanner) follow the same rule; compplan (Render) keeps its GitHub ship workflow.
- A failing check is diagnosed from its logs and fixed at the cause (or removed if redundant). Never re-run a failed workflow just to see if it passes.
- Failure emails: only a nightly live-check failure on the production site may email Livio (one summary, sent by the app). Branch and PR check failures never email him.
- Draft PRs do not run CI (it starts when the PR is marked ready). `nightly-live-check.yml` is the one production check that e-mails: it posts to `/api/admin/live-check-alert` (HMAC with ACCOUNTS_DATABASE_URL, no new secret), which e-mails the first ADMIN_EMAILS address once.
