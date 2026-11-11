import { describe, expect, it } from "vitest";
import { blocked, clearHits, record } from "./rateLimit";

describe("failed-login counters", () => {
  it("blocks only after max recorded failures and unlocks on clear", () => {
    const k = "loginfail:t@example.com:1.1.1.1";
    for (let i = 0; i < 9; i++) record(k);
    expect(blocked(k, 10)).toBe(false);
    record(k);
    expect(blocked(k, 10)).toBe(true);
    expect(blocked("loginfail:t@example.com:2.2.2.2", 10)).toBe(false);
    clearHits(k);
    expect(blocked(k, 10)).toBe(false);
  });
});
