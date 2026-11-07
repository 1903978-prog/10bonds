import { beforeEach, describe, expect, it } from "vitest";
import { buildReport, cachedReport, resetDbHealthCache, tokenOk, type DbHealthDeps } from "./secvalDbHealth";

const deps = (over: Partial<DbHealthDeps> = {}): DbHealthDeps => ({
  query: async (q) =>
    q === "tables" ? [{ tables: 20, tables_without_pk: 0 }]
      : q === "constraints" ? [{ contype: "f", n: 8 }, { contype: "u", n: 5 }, { contype: "c", n: 12 }]
      : q === "linked" ? [{ n: 15 }]
      : q === "standalone" ? [{ n: 4 }]
      : [{ n: 0 }],
  schemaReady: async () => true,
  setting: async (k) => (k === "backup_last_ok_at" ? "2026-11-06T02:20:00Z" : k === "backup_restore_test_ok_at" ? "2026-11-06T02:20:00Z" : null),
  orphanRankings: async () => 0,
  bondCopyOk: async () => true,
  ...over,
});
const NOW = new Date("2026-11-06T12:00:00Z");

beforeEach(() => resetDbHealthCache());

describe("secval database report", () => {
  it("reports counts only, in the agreed shape", async () => {
    const r = await buildReport(deps(), NOW);
    expect(r).toEqual({
      version: 1, engine: "postgresql", checkedAt: "2026-11-06T12:00:00.000Z",
      tables: 20, tablesWithoutPrimaryKey: 0, foreignKeys: 8, foreignKeysWithoutIndex: 0, tablesInLinks: 15, standaloneTables: 4, orphanRows: 0,
      uniqueConstraints: 5, checkConstraints: 12, pendingMigrations: 0,
      lastBackupAt: "2026-11-06T02:20:00.000Z", lastRestoreTestAt: "2026-11-06T02:20:00.000Z", integrityOk: true,
    });
    expect(JSON.stringify(r).length).toBeLessThan(16_000);
  });

  it("says null when it cannot tell, never guesses", async () => {
    const r = await buildReport(deps({ setting: async () => null, orphanRankings: async () => null, schemaReady: async () => { throw new Error("x"); } }), NOW);
    expect(r.lastBackupAt).toBeNull();
    expect(r.lastRestoreTestAt).toBeNull();
    expect(r.orphanRows).toBeNull();
    expect(r.pendingMigrations).toBeNull();
    expect((await buildReport(deps({ bondCopyOk: async () => false }), NOW)).integrityOk).toBe(false);
  });

  it("fails when the database cannot be read", async () => {
    await expect(buildReport(deps({ query: async () => { throw new Error("down"); } }), NOW)).rejects.toThrow();
  });

  it("works it out at most once a minute", async () => {
    let calls = 0;
    const d = deps({ bondCopyOk: async () => (calls++, true) });
    await cachedReport(d, 0);
    await cachedReport(d, 30_000);
    expect(calls).toBe(1);
    await cachedReport(d, 61_000);
    expect(calls).toBe(2);
    // Two callers at once share one run.
    resetDbHealthCache();
    await Promise.all([cachedReport(d, 0), cachedReport(d, 0)]);
    expect(calls).toBe(3);
  });

  it("accepts only the exact token", () => {
    expect(tokenOk("Bearer secret", "secret")).toBe(true);
    expect(tokenOk("Bearer wrong", "secret")).toBe(false);
    expect(tokenOk(null, "secret")).toBe(false);
    expect(tokenOk("Bearer secret", undefined)).toBe(false);
  });
});
