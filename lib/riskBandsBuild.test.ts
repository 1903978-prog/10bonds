import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { candidatesOf } from "./coherentFrontier";
import { buildBands } from "./riskBandsBuild";
import { RowSlots } from "./riskBandsAnswer";
import { liveBand, type LiveStep } from "./riskBandsLive";
import { defaultBands, defaultConfig, inBand, listOk, statOf } from "./riskBands";

const bond = (isin: string, issuer: string, ytm: number, rating: string, dur = 4): PublicBond => ({
  isin, name: isin, issuer, country: isin.endsWith("1") ? "Italy" : "France", currency: "EUR", coupon: null, maturity: null,
  ratingSp: rating, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: dur, ytmAsOf: null,
});
const NAMES = ["Axa", "Allianz", "Deutsche Zeta", "Engie", "Enel", "Snam", "Sanofi", "Roche", "Danone", "Heineken", "Eni", "Neste", "Stryker", "Orange", "Verizon", "Gecina", "Vonovia", "Iberdrola", "Telefonica", "Carrefour", "Michelin", "Siemens"];
const GRADES = ["AAA", "AA", "A", "BBB", "BBB", "BB", "B"];
function universe(seed: number): PublicBond[] {
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return NAMES.map((n, i) => { const g = Math.floor(rnd() * GRADES.length); return bond(`U${i}-${i % 2}`, n, Math.round((2.5 + g * 0.8 + rnd() * 1.2) * 100) / 100, GRADES[g], 3.6 + rnd() * 0.9); });
}

describe("stored band portfolios", () => {
  it("every stored list has its average risk inside its band, 10 distinct issuers and the horizon duration; empty bands say so", { timeout: 120000 }, async () => {
    const bonds = universe(23);
    const sb = await buildBands(bonds, 4, defaultConfig(), "t");
    expect(sb.bands).toHaveLength(30);
    const byIsin = new Map(candidatesOf(bonds, 4, false).map((c) => [c.b.isin, c]));
    const ok = sb.bands.filter((b) => b.status === "ok");
    expect(ok.length).toBeGreaterThan(1);
    for (const b of sb.bands) {
      if (b.status === "none") { expect(b.isins).toEqual([]); expect(b.ytm).toBeNull(); continue; }
      const sel = b.isins.map((i) => byIsin.get(i)!);
      expect(b.isins).toHaveLength(10);
      expect(new Set(sel.map((c) => c.group)).size).toBe(10);
      expect(inBand(statOf(sel).avgRisk, b)).toBe(true);
      expect(inBand(b.avgRisk!, b)).toBe(true);
      expect(Math.abs(b.avgDur! - 4)).toBeLessThanOrEqual(4 * 0.05 + 0.01);
    }
    // non-decreasing average yield from band 1 to band 30, or flagged
    let top = -Infinity;
    const flagged = new Set(sb.nonMonotonic);
    ok.forEach((b) => { if (b.ytm! < top - 1e-9) expect(flagged.has(b.k)).toBe(true); top = Math.max(top, b.ytm!); });
  });
});

describe("progressive search and rows in place", () => {
  it("never lowers the shown return nor raises the expected loss, and the stored exact list is at least as good as the start", { timeout: 60000 }, async () => {
    const bonds = universe(23);
    const cfg = defaultConfig();
    const band = defaultBands()[11];
    const steps: LiveStep[] = [];
    for await (const st of liveBand(bonds, 4, band, cfg, { exact: true, exactSeconds: 3 })) steps.push(st);
    if (!steps.length) return; // a band with no list gives no step
    expect(steps[0].phase).toBe("start");
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].stat.ytm).toBeGreaterThanOrEqual(steps[i - 1].stat.ytm - 1e-9);
      expect(steps[i].stat.el).toBeLessThanOrEqual(steps[i - 1].stat.el + 1e-9);
    }
    const rules = { perIssuer: 1, perSector: 3, duration: 4 };
    for (const st of steps) expect(listOk(st.sel, band, rules)).toBe(true);
    const sb = await buildBands(bonds, 4, cfg, "t");
    const stored = sb.bands[11];
    if (stored.status === "ok") expect(stored.ytm!).toBeGreaterThanOrEqual(Math.round(steps[0].stat.ytm * 100) / 100 - 0.005);
  });
  it("a swap changes only the row of the bond that left", () => {
    const cs = candidatesOf(universe(5), 4, false);
    const a = cs.slice(0, 10);
    const slots = new RowSlots();
    const first = slots.next(a);
    expect(first.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const leaving = a[3];
    const incoming = cs[12];
    const b = a.map((c) => (c === leaving ? incoming : c));
    const second = slots.next(b);
    const at = first.rows.findIndex((r) => r.isin === leaving.b.isin);
    expect(second.changed).toEqual([at + 1]);
    expect(second.rows[at].isin).toBe(incoming.b.isin);
    second.rows.forEach((r, i) => { if (i !== at) expect(r.isin).toBe(first.rows[i].isin); });
  });
});
