#!/usr/bin/env node
// Claims a release approval (or records an emergency rollback) once, in the accounts database, before anything reaches Fly.
// insert ... on conflict do nothing: a second dispatch, a re-run or a concurrent run with the same id stops here. 10B-0007.
// It checks the approval again against docs/livio-asks.md on origin/main (same rules as release-gate.mjs), so this step
// fails closed even if the gate job was skipped or bypassed (review 13 Nov).
// Needs ACCOUNTS_DATABASE_URL (and DATABASE_URL when it holds only the password), WORKFLOW, GITHUB_RUN_ID, GITHUB_SHA, GITHUB_ACTOR; APPROVAL_ID or EMERGENCY_REASON.
import postgres from "postgres";
import { appendFileSync } from "node:fs";
import { approvedSha, checkRelease, gitSameCode, readMainDoc } from "./release-approvals.mjs";
import { accountsUrl } from "./accounts-url.mjs";

const fail = (m) => { console.error("BLOCKED: " + m); process.exit(1); };
const id = process.env.APPROVAL_ID ?? "", reason = (process.env.EMERGENCY_REASON ?? "").trim(), wf = process.env.WORKFLOW ?? "";
if ((process.env.GITHUB_RUN_ATTEMPT ?? "1") !== "1") fail("a re-run cannot reuse an approval (run attempt > 1)");
if (wf !== "deploy" && wf !== "rollback") fail(`unknown workflow "${wf}"`);
if (id && !/^REL-\d{4}$/.test(id)) fail("approval id must look like REL-0001");
if (!id && wf !== "rollback") fail("no approval id");
let doc;
try { doc = readMainDoc(); } catch (e) { fail(e.message); }
const errors = checkRelease(doc, { workflow: wf, approval: id, sha: process.env.GITHUB_SHA ?? "", emergencyReason: reason, same: gitSameCode });
if (errors.length) fail("release not approved.\n- " + errors.join("\n- "));
if (!process.env.ACCOUNTS_DATABASE_URL) fail("ACCOUNTS_DATABASE_URL is not set: the approval cannot be claimed, so nothing is released");
const key = id ? `release_claim:${id}` : `release_emergency:${process.env.GITHUB_RUN_ID}`;
// The secret may hold only the app password (same rule as the site and the nightly backup): scripts/accounts-url.mjs.
// First release, 14 Nov 2026: passing the raw secret to postgres() failed with "Invalid URL" (nothing was claimed or deployed).
let sql;
try { sql = postgres(accountsUrl(process.env.ACCOUNTS_DATABASE_URL, process.env.DATABASE_URL), { max: 1, connect_timeout: 20 }); }
catch (e) { fail("accounts database link is not usable: " + (e.code ?? e.message)); }
try {
  const value = JSON.stringify({ workflow: wf, run: process.env.GITHUB_RUN_ID, sha: process.env.GITHUB_SHA, actor: process.env.GITHUB_ACTOR, reason: id ? null : reason.slice(0, 500), at: new Date().toISOString() });
  const claimed = await sql`insert into app.settings (key, value) values (${key}, ${value}) on conflict (key) do nothing returning key`;
  if (!claimed.length) fail(`approval ${id || key} was already used (single use)`);
  // The deploy records the APPROVED commit (RELEASE_SHA, image label), which the release audit and rollbacks compare against.
  if (wf === "deploy" && process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `approved_sha=${approvedSha(doc, id)}\n`);
  console.log(id ? `OK: ${id} claimed for run ${process.env.GITHUB_RUN_ID}.` : `EMERGENCY rollback recorded as ${key}.`);
} catch (e) { fail("could not claim the approval: " + e.message); }
finally { await sql.end(); }
