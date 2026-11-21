#!/usr/bin/env node
// Release audit (10B-0007): the live commit must have a release approval in docs/livio-asks.md (APPROVED or USED, same SHA).
// Detects a release made outside deploy.yml (for example a direct `fly deploy`): /api/health/version then says "unknown".
// Usage: node scripts/release-audit.mjs [base URL]   exit 1 = live release not approved (the nightly check e-mails once).
import { readFileSync } from "node:fs";
import { parseReleaseApprovals } from "./release-approvals.mjs";
import { execFileSync } from "node:child_process";
import { auditLiveAuto, gitRegisterOnly, findEntry, policyHash, PIN_VAR } from "./delegation.mjs";
import { ciSucceeded } from "./delegation-evidence.mjs";

export function auditLive(md, live, register = null, sameCode = (a, b) => a === b, autoProblem = null) {
  if (!live || !/^[0-9a-f]{40}$/.test(live.sha ?? "")) return "live release has no recorded commit (made outside the release gate)";
  // After a rollback the live commit is an older one; it passes only if that commit had its own approved deploy.
  const ok = parseReleaseApprovals(md).some((c) => c[1] === "10bonds" && c[2] === "deploy" && c[3] === live.sha && ["APPROVED", "USED"].includes(c[6]));
  if (!ok && register && auditLiveAuto(register, live, sameCode)) return autoProblem; // a register line alone is not enough: the pin, the pause switch and GitHub CI evidence must also hold (below) // released under the standing delegation: GREEN/AMBER, READY entry in docs/release-register.json
  if (!ok) return `live commit ${live.sha.slice(0, 12)} (${live.approval ?? "no approval"}) has no approved deploy in Release approvals`;
  return null;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const base = (process.argv[2] ?? "https://10bonds.com").replace(/\/$/, "");
  const live = await fetch(`${base}/api/health/version`, { signal: AbortSignal.timeout(20_000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  let register = null;
  try { register = JSON.parse(readFileSync("docs/release-register.json", "utf8")); } catch { /* no register: only Livio-approved rows count */ }
  // Evidence for the automatic path that an agent cannot write: owner variables and the GitHub CI record (nothing here is read from the register).
  let autoProblem = null;
  try {
    const entry = live && register ? findEntry(register, live.sha, gitRegisterOnly) : null;
    if (entry) {
      const env = process.env;
      const pol = execFileSync("git", ["show", `${live.sha}:docs/delegation/policy.json`], { encoding: "utf8" });
      if (env.RELEASE_DELEGATION !== "ACTIVE") autoProblem = "live commit was released automatically but the delegation is not ACTIVE (RELEASE_DELEGATION)";
      else if (env[PIN_VAR] !== policyHash(pol)) autoProblem = `live commit was released automatically but ${PIN_VAR} does not match its policy`;
      else if (!(await ciSucceeded(entry.sha, env))) autoProblem = "live commit was released automatically but GitHub shows no successful 'checks' run for it";
    }
  } catch (e) { autoProblem = `automatic-release evidence could not be read (${String(e.message ?? e).slice(0, 120)})`; }
  const problem = auditLive(readFileSync("docs/livio-asks.md", "utf8"), live, register, gitRegisterOnly, autoProblem);
  if (problem) { console.error(`RELEASE AUDIT FAILED: ${problem}`); process.exit(1); }
  console.log(`Release audit OK: ${live.sha.slice(0, 12)} under ${live.approval}.`);
}
