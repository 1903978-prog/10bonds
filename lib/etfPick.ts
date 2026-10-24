import type { SliderPosition } from "./sliderPortfolios";

// The 10bonds side of the ETF comparison: one of the 30 slider lists of the horizon, so a tap shows exactly that list.
export type EtfMatch = { position: number; ytm: number; avgRisk: number; beats: boolean };

/** The slider list with the lowest average risk whose return beats `ret` (ties: lower expected loss); else the highest return, `beats` false. */
export function etfPick(positions: SliderPosition[] | null, ret: number): EtfMatch | null {
  const ok = (positions ?? []).filter((p) => !p.unavailable && !p.sameAs && p.ytm != null && p.avgRisk != null);
  if (!ok.length) return null;
  const above = ok.filter((p) => p.ytm! > ret);
  const p = above.length
    ? above.reduce((a, b) => (b.avgRisk! < a.avgRisk! || (b.avgRisk === a.avgRisk && (b.expectedLoss ?? 0) < (a.expectedLoss ?? 0)) ? b : a))
    : ok.reduce((a, b) => (b.ytm! > a.ytm! ? b : a));
  return { position: p.position, ytm: p.ytm!, avgRisk: p.avgRisk!, beats: above.length > 0 };
}
