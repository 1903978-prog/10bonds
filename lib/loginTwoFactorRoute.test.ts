import { describe, expect, it, vi } from "vitest";
// Route-level check: an admin with two-factor on never gets a session from the password step alone,
// even when the browser still holds a valid two-factor mark from an earlier sign-in.
const admin = { id: 7, email: "a@b.c", isAdmin: true, twoFactorOn: true, plan: "free", passwordHash: "h" };
vi.mock("@/lib/accounts", () => ({ accountsConfigured: () => true, findUserByLogin: async () => admin, touchLogin: async () => {} }));
vi.mock("@/lib/password", () => ({ verifyPassword: async () => true }));
import { POST } from "@/app/api/auth/login/route";
import { mfaCookieValue, MFA_COOKIE } from "./twoFactor";

const req = (cookie?: string) => new Request("http://x/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify({ email: "a@b.c", password: "pw" }),
});

describe("admin login asks for the code at every new sign-in", () => {
  it("without a two-factor mark: ticket, no session cookie", async () => {
    const res = await POST(req());
    const body = await res.json();
    expect(body.twoFactor).toBe(true);
    expect(res.headers.get("set-cookie") ?? "").not.toContain("tb_session");
  });
  it("with an older valid two-factor mark: still a ticket, no session cookie", async () => {
    const res = await POST(req(`${MFA_COOKIE}=${mfaCookieValue(7)}`));
    const body = await res.json();
    expect(body.twoFactor).toBe(true);
    expect(res.headers.get("set-cookie") ?? "").not.toContain("tb_session");
  });
});
