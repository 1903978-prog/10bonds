#!/usr/bin/env bash
# Release uptime probe: asks the live site every 0.5 s and logs each answer, so a release can be judged by the numbers.
# Usage: uptime-probe.sh <log-file>   (runs until killed; summarise with: uptime-probe.sh --summary <log-file>)
# Log line: <epoch-ms> <http-code> <seconds>   (code 000 = no answer at all)
set -u
if [ "${1:-}" = "--summary" ]; then
  f="$2"; total=$(wc -l < "$f"); bad=$(awk '$2!=200' "$f" | wc -l)
  echo "probes: $total, not HTTP 200: $bad, slowest: $(sort -k3 -n -r "$f" | head -1 | awk '{print $3}') s"
  awk '$2!=200 {print "FAIL at " strftime("%H:%M:%S", $1/1000, 1) " UTC: HTTP " $2 " (" $3 " s)"}' "$f"
  [ "$total" -gt 20 ] && [ "$bad" -eq 0 ]
  exit $?
fi
log="$1"; : > "$log"
while true; do
  out=$(curl -s -o /dev/null --max-time 10 -w '%{http_code} %{time_total}' https://10bonds.com/api/health || echo "000 10")
  echo "$(date +%s%3N) $out" >> "$log"
  sleep 0.5
done
