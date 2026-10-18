import type { PublicBond, RankedBond } from "./types";
import { bondNotch } from "./ratings";

export const RESULT_COUNT = 10;

// How much one rating notch weighs against one percentage point of yield gap.
// AAA = 0, BBB- = 9: a BBB- bond needs to sit 0.9 points closer to the target to beat an AAA one.
export const NOTCH_PENALTY = 0.1;
// Bonds with no rating are treated as just below investment grade.
export const UNRATED_NOTCH = 10;

const START_BAND = 1; // years either side of the target duration
const MAX_BAND = 3;

/**
 * Top bonds for a target duration and yield.
 * 1. Keep bonds whose duration is within 1 year of the target (widen up to 3 years until 10 are found).
 * 2. Score = |yield - target yield| + 0.1 x rating notch. Lower is better.
 * 3. Best 10 scores win.
 */
export function rankBonds(bonds: PublicBond[], targetDuration: number, targetYtm: number, count = RESULT_COUNT): { results: RankedBond[]; band: number } {
  const usable = bonds.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null);

  let band = START_BAND;
  let pool = usable.filter((b) => Math.abs(b.modifiedDuration! - targetDuration) <= band);
  while (pool.length < count && band < MAX_BAND) {
    band += 0.5;
    pool = usable.filter((b) => Math.abs(b.modifiedDuration! - targetDuration) <= band);
  }

  const scored = pool.map((b) => {
    const ratingNotch = bondNotch(b);
    const notch = ratingNotch ?? UNRATED_NOTCH;
    const score = Math.abs(b.grossYtm! - targetYtm) + NOTCH_PENALTY * notch;
    return { ...b, ratingNotch, score };
  });

  scored.sort((a, b) => a.score - b.score || b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin));

  return {
    results: scored.slice(0, count).map((b, i) => ({ ...b, rank: i + 1 })),
    band,
  };
}

export function averages(rows: RankedBond[]) {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return {
    ytm: avg(rows.map((r) => r.grossYtm!)),
    duration: avg(rows.map((r) => r.modifiedDuration!)),
    notch: avg(rows.filter((r) => r.ratingNotch !== null).map((r) => r.ratingNotch!)),
  };
}
