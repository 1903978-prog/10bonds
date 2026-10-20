import type { PublicBond, RankedBond } from "./types";
import { issuerKey, portfolioPool, withinRisk, UNRATED_NOTCH } from "./ranking";
import { bondNotch, bondRisk } from "./ratings";
import { lossAdjustedYield } from "./expectedLoss";
import type { ResultRow } from "./tiers";

/** Why a bond near the horizon is not in the top 10 (Premium "why in or out"). */
export type OutReason = "lowerYield" | "moreRisk";

/** A bond left out of the top 10 that could take a place in it: Plus swaps it in, Premium also sees why it was left out. */
export type AltRow = Required<Pick<ResultRow, "issuer" | "ytm" | "name" | "isin" | "duration">> &
  Pick<ResultRow, "risk" | "coupon" | "maturity" | "country" | "minInvestment"> & { adjYtm?: number; reason?: OutReason };

export const MAX_ALTERNATIVES = 40;

/**
 * The best bond of every issuer not in the list, from the same pool the list was picked from (same horizon window and
 * risk limit), best yield after expected losses first. `withReasons` adds the score and why each one is out (Premium).
 */
export function alternativesFor(bonds: PublicBond[], chosen: RankedBond[], duration: number, risk: number, withReasons: boolean, max = MAX_ALTERNATIVES): AltRow[] {
  if (!chosen.length) return [];
  const { pool } = portfolioPool(withinRisk(bonds, risk), duration);
  const inList = new Set(chosen.map((b) => b.isin));
  const issuersIn = new Set(chosen.map(issuerKey));
  const scored = pool
    .filter((b) => !inList.has(b.isin))
    .map((b) => ({ b, key: issuerKey(b), adj: lossAdjustedYield(b.grossYtm!, bondNotch(b) ?? UNRATED_NOTCH, b.modifiedDuration!) }))
    .sort((x, y) => y.adj - x.adj || x.b.isin.localeCompare(y.b.isin));
  const seen = new Set<string>();
  const minScore = Math.min(...chosen.map((b) => b.score));
  const minYtm = Math.min(...chosen.map((b) => b.grossYtm!));
  const out: AltRow[] = [];
  for (const { b, key, adj } of scored) {
    // One per issuer, and never an issuer already in the list: a swap must keep the one-bond-per-issuer rule.
    if (seen.has(key) || issuersIn.has(key)) continue;
    seen.add(key);
    const row: AltRow = {
      issuer: b.issuer ?? b.name,
      name: b.name,
      isin: b.isin,
      ytm: b.grossYtm!,
      duration: b.modifiedDuration!,
      risk: bondRisk(b),
      coupon: b.coupon,
      maturity: b.maturity,
      country: b.country,
      minInvestment: b.minInvestment ?? null,
    };
    if (withReasons) {
      row.adjYtm = Math.round(adj * 100) / 100;
      // Scores no better than the list's weakest, or yields less than every bond in it: a lower yield. Otherwise it pays
      // more but takes more risk than the target needs (the list is the lowest-risk set that reaches it).
      row.reason = adj <= minScore || b.grossYtm! < minYtm ? "lowerYield" : "moreRisk";
    }
    out.push(row);
    if (out.length === max) break;
  }
  return out;
}
