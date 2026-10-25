// Admin only: spread of a bond's return over the German Bund of the same duration, in bp. The Bund curve comes from the
// Risk Premium model (lib/riskPremium/benchmark.ts), read linearly between neighbouring Bunds, never extrapolated.

export type BundPt = { years: number; ytm: number };

/** Return minus Bund yield at `years`, in whole bp; null when there is no Bund point at that duration. */
export function spreadBp(curve: BundPt[], ytm: number | null | undefined, years: number | null | undefined): number | null {
  if (ytm == null || years == null || !Number.isFinite(ytm) || !Number.isFinite(years) || curve.length < 2) return null;
  if (years < curve[0].years - 1e-9 || years > curve[curve.length - 1].years + 1e-9) return null;
  let lo = curve[0], hi = curve[curve.length - 1];
  for (const p of curve) {
    if (p.years <= years) lo = p;
    if (p.years >= years) { hi = p; break; }
  }
  const bund = hi.years === lo.years ? lo.ytm : lo.ytm + ((hi.ytm - lo.ytm) * (years - lo.years)) / (hi.years - lo.years);
  return Math.round((ytm - bund) * 100);
}
