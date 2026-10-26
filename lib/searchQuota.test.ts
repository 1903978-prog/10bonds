import { describe, expect, it } from "vitest";
import { decideSearch, limitFor } from "./searchQuota";

const now = new Date("2026-10-19T12:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);
const DAY = 24 * 60;

describe("weekly search allowance", () => {
  it("Free: 3 portfolio and 10 single-bond searches; Plus and Premium unlimited; admin unlimited", () => {
    expect(limitFor({ plan: "free", isAdmin: false }, "portfolio")).toBe(10);
    expect(limitFor({ plan: "free", isAdmin: false }, "single")).toBe(10);
    expect(limitFor({ plan: "plus", isAdmin: false }, "single")).toBeNull();
    expect(limitFor({ plan: "plus", isAdmin: false }, "portfolio")).toBeNull();
    expect(limitFor({ plan: "premium", isAdmin: false }, "portfolio")).toBeNull();
    expect(limitFor({ plan: "free", isAdmin: true }, "portfolio")).toBeNull();
  });
  it("counts a new search and refuses the 4th portfolio search within 7 days", () => {
    expect(decideSearch([], now, 3, "portfolio")).toMatchObject({ allowed: true, record: true, used: 1 });
    expect(decideSearch([ago(DAY), ago(2 * DAY)], now, 3, "portfolio")).toMatchObject({ allowed: true, record: true, used: 3 });
    const d = decideSearch([ago(DAY), ago(2 * DAY), ago(3 * DAY)], now, 3, "portfolio");
    expect(d).toMatchObject({ allowed: false, record: false, used: 3 });
    expect(d.resetsAt).toBe(new Date(ago(3 * DAY).getTime() + 7 * DAY * 60_000).toISOString());
  });
  it("moving the sliders within 15 minutes of the last counted search is the same search", () => {
    expect(decideSearch([ago(5), ago(DAY), ago(2 * DAY)], now, 3, "portfolio")).toMatchObject({ allowed: true, record: false, used: 3 });
    expect(decideSearch([ago(16)], now, 3, "portfolio")).toMatchObject({ record: true, used: 2 });
  });
  it("searches older than 7 days no longer count", () => {
    expect(decideSearch([ago(8 * DAY), ago(9 * DAY), ago(10 * DAY)], now, 3, "portfolio")).toMatchObject({ allowed: true, used: 1 });
  });
  it("unlimited plans never record", () => {
    expect(decideSearch([ago(1)], now, null, "single")).toMatchObject({ allowed: true, record: false });
  });
});
