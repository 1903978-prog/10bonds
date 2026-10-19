import { describe, expect, it } from "vitest";
import { passwordTag, readReset, resetEmail, resetLink } from "./passwordReset";

describe("password reset link", () => {
  it("is tied to the current password and expires after an hour", () => {
    const now = Date.parse("2026-10-19T10:00:00Z");
    const link = resetLink(7, "hash-A", "it", now)!;
    const t = decodeURIComponent(new URL(link).searchParams.get("t")!);
    const r = readReset(t, now + 59 * 60_000)!;
    expect(r.userId).toBe(7);
    expect(r.tag).toBe(passwordTag("hash-A"));
    expect(r.tag).not.toBe(passwordTag("hash-B")); // after the password changes the link no longer matches
    expect(readReset(t, now + 61 * 60_000)).toBeNull();
    expect(readReset(t.replace(/.$/, (c) => (c === "a" ? "b" : "a")), now)).toBeNull();
    expect(new URL(link).searchParams.get("lang")).toBe("it");
  });
  it("writes the e-mail in the chosen language", () => {
    expect(resetEmail("de", "Livio", "https://x").subject).toMatch(/Passwort/);
    expect(resetEmail("fr", "Livio", "https://x").text).toMatch(/mot de passe/);
    expect(resetEmail("it", "Livio", "https://x").html).toContain("lang=\"it\"");
  });
});
