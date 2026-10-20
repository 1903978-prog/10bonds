import type { PublicBond, RankedBond } from "./types";
import { issuerKey, portfolioPool, withinRisk, UNRATED_NOTCH } from "./ranking";
import { bondNotch, bondRisk } from "./ratings";
import { lossAdjustedYield } from "./expectedLoss";
import { lossOf, type ResultRow } from "./tiers";

/** A bond left out of the top 10 that could take a place in it: Plus swaps it in. */
export type AltRow = Required<Pick<ResultRow, "issuer" | "ytm" | "name" | "isin" | "duration">> &
  Pick<ResultRow, "risk" | "coupon" | "maturity" | "country" | "minInvestment" | "loss"> & { adjYtm?: number };

export const MAX_ALTERNATIVES = 40;

/**
 * The best bond of every issuer not in the list, from the same pool the list was picked from (same horizon window and
 * risk limit), best yield after expected losses first. `withScore` adds the yield after losses (Premium, to pick the
 * bond an added one replaces).
 */
export function alternativesFor(bonds: PublicBond[], chosen: RankedBond[], duration: number, risk: number, withScore: boolean, max = MAX_ALTERNATIVES): AltRow[] {
  if (!chosen.length) return [];
  const { pool } = portfolioPool(withinRisk(bonds, risk), duration);
  const inList = new Set(chosen.map((b) => b.isin));
  const issuersIn = new Set(chosen.map(issuerKey));
  const scored = pool
    .filter((b) => !inList.has(b.isin))
    .map((b) => ({ b, key: issuerKey(b), adj: lossAdjustedYield(b.grossYtm!, bondNotch(b) ?? UNRATED_NOTCH, b.modifiedDuration!) }))
    .sort((x, y) => y.adj - x.adj || x.b.isin.localeCompare(y.b.isin));
  const seen = new Set<string>();
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
      loss: lossOf(b),
    };
    if (withScore) row.adjYtm = Math.round(adj * 100) / 100;
    out.push(row);
    if (out.length === max) break;
  }
  return out;
}
