import { describe, expect, it } from "vitest";
import { DEFAULT_PROMO, parsePromo, promoActive, promoCents, promoEndLabel } from "./promo";

describe("Halloween promo", () => {
  it("halves the prices", () => {
    expect([promoCents("plus", 50), promoCents("premium", 50), promoCents("pro", 50)]).toEqual([450, 950, 4450]);
  });
  it("runs until 5 November end of day in Rome", () => {
    expect(promoActive(DEFAULT_PROMO, Date.parse("2026-10-27T10:00:00Z"))).toBe(true);
    expect(promoActive(DEFAULT_PROMO, Date.parse("2026-11-05T22:59:00Z"))).toBe(true);
    expect(promoActive(DEFAULT_PROMO, Date.parse("2026-11-05T23:00:01Z"))).toBe(false);
    expect(promoActive({ ...DEFAULT_PROMO, enabled: false }, Date.parse("2026-10-27T10:00:00Z"))).toBe(false);
  });
  it("labels the end date per language and falls back to defaults", () => {
    expect(promoEndLabel(DEFAULT_PROMO.endsAt, "en")).toBe("5 November");
    expect(promoEndLabel(DEFAULT_PROMO.endsAt, "it")).toBe("5 novembre");
    expect(promoEndLabel(DEFAULT_PROMO.endsAt, "de")).toBe("5. November");
    expect(parsePromo("garbage")).toEqual(DEFAULT_PROMO);
  });
});
