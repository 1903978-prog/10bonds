import { describe, expect, it } from "vitest";
import { bandsKey } from "./bands30";

describe("30 risk bands", () => {
  it("keys end with the method tag so older keys are never read for new lists", () => {
    const src = { source: "sample", asOf: "2026-10-27", bonds: [] } as never;
    expect(bandsKey(src, { currency: "EUR", size: "100k" }, 4)).toMatch(/\|bands30-v2$/);
  });
});
