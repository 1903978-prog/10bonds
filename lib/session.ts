import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "tb_session";
export const SESSION_DAYS = 30;

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-session-secret-not-for-production-use";
  return null;
}

/** Signed token "<userId>.<expiry ms>.<signature>". */
export function signSession(userId: number, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const body = `${userId}.${now + SESSION_DAYS * 86400_000}`;
  return `${body}.${createHmac("sha256", key).update(body).digest("base64url")}`;
}

export function readSession(token: string | undefined | null, now = Date.now()): number | null {
  const key = secret();
  if (!key || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const want = createHmac("sha256", key).update(`${id}.${exp}`).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(exp) || Number(exp) < now) return null;
  return Number(id);
}

/** A signed, expiring token for one purpose (e-mail confirmation, bot check). Payload must not contain ".". */
export function signToken(purpose: string, payload: string, ttlMs: number, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const body = `${payload}.${now + ttlMs}`;
  return `${body}.${createHmac("sha256", key).update(`${purpose}:${body}`).digest("base64url")}`;
}

export function readToken(purpose: string, token: string | null | undefined, now = Date.now()): string | null {
  const key = secret();
  if (!key || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [payload, exp, sig] = parts;
  const want = createHmac("sha256", key).update(`${purpose}:${payload}.${exp}`).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  if (!/^\d+$/.test(exp) || Number(exp) < now) return null;
  return payload;
}
