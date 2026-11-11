// Link repair for the 13 links of lib/dbLinks.ts. This is the only code path that changes old rows for them; start-up never does.
//
//   npx vite-node -c vitest.config.ts scripts/db-link-repair.ts            read-only: rows that break each link + fingerprint
//   npx vite-node -c vitest.config.ts scripts/db-link-repair.ts --apply    repair + validate, then prove what changed
//   add --allow-deletes only with a separate approval: without it, any deleted row rolls the repair back
//
// Database: REPAIR_DATABASE_URL (a login that can write schema app). --apply on PRODUCTION is a production data change and needs
// Livio's explicit release approval first. Test it on an isolated copy (a Neon branch of production) before that.
// --apply runs everything in ONE transaction (REPEATABLE READ): fingerprint, repair, validate, fingerprint again, compare. Live
// traffic is invisible to that snapshot, so it does not need a quiet window to be judged correctly. If anything changed that was
// not expected (a table outside the repair, a column outside REPAIR_COLUMNS, a row-count change other than the expected
// deletions/re-creations) or a link does not validate, the whole repair rolls back and the script exits 1. Nothing is half-done.
import postgres from "postgres";
import { LINKS, linkViolations, repairAndValidateLinks, RepairRolledBack } from "@/lib/dbLinks";
import { compareFingerprints, fingerprint, REPAIR_COLUMNS, type TableFingerprint } from "@/lib/dbFingerprint";

const url = process.env.REPAIR_DATABASE_URL;
if (!url) { console.error("REPAIR_DATABASE_URL is not set."); process.exit(2); }
const apply = process.argv.includes("--apply");
if (apply && (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REF !== "refs/heads/main" || !process.env.GITHUB_RUN_ID)) { console.error("BLOCKED: --apply runs only inside the guarded workflow on main (see docs/livio-asks.md, Production change approvals)"); process.exit(1); }
// Livio (09 Nov): no row deletions unless separately approved. Without this flag, any deletion rolls the whole repair back.
const allowDeletes = process.argv.includes("--allow-deletes");
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
  let snapBefore: Record<string, TableFingerprint> | undefined;
  let inTxBefore = violations;
  if (!apply) {
    const before = await fingerprint(sql);
    console.log(`\nFingerprint: ${Object.keys(before).length} tables, ${Object.values(before).reduce((a, b) => a + b.rows, 0)} rows.`);
    console.log("\nRead-only check done. Nothing was written.");
  } else {
    // One transaction at REPEATABLE READ: fingerprint, repair, validate, fingerprint, check. Live traffic is invisible to the
    // snapshot, so only this repair's own changes are compared. Anything unexpected rolls the whole repair back.
    let report = "";
    let ok = false;
    try {
      const result = await repairAndValidateLinks(sql, LINKS, {
        before: async (tx) => { inTxBefore = await linkViolations(tx); snapBefore = await fingerprint(tx); },
        verify: async (tx, done) => {
          const inTx = await linkViolations(tx);
          const after = await fingerprint(tx);
          const changes = compareFingerprints(snapBefore!, after);
          const lines = ["| Table | Rows before | Rows after | Change |", "|---|---:|---:|---|"];
          let unexpected = false;
          for (const c of changes) {
            const exp = ROW_COUNT_TABLES[c.table];
            const broke = (name: string) => inTxBefore.filter((v) => name.split("+").includes(v.name)).reduce((x, v) => x + v.rows, 0);
            // Sends: exactly the breaking rows go. Visitors/workers: at most one new row per breaking row, none removed.
            const countOk = !!exp && (c.table === "weekly_email_sends" ? allowDeletes && c.rowsBefore - c.rowsAfter === broke(exp) : c.rowsAfter > c.rowsBefore && c.rowsAfter - c.rowsBefore <= broke(exp));
            const kind = c.onlyRepairColumns && REPAIR_COLUMNS[c.table] ? "only the link column" : countOk ? "rows deleted/re-created as expected" : "UNEXPECTED";
            if (kind === "UNEXPECTED") unexpected = true;
            if (c.rowsAfter < c.rowsBefore && !allowDeletes) lines.push(`(${c.table}: ${c.rowsBefore - c.rowsAfter} rows would be deleted; deletions need separate approval and --allow-deletes)`);
            lines.push(`| ${c.table} | ${c.rowsBefore} | ${c.rowsAfter} | ${kind} |`);
          }
          const left = inTx.filter((v) => v.rows > 0 || v.validated !== true);
          if (left.length) { unexpected = true; lines.push("", `Still breaking or not validated: ${left.map((v) => v.name).join(", ")}`); }
          report = ["| Link | Rows repaired |", "|---|---:|", ...done.map((d) => `| ${d.name} | ${d.repaired} |`), "", ...lines].join("\n");
          if (unexpected) throw new RepairRolledBack("unexpected changes");
        },
      });
      ok = result.every((r) => r.validated);
    } catch (e) {
      console.log(report);
      console.log(`\nRESULT: ROLLED BACK, nothing was kept (${(e as Error).message}).`);
      process.exitCode = 1;
    }
    if (ok) {
      console.log(report);
      console.log("\nRESULT: committed. Every link validated; only the expected rows changed.");
    }
  }
} finally {
  await sql.end();
}
