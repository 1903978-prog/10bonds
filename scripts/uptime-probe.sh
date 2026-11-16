#!/usr/bin/env bash
# 10BONDS release availability observation, recovered from archived PR #454.
# The watcher samples the public /api/health endpoint between deployment steps.
# It is informational ONLY: never fail or roll back a release based on probe output.
# Usage:
#   bash scripts/uptime-probe.sh /path/to/probe.log
#   bash scripts/uptime-probe.sh --summary /path/to/probe.log
# Format: <UTC epoch milliseconds> <HTTP code or 000> <elapsed seconds>
set -euo pipefail

if [[ "${1:-}" == "--summary" ]]; then
  log="${2:-}"
  echo "### 10BONDS deploy uptime probe (informational)"
  if [[ -z "$log" || ! -s "$log" ]]; then
    echo "No samples collected; uptime has NOT been verified. Check the probe startup logs."
    exit 0
  fi
  awk '
    NF >= 3 {
      total++;
      code=$2;
      duration=$3+0;
      if (duration > slowest) slowest=duration;
      if (code != "200") {
        bad++;
        failures = failures sprintf("- Non-200: UTC epoch ms %s, HTTP %s, %.3f seconds\n", $1, code, duration);
      }
    }
    END {
      printf("Samples: %d; non-200 responses: %d; slowest response: %.3f seconds.\n", total, bad, slowest);
      if (total < 2) print("WARNING: Too few samples to establish release availability.");
      if (bad == 0 && total >= 2) print("No failed HTTP samples were observed; this does not prove absolute zero downtime.");
      if (bad > 0) printf("%s", failures);
    }
  ' "$log"
  exit 0
fi

log="${1:-}"
if [[ -z "$log" ]]; then
  echo "Usage: $0 <log-file> | --summary <log-file>" >&2
  exit 2
fi

: > "$log"
while :; do
  stamp=$(date -u +%s%3N)
  # curl can fail at the TCP/TLS layer. Its HTTP code is then 000; preserve
  # one and only one row per request rather than appending a second fake result.
  result=$(curl --silent --show-error --output /dev/null --connect-timeout 2 --max-time 4 \
    --write-out '%{http_code} %{time_total}' https://10bonds.com/api/health 2>/dev/null) || result="000 4.000"
  printf '%s %s\n' "$stamp" "$result" >> "$log"
  sleep 0.5
done
