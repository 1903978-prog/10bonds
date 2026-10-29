import { describe, it, expect } from "vitest";
import { cleanIssuer } from "./bonds";
describe("cleanIssuer", () => {
  it("drops bond terms", () => expect(cleanIssuer("DekaBank Deutsche Girozentrale 3.625% 26/29")).toBe("DekaBank Deutsche Girozentrale"));
  it("drops a seat after a comma", () => expect(cleanIssuer("Terega S.A., Pau")).toBe("Terega S.A."));
  it("keeps plain names", () => expect(cleanIssuer("Belgium")).toBe("Belgium"));
  it("keeps legal form after comma", () => expect(cleanIssuer("SAGAX EURO MTN NL B.V.")).toBe("SAGAX EURO MTN NL B.V."));
});

import { dropStale } from "./bonds";
describe("stale yields", () => {
  it("drops bonds whose yield date is more than 5 trading days behind the newest", () => {
    const b = (isin: string, d: string | null) => ({ isin, ytmAsOf: d }) as never;
    const kept = dropStale([b("NEW", "2026-10-17T00:00:00Z"), b("OK", "2026-10-12T00:00:00Z"), b("LATE", "2026-10-08T00:00:00Z"), b("OLD", "2026-09-30T00:00:00Z"), b("NODATE", null)]);
    expect(kept.map((x: { isin: string }) => x.isin)).toEqual(["NEW", "OK", "NODATE"]);
  });
});
