import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Small secrets the app must read back (the admin's authenticator-app key) are stored encrypted, so a copy of the
// database alone (a backup, a leaked dump) does not reveal them. The key is derived from SESSION_SECRET, which lives
// only in Fly's secret store. Format: "v1:" + base64url(iv | tag | ciphertext), AES-256-GCM.

const PREFIX = "v1:";

function key(): Buffer | null {
  const s = process.env.SESSION_SECRET;
  const base = s && s.length >= 32 ? s : process.env.NODE_ENV !== "production" ? "dev-only-session-secret-not-for-production-use" : null;
  return base ? Buffer.from(hkdfSync("sha256", base, "10bonds", "secret-box v1", 32)) : null;
}

export const isSealed = (v: string) => v.startsWith(PREFIX);

/** Encrypts a value. Without a key (misconfigured server) it is returned as is, as before this existed. */
export function seal(plain: string): string {
  const k = key();
  if (!k) return plain;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

/** Decrypts a sealed value; an older plain value is returned unchanged. Null when it cannot be opened. */
export function open(stored: string): string | null {
  if (!isSealed(stored)) return stored;
  const k = key();
  if (!k) return null;
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
    const d = createDecipheriv("aes-256-gcm", k, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
