# Running 10BONDS

## Deploys
Every pull request runs `.github/workflows/ci.yml` (Checks). Every push to `main` runs `.github/workflows/deploy.yml`:
1. **test** (the same Checks): type check, lint (`npm run lint`), unit tests, the database design on a real Postgres
   (`docs/database-schema.txt`, see `docs/DATABASE.md`), a production build, and a browser check of the public pages at
   desktop and phone widths (`scripts/page-check.mjs`: loads, title, heading, no script errors, no sideways scrolling,
   no serious accessibility problems). A failure stops the deploy; the live site is untouched.
2. **deploy**: builds on Fly's remote builder and replaces the running app. The Fly tool is pinned (action commit and
   flyctl version in the workflow); change it on purpose only.
3. **checks**: site answers, accounts database, robot check, payments, bond list ranking. If any of them fails, the
   previous release is put back automatically (`scripts/fly-rollback.sh`) and the run stays red.

## Rollback (one click, or automatic)
Automatic: a deploy whose checks fail is rolled back by itself (see above).
By hand: GitHub > Actions > **Roll back to the previous release** > Run workflow.
It puts the image of the release before the current one back on Fly. Nothing is rebuilt and no data changes.
From a terminal instead: `flyctl releases -a 10bonds --image` then `flyctl deploy -a 10bonds --image <previous image>`.

## Backups
- Bond data: a read-only copy filled by lm-op-model; the source of truth is in lm-op-model, so it can be refilled from there.
- Nightly copy to Dropbox: see docs/rebuild-from-zero.md.
- Accounts database (schema `app`: accounts, plans, codes, Pro requests, stats, guides, broker data):
  - **Nightly backup with a restore test** (`.github/workflows/backup.yml`, 02:15 UTC): dumps schema `app`, encrypts
    it (AES-256), decrypts that file again, restores it into an empty Postgres and compares every table's row count with
    the live one. A red run means there is no good backup for that night. The encrypted file is kept 30 days under the
    run's Artifacts. Key: repo secret `BACKUP_KEY` if set, otherwise the `ACCOUNTS_DATABASE_URL` secret's value
    (whoever has that value can open the database itself). If that secret changes, keep its old value to open older files.
  - **To restore** a night's file into a database you choose (never straight over the live one without a copy):
    `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass pass:'<key>' -in accounts-YYYY-MM-DD.dump.enc -out app.dump`
    then `pg_restore --dbname='<target link>' --no-owner --no-privileges app.dump`.
  - Neon also keeps its own short restore history (point-in-time restore) on the free plan: Neon console > Branches > Restore.
- The admin's two-factor key is stored encrypted with a key derived from `SESSION_SECRET` (Fly secret), so a backup
  alone does not reveal it. Do not change `SESSION_SECRET`: everyone would be signed out and the admin would need a
  backup code to sign in and set two-factor up again.

## Data watch
`.github/workflows/data-watch.yml` runs every morning (07:30 UTC) and reads `/api/health/data` and
`/api/health/ranking`. It goes red (GitHub e-mails the owner) when the newest yield is more than 4 days old (the
daily copy from lm-op-model stopped), a column the site reads disappeared, the table is empty or an ISIN appears
twice. Visitors see a yellow "these yields are N days old" note above the results in the same case.

## Limits that protect the site
- Login: 10 tries per 15 minutes per address and per email.
- Bond search and curve: 240 requests a minute per address.
- Errors on pages show a friendly page with Try again; details go to the server log only.
