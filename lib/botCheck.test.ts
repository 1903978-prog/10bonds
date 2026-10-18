import { describe, expect, it } from "vitest";
import { checkSolution, newChallenge, solves } from "./botCheck";

function solve(c: string, d: number) {
  for (let n = 0; ; n++) if (solves(c, String(n), d)) return String(n);
}

describe("bot check", () => {
  it("accepts a solved challenge once, refuses reuse, a wrong answer and a forged challenge", () => {
    const { challenge, difficulty } = newChallenge()!;
    const nonce = solve(challenge, difficulty);
    expect(checkSolution(challenge, String(Number(nonce) + 1) === nonce ? "x" : "999999999999")).toBe(false);
    expect(checkSolution(challenge, nonce)).toBe(true);
    expect(checkSolution(challenge, nonce)).toBe(false);
    const forged = challenge.replace(/^./, (c) => (c === "a" ? "b" : "a"));
    expect(checkSolution(forged, nonce)).toBe(false);
  });
  it("refuses an expired challenge", () => {
    const { challenge } = newChallenge(Date.now() - 11 * 60_000)!;
    expect(checkSolution(challenge, solve(challenge, 4))).toBe(false);
  });
});
