# 10bonds release governance: settings to apply after approval (10B-0007 follow-up)

Prepared 13 Nov 2026. NOT applied. The code gate in PR #510 (deploy.yml / rollback.yml need an exact-SHA REL-#### approval,
single use, audited) is only as strong as these repository settings. Until they are applied, a session using the shared
GitHub account (1903978-prog) or a local Fly token can still bypass it; the nightly release audit detects that, it does
not prevent it. Do not describe the deploy gate as secure before steps 1-4 are done and verified.

## 1. `production` environment limited to main
GitHub › 10bonds › Settings › Environments › `production` (created by the first gated run, or "New environment"):
- Deployment branches and tags: **Selected branches and tags** › add rule `main`.
- Effect: a dispatch of deploy.yml / rollback.yml from any other branch cannot enter the deploy or rollback job.

## 2. Fly token only in that environment
- Fly: create a deploy token scoped to app `10bonds` (`fly tokens create deploy -a 10bonds`), expiry 90 days.
- GitHub: Environments › `production` › Environment secrets › add `FLY_API_TOKEN` (the new token).
- GitHub: Settings › Secrets and variables › Actions › **delete the repository-level `FLY_API_TOKEN`**.
- Fly: revoke the old token(s) (`fly tokens list`, `fly tokens revoke <id>`), including any token stored on a laptop or in a
  Claude session. Effect: only a job inside `production` (main only, gate passed) can deploy; local `fly deploy` stops working.
- Same for `ACCOUNTS_DATABASE_URL` used by the claim step: also add it as a `production` environment secret.

## 3. Independent approver (prevents same-account approval)
- Environments › `production` › **Required reviewers**: a second GitHub account used only for approvals (no write or admin
  access to the repo, no Fly token, never used by a Claude session). Tick "Prevent self-review".
- Without this, the account that dispatches can also approve; steps 1-2 still stop branch and local deploys.

## 4. Protect main
- Settings › Rules › Rulesets › New branch ruleset for `main`: require a pull request, 1 approval from someone other than the
  author (the approver account in step 3), block force pushes and deletions; no bypass list for the development account.
- Effect: `docs/livio-asks.md` (the approvals table) and the workflows cannot be changed on main without the approver.

## Verification after applying
1. Dispatch deploy.yml from a non-main branch: the deploy job must not start (environment rule).
2. Dispatch deploy.yml on main with an unrecorded REL id: gate fails red, nothing claimed.
3. `fly deploy` with the old token from any machine: refused (token revoked).
4. `/api/health/version` after the first approved release shows the approved SHA and REL id; nightly release audit green.

## Who must act
Steps 2 (token creation/revocation), 3 (second account) and the ruleset in 4 change credentials and access: Livio's explicit
approval is required for each. Claude sessions cannot create GitHub accounts and the available GitHub connector has no
environment or ruleset API.
