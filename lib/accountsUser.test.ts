import { afterEach, describe, expect, it } from "vitest";
import { toUser } from "./accounts";
import { markEmailDomainVerified } from "./email";

const row = (o: Partial<Parameters<typeof toUser>[0]> = {}) => ({
  id: "1", email: "1903978@gmail.com", username: "owner", plan: "free" as const, premium_until: null, email_verified_at: null, ...o,
});

describe("toUser", () => {
  afterEach(() => { delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; });
  it("is Premium while the trial runs, then back to the stored plan", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    expect(toUser(row({ premium_until: new Date("2026-10-25T12:00:00Z") }), now).plan).toBe("premium");
    expect(toUser(row({ email: "someone@x.com", premium_until: new Date("2026-10-17T12:00:00Z") }), now).plan).toBe("free");
  });
  it("admin needs a confirmed address once e-mails are on", () => {
    expect(toUser(row()).isAdmin).toBe(true);
    process.env.RESEND_API_KEY = "x"; process.env.EMAIL_FROM = "a@b.c";
    markEmailDomainVerified(false);
    expect(toUser(row()).isAdmin).toBe(true); // domain not verified yet: e-mails still off
    markEmailDomainVerified(true);
    expect(toUser(row()).isAdmin).toBe(false);
    expect(toUser(row({ email: "1903978@gmail.com", email_verified_at: new Date() })).plan).toBe("premium");
    expect(toUser(row({ email_verified_at: new Date() })).isAdmin).toBe(true);
    expect(toUser(row({ email: "other@x.com", email_verified_at: new Date() })).isAdmin).toBe(false);
  });
});

describe("confirmBlocked", () => {
  afterEach(() => { delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; });
  it("blocks an unconfirmed account 3 hours after sign-up, once e-mails are on", () => {
    const now = Date.parse("2026-10-19T12:00:00Z");
    const u = (created: string, verified: Date | null = null) =>
      toUser(row({ email: "a@x.com", created_at: new Date(created), email_verified_at: verified }), now);
    expect(u("2026-10-19T08:00:00Z").confirmBlocked).toBe(false); // e-mails off
    process.env.RESEND_API_KEY = "x"; process.env.EMAIL_FROM = "a@b.c";
    markEmailDomainVerified(true);
    expect(u("2026-10-19T10:00:00Z").confirmBlocked).toBe(false); // 2h: still allowed
    expect(u("2026-10-19T08:00:00Z").confirmBlocked).toBe(true); // 4h: blocked
    expect(u("2026-10-19T08:00:00Z", new Date()).confirmBlocked).toBe(false); // confirmed
  });
});
