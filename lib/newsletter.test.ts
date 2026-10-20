import { describe, expect, it } from "vitest";
import { newsletterLang, readUnsubscribeToken, unsubscribeToken, unsubscribeUrl } from "./newsletter";

describe("newsletter unsubscribe link", () => {
  it("round-trips the user id and rejects tampering", () => {
    const t = unsubscribeToken(42)!;
    expect(readUnsubscribeToken(t)).toBe(42);
    expect(readUnsubscribeToken(t.replace(/^42/, "43"))).toBeNull();
    expect(readUnsubscribeToken("junk")).toBeNull();
  });
  it("builds a full link", () => {
    expect(unsubscribeUrl("https://www.10bonds.com/", 7)).toMatch(/^https:\/\/www\.10bonds\.com\/api\/newsletter\/unsubscribe\?t=/);
  });
  it("falls back to English", () => {
    expect(newsletterLang("de")).toBe("de");
    expect(newsletterLang("xx")).toBe("en");
  });
});
