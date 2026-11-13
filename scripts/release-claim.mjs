#!/usr/bin/env node
// Claims a release approval (or records an emergency rollback) once, in the accounts database, before anything reaches Fly.
// insert ... on conflict do nothing: a second dispatch, a re-run or a concurrent run with the same id stops here. 10B-0007.
// It checks the approval again against docs/livio-asks.md on origin/main (same rules as release-gate.mjs), so this step
// fails closed even if the gate job was skipped or bypassed (review 13 Nov).
// Needs ACCOUNTS_DATABASE_URL, WORKFLOW, GITHUB_RUN_ID, GITHUB_SHA, GITHUB_ACTOR; APPROVAL_ID or EMERGENCY_REASON.
import postgres from "postgres";
import { checkRelease, readMainDoc } from "./release-approvals.mjs";

const fail = (m) => { console.error("BLOCKED: " + m); process.exit(1); };
const id = process.env.APPROVAL_ID ?? "", reason = (process.env.EMERGENCY_REASON ?? "").trim(), wf = process.env.WORKFLOW ?? "";
if ((process.env.GITHUB_RUN_ATTEMPT ?? "1") !== "1") fail("a re-run cannot reuse an approval (run attempt > 1)");
if (wf !== "deploy" && wf !== "rollback") fail(`unknown workflow "${wf}"`);
if (id && !/^REL-\d{4}$/.test(id)) fail("approval id must look like REL-0001");
if (!id && wf !== "rollback") fail("no approval id");
let doc;
try { doc = readMainDoc(); } catch (e) { fail(e.message); }
const errors = checkRelease(doc, { workflow: wf, approval: id, sha: process.env.GITHUB_SHA ?? "", emergencyReason: reason });
if (errors.length) fail("release not approved.\n- " + errors.join("\n- "));
if (!process.env.ACCOUNTS_DATABASE_URL) fail("ACCOUNTS_DATABASE_URL is not set: the approval cannot be claimed, so nothing is released");
const key = id ? `release_claim:${id}` : `release_emergency:${process.env.GITHUB_RUN_ID}`;
const sql = postgres(process.env.ACCOUNTS_DATABASE_URL, { max: 1, connect_timeout: 20 });
try {
  const value = JSON.stringify({ workflow: wf, run: process.env.GITHUB_RUN_ID, sha: process.env.GITHUB_SHA, actor: process.env.GITHUB_ACTOR, reason: id ? null : reason.slice(0, 500), at: new Date().toISOString() });
  const claimed = await sql`insert into app.settings (key, value) values (${key}, ${value}) on conflict (key) do nothing returning key`;
  if (!claimed.length) fail(`approval ${id || key} was already used (single use)`);
  console.log(id ? `OK: ${id} claimed for run ${process.env.GITHUB_RUN_ID}.` : `EMERGENCY rollback recorded as ${key}.`);
} catch (e) { fail("could not claim the approval: " + e.message); }
finally { await sql.end(); }
