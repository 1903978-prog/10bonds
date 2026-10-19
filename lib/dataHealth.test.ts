import { describe, expect, it } from "vitest";
import { REQUIRED_COLUMNS, ageDays, isStale, judge, missingColumns } from "./dataHealth";

const NOW = Date.parse("2026-10-19T09:00:00Z");
const ALL = [...REQUIRED_COLUMNS, "min_lot"];

describe("bond data health", () => {
  it("counts whole days and tolerates a weekend", () => {
    expect(ageDays("2026-10-19T06:00:00Z", NOW)).toBe(0);
    expect(ageDays("2026-10-16T17:00:00Z", NOW)).toBe(2); // Friday close, read on Monday
    expect(isStale("2026-10-16T17:00:00Z", NOW)).toBe(false);
    expect(isStale("2026-10-13T17:00:00Z", NOW)).toBe(true);
    expect(ageDays(null, NOW)).toBeNull();
    expect(isStale("not a date", NOW)).toBe(false);
  });

  it("lists missing columns only", () => {
    expect(missingColumns(ALL)).toEqual([]);
    expect(missingColumns(ALL.filter((c) => c !== "gross_ytm" && c !== "isin"))).toEqual(["isin", "gross_ytm"]);
  });

  it("is ok for a fresh, complete copy", () => {
    const h = judge({ source: "live", newest: "2026-10-18T17:00:00Z", columns: ALL, rows: 900, duplicateIsins: 0 }, NOW);
    expect(h.ok).toBe(true);
    expect(h.problems).toEqual([]);
  });

  it("raises each problem in words", () => {
    const h = judge({ source: "live", newest: "2026-10-10T17:00:00Z", columns: ALL.filter((c) => c !== "maturity"), rows: 900, duplicateIsins: 2 }, NOW);
    expect(h.ok).toBe(false);
    expect(h.stale).toBe(true);
    expect(h.missingColumns).toEqual(["maturity"]);
    expect(h.problems.join(" ")).toMatch(/8 days old/);
    expect(h.problems.join(" ")).toMatch(/2 ISIN/);
  });

  it("flags an empty table and a missing connection", () => {
    expect(judge({ source: "live", newest: null, columns: ALL, rows: 0, duplicateIsins: 0 }, NOW).ok).toBe(false);
    expect(judge({ source: null, newest: null, columns: [], rows: 0, duplicateIsins: 0 }, NOW).problems[0]).toMatch(/not connected/);
  });

  it("does not judge sample data on age or columns", () => {
    expect(judge({ source: "sample", newest: "2020-01-01T00:00:00Z", columns: [], rows: 30, duplicateIsins: 0 }, NOW).ok).toBe(true);
  });
});
