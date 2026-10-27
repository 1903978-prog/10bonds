import { describe, expect, it } from "vitest";
import { activeFallback, setFallback } from "./enginePolicy";
import { FINDER_TEXT } from "./finderText";

describe("fallback policy (owner 27/10/2026, 2B)", () => {
  it("is off by default: no optimised list means no list", () => {
    expect(activeFallback()).toBe("none");
    setFallback("legacy_ranking");
    expect(activeFallback()).toBe("legacy_ranking");
    setFallback("none");
  });
  it("every language has the 'no optimized portfolio' text", () => {
    for (const lang of ["en", "it", "fr", "de"] as const) expect(FINDER_TEXT[lang].noOptimised.length).toBeGreaterThan(20);
  });
});
