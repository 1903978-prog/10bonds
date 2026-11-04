import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime } from "./formatDate";

describe("formatDate", () => {
  it("writes 03 Nov 2026", () => {
    expect(formatDate("2026-11-03")).toBe("03 Nov 2026");
    expect(formatDate(new Date(2026, 8, 5))).toBe("05 Sep 2026");
    expect(formatDate("2026-12-31T23:30:00Z", "Europe/Paris")).toBe("01 Jan 2027");
  });
  it("adds 24h time", () => {
    expect(formatDateTime("2026-11-03T13:05:00Z", "Europe/Paris")).toBe("03 Nov 2026, 14:05");
  });
  it("returns empty text for missing or invalid input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("nope")).toBe("");
  });
});
