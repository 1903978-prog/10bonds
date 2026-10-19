import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, codeAt, hashBackup, matchCode, newBackupCodes } from "./totp";

// RFC 6238 test secret "12345678901234567890" (SHA-1), 8-digit vectors truncated to 6 digits.
const SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("totp", () => {
  it("round-trips base32", () => {
    expect(base32Decode(SECRET).toString()).toBe("12345678901234567890");
  });
  it("matches the RFC 6238 vectors", () => {
    expect(codeAt(SECRET, Math.floor(59 / 30))).toBe("287082");
    expect(codeAt(SECRET, Math.floor(1111111109 / 30))).toBe("081804");
    expect(codeAt(SECRET, Math.floor(2000000000 / 30))).toBe("279037");
  });
  it("accepts one step of drift, refuses others and replays", () => {
    const now = 1111111109_000;
    const step = Math.floor(now / 30_000);
    expect(matchCode(SECRET, codeAt(SECRET, step), now)).toBe(step);
    expect(matchCode(SECRET, codeAt(SECRET, step - 1), now)).toBe(step - 1);
    expect(matchCode(SECRET, codeAt(SECRET, step - 2), now)).toBeNull();
    expect(matchCode(SECRET, codeAt(SECRET, step), now, step)).toBeNull();
    expect(matchCode(SECRET, "12345", now)).toBeNull();
  });
  it("backup codes hash the same regardless of case and dash", () => {
    const { codes, hashes } = newBackupCodes();
    expect(codes).toHaveLength(10);
    expect(hashBackup(codes[0].toUpperCase().replace("-", ""))).toBe(hashes[0]);
  });
});
