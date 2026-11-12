#!/usr/bin/env node
// Fail-closed gate for every production release of 10bonds (deploy.yml and rollback.yml). 10B-0007, after the 12 Nov 2026
// release of 10e5eb2f that had no recorded GO.
// Usage (inside the workflow): node scripts/release-gate.mjs --workflow deploy|rollback --approval REL-0001 [--sha <40 hex>]
// A release runs only if docs/livio-asks.md ON origin/main has a row in "Release approvals" that is APPROVED, names Livio
// with a date, is for this workflow and, for a deploy, for the EXACT commit being deployed. Single use: the deploy job claims
// the id in the database (scripts/release-claim.mjs) before anything reaches Fly, so a second run with the same id stops.
// An emergency rollback (previous image, nothing rebuilt) may run without an approval only with a written reason; it is
// labelled EMERGENCY in the run name and recorded in the database, so it is auditable afterwards.
import { realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { checkRelease } from "./release-approvals.mjs";

const isMain = process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (!isMain && !process.env.VITEST) { console.error("BLOCKED: gate was not run as a command"); process.exit(1); }
if (isMain) {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  try {
    if (process.env.GITHUB_ACTIONS && process.env.GITHUB_REF !== "refs/heads/main") throw new Error("releases run only from main");
    if ((process.env.GITHUB_RUN_ATTEMPT ?? "1") !== "1") throw new Error("a re-run cannot reuse an approval (run attempt > 1)");
    // The approval is read from origin/main, never from the files being deployed, so a branch cannot approve itself.
    let doc;
    try { execFileSync("git", ["fetch", "-q", "origin", "main"]); doc = execFileSync("git", ["show", "origin/main:docs/livio-asks.md"], { encoding: "utf8" }); }
    catch { throw new Error("cannot read docs/livio-asks.md from origin/main"); }
    const workflow = get("--workflow"), approval = get("--approval") || "", sha = get("--sha") || process.env.GITHUB_SHA || "";
    const errors = checkRelease(doc, { workflow, approval, sha, emergencyReason: process.env.EMERGENCY_REASON ?? "" });
    if (errors.length) { console.error("BLOCKED: release not approved.\n- " + errors.join("\n- ")); process.exit(1); }
    console.log(approval ? `OK: ${approval} approves ${workflow} of ${sha.slice(0, 12)}.` : "EMERGENCY rollback allowed without approval; reason recorded.");
  } catch (e) { console.error("BLOCKED: " + e.message); process.exit(1); }
}
