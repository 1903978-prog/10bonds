import { DEFAULT_FILTER } from "./bondFilter";
import { loadBondsFor } from "./bonds";
import { TERMS } from "./limits";
import { sliderFor } from "./sliderCache";
import { bondRisk } from "./ratings";
import { cleanIssuer } from "./issuer";

// The 10bonds side of the home page benchmark card (the owner, 24/10/2026): one slider list, medium term, worked out live
// under the current rules (rated bonds only, worst-of-three risk), so its figures follow the data. Null until ready.
// `bonds`: the same list's 10 bonds, shown by name on the landing carousel (the owner, 24/10/2026), highest return first.
export type BenchmarkBond = { name: string; year: number | null; risk: number | null; ytm: number | null };
export type BenchmarkPortfolio = { ytm: number; avgRisk: number; duration: number | null; asOf: string | null; bonds: BenchmarkBond[] };

export async function benchmarkPortfolio(position: number): Promise<BenchmarkPortfolio | null> {
  const { positions } = await sliderFor(DEFAULT_FILTER, TERMS[1].duration);
  if (!positions) return null;
  // Fewer positions when the frontier has fewer distinct lists: the nearest one.
  let p = positions[Math.min(position, positions.length) - 1];
  if (p?.sameAs) p = positions[p.sameAs - 1];
  if (!p || p.unavailable || p.ytm == null || p.avgRisk == null) return null;
  const src = await loadBondsFor(DEFAULT_FILTER);
  const by = new Map(src.bonds.map((b) => [b.isin, b]));
  const ds = p.isins.map((i) => by.get(i)?.modifiedDuration).filter((d): d is number => d != null);
  const bonds = p.isins.map((i) => by.get(i)).filter((b) => b !== undefined).map((b) => ({
    name: cleanIssuer(b.issuer) ?? b.name,
    year: b.maturity ? Number(b.maturity.slice(0, 4)) : null,
    risk: bondRisk(b),
    ytm: b.grossYtm,
  })).sort((a, b) => (b.ytm ?? 0) - (a.ytm ?? 0));
  const duration = ds.length ? Math.round((ds.reduce((a, b) => a + b, 0) / ds.length) * 10) / 10 : null;
  return { ytm: p.ytm, avgRisk: p.avgRisk, duration, asOf: src.asOf ?? null, bonds };
}
