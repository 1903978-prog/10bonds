import { randomInt } from "node:crypto";

// No 0/O or 1/I/L, so a code read aloud or typed from paper works.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeCode(): string {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `10B-${part()}-${part()}`;
}

export function normaliseCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toUpperCase().replace(/\s+/g, "");
  return /^10B-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c) ? c : null;
}
