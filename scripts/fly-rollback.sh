#!/usr/bin/env bash
# Puts the image of the release before the current one back on Fly, then waits until the site answers.
# Nothing is rebuilt and no data is touched. Used by rollback.yml (one click) and by deploy.yml when the checks
# after a deploy fail. Needs FLY_API_TOKEN and flyctl.
set -euo pipefail
image=$(flyctl releases -a 10bonds --image --json | jq -r '[.[] | select(.Status == "complete" or .Status == "succeeded")][1].ImageRef // empty')
if [ -z "$image" ]; then echo "No earlier release found."; exit 1; fi
# Releases since 10B-0007 are labelled sha-<commit>; older images give "unknown", which the release audit reports.
sha=$(printf '%s' "$image" | sed -nE 's/.*:sha-([0-9a-f]{40})$/\1/p')
echo "Rolling back to $image (commit ${sha:-unknown})"
flyctl deploy -a 10bonds --image "$image" --ha=false --env RELEASE_SHA="${sha:-unknown}" --env RELEASE_ID="${RELEASE_ID:-AUTO}"
for i in $(seq 1 20); do
  curl -fsS -o /dev/null https://10bonds.fly.dev/api/health && { echo "Site answers on the previous release."; exit 0; }
  sleep 6
done
echo "Site does not answer after the rollback."
exit 1
