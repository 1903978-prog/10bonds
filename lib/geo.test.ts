import { describe, expect, it } from "vitest";
import { countryFromHeaders, countryFromTimezone, geoOf } from "./geo";

const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });

describe("geo", () => {
  it("prefers a country header", () => expect(geoOf(h({ "cf-ipcountry": "fr" }), "Europe/Rome")).toEqual({ country: "FR", source: "header" }));
  it("ignores unknown markers", () => expect(countryFromHeaders(h({ "cf-ipcountry": "XX" }))).toBeNull());
  it("falls back to the timezone, labelled estimated", () => expect(geoOf(h({}), "Europe/Berlin")).toEqual({ country: "DE", source: "estimated" }));
  it("returns nothing when it cannot tell", () => { expect(geoOf(h({}), "Mars/Base")).toEqual({ country: null, source: null }); expect(countryFromTimezone(5)).toBeNull(); });
});
