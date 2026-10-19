#!/usr/bin/env bash
# Nightly backup of the accounts database (schema "app") with a real restore test. Prints counts only, never data.
#   1. dump schema app from the live database (read only);
#   2. encrypt the dump (AES-256, key from BACKUP_KEY);
#   3. decrypt that encrypted file again and restore it into an empty database (RESTORE_URL);
#   4. compare table by table: every table restored, row counts match the live ones (small drift allowed on
#      the two tables that grow while the dump runs).
# Env: SOURCE_URL, RESTORE_URL, BACKUP_KEY, OUT (encrypted file to write). PG_RUN optionally prefixes the Postgres
# tools (CI runs them from a postgres:18 container so pg_dump is never older than the server).
set -euo pipefail
: "${SOURCE_URL:?}" "${RESTORE_URL:?}" "${BACKUP_KEY:?}" "${OUT:?}"
PG_RUN=${PG_RUN:-}
# pg_dump needs a direct connection; Neon's pooled host ("-pooler") does not support it.
SOURCE_URL=${SOURCE_URL/-pooler./.}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

count_rows() { # $1 = database link; prints "table count" lines for schema app
  local tables
  tables=$($PG_RUN psql "$1" -X -A -t -c "select tablename from pg_tables where schemaname = 'app' order by 1")
  for t in $tables; do
    printf '%s %s\n' "$t" "$($PG_RUN psql "$1" -X -A -t -c "select count(*) from app.\"$t\"")"
  done
}

echo "== dump (schema app)"
$PG_RUN pg_dump "$SOURCE_URL" --schema=app --no-owner --no-privileges --format=custom > "$work/app.dump"
count_rows "$SOURCE_URL" > "$work/live.txt"
echo "dump size: $(wc -c < "$work/app.dump") bytes, tables: $(wc -l < "$work/live.txt")"
[ -s "$work/app.dump" ] || { echo "Empty dump."; exit 1; }

echo "== encrypt"
openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_KEY -in "$work/app.dump" -out "$OUT"
sha256sum "$OUT" | cut -d' ' -f1 > "$OUT.sha256"

echo "== restore test (from the encrypted file)"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_KEY -in "$OUT" -out "$work/restored.dump"
cmp -s "$work/app.dump" "$work/restored.dump" || { echo "Decrypted file differs from the dump."; exit 1; }
$PG_RUN psql "$RESTORE_URL" -X -q -c "drop schema if exists app cascade"
$PG_RUN pg_restore --dbname="$RESTORE_URL" --no-owner --no-privileges --exit-on-error < "$work/restored.dump"
count_rows "$RESTORE_URL" > "$work/restored.txt"

echo "== compare (table: live / restored)"
fail=0
while read -r t live; do
  got=$(awk -v t="$t" '$1 == t { print $2 }' "$work/restored.txt")
  if [ -z "$got" ]; then echo "MISSING $t"; fail=1; continue; fi
  diff=$(( live > got ? live - got : got - live ))
  case "$t" in
    events|search_usage) allowed=$(( live / 50 + 20 )) ;; # still being written while the dump runs
    *) allowed=0 ;;
  esac
  status=ok; [ "$diff" -le "$allowed" ] || { status=DIFF; fail=1; }
  printf '%-24s %8s / %-8s %s\n' "$t" "$live" "$got" "$status"
done < "$work/live.txt"
[ "$fail" = 0 ] && echo "Restore test passed." || { echo "Restore test FAILED."; exit 1; }
