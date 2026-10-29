import { describe, expect, it } from "vitest";
import { isTradingDay, lastTradingDay, tradingDaysBetween } from "./tradingCalendar";

describe("trading calendars", () => {
  it("TARGET2 closes on Good Friday, Easter Monday, 1 May, 25-26 Dec", () => {
    for (const d of ["2026-04-03", "2026-04-06", "2026-05-01", "2026-12-25", "2026-12-26", "2026-01-01"]) expect(isTradingDay("EUR", d)).toBe(false);
    expect(isTradingDay("EUR", "2026-11-26")).toBe(true); // US Thanksgiving is a TARGET2 day
  });
  it("SIFMA closes on US holidays only", () => {
    for (const d of ["2026-10-12", "2026-11-26", "2026-07-03", "2026-06-19", "2026-11-11"]) expect(isTradingDay("USD", d)).toBe(false);
    expect(isTradingDay("USD", "2026-05-01")).toBe(true);
    expect(isTradingDay("USD", "2026-10-29")).toBe(true);
  });
  it("counts days after the older date up to the newer, skipping weekends", () => {
    expect(tradingDaysBetween("EUR", "2026-10-23", "2026-10-29")).toBe(4); // Fri -> Thu
    expect(tradingDaysBetween("EUR", "2026-10-29", "2026-10-29")).toBe(0);
    expect(tradingDaysBetween("USD", "2026-10-09", "2026-10-13")).toBe(1); // Mon 12 Oct is a SIFMA holiday
    expect(tradingDaysBetween("EUR", "2026-10-09", "2026-10-13")).toBe(2);
  });
  it("rolls a weekend back to Friday", () => {
    expect(lastTradingDay("EUR", "2026-10-31")).toBe("2026-10-30");
    expect(lastTradingDay("USD", "2026-10-29")).toBe("2026-10-29");
  });
});
