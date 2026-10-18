# 10BONDS

Public website: pick a duration and a target yield, get the 10 best-matching euro bonds.

- **Data**: reads one table, `public_bonds`, from its own Neon database with a read-only login.
  The main app (lm-op-model) copies bond facts into that table once a day. The website has no
  connection to the main app. Without `DATABASE_URL` it runs on clearly marked sample bonds
  (only when `ALLOW_SAMPLE_DATA=1` in production).
- **Plans**: Free (top 3, issuer and yield), Plus (full top 10, ISINs, details), Premium (alerts, saved searches).
  Hidden fields are removed on the server, so they never reach a free user's browser.
- **Ranking** (`lib/ranking.ts`): bonds within 1 year of the target duration (widened up to 3),
  score = |yield - target| + 0.1 x rating notch, best 10.

## Run
    npm install
    npm run dev          # http://localhost:3000, sample data
    npm test
    npm run build

## Deploy (Fly.io)
    fly deploy
    fly secrets set DATABASE_URL='postgres://tenbonds_reader:...@.../neondb?sslmode=require'

Database setup: `db/setup.sql`.
