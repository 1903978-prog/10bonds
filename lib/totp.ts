import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Authenticator-app codes (RFC 6238: 6 digits, 30-second steps, SHA-1), used for the admin account's two-factor login.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newSecret = () => base32Encode(randomBytes(20));

export function codeAt(secret: string, step: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

export const stepOf = (now = Date.now()) => Math.floor(now / 30_000);

/**
 * The step a code matches (one step either side allowed for clock drift), or null.
 * `after` = last step already used, so the same code cannot be used twice.
 */
export function matchCode(secret: string, code: string, now = Date.now(), after = -1): number | null {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const s = stepOf(now);
  for (const step of [s - 1, s, s + 1]) {
    if (step <= after) continue;
    const want = Buffer.from(codeAt(secret, step));
    if (timingSafeEqual(want, Buffer.from(c))) return step;
  }
  return null;
}

export function otpauthUrl(secret: string, account: string, issuer = "10BONDS"): string {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Ten one-time backup codes ("abcd-efgh") and their hashes, for when the phone is not at hand. */
export function newBackupCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: 10 }, () => {
    const s = base32Encode(randomBytes(5)).toLowerCase().slice(0, 8);
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
  return { codes, hashes: codes.map(hashBackup) };
}

export const hashBackup = (code: string) => createHash("sha256").update(code.toLowerCase().replace(/[^a-z0-9]/g, "")).digest("hex");
