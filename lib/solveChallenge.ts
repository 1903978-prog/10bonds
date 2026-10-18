"use client";

/** Finds the number the server's robot check asks for (see lib/botCheck.ts). Takes about a second. */
export async function solveChallenge(challenge: string, difficulty: number): Promise<string> {
  const prefix = "0".repeat(difficulty);
  const enc = new TextEncoder();
  const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
  for (let start = 0; start < 50_000_000; start += 512) {
    const batch = await Promise.all(
      Array.from({ length: 512 }, (_, i) => crypto.subtle.digest("SHA-256", enc.encode(`${challenge}:${start + i}`))),
    );
    const hit = batch.findIndex((h) => hex(h).startsWith(prefix));
    if (hit >= 0) return String(start + hit);
  }
  throw new Error("The robot check could not be completed. Please reload the page.");
}
