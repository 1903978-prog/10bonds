import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";

// Bonds whose yield is far above every comparable bond usually carry a structure the rating of the issuer does not
// describe (subordinated / Tier 2 / AT1 bank debt, hybrids, perpetuals). The copy has no seniority column, so two rules
// leave them out everywhere on the site (Livio, 20/10/2026: "remove outliers as they must have risky structures"):
// 1. The name says so (subordinated, junior, Tier 1/2, AT1, hybrid, perpetual, CoCo).
// 2. Its yield is an outlier among its peers: same currency, same 10BONDS risk score, similar duration. It is left out
//    when it yields more than OUTLIER_MIN_GAP points above the peers' median and more than OUTLIER_MADS times their
//    typical spread (median absolute deviation) above it. Needs at least OUTLIER_MIN_PEERS peers to judge.

export const RISKY_STRUCTURE = /\b(sub|subord|subordinated|jr|junior|perp|perpetual|hybrid|tier ?[12]|t[12]|at1|lt2|coco)\b/i;
export const OUTLIER_MIN_GAP = 1.5;
export const OUTLIER_MADS = 4;
export const OUTLIER_MIN_PEERS = 8;
const PEER_DURATION = 0.2; // ±20% of the bond's duration
const PEER_DURATION_MIN = 1; // but at least ±1 year

export type Outlier = { bond: PublicBond; reason: "name" | "yield"; peerMedian: number | null };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The bonds the two rules leave out, with the reason. */
export function findOutliers(bonds: PublicBond[]): Outlier[] {
  const out: Outlier[] = [];
  const groups = new Map<string, PublicBond[]>();
  for (const b of bonds) {
    if (RISKY_STRUCTURE.test(b.name)) {
      out.push({ bond: b, reason: "name", peerMedian: null });
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
      const med = median(peers);
      const mad = median(peers.map((y) => Math.abs(y - med)));
      if (b.grossYtm! - med > Math.max(OUTLIER_MIN_GAP, OUTLIER_MADS * mad)) out.push({ bond: b, reason: "yield", peerMedian: med });
    }
  }
  return out;
}

/** Every bond except the outliers. */
export function dropOutliers(bonds: PublicBond[]): PublicBond[] {
  const gone = new Set(findOutliers(bonds).map((o) => o.bond.isin));
  return gone.size ? bonds.filter((b) => !gone.has(b.isin)) : bonds;
}
