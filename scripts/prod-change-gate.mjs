#!/usr/bin/env node
// Fail-closed gate for any manual production data change (repair, bulk update, destructive migration, TRUNCATE, DROP).
// Usage: node scripts/prod-change-gate.mjs --workflow <key> --approval <ID>     verify; exit 1 unless approved
//        node scripts/prod-change-gate.mjs --workflow <key> --hash               print the code hash to put in the approval row
// An approval lives in docs/livio-asks.md, section "Production change approvals", and is bound to the exact code
// (content hash of the files that run), single-use (status APPROVED -> USED after the run), and must record every field below.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Every workflow/script that can change production data must be listed here with the files whose content defines the change.
export const GUARDED = {
  "db-link-repair": ["scripts/db-link-repair.ts", "scripts/db-link-repair-sql.ts", "lib/dbLinks.ts", ".github/workflows/db-link-repair.yml"],
};
const HEADER = ["id", "exact change", "workflow", "code hash", "est. rows", "reversible", "backup + restore evidence", "rollback plan", "approved by / date", "status"];

export function codeHash(workflow, read = (p) => readFileSync(p, "utf8")) {
  const files = GUARDED[workflow];
  if (!files) throw new Error(`unknown guarded workflow: ${workflow}`);
  const h = createHash("sha256");
  for (const f of files) h.update(f + "\n" + read(f) + "\n");
  return h.digest("hex").slice(0, 16);
}

export function parseApprovals(md) {
  const start = md.indexOf("## Production change approvals");
  if (start < 0) return [];
  const rest = md.slice(start + 10);
  const end = rest.search(/\n## /);
  const body = end < 0 ? rest : rest.slice(0, end);
  return body.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length === HEADER.length && c[0].toLowerCase() !== "id");
}

export function check(md, { workflow, approval, hash }) {
  const errors = [];
  if (!approval) return ["no approval id given"];
  const row = parseApprovals(md).find((c) => c[0] === approval);
  if (!row) return [`approval ${approval} is not recorded in docs/livio-asks.md`];
  const [, change, wf, rowHash, rows, reversible, backup, rollback, by, status] = row;
  if (status !== "APPROVED") errors.push(`status is "${status}", must be APPROVED (single-use)`);
  if (!/livio/i.test(by) || !/\d{4}-\d{2}-\d{2}/.test(by)) errors.push('"approved by / date" must name Livio and an ISO date');
  if (wf !== workflow) errors.push(`approval is for workflow "${wf}", not "${workflow}"`);
  if (rowHash !== hash) errors.push(`code changed since approval (approved ${rowHash}, current ${hash})`);
  if (change.length < 20) errors.push("exact change list missing");
  if (!/^\d+$/.test(rows.replace(/[,~\s]/g, ""))) errors.push("estimated affected rows must be a number");
  if (reversible.length < 3) errors.push("reversibility missing");
  if (!/actions\/runs\/\d+/.test(backup) || !/restore/i.test(backup)) errors.push("backup evidence needs a run URL and the word restore (restore test result)");
  if (rollback.length < 10) errors.push("rollback plan missing");
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const workflow = get("--workflow");
  try {
    const hash = codeHash(workflow);
    if (a.includes("--hash")) { console.log(hash); process.exit(0); }
    const errors = check(readFileSync("docs/livio-asks.md", "utf8"), { workflow, approval: get("--approval"), hash });
    if (errors.length) { console.error("BLOCKED: production change not approved.\n- " + errors.join("\n- ")); process.exit(1); }
    console.log(`OK: approval ${get("--approval")} valid for ${workflow} (code ${hash}).`);
  } catch (e) { console.error("BLOCKED: " + e.message); process.exit(1); }
}
