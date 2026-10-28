import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";
import { isExcludedRank } from "./seniority";
import { riskParams } from "./riskPremium/params";

// Bonds whose yield is far above every comparable bond usually carry a structure the rating of the issuer does not
// describe (subordinated / Tier 2 / AT1 bank debt, hybrids, perpetuals). Three rules
// leave them out everywhere on the site, before any ranking, Pareto or frontier step (the owner, 20/10/2026):
// 0. The seniority field says so (subordinated, junior, hybrid, AT1, CoCo, Tier 1/2, perpetual; lib/seniority.ts, 25/10/2026).
// 1. The name says so (subordinated, junior, Tier 1/2, AT1, hybrid, perpetual, CoCo).
// 2. Statistical outlier: its yield is more than k standard deviations (and at least OUTLIER_MIN_GAP points) above the average yield of its cohort (same
//    currency, same 10BONDS risk score, duration within ±20% or ±1 year, the bond itself not counted). k is set by the
//    admin (yellow slider, 0.5 to 5, default 2). Needs at least OUTLIER_MIN_PEERS bonds in the cohort to judge.

export const RISKY_STRUCTURE = /\b(sub|subord|subordinated|jr|junior|perp|perpetual|hybrid|tier ?[12]|t[12]|at1|lt2|coco)\b/i;
export const OUTLIER_SD = { min: 0.5, max: 5, step: 0.1, default: 2 };
export const OUTLIER_MIN_PEERS = 8; // default; the live value is riskParams().outlierMinPeers
const PEER_DURATION_MIN = 1; // but at least ±1 year
/** Percentage points a yield must also sit above the cohort average, so near-identical peers (tiny standard deviation) cannot flag a bond (EBRD, 28/10/2026). */
export const OUTLIER_MIN_GAP = 1;

export type Outlier = { bond: PublicBond; reason: "name" | "rank" | "yield"; peerMean: number | null; peerSd: number | null };

/** A valid number of standard deviations, or the default. */
export function cleanSd(v: unknown): number {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || !Number.isFinite(n)) return OUTLIER_SD.default;
  return Math.round(Math.min(OUTLIER_SD.max, Math.max(OUTLIER_SD.min, n)) * 10) / 10;
}

/**
 * The yields the bond is judged against, or null when there are too few comparable bonds. Same currency, same risk score, duration within the
 * share set by the admin (at least 1 year). A thin cohort (high risk scores and short bonds often are) used to mean "not judged", so a very
 * high yield passed (BCP V Modular Services Finance II 4.75% 2028, risk 8, 10.77%, 28/10/2026). With `widen` the cohort grows in two steps
 * until it is big enough: first a duration window twice as wide, then the neighbouring risk scores (one up, one down) as well.
 */
function cohortYields(b: PublicBond, group: PublicBond[], groups: Map<string, PublicBond[]>, widen: boolean): number[] | null {
  const need = riskParams().outlierMinPeers;
  const d = b.modifiedDuration!;
  const risk = bondRisk(b)!;
  const near = (from: PublicBond[], scale: number) => {
    const band = Math.max(PEER_DURATION_MIN, riskParams().peerDuration * d * scale);
    return from.filter((p) => p !== b && Math.abs(p.modifiedDuration! - d) <= band).map((p) => p.grossYtm!);
  };
  const same = near(group, 1);
  if (same.length >= need || !widen) return same.length >= need ? same : null;
  const wider = near(group, 2);
  if (wider.length >= need) return wider;
  const around = [risk - 1, risk, risk + 1].flatMap((r) => groups.get(`${b.currency}|${r}`) ?? []);
  const widest = near(around, 2);
  return widest.length >= need ? widest : null;
}

/** The bonds the rules leave out, with the reason. */
export function findOutliers(bonds: PublicBond[], sd = OUTLIER_SD.default, widen = true): Outlier[] {
  const k = cleanSd(sd);
  const out: Outlier[] = [];
  const groups = new Map<string, PublicBond[]>();
  for (const b of bonds) {
    // The seniority field decides first (subordinated, junior, hybrid, AT1, CoCo, Tier 1/2, perpetual), then the name.
    if (isExcludedRank(b)) {
      out.push({ bond: b, reason: "rank", peerMean: null, peerSd: null });
      continue;
    }
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
      const peers = cohortYields(b, group, groups, widen);
      if (!peers) continue;
      const mean = peers.reduce((s, y) => s + y, 0) / peers.length;
      const sdev = Math.sqrt(peers.reduce((s, y) => s + (y - mean) ** 2, 0) / peers.length);
      if (b.grossYtm! > mean + Math.max(k * sdev, OUTLIER_MIN_GAP) + 1e-9) out.push({ bond: b, reason: "yield", peerMean: mean, peerSd: sdev });
    }
  }
  return out;
}

/** Every bond except the outliers. */
export function dropOutliers(bonds: PublicBond[], sd = OUTLIER_SD.default): PublicBond[] {
  const gone = new Set(findOutliers(bonds, sd).map((o) => o.bond.isin));
  return gone.size ? bonds.filter((b) => !gone.has(b.isin)) : bonds;
}
