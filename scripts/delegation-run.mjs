// Runs the standing-delegation checks against real inputs (git history, GitHub API, the live site). Used by release-gate.mjs and release-claim.mjs.
import { execFileSync } from "node:child_process";
import { readMainFile } from "./release-approvals.mjs";
import { checkDelegation, gitChange, gitRegisterOnly, approvalRowOnlyEdit, findEntry } from "./delegation.mjs";
import { ciSucceeded, latestBackup } from "./delegation-evidence.mjs";

export async function liveSha(base = process.env.LIVE_URL || "https://10bonds.com") {
  const r = await fetch(`${base.replace(/\/$/, "")}/api/health/version`, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`live version unreadable (HTTP ${r.status})`);
  return String((await r.json()).sha ?? "");
}

/** Returns { errors, klass, id }. Throws only on unreadable inputs (the callers treat a throw as BLOCKED).
 *  The policy is the one on the LIVE commit (a change cannot rewrite the rules it is judged by); the activation row and the register come from origin/main. */
export async function runDelegation({ sha, env = process.env, live } = {}) {
  const liveCommit = live ?? await liveSha();
  const policyText = execFileSync("git", ["show", `${liveCommit}:docs/delegation/policy.json`], { encoding: "utf8" });
  const activationMd = readMainFile("docs/livio-asks.md");
  const register = JSON.parse(readMainFile("docs/release-register.json"));
  let { files, changes, addedLines, codeAddedLines, asksLines } = gitChange(liveCommit, sha);
  // Recording the use of the owner-approved release that is live now is not a new approval: only that row may change.
  if (files.includes("docs/livio-asks.md") && approvalRowOnlyEdit(asksLines, activationMd, liveCommit)) {
    files = files.filter((f) => f !== "docs/livio-asks.md"); changes = changes.filter((c) => c.path !== "docs/livio-asks.md");
    if (!files.length) files = ["docs/release-register.json"], changes = [{ status: "M", path: "docs/release-register.json" }];
  }
  const entry = findEntry(register, sha, gitRegisterOnly);
  const evidence = { ci: {}, backupAt: "" };
  if (entry) evidence.ci[entry.sha] = await ciSucceeded(entry.sha, env);
  evidence.backupAt = await latestBackup(env);
  return checkDelegation({ policyText, activationMd, register, files, changes, addedLines, codeAddedLines, sha, live: liveCommit, env, now: new Date(), sameCode: gitRegisterOnly, evidence });
}
