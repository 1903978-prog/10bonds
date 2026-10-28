// Fixed, versioned benchmark tables supplied by the owner. They replace the curve derived from the daily copy for that currency.
// EUR: supplied 28/10/2026 with reference date 27/10/2026. "Verified" rows are the owner's verified values; "Interpolated" rows are his interpolations.
// 31-50 years: no verified benchmark, so bonds that long get no benchmark spread (no score). To refresh: replace the rows below and bump the version.
export type BenchmarkPoint = { years: number; yield: number; status: "Verified" | "Interpolated" };
export type BenchmarkTable = { version: string; referenceDate: string; source: string; points: BenchmarkPoint[] };

const EUR_YIELDS = [2.94, 3.07, 3.10, 3.13, 3.16, 3.21, 3.26, 3.31, 3.37, 3.42, 3.45, 3.49, 3.52, 3.56, 3.59, 3.61, 3.63, 3.64, 3.66, 3.68, 3.69, 3.70, 3.71, 3.72, 3.73, 3.74, 3.75, 3.76, 3.77, 3.78];
const EUR_VERIFIED = new Set([1, 2, 3, 5, 7, 10, 15, 20, 30]);

export const EUR_BENCHMARK: BenchmarkTable = {
  version: "eur-bench-2026-10-27",
  referenceDate: "2026-10-27",
  source: "Euro government benchmark supplied by the owner",
  points: EUR_YIELDS.map((y, i) => ({ years: i + 1, yield: y, status: EUR_VERIFIED.has(i + 1) ? "Verified" : "Interpolated" })),
};

/** Fixed table per currency (EUR only for now). */
export const FIXED_BENCHMARKS: Record<string, BenchmarkTable> = { EUR: EUR_BENCHMARK };
