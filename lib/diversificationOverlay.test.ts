import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Layout guard: the lock overlay sits on blurred bars, so it must have its own backdrop
// (otherwise its text collides with the bars) and fill the strip exactly (no layout shift).
describe("Diversification lock overlay", () => {
  const src = readFileSync(new URL("../components/Diversification.tsx", import.meta.url), "utf8");
  const line = src.split("\n").find((l) => l.includes('data-testid="diversification-overlay"')) ?? "";
  it("has a backdrop over the blurred bars", () => expect(line).toMatch(/\bbg-white\/\d+/));
  it("fills the strip without changing its size", () => {
    expect(line).toMatch(/\babsolute inset-0\b/);
    expect(src).toMatch(/h-\[86px\]/);
  });
});
