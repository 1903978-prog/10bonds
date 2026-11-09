// Link repair for the 13 links of lib/dbLinks.ts. This is the only code path that changes old rows for them; start-up never does.
//
//   npx vite-node -c vitest.config.ts scripts/db-link-repair.ts            read-only: rows that break each link + fingerprint
//   npx vite-node -c vitest.config.ts scripts/db-link-repair.ts --apply    repair + validate, then prove what changed
//
// Database: REPAIR_DATABASE_URL (a login that can write schema app). --apply on PRODUCTION is a production data change and needs
// Livio's explicit release approval first. Test it on an isolated copy (a Neon branch of production) before that.
// --apply exits 1 when anything changed that was not expected: a table outside the repair, a column outside REPAIR_COLUMNS,
// a row-count change other than the expected deletions/re-creations, or a link that did not validate.
import postgres from "postgres";
import { LINKS, linkViolations, repairAndValidateLinks } from "@/lib/dbLinks";
import { compareFingerprints, fingerprint } from "@/lib/dbFingerprint";

const url = process.env.REPAIR_DATABASE_URL;
if (!url) { console.error("REPAIR_DATABASE_URL is not set."); process.exit(2); }
const apply = process.argv.includes("--apply");
const sql = postgres(url, { max: 1, onnotice: () => {}, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require" });

// What the repair may do to row counts: weekly sends of deleted accounts are deleted; missing visitors and workers are re-created.
const ROW_COUNT_TABLES: Record<string, string> = {
  weekly_email_sends: "weekly_email_sends_user_id_fkey",
  visitors: "events_visitor_id_fkey",
  credit_research_workers: "credit_research_jobs_claimed_by_fkey+credit_research_runs_worker_id_fkey",
};

try {
  const host = new URL(url).host;
  console.log(`Database: ${host} · mode: ${apply ? "APPLY (writes)" : "read-only check"} · ${new Date().toISOString()}`);
  const violations = await linkViolations(sql);
  console.log("\n| Link | Rows breaking it | Rule validated |\n|---|---:|---|");
  for (const v of violations) console.log(`| ${v.name} | ${v.rows} | ${v.validated === null ? "not added yet" : v.validated ? "yes" : "no (NOT VALID)"} |`);
  const before = await fingerprint(sql);
  console.log(`\nFingerprint before: ${Object.keys(before).length} tables, ${Object.values(before).reduce((a, b) => a + b.rows, 0)} rows.`);
  if (!apply) {
    console.log("\nRead-only check done. Nothing was written.");
  } else {
    const result = await repairAndValidateLinks(sql);
    console.log("\n| Link | Rows repaired | Validated |\n|---|---:|---|");
    for (const r of result) console.log(`| ${r.name} | ${r.repaired} | ${r.validated ? "yes" : `NO: ${r.error}`} |`);
    const after = await fingerprint(sql);
    const changes = compareFingerprints(before, after);
    console.log("\n| Table | Rows before | Rows after | Change |\n|---|---:|---:|---|");
    let unexpected = result.some((r) => !r.validated);
    const known = new Set(LINKS.map((l) => l.table).concat(Object.keys(ROW_COUNT_TABLES)));
    for (const c of changes) {
      const broke = (name: string) => violations.filter((v) => name.split("+").includes(v.name)).reduce((a, v) => a + v.rows, 0);
      const exp = ROW_COUNT_TABLES[c.table];
      // Sends: exactly the breaking rows go. Visitors/workers: at most one new row per breaking row (one per missing id), none removed.
      const countOk = exp && (c.table === "weekly_email_sends" ? c.rowsBefore - c.rowsAfter === broke(exp) : c.rowsAfter > c.rowsBefore && c.rowsAfter - c.rowsBefore <= broke(exp));
      const kind = c.onlyRepairColumns ? "only the link column" : countOk ? "rows deleted/re-created as expected" : "UNEXPECTED";
      if (kind === "UNEXPECTED" || !known.has(c.table)) unexpected = true;
      console.log(`| ${c.table} | ${c.rowsBefore} | ${c.rowsAfter} | ${kind} |`);
    }
    const left = (await linkViolations(sql)).filter((v) => v.rows > 0 || v.validated !== true);
    if (left.length) { unexpected = true; console.log(`\nStill breaking or not validated: ${left.map((v) => v.name).join(", ")}`); }
    console.log(unexpected ? "\nRESULT: unexpected changes or failures (see above)." : "\nRESULT: every link validated; only the expected rows changed.");
    if (unexpected) process.exitCode = 1;
  }
} finally {
  await sql.end();
}
