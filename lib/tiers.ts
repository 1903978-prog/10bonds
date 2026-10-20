import type { PublicBond, RankedBond, Tier } from "./types";
import { averages, RESULT_COUNT, UNRATED_NOTCH } from "./ranking";
import { averageRisk, bondNotch, bondRisk } from "./ratings";
import { bondLossChance, listLossChance, lossAdjustedYield } from "./expectedLoss";
import { lifeYears } from "./lifeYears";

/** Rows a visitor without an account sees. A free account sees the full top 10, without ISINs. */
export const VISITOR_VISIBLE = 3;

export type ResultRow = {
  rank: number;
  issuer: string;
  ytm: number;
  // Free account and up.
  duration?: number;
  risk?: number | null; // 10BONDS risk score 1..10, never an agency grade
  country?: string | null;
  minInvestment?: number | null;
  // Paid only: never sent to visitors or free accounts.
  name?: string;
  isin?: string;
  coupon?: number | null;
  maturity?: string | null;
  // Admin only (the owner): the S&P grade, never sent to anyone else.
  sp?: string | null;
  // Paid only, when the risk-adjusted ranking is on: the figures behind the rank (no agency grade).
  why?: RiskWhy;
  // Premium only: yield after expected losses, the score behind the "why in or out" table.
  lossAdj?: number;
  // Paid: chance in % the bond defaults before it matures (historical default table), for the list's KPI box.
  pd?: number;
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
  summary: { count: number; avgYtm: number | null; avgDuration: number | null; avgRisk: number | null; lossChance: number | null } | null;
};

/** Chance in % the bond defaults before it matures, rounded to 0.001. */
export const pdOf = (b: PublicBond) => Math.round(bondLossChance(bondNotch(b) ?? UNRATED_NOTCH, lifeYears(b)) * 1000) / 1000;

/** Cut the ranked list down to what this tier may see. Done on the server so hidden data never reaches the browser. */
export function shapeForTier(ranked: RankedBond[], tier: Tier): ResultsPayload {
  if (tier === "visitor") {
    return {
      tier,
      rows: ranked.slice(0, VISITOR_VISIBLE).map((b) => ({ rank: b.rank, issuer: b.issuer ?? b.name, ytm: b.grossYtm! })),
      lockedCount: Math.max(0, Math.min(ranked.length, RESULT_COUNT) - VISITOR_VISIBLE),
      summary: null,
    };
  }
  if (tier === "free") {
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
      })),
      lockedCount: 0,
      summary: null,
    };
  }
  const avg = averages(ranked);
  return {
    tier,
    rows: ranked.map((b) => ({
      rank: b.rank,
      issuer: b.issuer ?? b.name,
      ytm: b.grossYtm!,
      name: b.name,
      isin: b.isin,
      coupon: b.coupon,
      maturity: b.maturity,
      duration: b.modifiedDuration!,
      risk: bondRisk(b),
      country: b.country,
      minInvestment: b.minInvestment ?? null,
      pd: pdOf(b),
      ...(whyOf(b) ? { why: whyOf(b) } : {}),
      ...(tier === "premium" ? { lossAdj: Math.round(lossAdjustedYield(b.grossYtm!, bondNotch(b) ?? UNRATED_NOTCH, b.modifiedDuration!) * 100) / 100 } : {}),
    })),
    lockedCount: 0,
    summary: {
      count: ranked.length,
      avgYtm: avg.ytm,
      avgDuration: avg.duration,
      avgRisk: averageRisk(ranked.map(bondRisk)),
      lossChance: ranked.length ? listLossChance(ranked.map(pdOf)) : null,
    },
  };
}
