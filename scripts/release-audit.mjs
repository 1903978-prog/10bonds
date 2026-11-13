#!/usr/bin/env node
// Release audit (10B-0007): the live commit must have a release approval in docs/livio-asks.md (APPROVED or USED, same SHA).
// Detects a release made outside deploy.yml (for example a direct `fly deploy`): /api/health/version then says "unknown".
// Usage: node scripts/release-audit.mjs [base URL]   exit 1 = live release not approved (the nightly check e-mails once).
import { readFileSync } from "node:fs";
import { parseReleaseApprovals } from "./release-approvals.mjs";

export function auditLive(md, live) {
  if (!live || !/^[0-9a-f]{40}$/.test(live.sha ?? "")) return "live release has no recorded commit (made outside the release gate)";
  // After a rollback the live commit is an older one; it passes only if that commit had its own approved deploy.
  const ok = parseReleaseApprovals(md).some((c) => c[1] === "10bonds" && c[2] === "deploy" && c[3] === live.sha && ["APPROVED", "USED"].includes(c[6]));
  if (!ok) return `live commit ${live.sha.slice(0, 12)} (${live.approval ?? "no approval"}) has no approved deploy in Release approvals`;
  return null;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const base = (process.argv[2] ?? "https://10bonds.com").replace(/\/$/, "");
  const live = await fetch(`${base}/api/health/version`, { signal: AbortSignal.timeout(20_000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const problem = auditLive(readFileSync("docs/livio-asks.md", "utf8"), live);
  if (problem) { console.error(`RELEASE AUDIT FAILED: ${problem}`); process.exit(1); }
  console.log(`Release audit OK: ${live.sha.slice(0, 12)} under ${live.approval}.`);
}
