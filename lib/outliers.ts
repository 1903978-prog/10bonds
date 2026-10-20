import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";

// Bonds whose yield is far above every comparable bond usually carry a structure the rating of the issuer does not
// describe (subordinated / Tier 2 / AT1 bank debt, hybrids, perpetuals). The copy has no seniority column, so two rules
// leave them out everywhere on the site, before any ranking, Pareto or frontier step (the owner, 20/10/2026):
// 1. The name says so (subordinated, junior, Tier 1/2, AT1, hybrid, perpetual, CoCo).
// 2. Statistical outlier: its yield is more than k standard deviations above the average yield of its cohort (same
//    currency, same 10BONDS risk score, duration within ±20% or ±1 year, the bond itself not counted). k is set by the
//    admin (yellow slider, 0.5 to 5, default 2). Needs at least OUTLIER_MIN_PEERS bonds in the cohort to judge.

export const RISKY_STRUCTURE = /\b(sub|subord|subordinated|jr|junior|perp|perpetual|hybrid|tier ?[12]|t[12]|at1|lt2|coco)\b/i;
export const OUTLIER_SD = { min: 0.5, max: 5, step: 0.1, default: 2 };
export const OUTLIER_MIN_PEERS = 8;
const PEER_DURATION = 0.2; // ±20% of the bond's duration
const PEER_DURATION_MIN = 1; // but at least ±1 year

export type Outlier = { bond: PublicBond; reason: "name" | "yield"; peerMean: number | null; peerSd: number | null };

/** A valid number of standard deviations, or the default. */
export function cleanSd(v: unknown): number {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || !Number.isFinite(n)) return OUTLIER_SD.default;
  return Math.round(Math.min(OUTLIER_SD.max, Math.max(OUTLIER_SD.min, n)) * 10) / 10;
}

/** The bonds the two rules leave out, with the reason. */
export function findOutliers(bonds: PublicBond[], sd = OUTLIER_SD.default): Outlier[] {
  const k = cleanSd(sd);
  const out: Outlier[] = [];
  const groups = new Map<string, PublicBond[]>();
  for (const b of bonds) {
    if (RISKY_STRUCTURE.test(b.name)) {
      out.push({ bond: b, reason: "name", peerMean: null, peerSd: null });
      continue;
    }
    const risk = bondRisk(b);
    if (risk === null || b.grossYtm === null || b.modifiedDuration === null) continue;
    const key = `${b.currency}|${risk}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(b);
  }
  for (const group of groups.values()) {
    for (const b of group) {
      const d = b.modifiedDuration!;
      const band = Math.max(PEER_DURATION_MIN, PEER_DURATION * d);
      const peers = group.filter((p) => p !== b && Math.abs(p.modifiedDuration! - d) <= band).map((p) => p.grossYtm!);
      if (peers.length < OUTLIER_MIN_PEERS) continue;
      const mean = peers.reduce((s, y) => s + y, 0) / peers.length;
      const sdev = Math.sqrt(peers.reduce((s, y) => s + (y - mean) ** 2, 0) / peers.length);
      if (b.grossYtm! > mean + k * sdev + 1e-9) out.push({ bond: b, reason: "yield", peerMean: mean, peerSd: sdev });
    }
  }
  return out;
}

/** Every bond except the outliers. */
export function dropOutliers(bonds: PublicBond[], sd = OUTLIER_SD.default): PublicBond[] {
  const gone = new Set(findOutliers(bonds, sd).map((o) => o.bond.isin));
  return gone.size ? bonds.filter((b) => !gone.has(b.isin)) : bonds;
}
