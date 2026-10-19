import type { PublicBond, RankedBond, Tier } from "./types";
import { RISK_LEVELS } from "./limits";
import { bondNotch, bondRisk } from "./ratings";
import { issuerKey } from "./ranking";
import type { ResultRow } from "./tiers";

/** How many bonds per rating step can be cycled with "Change". */
export const PER_LEVEL = 10;

/** The risk score (1..10) a bond belongs to, or null when unrated or in default (never shown). */
export function levelOf(b: PublicBond): number | null {
  return bondRisk(b);
}

/** A bond fits the horizon when its duration is within this share of it (5 years: 4 to 6). Livio, 19/10/2026. */
export const DURATION_TOLERANCE = 0.2;

/**
 * For one target duration, the bonds of each rating step, highest yield first, one per issuer.
 * Only bonds within ±20% of the horizon count; a step with none shows "no bond".
 */
export function curveByLevel(bonds: PublicBond[], targetDuration: number): { level: number; label: string; bonds: RankedBond[] }[] {
  const band = targetDuration * DURATION_TOLERANCE + 1e-9;
  return RISK_LEVELS.map((l, i) => {
    const level = i + 1;
    const pool = bonds.filter(
      (b) => levelOf(b) === level && b.grossYtm !== null && b.modifiedDuration !== null && Math.abs(b.modifiedDuration - targetDuration) <= band,
    );
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
      const free: ResultRow = { ...base, duration: b.modifiedDuration!, risk: bondRisk(b), country: b.country, minInvestment: b.minInvestment ?? null };
      if (tier === "free") return free;
      return { ...free, name: b.name, isin: b.isin, coupon: b.coupon, maturity: b.maturity };
    });
    return { level, label, ytm, options, more: bonds.length - visible.length };
  });
}
