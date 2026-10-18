import type { PublicBond, RankedBond } from "./types";
import { cleanIssuer } from "./issuer";
import { bondNotch } from "./ratings";
import { riskLevel, LIMITS } from "./limits";

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
export function rankBonds(bonds: PublicBond[], targetDuration: number, targetYtm: number, count = RESULT_COUNT, risk: number = LIMITS.risk.max): { results: RankedBond[]; band: number } {
  const { pool, band } = durationPool(withinRisk(bonds, risk), targetDuration, count);

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

/** Bonds rated equal to or better than the slider level. Unrated bonds only at the last level. */
export function withinRisk(bonds: PublicBond[], risk: number): PublicBond[] {
  const { maxNotch, allowUnrated } = riskLevel(risk);
  return bonds.filter((b) => {
    const n = bondNotch(b);
    return n === null ? allowUnrated : n <= maxNotch;
  });
}

/** Yield caps per duration step for every risk level: { "1": {...}, ..., "10": {...} }. */
export function ytmCapsByRisk(bonds: PublicBond[], durLimits: { min: number; max: number; step: number }, ytmLimits: { min: number; max: number; step: number }) {
  const out: Record<string, Record<string, number | null>> = {};
  for (let r = LIMITS.risk.min; r <= LIMITS.risk.max; r++) out[String(r)] = ytmCaps(withinRisk(bonds, r), durLimits, ytmLimits);
  return out;
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
 * The highest target yield worth asking for at each duration step: the average yield of the best bond of each of the
 * 10 highest-yielding issuers the ranking would look at for that duration (fewer when fewer issuers exist),
 * rounded down to the slider step so the top 10 can really reach it. Null when no bond is there.
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
    const bestPerIssuer = new Map<string, number>();
    for (const b of pool) {
      const k = issuerKey(b);
      bestPerIssuer.set(k, Math.max(bestPerIssuer.get(k) ?? -Infinity, b.grossYtm!));
    }
    const top = [...bestPerIssuer.values()].sort((a, b) => b - a).slice(0, RESULT_COUNT);
    const avg = top.reduce((s, x) => s + x, 0) / top.length;
    const down = Math.floor(avg / ytmLimits.step + 1e-9) * ytmLimits.step;
    caps[key] = Math.round(Math.min(ytmLimits.max, Math.max(ytmLimits.min + ytmLimits.step, down)) * 10) / 10;
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
