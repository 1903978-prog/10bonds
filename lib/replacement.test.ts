import { describe, expect, it } from "vitest";
import { cleanSettings, DEFAULT_SETTINGS, runEngine } from "./replacement";
import { parseAmount, parsePortfolio } from "./portfolioCsv";
import { SAMPLE_BONDS } from "./sample-bonds";
import type { PublicBond } from "./types";

const bond = (isin: string, issuer: string, ytm: number, dur: number, rating: string | null): PublicBond => ({
  isin, name: `${issuer} bond`, issuer, country: null, currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null,
  grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});

describe("runEngine", () => {
  it("swaps for more yield at the same duration and rating", () => {
    const u = [bond("OLD", "A Co", 3.0, 5, "A"), bond("NEW", "B Co", 3.6, 5.2, "A"), bond("FAR", "C Co", 5, 9, "A")];
    const r = runEngine([{ isin: "OLD", amount: 100_000 }], u, { ...DEFAULT_SETTINGS, maxIssuerPct: 100 });
    const l = r.lines[0];
    expect(l.action).toBe("swap");
    if (l.action !== "swap") return;
    expect(l.kind).toBe("yield");
    expect(l.buy.isin).toBe("NEW");
    expect(l.netYtmChange).toBeCloseTo(0.6 - 0.3 / 5);
    expect(r.extraIncomePerYear).toBeCloseTo(600);
    expect(r.tradingCost).toBeCloseTo(300);
    expect(l.rationale.join(" ")).toMatch(/Higher yield/);
  });

  it("never buys a lower rating for more yield", () => {
    const u = [bond("OLD", "A Co", 3.0, 5, "A"), bond("JUNK", "B Co", 6, 5, "BB")];
    expect(runEngine([{ isin: "OLD", amount: 1 }], u, { ...DEFAULT_SETTINGS, maxIssuerPct: 100 }).lines[0].action).toBe("keep");
  });

  it("swaps for a better rating at a similar yield", () => {
    const u = [bond("OLD", "A Co", 3.0, 5, "BBB"), bond("SAFE", "B Co", 3.0, 5, "A")];
    const l = runEngine([{ isin: "OLD", amount: 1 }], u, { ...DEFAULT_SETTINGS, maxIssuerPct: 100 }).lines[0];
    expect(l.action === "swap" && l.kind).toBe("risk");
  });

  it("keeps when the gain does not beat the trading cost", () => {
    // +0.2% a year, but 0.3% cost over 1 year leaves -0.1%.
    const u = [bond("OLD", "A Co", 3.0, 1, "A"), bond("NEW", "B Co", 3.2, 1, "A")];
    const l = runEngine([{ isin: "OLD", amount: 1 }], u, { ...DEFAULT_SETTINGS, maxIssuerPct: 100 }).lines[0];
    expect(l.action).toBe("keep");
  });

  it("does not let one issuer grow above the limit", () => {
    const u = [bond("OLD1", "A Co", 3.0, 5, "A"), bond("OLD2", "B Co", 3.0, 5, "A"), bond("NEW1", "Z Co", 4, 5, "A"), bond("NEW2", "Z Co", 3.9, 5, "A")];
    const r = runEngine([{ isin: "OLD1", amount: 50 }, { isin: "OLD2", amount: 50 }], u, { ...DEFAULT_SETTINGS, maxIssuerPct: 50 });
    const buys = r.lines.filter((l) => l.action === "swap");
    expect(buys).toHaveLength(1);
    expect(r.lines.some((l) => l.action === "keep" && /issuer above 50%/.test(l.reason))).toBe(true);
  });

  it("marks bonds that are not in the data", () => {
    const r = runEngine([{ isin: "XS0000000001", amount: 10 }], SAMPLE_BONDS);
    expect(r.lines[0].action).toBe("unknown");
  });

  it("runs on the sample data and improves or keeps the portfolio", () => {
    const holdings = SAMPLE_BONDS.slice(0, 12).map((b) => ({ isin: b.isin, amount: 100_000 }));
    const r = runEngine(holdings, SAMPLE_BONDS);
    expect(r.lines).toHaveLength(12);
    expect(r.after.ytm! + 1e-9).toBeGreaterThanOrEqual(r.before.ytm! - DEFAULT_SETTINGS.maxGiveUpPct);
  });

  it("cleans settings", () => {
    expect(cleanSettings({ costPct: "99", mode: "bad", maxIssuerPct: "" })).toMatchObject({ costPct: 3, mode: "both", maxIssuerPct: 10 });
  });
});

describe("parsePortfolio", () => {
  it("reads semicolon, comma and tab files with any column order", () => {
    expect(parsePortfolio("ISIN;Amount\nXS1234567890;1.000.000,00\nIT0005123456;250000").holdings).toEqual([
      { isin: "XS1234567890", amount: 1_000_000 },
      { isin: "IT0005123456", amount: 250_000 },
    ]);
    expect(parsePortfolio('Amount,ISIN\n"1,000,000.50",XS1234567890').holdings).toEqual([{ isin: "XS1234567890", amount: 1_000_000.5 }]);
    expect(parsePortfolio("Bond\tXS1234567890\t100.000").holdings).toEqual([{ isin: "XS1234567890", amount: 100_000 }]);
  });

  it("adds up repeated ISINs and reports bad lines", () => {
    const r = parsePortfolio("XS1234567890;100\nxs1234567890;50\nnonsense;5\nIT0005123456;");
    expect(r.holdings).toEqual([{ isin: "XS1234567890", amount: 150 }]);
    expect(r.skipped.map((s) => s.why)).toEqual(["no ISIN found", "no amount found"]);
  });

  it("reads amounts", () => {
    expect(parseAmount("€ 250 000")).toBe(250000);
    expect(parseAmount("1000,5")).toBe(1000.5);
    expect(parseAmount("abc")).toBeNull();
  });
});
