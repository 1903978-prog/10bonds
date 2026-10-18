import type { PublicBond, RankedBond, Tier } from "./types";
import { RISK_LEVELS } from "./limits";
import { bondNotch } from "./ratings";
import { durationPool, issuerKey } from "./ranking";
import type { ResultRow } from "./tiers";

/** How many bonds per rating step can be cycled with "Change". */
export const PER_LEVEL = 10;

/** The rating step (1..10) a bond belongs to, or null when it is weaker than BB. Unrated bonds sit at step 10. */
export function levelOf(b: PublicBond): number | null {
  const n = bondNotch(b);
  if (n === null) return RISK_LEVELS.length;
  const i = RISK_LEVELS.findIndex((l) => n <= l.maxNotch);
  return i < 0 ? null : i + 1;
}

/**
 * For one target duration, the bonds of each rating step, highest yield first, one per issuer.
 * Each step widens its own duration band (1 to 3 years) until it holds a few issuers.
 */
export function curveByLevel(bonds: PublicBond[], targetDuration: number): { level: number; label: string; bonds: RankedBond[] }[] {
  return RISK_LEVELS.map((l, i) => {
    const level = i + 1;
    const inStep = bonds.filter((b) => levelOf(b) === level);
    const { pool } = durationPool(inStep, targetDuration, 3);
    const sorted = [...pool].sort((a, b) => b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin));
    const seen = new Set<string>();
    const picked = sorted.filter((b) => {
      const k = issuerKey(b);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return {
      level,
      label: l.label,
      bonds: picked.slice(0, PER_LEVEL).map((b, j) => ({ ...b, rank: j + 1, ratingNotch: bondNotch(b), score: 0 })),
    };
  });
}

export type CurvePoint = { level: number; label: string; ytm: number | null; options: ResultRow[]; more: number };

/** Cut each step down to what this tier may see. Visitors see the best bond of each step only, without details. */
export function shapeCurve(curve: ReturnType<typeof curveByLevel>, tier: Tier): CurvePoint[] {
  return curve.map(({ level, label, bonds }) => {
    const ytm = bonds[0]?.grossYtm ?? null;
    const visible = tier === "visitor" ? bonds.slice(0, 1) : bonds;
    const options: ResultRow[] = visible.map((b) => {
      const base: ResultRow = { rank: b.rank, issuer: b.issuer ?? b.name, ytm: b.grossYtm! };
      if (tier === "visitor") return base;
      const rating = b.ratingResolved ?? b.ratingSp ?? b.ratingMoodys ?? b.ratingFitch;
      const free: ResultRow = { ...base, duration: b.modifiedDuration!, rating, country: b.country };
      if (tier === "free") return free;
      return { ...free, name: b.name, isin: b.isin, coupon: b.coupon, maturity: b.maturity };
    });
    return { level, label, ytm, options, more: bonds.length - visible.length };
  });
}
