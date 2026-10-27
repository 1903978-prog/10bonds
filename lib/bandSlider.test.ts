import { describe, expect, it } from "vitest";
import { landOn, SKIP_EMPTY_BANDS } from "./bandSlider";

describe("slider lands only on risk bands with a list", () => {
  const empty = new Set([1, 22, 23, 24, 25]);
  const un = (p: number) => empty.has(p);
  it("keeps a position that has a list", () => expect(landOn(10, 9, un, 25)).toBe(10));
  it("moves on in the direction of travel", () => {
    if (!SKIP_EMPTY_BANDS) return;
    expect(landOn(22, 21, un, 25)).toBe(21);
    expect(landOn(1, 5, un, 25)).toBe(2);
  });
});
