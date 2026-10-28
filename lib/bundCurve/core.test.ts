import { describe, expect, it } from "vitest";
import { MATURITIES, completeCurves, curveStatus, isBerlinMonday9, latestComplete, maxMoveBp, nextRun, parseBundesbankCsv, seriesId, withChange } from "./core";
import { fetchText } from "./fetch";

const sdmx = (rows: [string, string, string][]) => ["DATAFLOW;BBK_ID;TIME_PERIOD;OBS_VALUE;OBS_STATUS", ...rows.map(([id, d, v]) => `BBK:BBSIS(1.0);${id};${d};${v};`)].join("\n");
const full = (type: "ZAR" | "ZST", date: string, base = 3) => MATURITIES.map((y) => [seriesId(type, y), date, (base + y / 100).toFixed(2)] as [string, string, string]);

describe("parse", () => {
  it("reads SDMX csv and keeps 30 points per date", () => {
    const r = parseBundesbankCsv(sdmx([...full("ZAR", "2026-10-27"), ...full("ZAR", "2026-10-26")]));
    expect(r.errors).toEqual([]);
    expect(latestComplete(r.obs, "ZAR")!.date).toBe("2026-10-27");
  });
  it("treats '.' as missing (weekend) and never fills it", () => {
    const r = parseBundesbankCsv(sdmx([[seriesId("ZAR", 10), "2026-10-25", "."], ...full("ZAR", "2026-10-23")]));
    expect(r.missing).toBe(1);
    expect(latestComplete(r.obs, "ZAR")!.date).toBe("2026-10-23");
  });
  it("a day with a missing maturity is not complete", () => {
    expect(completeCurves(parseBundesbankCsv(sdmx(full("ZAR", "2026-10-27").slice(1))).obs)).toEqual([]);
  });
  it("rejects decimal fractions, text and conflicting duplicates", () => {
    expect(parseBundesbankCsv(sdmx([[seriesId("ZAR", 10), "2026-10-27", "0.034"]])).errors).toEqual([]); // plausible percent
    expect(parseBundesbankCsv(sdmx([[seriesId("ZAR", 10), "2026-10-27", "34"]])).errors.length).toBe(1);
    expect(parseBundesbankCsv(sdmx([[seriesId("ZAR", 10), "2026-10-27", "abc"]])).errors.length).toBe(1);
    expect(parseBundesbankCsv(sdmx([[seriesId("ZAR", 10), "2026-10-27", "3.4"], [seriesId("ZAR", 10), "2026-10-27", "3.5"]])).errors.length).toBe(1);
    expect(parseBundesbankCsv(sdmx([["BBSIS.D.I.XXX.ZI", "2026-10-27", "3.4"]])).errors.length).toBe(1);
  });
  it("ignores fractional maturities of the same family (R005X) without failing", () => {
    const r = parseBundesbankCsv(sdmx([["BBSIS.D.I.ZST.ZI.EUR.S1311.B.A604.R005X.R.A.A._Z._Z.A", "2026-10-27", "2.9"], [seriesId("ZST", 1), "2026-10-27", "2.9"]]));
    expect(r.errors).toEqual([]);
    expect(r.obs.length).toBe(1);
    expect(r.ignored).toBe(1);
  });
  it("rejects malformed files", () => {
    expect(parseBundesbankCsv("").errors.length).toBe(1);
    expect(parseBundesbankCsv("hello;world\n1;2").errors.length).toBe(1);
    expect(parseBundesbankCsv("DATAFLOW;X\nA;B").errors.length).toBe(1);
  });
  it("reads the classic wide csv with comma decimals", () => {
    const ids = [1, 2].map((y) => seriesId("ZAR", y));
    const csv = `"";${ids[0]};${ids[0]}_FLAGS;${ids[1]};${ids[1]}_FLAGS\n"";Title;;Title;\nStand vom;27.10.2026 12:28:32 Uhr;;x;\n2026-10-26;2,94;;3,06;\n2026-10-27;2,95;;.;Kein Wert`;
    const r = parseBundesbankCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.obs.map((o) => o.value)).toEqual([2.94, 3.06, 2.95]);
    expect(r.missing).toBe(1);
  });
});

describe("change and sanity", () => {
  it("computes bp change and max move", () => {
    const a = new Map([[1, 3.0], [2, 3.5]]), b = new Map([[1, 2.9], [2, 3.5]]);
    expect(withChange(a, b)[0].changeBp).toBe(10);
    expect(withChange(a, null)[0].changeBp).toBeNull();
    expect(maxMoveBp(a, b)).toBe(10);
  });
  it("status", () => {
    const now = new Date("2026-10-28T08:00:00Z");
    expect(curveStatus("2026-10-27", 30, false, now)).toBe("current");
    expect(curveStatus("2026-10-23", 30, false, new Date("2026-10-26T08:00:00Z"))).toBe("current"); // Friday value on Monday morning
    expect(curveStatus("2026-10-10", 30, false, now)).toBe("stale");
    expect(curveStatus("2026-10-27", 29, false, now)).toBe("incomplete");
    expect(curveStatus("2026-10-27", 30, true, now)).toBe("failed");
    expect(curveStatus(null, 0, false, now)).toBe("failed");
  });
});

describe("schedule: Monday 09:00 Berlin across daylight saving", () => {
  it("summer time = 07:00 UTC, winter time = 08:00 UTC", () => {
    expect(nextRun(new Date("2026-10-28T00:00:00Z")).toISOString()).toBe("2026-11-02T08:00:00.000Z"); // CET after 25 Oct 2026
    expect(nextRun(new Date("2026-07-01T00:00:00Z")).toISOString()).toBe("2026-07-06T07:00:00.000Z"); // CEST
  });
  it("around the changes", () => {
    expect(nextRun(new Date("2026-03-23T00:00:00Z")).toISOString()).toBe("2026-03-23T08:00:00.000Z"); // Mon 23 Mar still CET
    expect(nextRun(new Date("2026-03-30T00:00:00Z")).toISOString()).toBe("2026-03-30T07:00:00.000Z"); // Mon 30 Mar CEST (change 29 Mar)
    expect(nextRun(new Date("2026-10-26T08:30:00Z")).toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });
  it("guard accepts exactly one of the two cron times", () => {
    expect(isBerlinMonday9(new Date("2026-07-06T07:00:00Z"))).toBe(true);
    expect(isBerlinMonday9(new Date("2026-07-06T08:00:00Z"))).toBe(false);
    expect(isBerlinMonday9(new Date("2026-11-02T07:00:00Z"))).toBe(false);
    expect(isBerlinMonday9(new Date("2026-11-02T08:00:00Z"))).toBe(true);
  });
});

describe("download", () => {
  it("retries a server error then succeeds, gives up on a client error and on timeout", async () => {
    let n = 0;
    const flaky = (async () => (++n < 2 ? new Response("x", { status: 503 }) : new Response("ok"))) as unknown as typeof fetch;
    expect(await fetchText("http://x", 3, 1000, flaky)).toBe("ok");
    const bad = (async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
    await expect(fetchText("http://x", 3, 1000, bad)).rejects.toThrow("HTTP 404");
    const down = (async () => { throw new Error("timeout"); }) as unknown as typeof fetch;
    await expect(fetchText("http://x", 1, 1000, down)).rejects.toThrow("timeout");
  }, 20000);
});
