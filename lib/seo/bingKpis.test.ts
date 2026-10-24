import { describe, expect, it } from "vitest";
import { bingKpisFrom, mergeKpis } from "./bing";

const NOW = Date.parse("2026-10-19T12:00:00Z");
const d = (iso: string) => `/Date(${Date.parse(`${iso}T00:00:00Z`)})/`;

describe("bingKpisFrom", () => {
  it("sums this period, compares with the one before and takes the latest indexed count", () => {
    const traffic = [
      { Date: d("2026-08-10"), Clicks: 9, Impressions: 9 }, // older than both periods
      { Date: d("2026-09-01"), Clicks: 2, Impressions: 100 }, // previous period
      { Date: d("2026-10-01"), Clicks: 3, Impressions: 50 },
      { Date: d("2026-10-10"), Clicks: 1, Impressions: 50 },
    ];
    const queries = [
      { Query: "btp", Clicks: 1, Impressions: 30, AvgImpressionPosition: 4, Date: d("2026-10-05") },
      { Query: "bund", Clicks: 0, Impressions: 10, AvgImpressionPosition: 12, Date: d("2026-10-06") },
      { Query: "old", Clicks: 0, Impressions: 999, AvgImpressionPosition: 50, Date: d("2026-08-01") },
    ];
    const crawl = [{ Date: d("2026-10-17"), InIndex: 120 }, { Date: d("2026-10-10"), InIndex: 90 }];
    const k = bingKpisFrom(traffic, queries, crawl, 28, NOW);
    expect(k).toMatchObject({ clicks: 4, impressions: 100, ctr: 0.04, position: 6, prevClicks: 2, prevImpressions: 100, indexed: 120 });
  });

  it("gives no comparison or position without enough data", () => {
    const k = bingKpisFrom([{ Date: d("2026-10-10"), Clicks: 0, Impressions: 0 }], [], [], 28, NOW);
    expect(k).toMatchObject({ clicks: 0, ctr: null, position: null, prevClicks: null, indexed: null });
  });
});

describe("mergeKpis", () => {
  it("adds sites together and weights the position by impressions", () => {
    const a = { days: 28, clicks: 2, impressions: 100, ctr: 0.02, position: 10, prevClicks: null, prevImpressions: null, indexed: 50 };
    const b = { days: 28, clicks: 0, impressions: 0, ctr: null, position: null, prevClicks: 1, prevImpressions: 10, indexed: null };
    expect(mergeKpis([a, b])).toMatchObject({ clicks: 2, impressions: 100, ctr: 0.02, position: 10, prevClicks: 1, prevImpressions: 10, indexed: 50 });
  });
});
