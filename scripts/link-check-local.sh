#!/usr/bin/env bash
# Runs the all-roles link check from a session sandbox (no GitHub Actions minutes).
# Needs: network access to the site (BASE) and, for the first run, ACCOUNTS_DATABASE_URL to create the two test accounts.
# Usage: ACCOUNTS_DATABASE_URL=... BASE=https://10bonds.com scripts/link-check-local.sh
set -euo pipefail
: "${ACCOUNTS_DATABASE_URL:?set ACCOUNTS_DATABASE_URL (the accounts login)}"
BASE="${BASE:-https://10bonds.com}"
pw="$(printf 'linkcheck-v1:%s' "$ACCOUNTS_DATABASE_URL" | sha256sum | cut -c1-48)"
LINKCHECK_PASSWORD="$pw" npx vite-node -c vitest.config.ts scripts/link-accounts.ts
LINKCHECK_PASSWORD="$pw" BASE="$BASE" EXTRA_CHECKS=1 CHROME_PATH="${CHROME_PATH:-/opt/pw-browsers/chromium}" node scripts/link-crawl.mjs
