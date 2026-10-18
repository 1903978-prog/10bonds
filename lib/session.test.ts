import { describe, expect, it } from "vitest";
import { readSession, signSession } from "./session";
import { hashPassword, verifyPassword } from "./password";
import { normaliseEmail } from "./accounts";

describe("session token", () => {
  it("round-trips and rejects tampering and expiry", () => {
    const t = signSession(42, 1000)!;
    expect(readSession(t, 2000)).toBe(42);
    const [, exp, sig] = t.split(".");
    expect(readSession(`43.${exp}.${sig}`, 2000)).toBeNull();
    expect(readSession(t, 1000 + 31 * 86400_000)).toBeNull();
    expect(readSession("garbage", 2000)).toBeNull();
  });
});

describe("passwords", () => {
  it("verifies the right password only", async () => {
    const h = await hashPassword("correct horse");
    expect(h).not.toContain("correct");
    expect(await verifyPassword("correct horse", h)).toBe(true);
    expect(await verifyPassword("wrong horse", h)).toBe(false);
  });
});

describe("emails", () => {
  it("normalises and rejects bad addresses", () => {
    expect(normaliseEmail("  Ann@Example.COM ")).toBe("ann@example.com");
    expect(normaliseEmail("not-an-email")).toBeNull();
    expect(normaliseEmail(5)).toBeNull();
  });
});
