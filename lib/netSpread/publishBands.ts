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

/** The 30 positions of one horizon (a term or an exact year) as one stored set. Pure: what is stored is exactly what the solver returned and the validator checked. */
export function storedSetOf(bonds: BondSource["bonds"], duration: number, sig: string, results: PositionResult[]): StoredBands {
  const cfg = specConfig();
  const byCand = new Map<string, BandCand>(specCandidates(bonds, duration).map((c) => [c.b.isin, c]));
  const bands: StoredBand[] = cfg.bands.map((band) => {
    const r = results.find((x) => x.position === band.k);
    const sel = r?.metrics ? r.isins.map((i) => byCand.get(i)) : [];
    if (!r || !r.metrics || sel.length !== 10 || sel.some((c) => !c)) {
      // INFEASIBLE is a real limit of the rules; anything else (error, time limit, missing result) is a failed calculation and keeps the snapshot from publishing.
      const failed = !r || r.status !== "infeasible";
      return { ...band, status: "none", isins: [], avgRisk: null, ytm: null, el: null, avgDur: null, optimal: false, seconds: r?.seconds ?? 0, reason: r?.failure ?? "No result for this position", ...(failed ? { failed: true } : {}) };
    }
    const m = r.metrics;
    const eff = { netBp: m.netSpreadBp, grossBp: m.grossSpreadBp, lossBp: m.creditLossBp, avgBondBes: m.avgBondBes, portfolioBes: r.portfolioBes.score, besReason: r.portfolioBes.reason };
    return storedOf(band, sel as BandCand[], r.status === "optimal", r.seconds, { ...(r.repeatOf && r.repeatOf !== r.position ? { repeatOf: r.repeatOf } : {}), eff });
  });
  return { sig: sig + "|" + configSignature(cfg), duration, bands, nonMonotonic: [], candidates: { all: 0, kept: 0, perCell: cfg.perCell }, builtAt: new Date().toISOString() };
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
