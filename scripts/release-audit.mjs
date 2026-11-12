#!/usr/bin/env node
// Release audit (10B-0007): the live commit must have a release approval in docs/livio-asks.md (APPROVED or USED, same SHA).
// Detects a release made outside deploy.yml (for example a direct `fly deploy`): /api/health/version then says "unknown".
// Usage: node scripts/release-audit.mjs [base URL]   exit 1 = live release not approved (the nightly check e-mails once).
import { readFileSync } from "node:fs";
import { parseReleaseApprovals } from "./release-approvals.mjs";

export function auditLive(md, live) {
  if (!live || live.sha === "unknown" || !/^[0-9a-f]{40}$/.test(live.sha ?? "")) return "live release has no recorded commit (made outside the release gate)";
  const row = parseReleaseApprovals(md).find((c) => c[0] === live.approval);
  if (!row) return `live approval ${live.approval} is not in Release approvals`;
  if (row[3] !== live.sha) return `live commit ${live.sha.slice(0, 12)} is not the approved ${row[3].slice(0, 12)}`;
  if (!["APPROVED", "USED"].includes(row[6])) return `approval ${row[0]} has status ${row[6]}`;
  return null;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const base = (process.argv[2] ?? "https://10bonds.com").replace(/\/$/, "");
  const live = await fetch(`${base}/api/health/version`, { signal: AbortSignal.timeout(20_000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const problem = auditLive(readFileSync("docs/livio-asks.md", "utf8"), live);
  if (problem) { console.error(`RELEASE AUDIT FAILED: ${problem}`); process.exit(1); }
  console.log(`Release audit OK: ${live.sha.slice(0, 12)} under ${live.approval}.`);
}
