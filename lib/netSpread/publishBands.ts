import { candidatesOf, type BandCand } from "../coherentFrontier";
import type { BondFilter } from "../bondFilter";
import type { BondSource } from "../bonds";
import { configSignature } from "../riskBands";
import { storedOf, type StoredBand, type StoredBands } from "../riskBandsBuild";
import { bandsKey } from "../riskBandsServe";
import { saveStoredBands } from "../riskBandsStore";
import { TERMS } from "../limits";
import { netSpreadConfig } from "./config";
import { HORIZON_NAMES, type PositionResult } from "./build";

// Methodology 5 is served by the same stored-list path as the banded methodologies (lib/riskBandsServe.ts): after each run the 30 positions of every
// term are written under the Methodology 5 band table, so the finder and the slider read them with no solver. Written together, per term, in one save.

export async function publishBands(src: BondSource, filter: Pick<BondFilter, "currency" | "size">, results: PositionResult[]): Promise<number> {
  const cfg = netSpreadConfig();
  let saved = 0;
  for (const t of TERMS) {
    const horizon = HORIZON_NAMES[t.key];
    const byCand = new Map<string, BandCand>(candidatesOf(src.bonds, t.duration, false).map((c) => [c.b.isin, c]));
    const key = bandsKey(src, filter as BondFilter, t.duration, cfg);
    const bands: StoredBand[] = cfg.bands.map((band) => {
      const r = results.find((x) => x.horizon === horizon && x.position === band.k);
      const sel = r?.metrics ? r.isins.map((i) => byCand.get(i)) : [];
      if (!r || !r.metrics || sel.length !== 10 || sel.some((c) => !c)) return { ...band, status: "none", isins: [], avgRisk: null, ytm: null, el: null, avgDur: null, optimal: false, seconds: r?.seconds ?? 0 };
      const m = r.metrics;
      const eff = { netBp: m.netSpreadBp, grossBp: m.grossSpreadBp, lossBp: m.creditLossBp, avgBondBes: m.avgBondBes, portfolioBes: r.portfolioBes.score, besReason: r.portfolioBes.reason };
      return storedOf(band, sel as BandCand[], r.status === "optimal", r.seconds, { ...(r.repeatOf ? { repeatOf: r.repeatOf } : {}), eff });
    });
    const sb: StoredBands = { sig: key.split("|")[0] + "|" + configSignature(cfg), duration: t.duration, bands, nonMonotonic: [], candidates: { all: 0, kept: 0, perCell: cfg.perCell }, builtAt: new Date().toISOString() };
    await saveStoredBands(key, sb);
    saved++;
  }
  return saved;
}
