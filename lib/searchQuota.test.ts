import { describe, expect, it } from "vitest";
import { decideSearch, limitFor, romeDayStart } from "./searchQuota";

// 12:00 UTC = 14:00 in Rome (summer time, until 25 Oct 2026); on 27 Oct Rome is UTC+1, so 12:00 UTC = 13:00.
const now = new Date("2026-10-27T12:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);

describe("daily search allowance", () => {
  it("Free: 10 searches a day for both kinds together; Plus and Premium unlimited; admin unlimited", () => {
    expect(limitFor({ plan: "free", isAdmin: false }, "portfolio")).toBe(10);
    expect(limitFor({ plan: "free", isAdmin: false }, "single")).toBe(10);
    expect(limitFor({ plan: "free", isAdmin: false }, "single", false, 7)).toBe(7);
    expect(limitFor({ plan: "plus", isAdmin: false }, "single")).toBeNull();
    expect(limitFor({ plan: "premium", isAdmin: false }, "portfolio")).toBeNull();
    expect(limitFor({ plan: "free", isAdmin: true }, "portfolio")).toBeNull();
  });
  it("the day starts at midnight Rome time", () => {
    expect(romeDayStart(now).toISOString()).toBe("2026-10-26T23:00:00.000Z");
    expect(romeDayStart(new Date("2026-07-01T10:30:15.250Z")).toISOString()).toBe("2026-06-30T22:00:00.000Z");
  });
  it("counts a new search and refuses the one after the limit, until Rome midnight", () => {
    expect(decideSearch([], now, 3, "portfolio")).toMatchObject({ allowed: true, record: true, used: 1 });
    expect(decideSearch([ago(60), ago(120)], now, 3, "portfolio")).toMatchObject({ allowed: true, record: true, used: 3 });
    const d = decideSearch([ago(60), ago(120), ago(180)], now, 3, "portfolio");
    expect(d).toMatchObject({ allowed: false, record: false, used: 3 });
    expect(d.resetsAt).toBe("2026-10-27T23:00:00.000Z");
  });
  it("one-bond and portfolio searches share the counter", () => {
    const all = [ago(60), ago(120), ago(180)];
    expect(decideSearch(all, now, 3, "single", 15, [ago(60)])).toMatchObject({ allowed: false });
  });
  it("moving the sliders within 15 minutes of the last counted search of that kind is the same search", () => {
    expect(decideSearch([ago(5), ago(60), ago(120)], now, 3, "portfolio")).toMatchObject({ allowed: true, record: false, used: 3 });
    expect(decideSearch([ago(16)], now, 3, "portfolio")).toMatchObject({ record: true, used: 2 });
  });
  it("yesterday's searches (before Rome midnight) no longer count", () => {
    const yesterday = [new Date("2026-10-26T22:59:00Z"), new Date("2026-10-26T20:00:00Z"), new Date("2026-10-25T12:00:00Z")];
    expect(decideSearch(yesterday, now, 3, "portfolio")).toMatchObject({ allowed: true, used: 1 });
  });
  it("unlimited plans never record", () => {
    expect(decideSearch([ago(1)], now, null, "single")).toMatchObject({ allowed: true, record: false });
  });
});
