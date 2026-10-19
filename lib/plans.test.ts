import { describe, expect, it } from "vitest";
import { euro, priceCents, yearlyCents } from "./plans";

describe("plan prices", () => {
  it("Plus 9, Premium 19, Pro 89 a month", () => {
    expect(priceCents("premium", "month")).toBe(1900);
    expect(priceCents("pro", "month")).toBe(8900);
    expect(priceCents("plus", "month")).toBe(900);
  });
  it("yearly is 20% off twelve months", () => {
    expect(yearlyCents("plus")).toBe(8640);
    expect(yearlyCents("premium")).toBe(18240);
    expect(yearlyCents("pro")).toBe(85440);
  });
  it("formats in each language", () => {
    expect(euro(900)).toBe("€9");
    expect(euro(85440)).toBe("€854.40");
    expect(euro(8640, "it")).toBe("86,40 €");
    expect(euro(85440, "de")).toBe("854,40 €");
  });
});
