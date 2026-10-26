import { describe, expect, it } from "vitest";
import { demoTotals, netGain, runDemo, DEMO_HELD, DEMO_POOL } from "./proDemo";

describe("Pro demo", () => {
  const lines = runDemo();
  it("covers every held bond", () => expect(lines.length).toBe(DEMO_HELD.length));
  it("replaces only when the net gain clears the threshold and risk does not rise", () => {
    for (const l of lines) if (l.action === "replace") {
      expect(l.netGain).toBeGreaterThanOrEqual(0.15);
      expect(l.alt.risk).toBeLessThanOrEqual(l.held.risk);
      expect(Math.abs(l.alt.duration - l.held.duration)).toBeLessThanOrEqual(0.5);
    }
  });
  it("keeps a bond whose alternative gains too little or is riskier", () => {
    const kept = lines.filter((l) => l.action === "keep").map((l) => l.held.name);
    expect(kept).toContain("Northern Rail Holdings 3.9% 2030");
    expect(kept).toContain("Castello Energy 3.6% 2031");
  });
  it("net gain subtracts the cost", () => expect(netGain(DEMO_HELD[0], DEMO_POOL[0])).toBeCloseTo(3.95 - 3.4 - 0.3 / 4.7, 2));
  it("raises the weighted yield", () => { const t = demoTotals(lines); expect(t.after).toBeGreaterThan(t.before); });
  it("uses no ISINs", () => expect(JSON.stringify([DEMO_HELD, DEMO_POOL])).not.toMatch(/[A-Z]{2}[A-Z0-9]{9}\d/));
});
