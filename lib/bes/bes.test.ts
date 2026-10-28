import { describe, expect, it } from "vitest";
import type { PublicBond } from "../types";
import { SP_CORPORATE, SP_CORPORATE_YEARS, spCorporateRow } from "./spReference";
import { annualEquivalentPd, annualLossBp, besLabel, cumulativePd, cumulativePdExtended, curveYield, curveYieldExtended, grossSpreadBp, percentileRank } from "./math";
import { STALE_DAYS } from "../bonds";
import { BES_STALE_DAYS, calculateBes } from "./calc";

const sp = (c: string) => SP_CORPORATE.find(([k]) => k === c)![1];

describe("S&P Table 24 reference (anchors from the brief)", () => {
  it.each([
    ["AAA", 0.0, 0.34, 0.67], ["AA", 0.02, 0.28, 0.65], ["A", 0.05, 0.39, 1.03], ["BBB", 0.14, 1.36, 2.86],
    ["BB", 0.56, 5.75, 10.44], ["B", 2.93, 15.6, 22.02], ["CCC/C", 26.12, 46.53, 50.43],
  ])("%s 1/5/10y", (c, y1, y5, y10) => {
    const r = sp(c);
    expect([r[0], r[4], r[9]]).toEqual([y1, y5, y10]);
    expect(r).toHaveLength(15);
    for (let i = 1; i < 15; i++) expect(r[i]).toBeGreaterThanOrEqual(r[i - 1]);
  });
  it("maps notches to categories, CCC+ and below is the aggregate", () => {
    expect([0, 1, 4, 8, 12, 15, 16, 20].map((n) => spCorporateRow(n).category)).toEqual(["AAA", "AA", "A", "BBB", "BB", "B", "CCC/C", "CCC/C"]);
  });
});

describe("probability maths", () => {
  const row = sp("BBB"), hz = SP_CORPORATE_YEARS;
  it("returns the published value at a published horizon, as a decimal", () => {
    expect(cumulativePd(row, hz, 5)).toBeCloseTo(0.0136, 10);
    expect(cumulativePd(row, hz, 10)).toBeCloseTo(0.0286, 10);
  });
  it("interpolates survival between horizons and stays monotonic", () => {
    const mid = cumulativePd(row, hz, 2.5)!;
    expect(mid).toBeGreaterThan(0.0038);
    expect(mid).toBeLessThan(0.0067);
    let prev = 0;
    for (let t = 0.1; t <= 15; t += 0.1) { const p = cumulativePd(row, hz, t)!; expect(p).toBeGreaterThanOrEqual(prev); expect(p).toBeLessThanOrEqual(1); prev = p; }
  });
  it("below one year runs from zero; beyond 15 years is unsupported (null)", () => {
    expect(cumulativePd(row, hz, 0.5)).toBeCloseTo(0.0007, 10);
    expect(cumulativePd(row, hz, 15.5)).toBeNull();
    expect(cumulativePd(row, hz, 0)).toBeNull();
  });
  it("a different maturity gives a different PD (2y vs 5y vs 10y)", () => {
    const [a, b, c] = [2, 5, 10].map((t) => cumulativePd(row, hz, t)!);
    expect(a).toBeLessThan(b); expect(b).toBeLessThan(c);
  });
  it("annual equivalent: 1-(1-PD)^(1/T), not PD/T", () => {
    expect(annualEquivalentPd(0.0286, 10)).toBeCloseTo(1 - Math.pow(1 - 0.0286, 0.1), 12);
    expect(annualEquivalentPd(0.0286, 10)).not.toBeCloseTo(0.00286, 6);
    expect(annualEquivalentPd(0, 5)).toBe(0);
  });
});

describe("documented extensions (flagged limited)", () => {
  const row = sp("BBB"), hz = SP_CORPORATE_YEARS;
  it("default table: yearly hazard of the last segment is held flat beyond 15 years", () => {
    const e = cumulativePdExtended(row, hz, 20)!;
    expect(e.extended).toBe(true);
    const h = 1 - Math.pow((1 - 0.0401) / (1 - 0.0378), 1 / 1);
    expect(e.pd).toBeCloseTo(1 - (1 - 0.0401) * Math.pow(1 - h, 5), 10);
    expect(e.pd).toBeGreaterThan(0.0401);
    expect(cumulativePdExtended(row, hz, 10)!.extended).toBe(false);
    expect(cumulativePdExtended(row, hz, 60)).toBeNull();
  });
  it("a zero-default row stays zero beyond the table", () => {
    expect(cumulativePdExtended([0, 0, 0], [1, 2, 3], 9)!.pd).toBe(0);
  });
  it("benchmark curve: end yield held flat for a limited distance, otherwise unavailable", () => {
    const c = [{ years: 1, ytm: 2 }, { years: 10, ytm: 3 }];
    expect(curveYieldExtended(c, 5)).toEqual({ y: expect.closeTo(2.444, 2), extended: false });
    expect(curveYieldExtended(c, 15)).toEqual({ y: 3, extended: true });
    expect(curveYieldExtended(c, 0.5)).toEqual({ y: 2, extended: true });
    expect(curveYieldExtended(c, 25)).toBeNull();
  });
  it("uses the site's own stale limit", () => { expect(BES_STALE_DAYS).toBe(STALE_DAYS); });
});

describe("spreads and losses", () => {
  it("1 percentage point = 100 bp", () => {
    expect(grossSpreadBp(5.2, 3.1)).toBeCloseTo(210, 9);
    expect(grossSpreadBp(3.0, 3.5)).toBeCloseTo(-50, 9);
  });
  it("annual loss in bp = annual PD x LGD x 10,000", () => {
    expect(annualLossBp(0.003, 0.6)).toBeCloseTo(18, 9);
  });
  it("curve read is linear and never extrapolates", () => {
    const c = [{ years: 1, ytm: 2 }, { years: 3, ytm: 4 }];
    expect(curveYield(c, 2)).toBeCloseTo(3, 12);
    expect(curveYield(c, 0.5)).toBeNull();
    expect(curveYield(c, 3.5)).toBeNull();
    expect(curveYield(c.slice(0, 1), 1)).toBeNull();
  });
});

describe("percentile and labels", () => {
  it("ranks among other peers, ties half", () => {
    const xs = [10, 20, 30, 40, 50];
    expect(percentileRank(50, xs)).toBe(100);
    expect(percentileRank(10, xs)).toBe(0);
    expect(percentileRank(30, xs)).toBe(50);
    expect(percentileRank(5, [5, 5, 5])).toBe(50);
    expect(percentileRank(5, [5])).toBeNull();
  });
  it("labels follow the bands", () => {
    expect([95, 80, 65, 50, 30, 5].map(besLabel)).toEqual(["Exceptional relative efficiency", "Very attractive", "Above average", "Average", "Below average", "Poor relative efficiency"]);
  });
});

// Synthetic universe: German Bunds (benchmark) and 30 BBB corporates of one maturity band with spread 50..340 bp.
const TODAY = "2026-10-28";
const base = { country: null, coupon: 3, ratingMoodys: null, ratingFitch: null, ratingResolved: null, modifiedDuration: 4, ytmAsOf: "2026-10-28T00:00:00.000Z", couponType: "fixed" } as const;
function universe(): PublicBond[] {
  const out: PublicBond[] = [];
  for (let y = 1; y <= 12; y++) out.push({ ...base, isin: `DE${y}`, name: "Bund", issuer: "Federal Republic of Germany", country: "DE", currency: "EUR", maturity: `${2026 + y}-10-28`, ratingSp: "AAA", grossYtm: 2 + y * 0.1 } as PublicBond);
  for (let i = 0; i < 30; i++) out.push({ ...base, isin: `XS${i}`, name: `Corp ${i}`, issuer: `Corp ${i} AG`, currency: "EUR", maturity: "2031-10-28", ratingSp: "BBB", grossYtm: 2.5 + 0.5 + i * 0.1 } as PublicBond);
  return out;
}
describe("BES on a synthetic universe", () => {
  const rows = calculateBes(universe(), TODAY);
  const corp = rows.filter((r) => r.isin.startsWith("XS"));
  it("scores the 30 peers monotonically in net spread, 0..100", () => {
    expect(corp.every((r) => r.bes !== null && r.status === "valid" && r.peerCount === 30)).toBe(true);
    expect(corp[0].bes).toBe(0);
    expect(corp[29].bes).toBe(100);
    for (let i = 1; i < 30; i++) expect(corp[i].bes!).toBeGreaterThan(corp[i - 1].bes!);
  });
  it("net spread = gross - bond loss + (zero) benchmark loss, in bp", () => {
    const r = corp[10];
    expect(r.grossSpreadBp).toBeCloseTo((r.ytm! - r.benchmarkYield!) * 100, 9);
    expect(r.netSpreadBp).toBeCloseTo(r.grossSpreadBp! - r.annualLossBp!, 6);
    expect(r.liquidityCostBp).toBeNull();
    expect(r.fullyAdjustedBp).toBeNull();
  });
  it("a yield far below the government curve is flagged limited", () => {
    const u = universe();
    u.push({ ...u[20], isin: "XSLOW", name: "Low", issuer: "Low AG", grossYtm: 0.5 } as PublicBond);
    const r = calculateBes(u, TODAY).find((x) => x.isin === "XSLOW")!;
    expect(r.status).toBe("limited");
    expect(r.notes.join(" ")).toMatch(/100 bp below/);
  });
  it("is reproducible", () => {
    expect(calculateBes(universe(), TODAY)).toEqual(rows);
  });
  it("a group below the minimum peer count gets no score, never an invented one", () => {
    const few = universe().filter((b) => !b.isin.startsWith("XS") || Number(b.isin.slice(2)) < 5);
    const r = calculateBes(few, TODAY).filter((x) => x.isin.startsWith("XS"));
    expect(r.every((x) => x.bes === null && x.status === "unavailable")).toBe(true);
  });
  it("a currency without a benchmark curve is unavailable (no zero-yield assumption)", () => {
    const r = calculateBes(universe().map((b) => (b.isin.startsWith("XS") ? { ...b, currency: "CHF" } : b)), TODAY).filter((x) => x.isin.startsWith("XS"));
    expect(r.every((x) => x.bes === null && x.benchmarkYield === null)).toBe(true);
  });
  it("floating notes are not scored; a 20-year bond gets a limited score with both extensions noted", () => {
    const u = universe();
    u.push({ ...u[20], isin: "FRN1", couponType: "floating" } as PublicBond, { ...u[20], isin: "LONG1", maturity: "2046-10-28" } as PublicBond);
    const r = calculateBes(u, TODAY);
    expect(r.find((x) => x.isin === "FRN1")!.status).toBe("unavailable");
    const l = r.find((x) => x.isin === "LONG1")!;
    expect(l.status).toBe("limited");
    expect(l.bes).not.toBeNull();
    expect(l.notes.join(" ")).toMatch(/extended beyond 15 years/);
    expect(l.notes.join(" ")).toMatch(/Benchmark extended/);
  });
  it("a bond 9 days behind the newest quote is still scored (site limit is 10 days)", () => {
    const u = universe();
    u.push({ ...u[20], isin: "OLD9", ytmAsOf: "2026-10-19T00:00:00.000Z" } as PublicBond);
    expect(calculateBes(u, TODAY).find((x) => x.isin === "OLD9")!.bes).not.toBeNull();
    u.push({ ...u[20], isin: "OLD12", ytmAsOf: "2026-10-16T00:00:00.000Z" } as PublicBond);
    expect(calculateBes(u, TODAY).find((x) => x.isin === "OLD12")!.status).toBe("unavailable");
  });
});
