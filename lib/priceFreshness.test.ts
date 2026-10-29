import { describe, expect, it } from "vitest";
import { bondsCsv, plainReason, summarise, type FreshRow } from "./priceFreshness";

const none = { EUR: null, USD: null };
const now = new Date("2026-10-29T08:00:00Z"); // Thursday
const rows: FreshRow[] = [
  { cur: "EUR", day: "2026-10-29", status: null, reason: null, n: 90 },
  { cur: "EUR", day: "2026-10-27", status: null, reason: null, n: 8 }, // 2 days
  { cur: "EUR", day: "2026-10-23", status: null, reason: "no_quote", n: 2 }, // 4 days
  { cur: "USD", day: "2026-10-29", status: null, reason: null, n: 50 },
  { cur: "USD", day: null, status: null, reason: null, n: 50 },
];

describe("price freshness summary", () => {
  const s = summarise(rows, { EUR: "2026-10-29T07:00:00Z", USD: "2026-10-29T07:00:00Z" }, none, now, { EUR: 90, USD: 50 });
  const eur = s.rows[0], usd = s.rows[1];
  it("counts within 1 / 3 / 5 trading days", () => {
    expect([eur.total, eur.within1, eur.within3, eur.within5]).toEqual([100, 90, 98, 100]);
    expect([usd.total, usd.within3, usd.noDate]).toEqual([100, 50, 50]);
  });
  it("groups bonds older than 3 days by reason in plain words", () => {
    expect(eur.notRefreshed).toEqual([{ reason: "No quote from data feed", count: 2 }]);
    expect(usd.notRefreshed).toEqual([{ reason: "No reason sent by data feed", count: 50 }]);
  });
  it("is red below 99% within 3 days", () => {
    expect(s.banner.red).toBe(true);
    expect(s.banner.reasons.join(" ")).toContain("EUR: only 98.0%");
  });
  it("is red when a real push is older than 26 h, green when fresh and all within 3 days", () => {
    const ok: FreshRow[] = [{ cur: "EUR", day: "2026-10-29", status: null, reason: null, n: 10 }, { cur: "USD", day: "2026-10-29", status: null, reason: null, n: 10 }];
    const old = summarise(ok, none, { EUR: "2026-10-28T05:00:00Z", USD: "2026-10-29T06:00:00Z" }, now, { EUR: 10, USD: 10 });
    expect(old.banner.reasons).toEqual(["EUR: last push from the data feed is 27 h old (limit 26 h)"]);
    expect(summarise(ok, none, { EUR: "2026-10-29T06:00:00Z", USD: "2026-10-29T06:00:00Z" }, now, { EUR: 10, USD: 10 }).banner.red).toBe(false);
  });
  it("does not raise the push alert when the feed sends no push time", () => {
    const ok: FreshRow[] = [{ cur: "EUR", day: "2026-10-29", status: null, reason: null, n: 10 }, { cur: "USD", day: "2026-10-29", status: null, reason: null, n: 10 }];
    expect(summarise(ok, { EUR: "2026-10-01T00:00:00Z", USD: null }, none, now, { EUR: 0, USD: 0 }).banner.red).toBe(false);
  });
});

describe("reasons and CSV", () => {
  it("humanises codes and falls back", () => {
    expect(plainReason(null)).toBe("No reason sent by data feed");
    expect(plainReason("not_in_feed")).toBe("Bond not in data feed");
    expect(plainReason("bad_isin_format")).toBe("Bad isin format");
  });
  it("quotes CSV fields", () => {
    const csv = bondsCsv([{ isin: "X1", name: 'A "b", c', issuer: null, currency: "EUR", priceDate: "2026-10-01", ageTradingDays: 20, status: "failed", reason: "No quote from data feed", lastAttempt: null }]);
    expect(csv.split("\n")[1]).toBe('X1,"A ""b"", c","",EUR,2026-10-01,20,failed,"No quote from data feed",');
  });
});
