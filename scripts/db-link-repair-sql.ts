// Writes docs/db-link-repair-dryrun.sql from lib/dbLinkRepairSql.ts. Usage: npx vite-node -c vitest.config.ts scripts/db-link-repair-sql.ts
import { writeFileSync } from "node:fs";
import { repairDryRunSql } from "@/lib/dbLinkRepairSql";
writeFileSync("docs/db-link-repair-dryrun.sql", repairDryRunSql());
console.log("docs/db-link-repair-dryrun.sql written");
