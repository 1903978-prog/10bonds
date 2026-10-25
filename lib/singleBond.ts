import type { PublicBond, RankedBond, Tier } from "./types";
import { RISK_LEVELS, nearHorizon } from "./limits";
import { bondNotch, bondRisk, riskBand } from "./ratings";
import { issuerKey } from "./ranking";
import { lossAdjustedYield } from "./expectedLoss";
import { lgdOf } from "./seniority";
import { tierFeatures, type ResultRow } from "./tiers";

/** How many bonds per rating step can be cycled with "Change". */
export const PER_LEVEL = 10;

/** The risk score (1..10) a bond belongs to, or null when unrated or in default (never shown). */
export function levelOf(b: PublicBond): number | null {
  return bondRisk(b);
}

/** A bond fits the horizon when its duration is within this share of it (5 years: 4 to 6). The owner, 19/10/2026. */
export const DURATION_TOLERANCE = 0.2;

/**
 * For one target duration, the bonds of each rating step, highest yield after expected losses first, one per issuer.
 * Only bonds within ±20% of the horizon count; a step with none shows "no bond".
 */
export function curveByLevel(bonds: PublicBond[], targetDuration: number): { level: number; label: string; bonds: RankedBond[] }[] {
  const band = targetDuration * DURATION_TOLERANCE + 1e-9;
  return RISK_LEVELS.map((l, i) => {
    const level = i + 1;
    const pool = bonds.filter(
      (b) => levelOf(b) === level && b.grossYtm !== null && b.modifiedDuration !== null && nearHorizon(b.modifiedDuration, targetDuration, band),
    );
    const adj = new Map(pool.map((b) => [b.isin, lossAdjustedYield(b.grossYtm!, bondNotch(b)!, b.modifiedDuration!, lgdOf(b))]));
    const sorted = [...pool].sort((a, b) => adj.get(b.isin)! - adj.get(a.isin)! || b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin));
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
      bonds: picked.slice(0, PER_LEVEL).map((b, j) => ({ ...b, rank: j + 1, ratingNotch: bondNotch(b), score: adj.get(b.isin)! })),
    };
  });
}

// adj: the step's best yield after expected losses, used to judge whether more risk pays more.
export type CurvePoint = { level: number; label: string; ytm: number | null; adj?: number | null; options: ResultRow[]; more: number; band?: string };

/** Cut each step down to what this tier may see. Visitors see the best bond of each step only, without details. */
/** `admin`: also add each bond's S&P grade (admin only, never for customers). */
/** `details`: ISIN, name, coupon and the other facts (plans with the "isin" feature, lib/features.ts). */
export function shapeCurve(curve: ReturnType<typeof curveByLevel>, tier: Tier, admin = false, details = tierFeatures(tier).includes("isin")): CurvePoint[] {
  return curve.map(({ level, label, bonds }) => {
    const ytm = bonds[0]?.grossYtm ?? null;
    const adj = bonds[0] ? Math.round(bonds[0].score * 1000) / 1000 : null;
    const visible = tier === "visitor" ? bonds.slice(0, 1) : bonds;
    const options: ResultRow[] = visible.map((b) => {
      const base: ResultRow = { rank: b.rank, issuer: b.issuer ?? b.name, ytm: b.grossYtm! };
      if (tier === "visitor") return base;
      const free: ResultRow = { ...base, duration: b.modifiedDuration!, risk: bondRisk(b), country: b.country, minInvestment: b.minInvestment ?? null };
      if (!details && !admin) return free;
      const paid: ResultRow = { ...free, name: b.name, isin: b.isin, coupon: b.coupon, maturity: b.maturity,
        currency: b.currency, couponType: b.couponType ?? null, seniority: b.seniority ?? null, issueDate: b.issueDate ?? null, callable: b.callable ?? null };
      return admin ? { ...paid, sp: b.ratingSp?.trim() || null, low52w: b.low52w ?? null, high52w: b.high52w ?? null } : paid;
    });
    return { level, label, ytm, adj, options, more: bonds.length - visible.length, ...(admin ? { band: riskBand(level) } : {}) };
  });
}
