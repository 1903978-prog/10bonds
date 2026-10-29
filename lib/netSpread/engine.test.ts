import { describe, expect, it } from "vitest";
import type { PublicBond } from "../types";
import { bondRisk } from "../ratings";
import { poolWindowOf, specRules } from "../portfolioSpec";
import { assemble, snapshotProblems } from "../sliderSnapshotBuild";
import { bondsOfBand, publicPositions, positionsOfBands } from "../riskBandsServe";
import { specConfig } from "./config";
import { dominatedPositions, storedSetOf } from "./publishBands";
import { specCandidates } from "./candidates";
import { buildHorizon, nsCandidates, type BesBond } from "./build";
import { checkNsList } from "./check";

// A synthetic universe that exercises every rule of the spec on the real candidate pipeline: all ten risk classes, durations in and outside the window,
// stale quotes and subordinated debt that would win if they were allowed, and class 9-10 too thin for some positions (those must stay infeasible).
const GRADES = ["AAA", "AA", "A", "BBB+", "BBB", "BBB-", "BB", "B", "CCC", "CC"];
const PER_CLASS = [14, 30, 40, 40, 40, 40, 30, 20, 12, 3];
const NEWEST = "2026-10-27";
const STALE = "2026-10-09"; // 12 trading days behind (stale from 5)

function universe(duration: number): { bonds: PublicBond[]; bes: Map<string, BesBond> } {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bonds: PublicBond[] = [];
  const bes = new Map<string, BesBond>();
  GRADES.forEach((g, ci) => {
    const cls = ci + 1;
    for (let k = 0; k < PER_CLASS[ci]; k++) {
      const isin = `S${cls}-${k}-${duration}`;
      const ytm = 2 + cls * 0.45 + rnd() * 0.8;
      // Durations spread over the window the spec allows for this horizon (Long wider), plus a few clearly outside it.
      const w = poolWindowOf(duration);
      const dur = duration * (1 - w + rnd() * 2 * w);
      const trap = k % 11 === 5; // would win on net spread if the data rules did not exclude it
      bonds.push({
        isin, name: isin, issuer: `Issuer ${cls}-${k}`, country: "France", currency: "EUR", coupon: null, maturity: null,
        ratingSp: g, ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: ytm, modifiedDuration: dur,
        ytmAsOf: trap && k % 2 ? STALE : NEWEST, seniority: trap && !(k % 2) ? "Subordinated Tier 2" : "Senior unsecured", feedSector: `sector ${(cls * 7 + k) % 9}`,
      });
      const net = 60 + cls * 14 + rnd() * 40 + (trap ? 400 : 0);
      bes.set(isin, { isin, netSpreadBp: net, grossSpreadBp: net + 8 * cls, annualLossBp: 6 * cls + rnd() * 10, bes: Math.round(rnd() * 100), status: "valid" });
    }
  });
  return { bonds, bes };
}

describe("the unified engine on a full synthetic horizon", () => {
  for (const duration of [2, 4, 10]) {
    it(`${duration} y: every list obeys the spec, traps stay out, windows rise, infeasible stays empty, stored = displayed`, { timeout: 240000 }, async () => {
      const { bonds, bes } = universe(duration);
      const byIsin = new Map(bonds.map((b) => [b.isin, b]));
      const results = await buildHorizon({ bonds, bes, seedKey: "t", light: true }, "H", duration, 1);
      expect(results).toHaveLength(30);
      expect(results.map((r) => r.position)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));

      const valid = results.filter((r) => r.metrics);
      if (process.env.SPEC_DEBUG) console.log(duration, results.map((r) => `${r.position}:${r.status[0]}${r.repeatOf && r.repeatOf !== r.position ? "=" + r.repeatOf : ""}${r.metrics ? "/" + r.metrics.netSpreadBp.toFixed(0) + "/" + r.metrics.creditLossBp.toFixed(0) : ""}`).join(" "));
      expect(valid.length).toBeGreaterThan(15);
      for (const r of valid) {
        const rows = r.isins.map((i) => byIsin.get(i)!);
        // The band, the 3-class window (spread <= 2), duration, issuer, sector caps and loss share: the one validator, applied again from the bond rows.
        const cls = rows.map((b) => bondRisk(b)!);
        expect(Math.max(...cls) - Math.min(...cls)).toBeLessThanOrEqual(2);
        expect(r.isins).toHaveLength(10);
        const items = r.bonds.map((b) => ({ isin: b.isin, group: b.group, sector: b.sector, cls: b.cls, dur: b.dur, lossBp: b.lossBp }));
        expect(checkNsList(items, r.allowed, specRules(duration, r.step ?? 0), { sum: { lo: r.band.sumLo, hi: r.band.sumHi } }).filter((c) => !c.ok)).toEqual([]);
        // Data exclusions: no stale quote, no subordinated / Tier 2 debt, whatever its net spread.
        for (const b of rows) { expect(b.ytmAsOf).toBe(NEWEST); expect(b.seniority).toBe("Senior unsecured"); }
        // Bond duration window of the ladder step the list was found at.
        for (const b of rows) expect(Math.abs(b.modifiedDuration! - duration)).toBeLessThanOrEqual(poolWindowOf(duration, r.step ?? 0) * duration + 1e-9);
      }

      // Anchored bands: the average risk never falls from one position to the next (a break would be reported in the stored set, never forced).
      for (let i = 1; i < valid.length; i++) expect(valid[i].metrics!.avgRisk).toBeGreaterThanOrEqual(valid[i - 1].metrics!.avgRisk - 1e-9);

      // Return must rise with risk: no list returns less than the one below it, and no position is beaten by a lower one.
      for (let i = 1; i < valid.length; i++) expect(valid[i].metrics!.ytm).toBeGreaterThanOrEqual(valid[i - 1].metrics!.ytm - 0.005);
      expect(dominatedPositions(results)).toEqual([]);

      // Infeasible positions are empty with a reason; nothing fills them.
      const infeasible = results.filter((r) => r.status === "infeasible");
      for (const r of infeasible) { expect(r.isins).toEqual([]); expect(r.metrics).toBeNull(); expect(r.failure).toMatch(/No list of 10 bonds/); }

      // Stored = displayed: the stored set, the snapshot rows and the served positions hold exactly the solver's bonds.
      const stored = storedSetOf(bonds, duration, "sig", results);
      const sets = [null, null, null] as (typeof stored | null)[];
      sets[duration === 2 ? 0 : duration === 4 ? 1 : 2] = stored;
      const a = assemble(sets, bonds, specConfig(), "strict");
      const h = a.rows.filter((r) => r.horizon === (duration === 2 ? "SHORT" : duration === 4 ? "MEDIUM" : "LONG"));
      for (const r of results) {
        const row = h[r.position - 1];
        const sb = stored.bands[r.position - 1];
        if (r.metrics) {
          expect(row.status).toBe("VALID");
          expect(row.isins).toEqual(r.isins);
          expect([...sb.isins].sort()).toEqual(r.isins);
          expect(bondsOfBand(sb, byIsin)!.map((b) => b.isin).sort()).toEqual(r.isins);
        } else {
          expect(row.status).toBe("INFEASIBLE");
          expect(row.isins).toEqual([]);
        }
      }
      expect(a.rows.filter((r) => r.status === "ERROR")).toEqual([]);

      // Expected loss never falls with position (owner, 29/10/2026).
      const els = stored.bands.filter((b) => b.status === "ok").map((b) => b.el!);
      for (let i = 1; i < els.length; i++) expect(els[i]).toBeGreaterThanOrEqual(els[i - 1] - 0.0011);

      // Public slider: valid positions only, renumbered 1..n, repeats out, the stored position kept for the list lookup, risk classes shown.
      const served = positionsOfBands({ stored, stale: false, src: { bonds, source: "live", asOf: NEWEST }, cfg: specConfig(), key: "k" });
      const pub = publicPositions(served);
      expect(pub.map((p) => p.position)).toEqual(Array.from({ length: pub.length }, (_, i) => i + 1));
      expect(pub.length).toBe(valid.filter((r) => !r.repeatOf || r.repeatOf === r.position).length);
      for (const p of pub) {
        expect(p.unavailable).toBe(false);
        expect(p.classes).toEqual(results[p.slot! - 1].allowed);
        expect(p.adjusted === true).toBe((results[p.slot! - 1].step ?? 0) > 0);
        expect(p.query!.band).toBe(p.slot);
        expect(results[p.slot! - 1].metrics).not.toBeNull();
      }
      expect(a.filled).toBe(valid.length);
      expect(snapshotProblems(h.map((r, i) => ({ ...r, rowNo: i + 1 }))).join(" ")).not.toMatch(/ERROR/);
    });
  }

  it("the Long horizon takes bonds up to 30% from 10 years; Short and Medium stop at 20%", () => {
    expect([poolWindowOf(2), poolWindowOf(4), poolWindowOf(10)]).toEqual([0.2, 0.2, 0.3]);
    expect([1, 3, 5, 6, 12, 15].map((d) => poolWindowOf(d))).toEqual([0.2, 0.2, 0.2, 0.3, 0.3, 0.3]);
    const mk = (isin: string, dur: number): PublicBond => ({ isin, name: isin, issuer: `Long ${isin}`, country: "France", currency: "EUR", coupon: null, maturity: null, ratingSp: "A", ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: 4, modifiedDuration: dur, ytmAsOf: NEWEST, seniority: "Senior unsecured", feedSector: "sector 1" });
    const bonds = [mk("L1", 12.6), mk("L2", 9.9), mk("L3", 7.2)];
    // Fewer than 10 issuers would widen the pool in half-year steps; the window itself is what is under test, so compare the first three candidates against a 20% pool.
    const long = specCandidates(bonds, 10).map((c) => c.b.isin).sort();
    expect(long).toEqual(["L1", "L2", "L3"]);
  });

  it("bonds the spec excludes are not candidates, whatever their net spread", () => {
    const { bonds, bes } = universe(4);
    const cands = nsCandidates(bonds, 4, bes);
    const ids = new Set(cands.map((c) => c.isin));
    for (const b of bonds) if (b.ytmAsOf === STALE || b.seniority !== "Senior unsecured") expect(ids.has(b.isin)).toBe(false);
    expect(cands.length).toBeGreaterThan(100);
  });

  it("a failed calculation is an ERROR that blocks publishing, a real limit is INFEASIBLE with its reason", { timeout: 120000 }, async () => {
    const { bonds, bes } = universe(4);
    const results = await buildHorizon({ bonds, bes, seedKey: "t", light: true }, "H", 4, 1);
    const broken = results.map((r) => (r.position === 5 ? { ...r, status: "error" as const, metrics: null, isins: [], bonds: [], failure: "solver time limit" } : r));
    const a = assemble([null, storedSetOf(bonds, 4, "sig", broken), null], bonds, specConfig(), "strict");
    const med = a.rows.filter((r) => r.horizon === "MEDIUM");
    expect(med[4].status).toBe("ERROR");
    expect(med[4].error).toBe("solver time limit");
    expect(snapshotProblems(a.rows).join(" ")).toMatch(/not resolved/);
  });
});
