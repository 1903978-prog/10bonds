import { describe, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
import { sessionIssuedAt, signSession } from "./session";
import { sessionStillValid } from "./currentUser";

describe("session revocation", () => {
  const t0 = 1_800_000_000_000;
  const token = signSession(7, t0)!;
  it("reads the issue time back", () => {
    expect(sessionIssuedAt(token, t0 + 1000)).toBe(t0);
    expect(sessionIssuedAt("x.y.z")).toBeNull();
  });
  it("accepts a session issued after the revoke time and refuses one issued before", () => {
    expect(sessionStillValid({ sessionsValidAfter: null }, token)).toBe(true);
    expect(sessionStillValid({ sessionsValidAfter: t0 - 5 }, token)).toBe(true);
    expect(sessionStillValid({ sessionsValidAfter: t0 + 5 }, token)).toBe(false);
    expect(sessionStillValid({ sessionsValidAfter: null }, undefined)).toBe(false);
  });
});
