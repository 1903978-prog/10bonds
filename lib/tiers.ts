import type { PublicBond, RankedBond, Tier } from "./types";
import { averages, RESULT_COUNT, UNRATED_NOTCH } from "./ranking";
import { averageRisk, bondNotch, bondRisk } from "./ratings";
import { bondLossChance, listLifeLoss, lossAdjustedYield } from "./expectedLoss";
import { lifeYears } from "./lifeYears";
import { defaultMatrix, featuresOf, type FeatureKey } from "./features";


export type ResultRow = {
  rank: number;
  issuer: string;
  // Visitors: the issuer is left out ("") and the page shows a blurred placeholder.
  hidden?: boolean;
  ytm: number;
  // Signed-in accounts.
  duration?: number;
  risk?: number | null; // 10BONDS risk score 1..10, never an agency grade
  country?: string | null;
  minInvestment?: number | null;
  // Plans with the "isin" feature only (lib/features.ts): never sent to the others.
  name?: string;
  isin?: string;
  coupon?: number | null;
  maturity?: string | null;
  currency?: string;
  couponType?: string | null;
  seniority?: string | null;
  issueDate?: string | null;
  callable?: boolean | null;
  // Admin only (the owner): the S&P grade, never sent to anyone else.
  sp?: string | null;
  // Admin only: the data supplier's 52-week price low and high (never sent to anyone else: data supplier rights).
  low52w?: number | null;
  high52w?: number | null;
  // With "isin", when the risk-adjusted ranking is on: the figures behind the rank (no agency grade).
  why?: RiskWhy;
  // With "why_table": yield after expected losses, the score behind the "why in or out" table.
  lossAdj?: number;
  // With "portfolio_sim": chance in % the bond defaults before it matures (historical default table), for the list's KPI box.
  pd?: number;
  // With "portfolio_sim": years left until it matures (the horizon of pd), for the admin's calculation box.
  life?: number;
};

/** Why a bond ranks where it does under the risk premium model. bp = basis points; adjYtm is a score, not a yield. */
export type RiskWhy = { spreadBp: number; requiredBp: number; surplusBp: number; adjYtm: number; version: string; asOf: string | null };

type WithRisk = RankedBond & { risk?: { spreadBp: number | null; requiredBp: number | null; surplusBp: number | null; riskAdjustedYtm: number | null; version: string; ytmAsOf: string | null } };
function whyOf(b: WithRisk): RiskWhy | undefined {
  const r = b.risk;
  if (!r || r.spreadBp === null || r.requiredBp === null || r.surplusBp === null || r.riskAdjustedYtm === null) return undefined;
  return { spreadBp: Math.round(r.spreadBp), requiredBp: r.requiredBp, surplusBp: Math.round(r.surplusBp), adjYtm: r.riskAdjustedYtm, version: r.version, asOf: r.ytmAsOf };
}

export type ResultsPayload = {
  tier: Tier;
  rows: ResultRow[];
  lockedCount: number;
  summary: { count: number; avgYtm: number | null; avgDuration: number | null; avgRisk: number | null; lifeLoss: number | null } | null;
};

/** Chance in % the bond defaults before it matures, rounded to 0.001. */
export const pdOf = (b: PublicBond) => Math.round(bondLossChance(bondNotch(b) ?? UNRATED_NOTCH, lifeYears(b)) * 1000) / 1000;

/** Default features of a tier (tests and sample previews); live searches pass the admin's table (lib/planFeatures.ts). */
export const tierFeatures = (tier: Tier): FeatureKey[] => (tier === "visitor" ? [] : featuresOf(defaultMatrix(), tier));

/**
 * Cut the ranked list down to what this tier and these features allow. Done on the server so hidden data never reaches
 * the browser. Visitors see all rows without issuer names; a signed-in account sees the full list, with ISINs ("isin") and the
 * portfolio figures ("portfolio_sim") when its plan has them. `admin`: also each bond's S&P grade (the owner only).
 */
export function shapeForTier(ranked: RankedBond[], tier: Tier, features: FeatureKey[] = tierFeatures(tier), admin = false): ResultsPayload {
  // Visitors (the owner, 24/10/2026): all 10 bonds with return, years and risk, plus the two averages; the issuer is
  // never sent (the page draws a blurred placeholder), so the names stay behind the free account.
  if (tier === "visitor") {
    const top = ranked.slice(0, RESULT_COUNT);
    return {
      tier,
      rows: top.map((b) => ({ rank: b.rank, issuer: "", hidden: true, ytm: b.grossYtm!, duration: b.modifiedDuration!, risk: bondRisk(b) })),
      lockedCount: 0,
      summary: top.length ? { count: top.length, avgYtm: averages(top).ytm, avgDuration: averages(top).duration, avgRisk: averageRisk(top.map(bondRisk)), lifeLoss: listLifeLoss(top.map(pdOf)) } : null,
    };
  }
  const has = new Set(features);
  const avg = averages(ranked);
  return {
    tier,
    rows: ranked.map((b) => ({
      rank: b.rank,
      issuer: b.issuer ?? b.name,
      ytm: b.grossYtm!,
      duration: b.modifiedDuration!,
      risk: bondRisk(b),
      country: b.country,
      minInvestment: b.minInvestment ?? null,
      ...(has.has("isin") ? { name: b.name, isin: b.isin, coupon: b.coupon, maturity: b.maturity, ...(whyOf(b) ? { why: whyOf(b) } : {}) } : {}),
      ...(has.has("portfolio_sim") ? { pd: pdOf(b), life: Math.round(lifeYears(b) * 100) / 100 } : {}),
      // Admin only (the owner, 24/10/2026): the bond terms on the details line under each bond (data as held, else "–").
      ...(admin ? { sp: b.ratingSp?.trim() || null, maturity: b.maturity, couponType: b.couponType ?? null, seniority: b.seniority ?? null } : {}),
      ...(has.has("why_table") ? { lossAdj: Math.round(lossAdjustedYield(b.grossYtm!, bondNotch(b) ?? UNRATED_NOTCH, b.modifiedDuration!) * 100) / 100 } : {}),
    })),
    lockedCount: 0,
    summary: has.has("portfolio_sim")
      ? {
          count: ranked.length,
          avgYtm: avg.ytm,
          avgDuration: avg.duration,
          avgRisk: averageRisk(ranked.map(bondRisk)),
          lifeLoss: ranked.length ? listLifeLoss(ranked.map(pdOf)) : null,
        }
      : null,
  };
}
