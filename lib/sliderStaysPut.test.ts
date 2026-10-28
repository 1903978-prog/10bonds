import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Livio 28/10/2026: the finder slider walked to the right by itself, because a search that found a position empty moved the slider on to the next one,
// which was empty too, and so on. A search result must never move the slider; only the visitor, the term or new positions do.
describe("finder slider", () => {
  const src = readFileSync("components/Finder.tsx", "utf8");
  it("is never moved by a search result", () => {
    expect(src).not.toMatch(/setEmptyBands|knownEmpty/);
    expect(src).not.toMatch(/useEffect\([\s\S]{0,400}data\.status !== "INFEASIBLE"[\s\S]{0,300}setMix\(/);
  });
});
