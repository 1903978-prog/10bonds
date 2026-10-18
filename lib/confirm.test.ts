import { describe, expect, it } from "vitest";
import { confirmLink, emailTag, readConfirm } from "./confirm";

process.env.SESSION_SECRET = "test-secret-test-secret-test-secret";

describe("confirmation link", () => {
  it("carries the user id and the address tag, and refuses a tampered link", () => {
    const link = confirmLink(42, "a.b@example.com")!;
    const t = new URL(link).searchParams.get("t");
    expect(readConfirm(t)).toEqual({ userId: 42, tag: emailTag("a.b@example.com") });
    expect(readConfirm(t!.slice(0, -2) + "xx")).toBeNull();
    expect(readConfirm(null)).toBeNull();
  });
});
