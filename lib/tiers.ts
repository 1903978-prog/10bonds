import type { RankedBond, Tier } from "./types";
import { averages, RESULT_COUNT } from "./ranking";
import { spGradeOf } from "./ratings";

/** Rows a visitor without an account sees. A free account sees the full top 10, without ISINs. */
export const VISITOR_VISIBLE = 3;

export type ResultRow = {
  rank: number;
  issuer: string;
  ytm: number;
  // Free account and up.
  duration?: number;
  rating?: string | null;
  country?: string | null;
  // Paid only: never sent to visitors or free accounts.
  name?: string;
  isin?: string;
  coupon?: number | null;
  maturity?: string | null;
};

export type ResultsPayload = {
  tier: Tier;
  rows: ResultRow[];
  lockedCount: number;
  summary: { count: number; avgYtm: number | null; avgDuration: number | null; avgRating: string | null } | null;
};

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
        rating: ratingOf(b),
        country: b.country,
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
      rating: ratingOf(b),
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

function ratingOf(b: RankedBond) {
  return b.ratingResolved ?? b.ratingSp ?? b.ratingMoodys ?? b.ratingFitch;
}
