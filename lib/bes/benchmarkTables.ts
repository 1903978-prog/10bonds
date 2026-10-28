// Fixed, versioned benchmark tables supplied by the owner. They replace the curve derived from the daily copy for that currency.
// EUR: supplied 28/10/2026 with reference date 27/10/2026. "Verified" rows are the owner's verified values; "Interpolated" rows are his interpolations.
// 31-50 years: no verified benchmark, so bonds that long get no benchmark spread (no score). To refresh: replace the rows below and bump the version.
export type BenchmarkPoint = { years: number; yield: number; status: "Verified" | "Interpolated" };
export type BenchmarkTable = { version: string; referenceDate: string; source: string; points: BenchmarkPoint[]; /** Owner-supplied placeholder until an official import replaces it. */ interim?: boolean; /** Imported from the official publisher (Bundesbank, Federal Reserve), not supplied by hand. */ official?: boolean };

const EUR_YIELDS = [2.94, 3.07, 3.10, 3.13, 3.16, 3.21, 3.26, 3.31, 3.37, 3.42, 3.45, 3.49, 3.52, 3.56, 3.59, 3.61, 3.63, 3.64, 3.66, 3.68, 3.69, 3.70, 3.71, 3.72, 3.73, 3.74, 3.75, 3.76, 3.77, 3.78];
const EUR_VERIFIED = new Set([1, 2, 3, 5, 7, 10, 15, 20, 30]);

export const EUR_BENCHMARK: BenchmarkTable = {
  version: "eur-bench-2026-10-27",
  referenceDate: "2026-10-27",
  source: "Euro government benchmark supplied by the owner",
  points: EUR_YIELDS.map((y, i) => ({ years: i + 1, yield: y, status: EUR_VERIFIED.has(i + 1) ? "Verified" : "Interpolated" })),
};

// USD: US Treasury par yields supplied by the owner 28/10/2026 (reference date 27/10/2026). "Verified" = published Treasury maturities (1,2,3,5,7,10,20,30), the rest interpolated by the owner.
// INTERIM, from the owner's table, not yet verified: to be replaced by the Federal Reserve fitted par curve (SVENPY01-30) once that import is on main.
const USD_YIELDS = [4.5, 4.7, 4.8, 4.81, 4.82, 4.865, 4.91, 4.937, 4.963, 4.99, 5.025, 5.06, 5.095, 5.13, 5.165, 5.2, 5.235, 5.27, 5.305, 5.34, 5.336, 5.332, 5.328, 5.324, 5.32, 5.316, 5.312, 5.308, 5.304, 5.3];
const USD_PUBLISHED = new Set([1, 2, 3, 5, 7, 10, 20, 30]);

export const USD_BENCHMARK: BenchmarkTable = {
  version: "usd-bench-2026-10-27-interim",
  referenceDate: "2026-10-27",
  source: "US Treasury par yields supplied by the owner (interim, not yet verified)",
  interim: true,
  points: USD_YIELDS.map((y, i) => ({ years: i + 1, yield: y, status: USD_PUBLISHED.has(i + 1) ? "Verified" : "Interpolated" })),
};

/** Fixed table per currency (EUR, USD; GBP still uses the daily copy). The owner's tables are the flagged fallback; official imports replace them for a run. */
export const FIXED_BENCHMARKS: Record<string, BenchmarkTable> = { EUR: EUR_BENCHMARK, USD: USD_BENCHMARK };

/** Replace the table of a currency with an official import (all 30 points are published values). Used by the BES job before it calculates. */
export function setOfficialBenchmark(currency: string, asOf: string, points: { years: number; ytm: number }[], source: string, versionPrefix: string): BenchmarkTable {
  const t: BenchmarkTable = { version: `${versionPrefix}-${asOf}`, referenceDate: asOf, source, official: true, points: [...points].sort((a, b) => a.years - b.years).map((p) => ({ years: p.years, yield: p.ytm, status: "Verified" as const })) };
  FIXED_BENCHMARKS[currency] = t;
  return t;
}

/** One-line description of the benchmark used for a currency, stored with every score. */
export function benchmarkLabel(currency: string, tableName: string): string {
  const t = FIXED_BENCHMARKS[currency];
  if (!t) return "";
  if (t.official) return `${t.source}, observation date ${t.referenceDate} (${t.version})`;
  return `${tableName} ${t.version} (reference date ${t.referenceDate}, supplied by the owner${t.interim ? ", interim, not yet verified" : ", fallback until the official import is available"})`;
}
