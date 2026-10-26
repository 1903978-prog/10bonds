# 10BONDS databases

Two logins on one Neon Postgres project:

| Login | Reads / writes | What |
|---|---|---|
| `tenbonds_reader` (`DATABASE_URL`) | read only | `public.public_bonds`: the bond copy rebuilt every day by lm-op-model (the master). Never edited here. |
| `tenbonds_app` (`ACCOUNTS_DATABASE_URL`) | read and write, schema `app` only | Everything the site owns (below). |

## Schema `app` (owned by this site)

| Table | Holds | Why | Kept |
|---|---|---|---|
| `users` | account: e-mail, username, scrypt password hash, plan, Stripe links, terms version, newsletter opt-in (with consent and unsubscribe dates), two-factor (key encrypted, backup codes hashed) | sign-in, the plan you pay for, proof of the terms accepted, admin two-factor | until the account is deleted (never-confirmed accounts: see below) |
| `search_usage` | one row per counted search (weekly allowance) | enforce the free weekly search allowance | 30 days |
| `events` | usage statistics, only with consent, no IP | improve the site (consent) | 13 months |
| `trial_codes` | one-month Premium codes made by the admin | give and redeem trials once | permanent (account link blanked on deletion) |
| `pro_access` | professional access requests | check Pro users are regulated professionals | until the account is deleted |
| `refresh_requests` | "refresh prices" requests read by lm-op-model | hand the request to the main app | permanent (small, no personal data beyond the admin name) |
| `best_bonds` | cache of the best bonds per horizon and risk, rebuilt from `public_bonds` | fast pages | rebuilt with each copy |
| `ytm_history` | one yield per rated EUR bond per day, recorded when a new copy loads (weekly/monthly moves) | price-move figures on the bond pages | 120 days |
| `bond_price_weeks` | weekly lowest and highest yield of each shown bond, for the 52-week price high on the Price drops page | 52-week price high | about 60 weeks |
| `bond_daily_prices` | daily yield and indicative price of each shown bond (admin Price drops: 1-week and 1-month moves) | admin Price drops page | about 40 days |
| `settings` | small values the app keeps for itself (Stripe webhook key, one-time markers) | app configuration | permanent |
| `broker_*` | broker profiles, tariffs (versioned drafts and approvals), settings | broker comparison pages | permanent |
| `seo_*` | guides, their history, keywords, backlinks, assessments | public guides | permanent |

Never-confirmed accounts: today they are kept until deleted. A clean-up exists (`lib/unconfirmedPurge.ts`, run at
start): accounts with no confirmed address, no Stripe customer or subscription, older than 30 days, never the admin.
It is **off** unless the Fly secret `PRIVACY_PURGE_UNCONFIRMED=on`; Livio decides, and the privacy page's retention
section gets the new period, before it is switched on.

Links between records are enforced by the database (foreign keys): deleting an account removes its searches and Pro
request and blanks it in stats and codes. Every table has a primary key; allowed values are checked by the database.

## Held outside the database

| Where | What | Why | Kept |
|---|---|---|---|
| Stripe | customer (e-mail, name and address the payer types), subscription, invoices, card details (never seen by us) | paid plans | as tax law requires, also after the account is deleted (Stripe's records) |
| Resend | each e-mail sent (recipient, subject, body: confirmation and reset links) | account e-mails | Resend's own log retention |
| Fly.io logs | request logs and the app's `console` output (e-mail addresses in Resend errors are masked, `maskEmails`) | operation and security | Fly's short log retention |
| Server memory | client IP as the key of the sign-in / sign-up rate limit (`lib/rateLimit.ts`) | stop password guessing | only the last 15 minutes count; the entry stays in memory until the machine restarts or the table reaches 5,000 keys |
| GitHub Actions artifacts | encrypted nightly dump of schema `app` (`.github/workflows/backup.yml`) | restore after a failure | 30 days |

## Processors and their data-processing terms

Same list as the privacy page (`app/privacy/page.tsx`, section 7):

| Provider | What | Terms |
|---|---|---|
| Fly.io, Inc. | hosting, logs | https://fly.io/compliance |
| Neon, Inc. (Databricks) | this database | https://neon.com/dpa |
| Stripe Payments Europe, Ltd. | payments | https://stripe.com/legal/dpa |
| Resend (Plus Five Five, Inc.) | account e-mails | https://resend.com/legal/dpa |
| GitHub, Inc. | encrypted backups (Actions artifacts) | https://github.com/customer-terms/github-data-protection-agreement |

## How the design is tracked

- The tables are created and extended by the app itself at start (`lib/accounts.ts`, `lib/pro.ts`,
  `lib/brokers/store.ts`, `lib/seo/store.ts`), additively: `create ... if not exists`, `add column if not exists`.
  Nothing is dropped automatically and nothing is changed by hand on production (except the one-time roles in `db/setup.sql`).
- `docs/database-schema.txt` is the exact result (tables, columns, rules, indexes). `lib/schema.db.test.ts` builds the
  schema on an empty Postgres in CI, twice, and fails if the result differs from that file or if running setup again
  changes anything. A deliberate change: run the test with `UPDATE_SCHEMA=1` and commit the new file with the code.

## Backups

See `docs/OPERATIONS.md` > Backups: nightly encrypted dump of schema `app` with an automatic restore test.
