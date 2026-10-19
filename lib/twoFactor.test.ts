import { describe, expect, it } from "vitest";
import type { User } from "./accounts";
import { adminStateOf, loginTicket, mfaCookieOk, mfaCookieValue, readTicket } from "./twoFactor";

const base = { id: 7, email: "a@b.c", isAdmin: true, twoFactorOn: true } as unknown as User;

describe("admin two-factor state", () => {
  it("ordinary users are untouched", () => {
    expect(adminStateOf({ ...base, isAdmin: false }, undefined)).toBeUndefined();
  });
  it("admin without 2FA must set it up", () => {
    expect(adminStateOf({ ...base, twoFactorOn: false }, mfaCookieValue(7)!)).toBe("setup");
  });
  it("admin with 2FA needs this browser's cookie", () => {
    expect(adminStateOf(base, undefined)).toBe("needed");
    expect(adminStateOf(base, "7.9999999999999.bad")).toBe("needed");
    expect(adminStateOf(base, mfaCookieValue(8)!)).toBe("needed");
    expect(adminStateOf(base, mfaCookieValue(7)!)).toBe("ok");
  });
  it("cookie and ticket are not interchangeable", () => {
    expect(mfaCookieOk(7, loginTicket(7)!)).toBe(false);
    expect(readTicket(mfaCookieValue(7))).toBeNull();
    expect(readTicket(loginTicket(7))).toBe(7);
    expect(readTicket(123)).toBeNull();
  });
});
