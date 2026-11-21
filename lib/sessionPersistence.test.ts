import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
import type { User } from "./accounts";
import { readSession, SESSION_DAYS, signSession } from "./session";
import { findUserWithRetry, sessionStillValid } from "./currentUser";
import { adminStateOf, MFA_DAYS, needsCodeAtLogin, readTicket, loginTicket } from "./twoFactor";
import { readToken, signToken } from "./session";

// 30-day sign-in, tested with a simulated clock (no real waiting).
const DAY = 86400_000;
const t0 = 1_800_000_000_000;
const admin = { id: 7, email: "a@b.c", isAdmin: true, twoFactorOn: true } as unknown as User;

afterEach(() => vi.unstubAllEnvs());

describe("30-day session", () => {
  const token = signSession(7, t0)!;
  it("is still valid on day 29 and after refreshes (stateless signed cookie)", () => {
    expect(SESSION_DAYS).toBe(30);
    expect(readSession(token, t0 + 1000)).toBe(7);
    expect(readSession(token, t0 + 29 * DAY)).toBe(7);
    expect(readSession(token, t0 + 30 * DAY - 1)).toBe(7);
  });
  it("has ended on day 31 and is never extended by later reads", () => {
    for (let d = 0; d < 30; d++) readSession(token, t0 + d * DAY);
    expect(readSession(token, t0 + 31 * DAY)).toBeNull();
  });
  it("survives a server restart or deploy: a new process with the same SESSION_SECRET accepts it", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "a".repeat(40));
    const prod = signSession(7, t0)!;
    vi.resetModules();
    const fresh = await import("./session");
    expect(fresh.readSession(prod, t0 + 29 * DAY)).toBe(7);
  });
  it("is refused after a signing-key change and fails closed with no key in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "a".repeat(40));
    const prod = signSession(7, t0)!;
    vi.stubEnv("SESSION_SECRET", "b".repeat(40));
    expect(readSession(prod, t0 + DAY)).toBeNull();
    vi.stubEnv("SESSION_SECRET", "short");
    expect(signSession(7, t0)).toBeNull();
    expect(readSession(prod, t0 + DAY)).toBeNull();
  });
  it("rejects missing, malformed and tampered cookies", () => {
    expect(readSession(undefined, t0)).toBeNull();
    expect(readSession("", t0)).toBeNull();
    expect(readSession("7.1.2.3", t0)).toBeNull();
    const [, exp, sig] = token.split(".");
    expect(readSession(`8.${exp}.${sig}`, t0)).toBeNull();
    expect(readSession(`7.${Number(exp) + 365 * DAY}.${sig}`, t0)).toBeNull();
  });
  it("ends on sign-out or security revocation (sessions_valid_after) and a new sign-in works", () => {
    expect(sessionStillValid({ sessionsValidAfter: null }, token)).toBe(true);
    expect(sessionStillValid({ sessionsValidAfter: t0 + 5 * DAY }, token)).toBe(false);
    const after = signSession(7, t0 + 5 * DAY + 1)!;
    expect(sessionStillValid({ sessionsValidAfter: t0 + 5 * DAY }, after)).toBe(true);
  });
});

describe("two-factor only at a new sign-in", () => {
  it("every new admin sign-in asks for the code; ordinary accounts never do", () => {
    expect(needsCodeAtLogin(admin)).toBe(true);
    expect(needsCodeAtLogin({ ...admin, twoFactorOn: false })).toBe(false);
    expect(needsCodeAtLogin({ ...admin, isAdmin: false })).toBe(false);
  });
  it("a two-factor mark set at sign-in lasts as long as the session: day 29 ok, day 31 not", () => {
    expect(MFA_DAYS).toBe(SESSION_DAYS);
    const mark = signToken("mfa", "7", MFA_DAYS * DAY, t0)!;
    expect(readToken("mfa", mark, t0 + 29 * DAY)).toBe("7");
    expect(readToken("mfa", mark, t0 + 31 * DAY)).toBeNull();
    expect(adminStateOf(admin, undefined)).toBe("needed");
  });
  it("the password-step ticket cannot be used as a session or a two-factor mark", () => {
    const ticket = loginTicket(7)!;
    expect(readTicket(ticket)).toBe(7);
    expect(readSession(ticket)).toBeNull();
    expect(readToken("mfa", ticket)).toBeNull();
  });
});

describe("a failed account read does not sign the person out", () => {
  it("retries once and returns the account", async () => {
    const find = vi.fn().mockRejectedValueOnce(new Error("connection terminated")).mockResolvedValueOnce(admin);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(findUserWithRetry(7, find, 1)).resolves.toBe(admin);
    expect(find).toHaveBeenCalledTimes(2);
  });
  it("a second failure still fails (never grants access)", async () => {
    const find = vi.fn().mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(findUserWithRetry(7, find, 1)).rejects.toThrow("down");
  });
});
