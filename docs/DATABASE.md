# 10BONDS databases

Two logins on one Neon Postgres project:

| Login | Reads / writes | What |
|---|---|---|
| `tenbonds_reader` (`DATABASE_URL`) | read only | `public.public_bonds`: the bond copy rebuilt every day by lm-op-model (the master). Never edited here. |
| `tenbonds_app` (`ACCOUNTS_DATABASE_URL`) | read and write, schema `app` only | Everything the site owns (below). |

## Schema `app` (owned by this site)

| Table | Holds | Kept |
|---|---|---|
| `users` | account: e-mail, username, scrypt password hash, plan, Stripe links, terms version, newsletter opt-in (with consent and unsubscribe dates), two-factor (key encrypted, backup codes hashed) | until the account is deleted |
| `search_usage` | one row per counted search (weekly allowance) | 30 days |
| `events` | usage statistics, only with consent, no IP | 13 months |
| `trial_codes` | one-month Premium codes made by the admin | permanent |
| `pro_access` | professional access requests | until the account is deleted |
| `refresh_requests` | "refresh prices" requests read by lm-op-model | permanent (small) |
| `best_bonds` | cache of the best bonds per horizon and risk, rebuilt from `public_bonds` | rebuilt with each copy |
| `ytm_history` | one yield per rated EUR bond per day, recorded when a new copy loads (weekly/monthly moves) | 120 days |
| `bond_price_weeks` | weekly lowest and highest yield of each shown bond, for the 52-week price high on the Price drops page | about 60 weeks |
| `settings` | small values the app keeps for itself (Stripe webhook key, one-time markers) | permanent |
| `broker_*` | broker profiles, tariffs (versioned drafts and approvals), settings | permanent |
| `seo_*` | guides, their history, keywords, backlinks, assessments | permanent |

Links between records are enforced by the database (foreign keys): deleting an account removes its searches and Pro
request and blanks it in stats and codes. Every table has a primary key; allowed values are checked by the database.

## How the design is tracked

- The tables are created and extended by the app itself at start (`lib/accounts.ts`, `lib/pro.ts`,
  `lib/brokers/store.ts`, `lib/seo/store.ts`), additively: `create ... if not exists`, `add column if not exists`.
  Nothing is dropped automatically and nothing is changed by hand on production (except the one-time roles in `db/setup.sql`).
- `docs/database-schema.txt` is the exact result (tables, columns, rules, indexes). `lib/schema.db.test.ts` builds the
  schema on an empty Postgres in CI, twice, and fails if the result differs from that file or if running setup again
  changes anything. A deliberate change: run the test with `UPDATE_SCHEMA=1` and commit the new file with the code.

## Backups

See `docs/OPERATIONS.md` > Backups: nightly encrypted dump of schema `app` with an automatic restore test.
