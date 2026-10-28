import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { candidatesOf } from "./coherentFrontier";
import { buildBands } from "./riskBandsBuild";
import { defaultConfig } from "./riskBands";
import { assemble, snapshotProblems, validateBand, type SnapshotRow } from "./sliderSnapshotBuild";

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

describe("90-position slider snapshot", () => {
  it("recomputes every figure from the bond rows, flags empty positions, and refuses to publish them in strict mode", { timeout: 120000 }, async () => {
    const bonds = universe(23);
    const cfg = defaultConfig();
    const mid = await buildBands(bonds, 4, cfg, "t");
    const a = assemble([null, mid, null], bonds, cfg, "strict");
    expect(a.rows).toHaveLength(90);
    expect(a.rows.map((r) => r.rowNo)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
    const okBands = mid.bands.filter((b) => b.status === "ok").length;
    expect(a.rows.filter((r) => r.horizon === "MEDIUM" && r.filled)).toHaveLength(okBands);
    expect(a.filled).toBe(okBands);
    for (const r of a.rows.filter((x) => x.filled)) {
      expect(r.isins).toHaveLength(10);
      expect(Number.isFinite(r.ytm!) && Number.isFinite(r.duration!) && Number.isFinite(r.risk!)).toBe(true);
    }
    expect(a.rows.filter((r) => r.horizon === "SHORT").every((r) => !r.filled && r.error)).toBe(true);
    expect(snapshotProblems(a.rows).join(" ")).toMatch(/not filled/);
    expect(a.blockers.length).toBeGreaterThan(0);
  });

  it("share mode shows a real neighbouring portfolio flagged mappedFrom and never invents one", { timeout: 120000 }, async () => {
    const bonds = universe(23);
    const cfg = defaultConfig();
    const mid = await buildBands(bonds, 4, cfg, "t");
    const a = assemble([null, mid, null], bonds, cfg, "share");
    const real = new Set(mid.bands.filter((b) => b.status === "ok").map((b) => [...b.isins].sort().join(",")));
    for (const r of a.rows.filter((x) => x.horizon === "MEDIUM")) {
      if (!r.filled) continue;
      expect(real.has(r.isins.join(","))).toBe(true);
      if (r.mappedFrom) expect(r.sharedWith).toBe(r.mappedFrom);
    }
    expect(a.rows.filter((r) => r.horizon === "SHORT").every((r) => !r.filled)).toBe(true);
  });

  it("rejects a list whose stored figures no longer match the bond rows (mixed price batch)", { timeout: 120000 }, async () => {
    const bonds = universe(23);
    const cfg = defaultConfig();
    const mid = await buildBands(bonds, 4, cfg, "t");
    const sb = mid.bands.find((b) => b.status === "ok")!;
    const byIsin = new Map(bonds.map((b) => [b.isin, b]));
    const cands = new Map(candidatesOf(bonds, 4, false).map((c) => [c.b.isin, c]));
    const band = cfg.bands[sb.k - 1];
    expect(validateBand(sb, byIsin, cands, 4, band).ok).toBe(true);
    const moved = bonds.map((b) => (b.isin === sb.isins[0] ? { ...b, grossYtm: b.grossYtm! + 1 } : b));
    const r = validateBand(sb, new Map(moved.map((b) => [b.isin, b])), new Map(candidatesOf(moved, 4, false).map((c) => [c.b.isin, c])), 4, band);
    expect(r.ok).toBe(false);
    expect(validateBand({ ...sb, isins: sb.isins.slice(0, 9) }, byIsin, cands, 4, band).ok).toBe(false);
    expect(validateBand({ ...sb, isins: [...sb.isins.slice(0, 9), "NOPE"] }, byIsin, cands, 4, band).ok).toBe(false);
  });

  it("whole-snapshot check needs 90 rows, 30 per term, indexes 1..30 and every row filled", () => {
    const full: SnapshotRow[] = (["SHORT", "MEDIUM", "LONG"] as const).flatMap((h, hi) => Array.from({ length: 30 }, (_, i) => ({
      rowNo: hi * 30 + i + 1, horizon: h, position: i + 1, durationTarget: 2, ytm: 3, duration: 2, risk: 2, expectedLoss: 1, worstRisk: 3, bandMin: 1, bandMax: 2, optimal: true, filled: true, error: null, isins: [], portfolioId: "p", sharedWith: null, mappedFrom: null,
    })));
    expect(snapshotProblems(full)).toEqual([]);
    expect(snapshotProblems(full.slice(0, 89))).not.toEqual([]);
    expect(snapshotProblems(full.map((r, i) => (i === 40 ? { ...r, filled: false } : r)))).not.toEqual([]);
    expect(snapshotProblems(full.map((r, i) => (i === 5 ? { ...r, position: 7 } : r)))).not.toEqual([]);
  });
});
