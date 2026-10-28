// Pure maths of the Bond Efficiency Score. No database, no clock.

/**
 * Cumulative default probability (0..1) at `years`, interpolated linearly on the SURVIVAL probability between the published horizons
 * (t = 0 has survival 1). Monotonic when the table is. null beyond the last published horizon (never extrapolated) or for years <= 0.
 */
export function cumulativePd(pctRow: readonly number[], horizons: readonly number[], years: number): number | null {
  if (!Number.isFinite(years) || years <= 0 || years > horizons[horizons.length - 1] + 1e-9) return null;
  let t0 = 0, s0 = 1;
  for (let i = 0; i < horizons.length; i++) {
    const s1 = 1 - pctRow[i] / 100;
    if (years <= horizons[i] + 1e-12) return 1 - (s0 + ((s1 - s0) * (years - t0)) / (horizons[i] - t0));
    t0 = horizons[i]; s0 = s1;
  }
  return null;
}

/** Constant yearly default probability that gives the same cumulative probability over `years`. */
export const annualEquivalentPd = (cumPd: number, years: number): number => 1 - Math.pow(1 - cumPd, 1 / years);

/** Gross spread in bp: 1 percentage point = 100 bp. */
export const grossSpreadBp = (bondYtmPct: number, benchmarkPct: number): number => (bondYtmPct - benchmarkPct) * 100;

/** Annual credit-loss allowance in bp: annual equivalent PD x LGD x 10,000 (a screening approximation, not a cash-flow model). */
export const annualLossBp = (annualPd: number, lgd: number): number => annualPd * lgd * 10_000;

/** Linear read of a (years, yield %) curve; null outside the curve or with fewer than 2 points (never extrapolated). */
export function curveYield(curve: readonly { years: number; ytm: number }[], years: number): number | null {
  if (curve.length < 2 || years < curve[0].years - 1e-9 || years > curve[curve.length - 1].years + 1e-9) return null;
  let lo = curve[0], hi = curve[curve.length - 1];
  for (const p of curve) { if (p.years <= years) lo = p; if (p.years >= years) { hi = p; break; } }
  return hi.years === lo.years ? lo.ytm : lo.ytm + ((hi.ytm - lo.ytm) * (years - lo.years)) / (hi.years - lo.years);
}

/**
 * Percentile rank 0..100 of `x` among `peers` (which include x itself once): share of the OTHER peers below it, ties counting half.
 * 100 x (below + 0.5 x equal) / (n - 1). Needs at least 2 peers.
 */
export function percentileRank(x: number, peers: readonly number[]): number | null {
  const n = peers.length;
  if (n < 2) return null;
  let below = 0, equal = 0;
  for (const p of peers) { if (p < x) below++; else if (p === x) equal++; }
  equal -= 1; // x itself
  return (100 * (below + 0.5 * equal)) / (n - 1);
}

export const MIN_PEERS = 20;

export function besLabel(score: number): string {
  return score >= 90 ? "Exceptional relative efficiency" : score >= 75 ? "Very attractive" : score >= 60 ? "Above average" : score >= 40 ? "Average" : score >= 20 ? "Below average" : "Poor relative efficiency";
}
