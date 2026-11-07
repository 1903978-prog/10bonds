#!/bin/bash
# Fresh-session test: runs a REAL headless Claude Code session (read-only, plan mode) in an isolated clone.
# usage: run_fresh.sh <label> <repo-dir> <branch> "<prompt>" ["pre-command run inside the clone"]
# env:   AEOS_OUT  folder for <label>.json (full result) and <label>.meta (default: a new temp folder, printed)
# needs: the `claude` CLI signed in; each run costs about USD 0.1 to 0.9.
set -u
label=${1:?label}; repo=${2:?repo}; branch=${3:?branch}; prompt=${4:?prompt}; pre=${5:-}
OUT=${AEOS_OUT:-$(mktemp -d)}; mkdir -p "$OUT/clones" "$OUT/out"
d="$OUT/clones/$label"; rm -rf "$d"
git clone -q --branch "$branch" "$repo" "$d" || exit 1
cd "$d" && git config user.email t@t && git config user.name t
[ -n "$pre" ] && eval "$pre"
start=$(date +%s)
timeout 300 claude -p "$prompt" --permission-mode plan --allowedTools Read --max-turns 8 --output-format json > "$OUT/out/$label.json" 2> "$OUT/out/$label.err"
echo "rc=$? secs=$(( $(date +%s)-start )) head=$(git rev-parse --short HEAD)" > "$OUT/out/$label.meta"
echo "results in $OUT/out/$label.json"
