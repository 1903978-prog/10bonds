import type { PublicBond, RankedBond, Tier } from "./types";
import { RISK_LEVELS } from "./limits";
import { bondNotch, bondRisk } from "./ratings";
import { durationPool, issuerKey } from "./ranking";
import type { ResultRow } from "./tiers";

/** How many bonds per rating step can be cycled with "Change". */
export const PER_LEVEL = 10;

/** The risk score (1..10) a bond belongs to, or null when unrated or in default (never shown). */
export function levelOf(b: PublicBond): number | null {
  return bondRisk(b);
}

/**
 * For one target duration, the bonds of each rating step, highest yield first, one per issuer.
 * Each step widens its own duration band (1 to 3 years) until it holds a few issuers.
 */
export function curveByLevel(bonds: PublicBond[], targetDuration: number): { level: number; label: string; bonds: RankedBond[] }[] {
  return RISK_LEVELS.map((l, i) => {
    const level = i + 1;
    const inStep = bonds.filter((b) => levelOf(b) === level);
    let { pool } = durationPool(inStep, targetDuration, 3);
    // Nothing within 3 years: take the bonds of this step nearest to the horizon instead, so every risk score keeps
    // its best bond (Livio, 19/10/2026). The chart marks such a point with the bond's own duration.
    if (!pool.length) {
      const usable = inStep.filter((b) => b.grossYtm !== null && b.modifiedDuration !== null);
      const gap = (b: PublicBond) => Math.abs(b.modifiedDuration! - targetDuration);
      const nearest = Math.min(...usable.map(gap));
      pool = usable.filter((b) => gap(b) <= nearest + 1);
    }
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

/** Beyond this many years from the horizon a point is labelled with its bond's own duration. */
export const FAR_GAP = 3;

/** `far`: the best bond of the step is more than FAR_GAP years from the horizon; `duration` is then its duration. */
export type CurvePoint = { level: number; label: string; ytm: number | null; options: ResultRow[]; more: number; far?: boolean; duration?: number };

/** Cut each step down to what this tier may see. Visitors see the best bond of each step only, without details. */
export function shapeCurve(curve: ReturnType<typeof curveByLevel>, tier: Tier, targetDuration?: number): CurvePoint[] {
  return curve.map(({ level, label, bonds }) => {
    const ytm = bonds[0]?.grossYtm ?? null;
    const visible = tier === "visitor" ? bonds.slice(0, 1) : bonds;
    const options: ResultRow[] = visible.map((b) => {
      const base: ResultRow = { rank: b.rank, issuer: b.issuer ?? b.name, ytm: b.grossYtm! };
      if (tier === "visitor") return base;
      const free: ResultRow = { ...base, duration: b.modifiedDuration!, risk: bondRisk(b), country: b.country, minInvestment: b.minInvestment ?? null };
      if (tier === "free") return free;
      return { ...free, name: b.name, isin: b.isin, coupon: b.coupon, maturity: b.maturity };
    });
    const best = bonds[0]?.modifiedDuration;
    const far = targetDuration !== undefined && best != null && Math.abs(best - targetDuration) > FAR_GAP;
    return { level, label, ytm, options, more: bonds.length - visible.length, ...(far ? { far, duration: Math.round(best * 10) / 10 } : {}) };
  });
}
