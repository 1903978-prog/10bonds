#!/usr/bin/env node
// Claims a release approval (or records an emergency rollback) once, in the accounts database, before anything reaches Fly.
// insert ... on conflict do nothing: a second dispatch, a re-run or a concurrent run with the same id stops here. 10B-0007.
// Needs ACCOUNTS_DATABASE_URL, WORKFLOW, GITHUB_RUN_ID, GITHUB_SHA, GITHUB_ACTOR; APPROVAL_ID or EMERGENCY_REASON.
import postgres from "postgres";
const fail = (m) => { console.error("BLOCKED: " + m); process.exit(1); };
const id = process.env.APPROVAL_ID ?? "", reason = (process.env.EMERGENCY_REASON ?? "").trim(), wf = process.env.WORKFLOW ?? "";
if ((process.env.GITHUB_RUN_ATTEMPT ?? "1") !== "1") fail("a re-run cannot reuse an approval (run attempt > 1)");
if (!process.env.ACCOUNTS_DATABASE_URL) fail("ACCOUNTS_DATABASE_URL is not set: the approval cannot be claimed, so nothing is released");
const key = id ? `release_claim:${id}` : `release_emergency:${process.env.GITHUB_RUN_ID}`;
if (!id && !(wf === "rollback" && reason.length >= 20)) fail("no approval id");
const sql = postgres(process.env.ACCOUNTS_DATABASE_URL, { max: 1, connect_timeout: 20 });
try {
  const value = JSON.stringify({ workflow: wf, run: process.env.GITHUB_RUN_ID, sha: process.env.GITHUB_SHA, actor: process.env.GITHUB_ACTOR, reason: id ? null : reason.slice(0, 500), at: new Date().toISOString() });
  const claimed = await sql`insert into app.settings (key, value) values (${key}, ${value}) on conflict (key) do nothing returning key`;
  if (!claimed.length) fail(`approval ${id} was already used (single use)`);
  console.log(id ? `OK: ${id} claimed for run ${process.env.GITHUB_RUN_ID}.` : `EMERGENCY rollback recorded as ${key}.`);
} finally { await sql.end(); }
