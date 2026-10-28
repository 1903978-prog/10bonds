import { type BandCand } from "../coherentFrontier";
import { specCandidates } from "./candidates";
import type { BondFilter } from "../bondFilter";
import type { BondSource } from "../bonds";
import { configSignature } from "../riskBands";
import { storedOf, type StoredBand, type StoredBands } from "../riskBandsBuild";
import { bandsKey } from "../riskBandsServe";
import { saveStoredBands } from "../riskBandsStore";
import { TERMS } from "../limits";
import { specConfig } from "./config";
import { HORIZON_NAMES, type PositionResult } from "./build";

// The unified engine is served by the stored-list path (lib/riskBandsServe.ts): after each run the 30 positions of a horizon are written under the
// spec's band table, so the finder, the slider and the Efficient Database read them with no solver. Written together, per horizon, in one save.

/** Positions whose average risk or expected loss is lower than the position before (reported to the admin, never forced). */
export function monotonicBreaks(results: PositionResult[]): string[] {
  const out: string[] = [];
  let prev: PositionResult | null = null;
  for (const r of [...results].sort((a, b) => a.position - b.position)) {
    if (!r.metrics) continue;
    if (prev?.metrics) {
      if (r.metrics.avgRisk < prev.metrics.avgRisk - 1e-9) out.push(`${r.position}: average risk ${r.metrics.avgRisk} is lower than position ${prev.position} (${prev.metrics.avgRisk})`);
      if (r.metrics.creditLossBp < prev.metrics.creditLossBp - 1e-9) out.push(`${r.position}: expected loss ${r.metrics.creditLossBp} bp is lower than position ${prev.position} (${prev.metrics.creditLossBp} bp)`);
    }
    prev = r;
  }
  return out;
}

/** The 30 positions of one horizon (a term or an exact year) as one stored set. Pure: what is stored is exactly what the solver returned and the validator checked. */
export function storedSetOf(bonds: BondSource["bonds"], duration: number, sig: string, results: PositionResult[]): StoredBands {
  const cfg = specConfig();
  const byCand = new Map<string, BandCand>(specCandidates(bonds, duration, 3).map((c) => [c.b.isin, c]));
  const bands: StoredBand[] = cfg.bands.map((cb) => {
    const r = results.find((x) => x.position === cb.k);
    // The band of this key (anchored): its average-risk range, classes and target, even when no list exists for it.
    const band = { k: cb.k, min: r ? r.band.sumLo / 10 : cb.min, max: r ? r.band.sumHi / 10 : cb.max, ...(r ? { allowed: r.allowed, target: r.band.target, sumLo: r.band.sumLo, sumHi: r.band.sumHi } : {}) };
    const sel = r?.metrics ? r.isins.map((i) => byCand.get(i)) : [];
    if (!r || !r.metrics || sel.length !== 10 || sel.some((c) => !c)) {
      // INFEASIBLE is a real limit of the rules; anything else (error, time limit, missing result) is a failed calculation and keeps the snapshot from publishing.
      const failed = !r || r.status !== "infeasible";
      return { ...band, status: "none", isins: [], avgRisk: null, ytm: null, el: null, avgDur: null, optimal: false, seconds: r?.seconds ?? 0, reason: r?.failure ?? "No result for this position", ...(failed ? { failed: true } : {}) };
    }
    const m = r.metrics;
    const eff = { netBp: m.netSpreadBp, grossBp: m.grossSpreadBp, lossBp: m.creditLossBp, avgBondBes: m.avgBondBes, portfolioBes: r.portfolioBes.score, besReason: r.portfolioBes.reason };
    return storedOf(band, sel as BandCand[], r.status === "optimal", r.seconds, { ladder: r.step ?? 0, ...(r.repeatOf && r.repeatOf !== r.position ? { repeatOf: r.repeatOf } : {}), eff });
  });
  const first = results.find((x) => x.r1 !== null);
  return {
    sig: sig + "|" + configSignature(cfg), duration, bands, nonMonotonic: [],
    ...(first ? { anchors: { r1: first.r1! / 10, r30: first.r30! / 10, step: Math.max(0, ...results.filter((x) => x.position === 1 || x.position === 30).map((x) => x.step ?? 0)) } } : {}),
    breaks: monotonicBreaks(results),
    candidates: { all: 0, kept: 0, perCell: cfg.perCell }, builtAt: new Date().toISOString(),
  };
}

export async function publishHorizon(src: BondSource, filter: Pick<BondFilter, "currency" | "size">, duration: number, results: PositionResult[]): Promise<void> {
  const key = bandsKey(src, filter as BondFilter, duration, specConfig());
  await saveStoredBands(key, storedSetOf(src.bonds, duration, key.split("|")[0], results));
}

export async function publishBands(src: BondSource, filter: Pick<BondFilter, "currency" | "size">, results: PositionResult[]): Promise<number> {
  let saved = 0;
  for (const t of TERMS) {
    await publishHorizon(src, filter, t.duration, results.filter((x) => x.horizon === HORIZON_NAMES[t.key]));
    saved++;
  }
  return saved;
}
