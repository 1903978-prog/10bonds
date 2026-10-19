import { describe, expect, it } from "vitest";
import { buildCsp, newNonce } from "./csp";

describe("content security policy", () => {
  it("never allows inline or eval scripts in production", () => {
    const csp = buildCsp("abc", false);
    const scripts = csp.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scripts).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(scripts).not.toContain("unsafe");
  });
  it("allows eval only in development", () => {
    expect(buildCsp("abc", true)).toContain("'unsafe-eval'");
  });
  it("keeps the other locks", () => {
    const csp = buildCsp("abc", false);
    for (const d of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"]) expect(csp).toContain(d);
  });
  it("makes a new random nonce each time", () => {
    const a = newNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(newNonce()).not.toBe(a);
  });
});
