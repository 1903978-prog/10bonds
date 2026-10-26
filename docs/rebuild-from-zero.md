# Rebuild 10BONDS from zero

Plain-language checklist. Names only, never secret values. Keep the actual values in a password manager.

## 1. What is backed up (Dropbox folder "App backups / 10bonds")
Made every night by `.github/workflows/backup.yml` (02:15 UTC), newest 14 of each kept:
- `10bonds-code-DATE.zip`: all the code as of that night.
- `10bonds-history-DATE.bundle`: the code with its full history (restore: `git clone 10bonds-history-DATE.bundle 10bonds`).
- `10bonds-accounts-db-DATE.dump.enc`: the accounts database (schema `app`): users and password hashes, plans, Stripe links, codes,
  settings (incl. Stripe webhook key), search usage, stats, saved/shortlisted data, SEO history, Gemini results, broker data.
  It is encrypted. **Without the key it cannot be opened**: keep `BACKUP_KEY` in your password manager. If the secret
  `BACKUP_KEY` is not set, the key is the value of `ACCOUNTS_DATABASE_URL` (then keep that value safe instead).
- Older manual files (`10bonds-db-...dump`) can be deleted once the nightly files appear.

NOT in any backup: secrets, accounts at outside services, the domain, and the bond data (see 4).

## 2. Accounts and services needed
| Service | Used for | Notes |
|---|---|---|
| GitHub (`1903978-prog/10bonds`) | code, automatic checks, deploy, nightly jobs | Actions secrets listed in 3 |
| Fly.io | runs the site: app `10bonds`, region `cdg` (Paris), 1 shared CPU, 1024 MB, always 1 machine on, health check `/api/health` (all in `fly.toml`) | needs a Fly token |
| Neon (Postgres) | one project, database `neondb`: schema `public` = bond data (`public_bonds`), schema `app` = accounts | logins `tenbonds_reader` (read only) and `tenbonds_app` (schema `app`); created with `db/setup.sql` |
| Stripe (SQUARE ONE OÜ, live) | payments, plans | webhook to `https://10bonds.com/api/stripe/webhook` |
| Resend | confirmation and other emails | sending domain must be verified |
| Google Gemini | bond text/ratings helper | free tier |
| Google Cloud service account | Search Console data | added as user in Search Console |
| Bing Webmaster, PageSpeed, Perplexity | SEO and AI-citation reports | API keys |
| Dropbox | backups | app with refresh token (section 5) |
| Domain `10bonds.com` + DNS | public address | points to Fly |
| LM op model (separate project) | fills the bond data | see 4 |

## 3. Secret names
GitHub Actions secrets (repo > Settings > Secrets and variables > Actions):
`ACCOUNTS_DATABASE_URL`, `DATABASE_URL`, `BACKUP_KEY`, `FLY_API_TOKEN`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
`GEMINI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `BING_WEBMASTER_API_KEY`, `PAGESPEED_API_KEY`, `PERPLEXITY_API_KEY`,
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`,
`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`,
`DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN`.

Fly secrets (`fly secrets set NAME=value -a 10bonds`; check the current list with `fly secrets list -a 10bonds`):
`DATABASE_URL`, `ACCOUNTS_DATABASE_URL`, `SESSION_SECRET` (never change it: everyone is signed out and admin two-factor breaks;
it is NOT in the database backup, so store it in your password manager), `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
`ADMIN_EMAILS`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, `BING_WEBMASTER_API_KEY`, `PAGESPEED_API_KEY`,
`PERPLEXITY_API_KEY`, `CANONICAL_HOST`/`SITE_URL` (if set), `INDEXNOW_KEY` (if set).
Other names the code can read are optional (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, LinkedIn, X).

## 4. What LM op model must supply
The bond data is not rebuilt from this repo. LM op model writes `public.public_bonds` into the Neon project every night
(`PUBLIC_EXPORT_DATABASE_URL` on its side). It must also fill the columns in `docs/handover/` (`lr_score`, dormant flag,
bond details, price history, USD ratings, coupon frequency) and read `app.refresh_requests` hourly
(`docs/handover/refresh-requests.md`). Without it the site starts but shows no or stale bonds. Back up LM op model separately.

## 5. Restore, in order
1. **Code**: unzip `10bonds-code-DATE.zip`, or `git clone 10bonds-history-DATE.bundle 10bonds`; push to a new GitHub repo.
2. **Neon**: create a project, run `db/setup.sql` (roles `tenbonds_reader`, `tenbonds_app`, schema `app`).
3. **Database**: decrypt and restore (use a copy of your link, never the old live database by mistake):
   `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass pass:'<BACKUP_KEY>' -in 10bonds-accounts-db-DATE.dump.enc -out app.dump`
   then `pg_restore --dbname='<new ACCOUNTS_DATABASE_URL>' --no-owner --no-privileges app.dump`.
4. **Bond data**: point LM op model at the new database and run its export.
5. **Secrets**: set the GitHub and Fly secrets from section 3.
6. **Fly**: `fly apps create 10bonds`, then push to `main` (deploy workflow) or `fly deploy`.
7. **Domain**: point `10bonds.com` (and `www`) at Fly (`fly certs add 10bonds.com`), update DNS.
8. **Stripe**: webhook `https://10bonds.com/api/stripe/webhook`; check `https://10bonds.com/api/health/billing` says live.
9. **Search Console / Bing**: re-add the service account, submit the sitemap.
10. **Lists**: run GitHub Actions > "Precompute frontiers" (rebuilds the saved portfolio lists), then "Landing snapshot" by hand.
11. Check `https://10bonds.com/api/health`, `/api/health/data`, sign in as admin.

## 6. One-time step to switch on the Dropbox upload
1. Open https://www.dropbox.com/developers/apps > Create app > Scoped access > Full Dropbox. Name it e.g. `10bonds-backup`.
2. Permissions tab: tick `files.content.write`, `files.content.read`, Submit.
3. Copy App key and App secret (Settings tab). Open
   `https://www.dropbox.com/oauth2/authorize?client_id=<APP_KEY>&response_type=code&token_access_type=offline`, allow, copy the code.
4. Get the refresh token: in a terminal
   `curl https://api.dropbox.com/oauth2/token -d code=<CODE> -d grant_type=authorization_code -u <APP_KEY>:<APP_SECRET>`
   and copy `refresh_token`.
5. Add the three GitHub secrets `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` at
   https://github.com/1903978-prog/10bonds/settings/secrets/actions . Optional: add `BACKUP_KEY` (any long random text).
6. Run it once: https://github.com/1903978-prog/10bonds/actions/workflows/backup.yml > Run workflow.
