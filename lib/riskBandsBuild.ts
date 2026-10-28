import type { PublicBond, RankedBond } from "./types";
import { activePolicy } from "./coherence";
import { candidatesOf, type BandCand } from "./coherentFrontier";
import { bondNotch } from "./ratings";
import { lossAdjustedYield } from "./expectedLoss";
import { lgdOf } from "./seniority";
import { UNRATED_NOTCH } from "./ranking";
import { isSovereignBond } from "./sovereign";
import { configSignature, defaultConfig, inClasses, nonMonotonic, pruneCandidates, statOf, type BandConfig, type Rules } from "./riskBands";
import { solveBand } from "./riskBandsSolve";

// Works out and shapes the 30 stored band portfolios of one horizon (owner, 27/10/2026): run by the precompute job after each data copy,
// read by the website.

/** Methodology 5 only: the portfolio's economic figures (bp per year, equal weight) and its Portfolio BES (null = unavailable, with the reason). */
export type PortfolioEff = { netBp: number; grossBp: number; lossBp: number; avgBondBes: number | null; portfolioBes: number | null; besReason: string | null; stale?: boolean };
export type StoredBand = {
  k: number; min: number; max: number;
  /** "none" = no list of 10 exists for this band (shown as "No portfolio for this risk level"). */
  status: "ok" | "none";
  isins: string[];
  /** Average risk score of the list, to 0.1; average return (% per year); expected loss on your money (%); average duration (years). */
  avgRisk: number | null; ytm: number | null; el: number | null; avgDur: number | null;
  /** True only when the solver proved the list best for the band (highest yield, then lowest loss). */
  optimal: boolean;
  /** Notes: the sector cap had to be lifted for this band / the list needed bonds outside the pruned candidate set. */
  sectorCapLifted?: boolean;
  outsideCandidates?: boolean;
  /** Methodology 4: lowest and highest bond risk class in the list, and the earlier position that holds exactly this list (a repeat, not a new result). */
  minRisk?: number; maxRisk?: number; repeatOf?: number;
  seconds: number;
  eff?: PortfolioEff;
};
export type StoredBands = {
  sig: string; duration: number;
  bands: StoredBand[];
  /** Bands whose average yield is lower than an earlier band's (flagged, not hidden). */
  nonMonotonic: number[];
  candidates: { all: number; kept: number; perCell: number };
  builtAt: string;
};

export const rulesFor = (duration: number, p = activePolicy()): Rules => ({ perIssuer: p.maxPerIssuer, perSector: p.maxPerSector, duration });
export const r2 = (x: number) => Math.round(x * 100) / 100;
export const r3 = (x: number) => Math.round(x * 1000) / 1000;
const r1 = (x: number) => Math.round(x * 10) / 10;

export function storedOf(band: { k: number; min: number; max: number }, sel: BandCand[], optimal: boolean, seconds: number, extra: Partial<StoredBand> = {}): StoredBand {
  const s = statOf(sel);
  return { ...band, status: "ok", isins: sel.map((c) => c.b.isin).sort(), minRisk: Math.min(...sel.map((c) => c.cls)), maxRisk: Math.max(...sel.map((c) => c.cls)), avgRisk: r1(s.avgRisk), ytm: r2(s.ytm), el: r3(s.el), avgDur: r2(s.avgDur), optimal, seconds, ...extra };
}

/** All 30 bands for one horizon over the bonds given (already filtered like the live engine: rated only, outliers out, minimum order). */
export async function buildBands(bonds: PublicBond[], duration: number, config: BandConfig = defaultConfig(), sigOf = ""): Promise<StoredBands> {
  const every = candidatesOf(bonds, duration, false);
  const keptEvery = pruneCandidates(every, config.perCell);
  const rules = rulesFor(duration);
  const bands: StoredBand[] = [];
  for (const b of config.bands) {
    // Methodology 4: only bonds whose own risk class the matrix allows for this position.
    const all = b.allowed ? every.filter((c) => inClasses(b, c.cls)) : every;
    const kept = b.allowed ? pruneCandidates(all, config.perCell) : keptEvery;
    let r = await solveBand(kept, b, rules, { step: b.step });
    let outside = false, lifted = false;
    if (r.status === "infeasible") { r = await solveBand(all, b, rules, { step: b.step }); outside = r.status !== "infeasible"; }
    if (r.status === "infeasible") { r = await solveBand(all, b, { ...rules, perSector: 10 }, { step: b.step }); lifted = r.status !== "infeasible"; }
    if (r.status === "infeasible" || !r.sel.length) {
      bands.push({ ...b, status: "none", isins: [], avgRisk: null, ytm: null, el: null, avgDur: null, optimal: false, seconds: r.seconds });
      continue;
    }
    bands.push(storedOf(b, r.sel, r.status === "optimal", r.seconds, { ...(lifted ? { sectorCapLifted: true } : {}), ...(outside ? { outsideCandidates: true } : {}) }));
  }
  const seen = new Map<string, number>();
  for (const b of bands) if (b.status === "ok") { const k = b.isins.join(","); const first = seen.get(k); if (first) b.repeatOf = first; else seen.set(k, b.k); }
  return { sig: sigOf + "|" + configSignature(config), duration, bands, nonMonotonic: nonMonotonic(bands.map((b) => b.ytm)), candidates: { all: every.length, kept: keptEvery.length, perCell: config.perCell }, builtAt: new Date().toISOString() };
}

/** The ranked rows the finder shows for a stored list (same shape as lib/coherentFrontier.ts lists), best loss-adjusted score first. */
export function rowsOf(bonds: PublicBond[]): RankedBond[] {
  return bonds
    .map((b) => ({ ...b, ratingNotch: bondNotch(b), score: lossAdjustedYield(b.grossYtm!, bondNotch(b) ?? UNRATED_NOTCH, b.modifiedDuration!, lgdOf(b), isSovereignBond(b)), rank: 0 }))
    .sort((a, b) => b.score - a.score || b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin))
    .map((x, i) => ({ ...x, rank: i + 1 }));
}
