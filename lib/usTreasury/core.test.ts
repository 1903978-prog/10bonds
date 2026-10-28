import { describe, expect, it } from "vitest";
import { MATURITIES, isBerlinMonday9, nextRun } from "../bundCurve/core";
import { TREASURY_TENORS, compareBp, fedSeriesId, parseFedCsv, parseTreasuryXml, treasuryFresh, usStatus } from "./core";
import { fetchText } from "./fetch";

const cols = ["Date", "BETA0", "BETA1", ...MATURITIES.map((y) => fedSeriesId("PAR", y)), ...MATURITIES.map((y) => fedSeriesId("ZERO", y)), "TAU1"];
const notes = ['"Note: This is not an official Federal Reserve statistical release."', "", "Series,Compounding Convention,Mnemonic(s)", "Par yield,Coupon-Equivalent,SVENPYXX", ""];
const row = (date: string, par = (y: number) => (4 + y / 100).toFixed(4), zero = (y: number) => (4.1 + y / 100).toFixed(4)) =>
  [date, "1", "2", ...MATURITIES.map(par), ...MATURITIES.map(zero), "3"].join(",");
const csv = (rows: string[]) => [...notes, cols.join(","), ...rows].join("\n");

describe("Fed CSV", () => {
  it("maps SVENPY01-30 to PAR and SVENY01-30 to ZERO, 30 points each, percent units", () => {
    const r = parseFedCsv(csv([row("2026-10-22"), row("2026-10-23")]));
    expect(r.errors).toEqual([]);
    const par = r.curves.filter((c) => c.curveType === "PAR"), zero = r.curves.filter((c) => c.curveType === "ZERO");
    expect(par.map((c) => c.date)).toEqual(["2026-10-22", "2026-10-23"]);
    expect(zero.length).toBe(2);
    expect(par[1].values.size).toBe(30);
    expect(par[1].values.get(10)).toEqual({ value: 4.1, seriesId: "SVENPY10" });
    expect(zero[1].values.get(30)).toEqual({ value: 4.4, seriesId: "SVENY30" });
  });
  it("NA means missing, never filled; a day with a gap is not complete", () => {
    const r = parseFedCsv(csv([row("2026-10-22"), row("2026-10-23", (y) => (y === 7 ? "NA" : "4.0000"))]));
    expect(r.curves.filter((c) => c.curveType === "PAR").map((c) => c.date)).toEqual(["2026-10-22"]);
    expect(r.curves.filter((c) => c.curveType === "ZERO").length).toBe(2); // zero curve of the same day is still complete
    expect(r.incompleteDays).toBe(1);
  });
  it("research-data delay: the latest complete day is simply the newest day present", () => {
    expect(parseFedCsv(csv([row("2026-10-16"), row("2026-10-19")])).curves.filter((c) => c.curveType === "PAR").pop()!.date).toBe("2026-10-19");
  });
  it("rejects text, wrong unit, conflicting duplicates, missing columns and foreign files", () => {
    expect(parseFedCsv(csv([row("2026-10-23", () => "abc")])).errors.length).toBeGreaterThan(0);
    expect(parseFedCsv(csv([row("2026-10-23", () => "430")])).errors[0]).toMatch(/outside/);
    expect(parseFedCsv(csv([row("2026-10-23"), row("2026-10-23", () => "4.5")])).errors.some((e) => /Duplicate/.test(e))).toBe(true);
    expect(parseFedCsv(csv([row("2026-10-23"), row("2026-10-23")])).errors).toEqual([]); // identical duplicate is harmless
    expect(parseFedCsv(["Date,BETA0", "2026-10-23,1"].join("\n")).errors[0]).toMatch(/Missing column/);
    expect(parseFedCsv("hello").errors.length).toBe(1);
    expect(parseFedCsv("").errors.length).toBe(1);
  });
  it("keeps at most the latest 10 complete days per curve", () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(`2026-09-${String(i + 1).padStart(2, "0")}`));
    const r = parseFedCsv(csv(rows));
    expect(r.curves.filter((c) => c.curveType === "PAR").length).toBe(10);
  });
});

const entry = (date: string, v: Record<string, string>) => `<entry><content type="application/xml"><m:properties><d:Id m:type="Edm.Int32">1</d:Id><d:NEW_DATE m:type="Edm.DateTime">${date}T00:00:00</d:NEW_DATE>${Object.entries(v).map(([k, x]) => `<d:${k} m:type="Edm.Double">${x}</d:${k}>`).join("")}</m:properties></content></entry>`;
const full = { BC_1MONTH: "4.10", BC_6MONTH: "4.34", BC_1YEAR: "4.50", BC_2YEAR: "4.70", BC_3YEAR: "4.80", BC_5YEAR: "4.82", BC_7YEAR: "4.91", BC_10YEAR: "4.99", BC_20YEAR: "5.34", BC_30YEAR: "5.30", BC_30YEARDISPLAY: "5.30" };
const feed = (...e: string[]) => `<?xml version="1.0"?><feed xmlns:d="x" xmlns:m="y">${e.join("")}</feed>`;

describe("Treasury XML", () => {
  it("reads the 8 published annual tenors, ignores months and the display duplicate", () => {
    const r = parseTreasuryXml(feed(entry("2026-10-27", full)));
    expect(r.errors).toEqual([]);
    expect([...r.days[0].values.keys()]).toEqual(TREASURY_TENORS);
    expect(r.days[0].values.get(30)).toEqual({ value: 5.3, seriesId: "BC_30YEAR" });
  });
  it("does not invent tenors: a day missing one is incomplete", () => {
    const { BC_7YEAR: _x, ...gap } = full; void _x;
    const r = parseTreasuryXml(feed(entry("2026-10-27", gap), entry("2026-10-26", full)));
    expect(r.days.map((d) => d.date)).toEqual(["2026-10-26"]);
    expect(r.incompleteDays).toBe(1);
  });
  it("rejects bad numbers, conflicting duplicates and other documents", () => {
    expect(parseTreasuryXml(feed(entry("2026-10-27", { ...full, BC_10YEAR: "x" }))).errors.length).toBe(1);
    expect(parseTreasuryXml(feed(entry("2026-10-27", full), entry("2026-10-27", { ...full, BC_1YEAR: "4.60" }))).errors.some((e) => /Duplicate/.test(e))).toBe(true);
    expect(parseTreasuryXml("<html>no</html>").errors.length).toBe(1);
  });
});

describe("two sources are compared, never assumed equal", () => {
  it("difference in bp at shared tenors only", () => {
    const fed = new Map(MATURITIES.map((y) => [y, 4 + y / 100])), tsy = new Map([[1, 4.0], [10, 4.2]]);
    expect(compareBp(fed, tsy)).toEqual([{ years: 1, fed: 4.01, treasury: 4, diffBp: 1 }, { years: 10, fed: 4.1, treasury: 4.2, diffBp: -10 }]);
  });
});

describe("freshness", () => {
  const now = new Date("2026-10-26T08:00:00Z"); // Monday morning
  it("the Fed Friday-of-last-week value (10 days) is still current on a Monday; older is stale", () => {
    expect(usStatus("2026-10-16", 30, false, now)).toBe("current");
    expect(usStatus("2026-10-09", 30, false, now)).toBe("stale");
    expect(usStatus("2026-10-23", 29, false, now)).toBe("incomplete");
    expect(usStatus("2026-10-23", 30, true, now)).toBe("failed");
    expect(usStatus(null, 0, false, now)).toBe("failed");
  });
  it("Treasury daily values are fresh for 5 days", () => {
    expect(treasuryFresh("2026-10-23", now)).toBe(true);
    expect(treasuryFresh("2026-10-20", now)).toBe(false);
  });
});

describe("schedule: same Monday 09:00 Berlin rule as the Bund job", () => {
  it("DST", () => {
    expect(nextRun(new Date("2026-10-28T00:00:00Z")).toISOString()).toBe("2026-11-02T08:00:00.000Z");
    expect(isBerlinMonday9(new Date("2026-07-06T07:00:00Z"))).toBe(true);
    expect(isBerlinMonday9(new Date("2026-07-06T08:00:00Z"))).toBe(false);
  });
});

describe("download", () => {
  it("retries a server error, gives up on a client error", async () => {
    let n = 0;
    const flaky = (async () => (++n < 2 ? new Response("x", { status: 503 }) : new Response("ok"))) as unknown as typeof fetch;
    expect(await fetchText("http://x", 3, 1000, flaky)).toBe("ok");
    const bad = (async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
    await expect(fetchText("http://x", 3, 1000, bad)).rejects.toThrow("HTTP 404");
  }, 20000);
});
