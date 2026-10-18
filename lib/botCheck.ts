import { createHash, randomBytes } from "node:crypto";
import { readToken, signToken } from "./session";

/**
 * Bot check without third parties (no Google, no cookies): the browser must find a number whose
 * SHA-256 with a signed challenge starts with DIFFICULTY zero hex digits. Costs a person about a
 * second once; makes mass sign-ups by scripts expensive. Each challenge works once, for 10 minutes.
 */
export const DIFFICULTY = 4;
const TTL = 10 * 60_000;
const used = new Map<string, number>();

export function newChallenge(now = Date.now()): { challenge: string; difficulty: number } | null {
  const token = signToken("bot", randomBytes(12).toString("hex"), TTL, now);
  return token ? { challenge: token, difficulty: DIFFICULTY } : null;
}

export function solves(challenge: string, nonce: string, difficulty = DIFFICULTY): boolean {
  return createHash("sha256").update(`${challenge}:${nonce}`).digest("hex").startsWith("0".repeat(difficulty));
}

export function checkSolution(challenge: unknown, nonce: unknown, now = Date.now()): boolean {
  if (typeof challenge !== "string" || typeof nonce !== "string" || !/^\d{1,12}$/.test(nonce)) return false;
  if (!readToken("bot", challenge, now)) return false;
  if (used.has(challenge)) return false;
  if (!solves(challenge, nonce)) return false;
  for (const [k, t] of used) if (t < now) used.delete(k);
  used.set(challenge, now + TTL);
  return true;
}
