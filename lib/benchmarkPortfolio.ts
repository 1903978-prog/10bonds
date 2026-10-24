import { DEFAULT_FILTER } from "./bondFilter";
import { loadBondsFor } from "./bonds";
import { TERMS } from "./limits";
import { sliderFor } from "./sliderCache";

// The 10bonds side of the home page benchmark card (the owner, 24/10/2026): one slider list, medium term, worked out live
// under the current rules (rated bonds only, worst-of-three risk), so its figures follow the data. Null until ready.
export type BenchmarkPortfolio = { ytm: number; avgRisk: number; duration: number | null; asOf: string | null };

export async function benchmarkPortfolio(position: number): Promise<BenchmarkPortfolio | null> {
  const { positions } = await sliderFor(DEFAULT_FILTER, TERMS[1].duration);
  if (!positions) return null;
  // Fewer positions when the frontier has fewer distinct lists: the nearest one.
  let p = positions[Math.min(position, positions.length) - 1];
  if (p?.sameAs) p = positions[p.sameAs - 1];
  if (!p || p.unavailable || p.ytm == null || p.avgRisk == null) return null;
  const src = await loadBondsFor(DEFAULT_FILTER);
  const by = new Map(src.bonds.map((b) => [b.isin, b.modifiedDuration]));
  const ds = p.isins.map((i) => by.get(i)).filter((d): d is number => d != null);
  const duration = ds.length ? Math.round((ds.reduce((a, b) => a + b, 0) / ds.length) * 10) / 10 : null;
  return { ytm: p.ytm, avgRisk: p.avgRisk, duration, asOf: src.asOf ?? null };
}
