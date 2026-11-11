import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error plain ESM script
import { check, codeHash, parseApprovals, GUARDED } from "../scripts/prod-change-gate.mjs";

const ok = (o: Record<string, string> = {}) => {
  const c = { id: "CHG-1", change: "null 5 stale links in table x, no deletions", wf: "db-link-repair", hash: "abc", rows: "5", rev: "yes, from backup", backup: "https://github.com/o/r/actions/runs/1 restore test passed", rb: "restore the backup run above", by: "Livio 2026-11-11", status: "APPROVED", ...o };
  return `## Production change approvals\n| ID | a |\n| --- |\n| ${c.id} | ${c.change} | ${c.wf} | ${c.hash} | ${c.rows} | ${c.rev} | ${c.backup} | ${c.rb} | ${c.by} | ${c.status} |\n`;
};
const run = (md: string, hash = "abc") => check(md, { workflow: "db-link-repair", approval: "CHG-1", hash });

describe("production change gate fails closed", () => {
  it("passes a complete approval", () => expect(run(ok())).toEqual([]));
  it("blocks without an id, unknown id, used, unapproved, other workflow, changed code, missing evidence", () => {
    expect(check(ok(), { workflow: "db-link-repair", approval: "", hash: "abc" })).not.toEqual([]);
    expect(check(ok(), { workflow: "db-link-repair", approval: "CHG-2", hash: "abc" })).not.toEqual([]);
    expect(run(ok({ status: "USED" }))).not.toEqual([]);
    expect(run(ok({ status: "PENDING" }))).not.toEqual([]);
    expect(run(ok({ by: "Claude 2026-11-11" }))).not.toEqual([]);
    expect(run(ok({ wf: "other" }))).not.toEqual([]);
    expect(run(ok(), "different")).not.toEqual([]);
    expect(run(ok({ backup: "none" }))).not.toEqual([]);
    expect(run(ok({ rows: "many" }))).not.toEqual([]);
    expect(run(ok({ rb: "" }))).not.toEqual([]);
  });
  it("the real docs file parses and every guarded workflow hashes", () => {
    expect(parseApprovals(readFileSync("docs/livio-asks.md", "utf8")).length).toBeGreaterThan(0);
    for (const k of Object.keys(GUARDED)) expect(codeHash(k)).toMatch(/^[0-9a-f]{16}$/);
  });
  it("the apply step of the repair workflow runs the gate first", () => {
    const y = readFileSync(".github/workflows/db-link-repair.yml", "utf8");
    expect(y.indexOf("prod-change-gate.mjs")).toBeGreaterThan(0);
    expect(y.indexOf("prod-change-gate.mjs")).toBeLessThan(y.indexOf("db-link-repair.ts --apply"));
  });
});

// Static scan: no DROP TABLE/SCHEMA/COLUMN, TRUNCATE, or unbounded DELETE/UPDATE in app or script code outside this reviewed allowlist.
const UNBOUNDED_OK = new Set(["lib/bestTable.ts"]); // derived table, rebuilt in the same transaction
const files = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return n === "node_modules" || n.startsWith(".") ? [] : statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|mjs|sh)$/.test(n) && !/\.test\.ts$/.test(n) ? [p] : []; });
describe("no destructive SQL slips into app or script code", () => {
  const all = ["lib", "scripts", "app"].flatMap(files);
  it("no DROP TABLE/SCHEMA/COLUMN or TRUNCATE (restore scratch script only)", () => {
    const bad = all.filter((f) => f !== "scripts/backup-accounts.sh" && /\b(drop\s+(table|schema|column)|truncate\s+(table\s+)?(app\.|[a-z_]+\s*[;`'"]))/i.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
  it("every DELETE and UPDATE statement has a WHERE", () => {
    const bad: string[] = [];
    for (const f of all) {
      if (UNBOUNDED_OK.has(f)) continue;
      const src = readFileSync(f, "utf8").replace(/\$\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g, "?");
      for (const m of src.matchAll(/\b(delete\s+from\s+app\.\w+|update\s+app\.\w+\s+(?:\w+\s+)?set)\b([^`"]*)/gi)) if (!/\bwhere\b/i.test(m[2])) bad.push(`${f}: ${m[0].slice(0, 60)}`);
    }
    expect(bad).toEqual([]);
  });
});
