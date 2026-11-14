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

## 3. One human approver: Livio (policy EEN-REL-001, 14 Nov 2026)
- Livio is the only human release approver. No other human, extra GitHub account, collaborator or formal approving
  review is ever required, and none may be requested. Independent AI code review stays mandatory.
- His approval is the exact-SHA REL-#### row (step "Release approvals" in docs/livio-asks.md), written from his own words.
- Remaining risk, stated plainly: one admin account can still edit the approvals table, change workflows or use a Fly token it
  holds. The gate stops mistakes and unapproved automated releases; the nightly release audit detects a deliberate bypass.

## 4. Protect main (EEN-REL-001 configuration)
- Settings › Branches (or Rules › Rulesets) for `main`: require a pull request, **required approving reviews = 0**, required
  status check `test / checks`, block force pushes and deletions.
- The approval row then reaches main through a docs-only pull request (the gate accepts a head whose only change from the
  approved commit is docs/livio-asks.md, including a merge commit).
- Checked 14 Nov 2026: main has no branch protection and no ruleset, so no review count exists to correct.

## Verification after applying
1. Dispatch deploy.yml from a non-main branch: the deploy job must not start (environment rule).
2. Dispatch deploy.yml on main with an unrecorded REL id: gate fails red, nothing claimed.
3. `fly deploy` with the old token from any machine: refused (token revoked).
4. `/api/health/version` after the first approved release shows the approved SHA and REL id; nightly release audit green.

## Who must act
Steps 2 (token creation/revocation) and the main protection in 4 change credentials and repository settings; the GitHub
connector available to Claude sessions has no environment, secret or ruleset API. Step 3 needs no action.
