import type { RankedBond, Tier } from "./types";
import { averages, RESULT_COUNT } from "./ranking";
import { spGradeOf } from "./ratings";

export const FREE_VISIBLE = 3;

export type ResultRow = {
  rank: number;
  issuer: string;
  ytm: number;
  // Paid fields: never sent to free users.
  name?: string;
  isin?: string;
  coupon?: number | null;
  maturity?: string | null;
  duration?: number;
  rating?: string | null;
  country?: string | null;
};

export type ResultsPayload = {
  tier: Tier;
  rows: ResultRow[];
  lockedCount: number;
  summary: { count: number; avgYtm: number | null; avgDuration: number | null; avgRating: string | null } | null;
};

/** Cut the ranked list down to what this tier may see. Done on the server so hidden data never reaches the browser. */
export function shapeForTier(ranked: RankedBond[], tier: Tier): ResultsPayload {
  if (tier === "free") {
    return {
      tier,
      rows: ranked.slice(0, FREE_VISIBLE).map((b) => ({ rank: b.rank, issuer: b.issuer ?? b.name, ytm: b.grossYtm! })),
      lockedCount: Math.max(0, Math.min(ranked.length, RESULT_COUNT) - FREE_VISIBLE),
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
      rating: b.ratingResolved ?? b.ratingSp ?? b.ratingMoodys ?? b.ratingFitch,
      country: b.country,
    })),
    lockedCount: 0,
    summary: {
      count: ranked.length,
      avgYtm: avg.ytm,
      avgDuration: avg.duration,
      avgRating: avg.notch === null ? null : spGradeOf(Math.round(avg.notch)),
    },
  };
}
