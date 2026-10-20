import type { PublicBond } from "../types";
import { sovereignOf } from "../seo/classify";

// German government (Bund) yield curve built from the Bunds in the same daily copy, so the benchmark and the bonds
// share one pricing date. A bond's benchmark is the Bund yield at its remaining maturity, read linearly between the
// two nearest Bund maturities. No extrapolation: outside the range of Bund maturities there is no benchmark.

export type BundPoint = { years: number; ytm: number; isin: string };
export type BundCurve = { points: BundPoint[]; asOf: string | null };

const YEAR_MS = 365.25 * 86_400_000;

/** Years from `asOf` (the data date) to the bond's maturity; null when the date is missing or invalid. */
export function yearsToMaturity(maturity: string | null, asOf: string | null): number | null {
  if (!maturity) return null;
  const end = Date.parse(maturity);
  const start = asOf ? Date.parse(asOf) : NaN;
  if (!Number.isFinite(end) || !Number.isFinite(start)) return null;
  return (end - start) / YEAR_MS;
}

/** Plain EUR Bunds with a current yield, ordered by maturity. */
export function bundCurve(bonds: PublicBond[], asOf: string | null): BundCurve {
  const points: BundPoint[] = [];
  for (const b of bonds) {
    if (b.currency !== "EUR" || b.grossYtm === null || sovereignOf(b) !== "DE") continue;
    const years = yearsToMaturity(b.maturity, asOf);
    if (years === null || years <= 0) continue;
    points.push({ years, ytm: b.grossYtm, isin: b.isin });
  }
  points.sort((a, b) => a.years - b.years || a.isin.localeCompare(b.isin));
  return { points, asOf };
}

/** Bund yield (%) at `years`, linear between neighbouring Bunds; Bunds with the same maturity are averaged. */
export function bundYieldAt(curve: BundCurve, years: number): number | null {
  const pts = curve.points;
  if (pts.length < 2 || years < pts[0].years - 1e-9 || years > pts[pts.length - 1].years + 1e-9) return null;
  const same = pts.filter((p) => Math.abs(p.years - years) < 1e-6);
  if (same.length) return same.reduce((s, p) => s + p.ytm, 0) / same.length;
  let lo = pts[0], hi = pts[pts.length - 1];
  for (const p of pts) {
    if (p.years <= years) lo = p;
    if (p.years >= years) { hi = p; break; }
  }
  if (hi.years === lo.years) return lo.ytm;
  return lo.ytm + ((hi.ytm - lo.ytm) * (years - lo.years)) / (hi.years - lo.years);
}
