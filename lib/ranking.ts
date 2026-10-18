import type { PublicBond, RankedBond } from "./types";
import { cleanIssuer } from "./issuer";
import { bondNotch } from "./ratings";

export const RESULT_COUNT = 10;

// How much one rating notch weighs against one percentage point of yield gap.
// AAA = 0, BBB- = 9: a BBB- bond needs to sit 0.18 points closer to the target to beat an AAA one.
// Kept small so the bond closest to the target yield comes first; the rating only decides near-ties.
export const NOTCH_PENALTY = 0.02;
// Bonds with no rating are treated as just below investment grade.
export const UNRATED_NOTCH = 10;

const START_BAND = 1; // years either side of the target duration
const MAX_BAND = 3;

/**
 * Top bonds for a target duration and yield.
 * 1. Keep bonds whose duration is within 1 year of the target (widen up to 3 years until 10 are found).
 * 2. Score = |yield - target yield| + 0.02 x rating notch. Lower is better.
 * 3. Best 10 scores win, at most one bond per issuer (each issuer's best-scored bond).
 */
export function rankBonds(bonds: PublicBond[], targetDuration: number, targetYtm: number, count = RESULT_COUNT): { results: RankedBond[]; band: number } {
  const { pool, band } = durationPool(bonds, targetDuration, count);

  const scored = pool.map((b) => {
    const ratingNotch = bondNotch(b);
    const notch = ratingNotch ?? UNRATED_NOTCH;
    const score = Math.abs(b.grossYtm! - targetYtm) + NOTCH_PENALTY * notch;
    return { ...b, ratingNotch, score };
  });

  scored.sort((a, b) => a.score - b.score || b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin));

  const seen = new Set<string>();
  const onePerIssuer = scored.filter((b) => {
    const k = issuerKey(b);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    results: onePerIssuer.slice(0, count).map((b, i) => ({ ...b, rank: i + 1 })),
    band,
  };
}

/** One key per issuer: bond terms, seat, legal form, case and punctuation do not make a different issuer. */
export function issuerKey(b: Pick<PublicBond, "issuer" | "isin">): string {
  const name = cleanIssuer(b.issuer);
  if (!name) return `isin:${b.isin}`;
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?\s?a|ag|se|n\.?v|b\.?v|plc|s\.p\.a|spa|gmbh|ltd|inc|oyj|asa|ab)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() || `isin:${b.isin}`;
}

/** Bonds within 1 year of the target duration, widened in half-years (up to 3) until `count` different issuers are in. */
export function durationPool(bonds: PublicBond[], targetDuration: number, count = RESULT_COUNT): { pool: PublicBond[]; band: number } {
  const usable = bonds.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null);
  let band = START_BAND;
  let pool = usable.filter((b) => Math.abs(b.modifiedDuration! - targetDuration) <= band);
  while (distinctIssuers(pool) < count && band < MAX_BAND) {
    band += 0.5;
    pool = usable.filter((b) => Math.abs(b.modifiedDuration! - targetDuration) <= band);
  }
  return { pool, band };
}

/**
 * The highest yield worth asking for at each duration step of the slider: the best yield among the bonds
 * the ranking would look at for that duration, rounded up to the slider step. Null when no bond is there.
 */
export function ytmCaps(bonds: PublicBond[], limits: { min: number; max: number; step: number }, ytmLimits: { min: number; max: number; step: number }): Record<string, number | null> {
  const caps: Record<string, number | null> = {};
  for (let d = limits.min; d <= limits.max + 1e-9; d += limits.step) {
    const { pool } = durationPool(bonds, d);
    const key = String(Math.round(d * 100) / 100);
    if (!pool.length) {
      caps[key] = null;
      continue;
    }
    const best = Math.max(...pool.map((b) => b.grossYtm!));
    const up = Math.ceil(best / ytmLimits.step - 1e-9) * ytmLimits.step;
    caps[key] = Math.round(Math.min(ytmLimits.max, Math.max(ytmLimits.min + ytmLimits.step, up)) * 10) / 10;
  }
  return caps;
}

const distinctIssuers = (rows: PublicBond[]) => new Set(rows.map(issuerKey)).size;

export function averages(rows: RankedBond[]) {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return {
    ytm: avg(rows.map((r) => r.grossYtm!)),
    duration: avg(rows.map((r) => r.modifiedDuration!)),
    notch: avg(rows.filter((r) => r.ratingNotch !== null).map((r) => r.ratingNotch!)),
  };
}
