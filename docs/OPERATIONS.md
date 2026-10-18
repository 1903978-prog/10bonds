# Running 10BONDS

## Deploys
Every push to `main` runs `.github/workflows/deploy.yml`:
1. **test**: type check (`npm run typecheck`) and unit tests (`npm test`). A failure stops the deploy; the live site is untouched.
2. **deploy**: builds on Fly's remote builder and replaces the running app.
3. **checks**: site answers, accounts database, robot check, payments, bond list ranking. A failed check marks the run red.

## Rollback (one click)
GitHub > Actions > **Roll back to the previous release** > Run workflow.
It puts the image of the release before the current one back on Fly. Nothing is rebuilt and no data changes.
From a terminal instead: `flyctl releases -a 10bonds --image` then `flyctl deploy -a 10bonds --image <previous image>`.

## Backups
- Bond data: a read-only copy filled by lm-op-model; the source of truth is in lm-op-model, so it can be refilled from there.
- Accounts database (Neon): Neon keeps a restore history (point-in-time restore) on its free plan, limited to a short window. Restore from the Neon console > Branches > Restore.
- A longer, independent backup (e.g. a nightly `pg_dump` to free storage) is not set up yet.

## Limits that protect the site
- Login: 10 tries per 15 minutes per address and per email.
- Bond search and curve: 240 requests a minute per address.
- Errors on pages show a friendly page with Try again; details go to the server log only.
