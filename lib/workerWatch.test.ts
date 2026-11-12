import { describe, expect, it } from "vitest";
import { OFFLINE_AFTER_MS, watchDecision } from "./workerWatch";

describe("worker offline watch", () => {
  const t0 = 1_000_000;
  it("stays quiet while the worker is heard from", () => {
    expect(watchDecision({ lastSeen: t0, alerted: false }, t0 + OFFLINE_AFTER_MS)).toBeNull();
  });
  it("alerts once after 10 minutes of silence", () => {
    expect(watchDecision({ lastSeen: t0, alerted: false }, t0 + OFFLINE_AFTER_MS + 1)).toBe("offline");
    expect(watchDecision({ lastSeen: t0, alerted: true }, t0 + 3 * OFFLINE_AFTER_MS)).toBeNull();
  });
  it("says when it is back, once", () => {
    expect(watchDecision({ lastSeen: t0 + 5, alerted: true }, t0 + 10)).toBe("recovered");
    expect(watchDecision({ lastSeen: t0 + 5, alerted: false }, t0 + 10)).toBeNull();
  });
});
