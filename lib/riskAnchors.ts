// The risk positions of the portfolio spec (owner, 28/10/2026, anchored bands). Pure arithmetic, no data and no solver.
//   Portfolio 30 = the list with the HIGHEST average risk under every rule (R30), portfolio 1 = the LOWEST (R1); both then take the highest net spread.
//   Portfolios 2..29 sit between them: target T(n) = R1 + (R30 - R1) (n - 1) / 29. Band n runs from the midpoint of T(n-1) and T(n) up to, but not
//   including, the midpoint of T(n) and T(n+1) on the 0.1 grid. The ten bond risk classes are whole numbers, so the average of a list is a multiple
//   of 0.1 and everything here is counted in TENTHS (sum of the ten classes). The classes a list may hold are the 3-class window around T(n).
export const POSITIONS = 30;
export const ANCHORS_VERSION = "ab1-2026-10-28";
export const MAX_RISK_SPREAD = 2;
/** Classes a list may hold: three consecutive classes (max - min <= 2). */
export const WINDOW_WIDTH = 3;

export type AnchorBand = {
  position: number;
  /** Sum of the ten bond risk classes (= average risk in tenths) the list must have, inclusive. */
  sumLo: number; sumHi: number;
  /** Allowed bond risk classes, 3 consecutive (lo..lo+2). */
  classLo: number; classHi: number;
  /** Target T(n) in tenths. */
  target: number;
};

export type AnchorTable = { r1: number; r30: number; bands: AnchorBand[] };

const tenths = (x: number) => Math.round(x * 10 + 1e-9);
/** Window of three classes around a target (in tenths): lo = max(1, round(T) - 1), lo + 2 at most 10. */
export function windowAround(targetTenths: number): { lo: number; hi: number } {
  const lo = Math.min(8, Math.max(1, Math.round(targetTenths / 10 + 1e-9) - 1));
  return { lo, hi: lo + WINDOW_WIDTH - 1 };
}

/** The 30 bands from the two anchors, given as sums of ten classes (tenths of average risk). `r1` <= `r30`. */
export function anchoredBands(r1: number, r30: number): AnchorTable {
  const t = (n: number) => r1 + ((r30 - r1) * (n - 1)) / (POSITIONS - 1);
  // Boundary between n and n+1 on the 0.1 grid (half up), for n = 1..29.
  const cut = (n: number) => Math.floor((t(n) + t(n + 1)) / 2 + 0.5 + 1e-9);
  const bands: AnchorBand[] = [];
  for (let n = 1; n <= POSITIONS; n++) {
    let lo = n === 1 ? r1 : cut(n - 1);
    let hi = n === POSITIONS ? r30 : cut(n) - 1;
    // A range too narrow for 0.1 steps: the band is the single tenth nearest its target (neighbouring bands then repeat the same list).
    if (hi < lo) { lo = hi = Math.min(r30, Math.max(r1, Math.round(t(n)))); }
    const w = windowAround(t(n));
    bands.push({ position: n, sumLo: lo, sumHi: hi, classLo: w.lo, classHi: w.hi, target: Math.round(t(n) * 100) / 100 });
  }
  return { r1, r30, bands };
}

/** Average risk label of a band, e.g. "3.4 - 3.7" (one value when it is a single tenth). */
export const bandLabel = (b: { sumLo: number; sumHi: number }) => (b.sumLo === b.sumHi ? (b.sumLo / 10).toFixed(1) : `${(b.sumLo / 10).toFixed(1)} - ${(b.sumHi / 10).toFixed(1)}`);
export { tenths };
