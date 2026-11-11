import { describe, expect, it } from "vitest";
import { backupAlertDue, liveCheckMail, liveCheckRecipient, liveCheckToken, liveCheckTokenOk } from "./liveCheckAlert";

describe("live check alert", () => {
  it("accepts only the right token", () => {
    const t = liveCheckToken("k");
    expect(liveCheckTokenOk("k", t)).toBe(true);
    expect(liveCheckTokenOk("k", "x".repeat(t.length))).toBe(false);
    expect(liveCheckTokenOk(undefined, t)).toBe(false);
    expect(liveCheckTokenOk("k", "")).toBe(false);
  });
  it("sends to the first admin address", () => {
    expect(liveCheckRecipient(undefined)).toBe("1903978@gmail.com");
    expect(liveCheckRecipient(" A@x.com , b@x.com")).toBe("a@x.com");
  });
  it("escapes the summary in the html body", () => {
    expect(liveCheckMail("<b>x</b>", "https://github.com/a").html).not.toContain("<b>x</b>");
  });
  it("backup alert: subject says backup, and only one per UTC day", () => {
    expect(liveCheckMail("x", "https://github.com/a", "backup").subject).toContain("BACKUP");
    const now = new Date("2026-11-09T03:00:00Z");
    expect(backupAlertDue(null, now)).toBe(true);
    expect(backupAlertDue("2026-11-08", now)).toBe(true);
    expect(backupAlertDue("2026-11-09", now)).toBe(false);
  });
});
