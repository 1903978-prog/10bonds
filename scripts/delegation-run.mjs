// Runs the standing-delegation checks against real inputs (origin/main files, git history, the live site). Used by release-gate.mjs and release-claim.mjs.
import { readMainFile } from "./release-approvals.mjs";
import { checkDelegation, gitChange } from "./delegation.mjs";

export async function liveSha(base = process.env.LIVE_URL || "https://10bonds.com") {
  const r = await fetch(`${base.replace(/\/$/, "")}/api/health/version`, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`live version unreadable (HTTP ${r.status})`);
  return String((await r.json()).sha ?? "");
}

/** Returns { errors, klass, id }. Throws only on unreadable inputs (the callers treat a throw as BLOCKED). */
export async function runDelegation({ sha, env = process.env, live } = {}) {
  const liveCommit = live ?? await liveSha();
  const policyText = readMainFile("docs/delegation/policy.json");
  const activationMd = readMainFile("docs/livio-asks.md");
  const register = JSON.parse(readMainFile("docs/release-register.json"));
  const { files, addedLines } = gitChange(liveCommit, sha);
  return checkDelegation({ policyText, activationMd, register, files, addedLines, sha, live: liveCommit, env, now: new Date() });
}
