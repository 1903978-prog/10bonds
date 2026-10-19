import { describe, expect, it } from "vitest";
import { correctedMin } from "./minOverrides";

describe("minimum investment corrections", () => {
  it("Chile 4% 2034 is 100k, not the venue lot", () => expect(correctedMin("XS3459013960", "Chile, Republik", "EUR", 1000)).toBe(100_000));
  it("any Chile EUR bond is at least 100k", () => expect(correctedMin("XS0000000000", "Chile", "EUR", null)).toBe(100_000));
  it("other bonds keep the copy's value", () => expect(correctedMin("XS2887901911", "BMW Finance N.V.", "EUR", 1000)).toBe(1000));
});
