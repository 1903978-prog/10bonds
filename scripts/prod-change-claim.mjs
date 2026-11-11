#!/usr/bin/env node
// Last gate before a guarded production change: proves a fresh backup AND a fresh successful restore test, then claims the
// approval ID atomically (insert ... on conflict do nothing), so a rerun, a second dispatch or a concurrent attempt cannot
// use the same approval twice. Needs REPAIR_DATABASE_URL, APPROVAL_ID, GITHUB_RUN_ID. Writes ONE ledger row in app.settings.
import postgres from "postgres";
const MAX_AGE_S = 26 * 3600;
const id = process.env.APPROVAL_ID ?? "";
const fail = (m) => { console.error("BLOCKED: " + m); process.exit(1); };
if (!/^CHG-\d{4}$/.test(id)) fail("approval id must look like CHG-0001");
if ((process.env.GITHUB_RUN_ATTEMPT ?? "1") !== "1") fail("a rerun cannot reuse an approval (run attempt > 1)");
const sql = postgres(process.env.REPAIR_DATABASE_URL, { max: 1, connect_timeout: 20 });
try {
  const rows = await sql`select key, value from app.settings where key in ('backup_last_ok_at','backup_restore_test_ok_at')`;
  const at = Object.fromEntries(rows.map((r) => [r.key, Date.parse(r.value)]));
  for (const k of ["backup_last_ok_at", "backup_restore_test_ok_at"]) {
    const age = (Date.now() - at[k]) / 1000;
    if (!Number.isFinite(age) || age > MAX_AGE_S || age < -300) fail(`${k} missing or older than 26 h`);
    console.log(`${k}: ${Math.round(age / 60)} min ago`);
  }
  const claimed = await sql`insert into app.settings (key, value) values (${"prod_change_claim:" + id}, ${JSON.stringify({ run: process.env.GITHUB_RUN_ID, sha: process.env.GITHUB_SHA, at: new Date().toISOString() })})
    on conflict (key) do nothing returning key`;
  if (!claimed.length) fail(`approval ${id} was already claimed (single-use)`);
  console.log(`OK: backup and restore test are fresh; ${id} claimed for run ${process.env.GITHUB_RUN_ID}.`);
} finally { await sql.end(); }
