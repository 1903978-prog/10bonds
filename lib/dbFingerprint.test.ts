import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compareFingerprints } from "./dbFingerprint";
import { repairDryRunSql } from "./dbLinkRepairSql";

describe("link repair evidence", () => {
  it("docs/db-link-repair-dryrun.sql is the generated file (regenerate: scripts/db-link-repair-sql.ts)", () => {
    expect(readFileSync(path.join(__dirname, "..", "docs", "db-link-repair-dryrun.sql"), "utf8")).toBe(repairDryRunSql());
  });
  it("the dry run ends with a rollback and never commits", () => {
    const sql = repairDryRunSql();
    expect(sql.trimEnd().endsWith("rollback;")).toBe(true);
    expect(sql).not.toMatch(/^\s*(commit|end)\s*;/im);
  });
  it("compareFingerprints tells link-column-only changes from added or removed rows", () => {
    const fp = (rows: number, hash: string, h2: string) => ({ rows, hash, hashWithoutRepairColumns: h2 });
    expect(compareFingerprints(
      { a: fp(1, "x", "x"), b: fp(2, "y", "k"), c: fp(3, "z", "z") },
      { a: fp(1, "x", "x"), b: fp(2, "y2", "k"), c: fp(4, "z2", "z2") },
    )).toEqual([
      { table: "b", rowsBefore: 2, rowsAfter: 2, onlyRepairColumns: true },
      { table: "c", rowsBefore: 3, rowsAfter: 4, onlyRepairColumns: false },
    ]);
  });
});
