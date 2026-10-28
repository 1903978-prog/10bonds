import { EUR_BENCHMARK } from "./bes/benchmarkTables";

// The German government (Bund) curve for the Knowledge chart, 1 to 30 years. Same table as the BES benchmark (lib/bes/benchmarkTables.ts): one source.
// "verified" = published benchmark point; "interpolated" = linear estimate between verified points.

export type BundRow = { years: number; yield: number; status: "verified" | "interpolated" };

export const BUND_BENCHMARK: { asOf: string; currency: "EUR"; rows: BundRow[] } = {
  asOf: EUR_BENCHMARK.referenceDate,
  currency: "EUR",
  rows: EUR_BENCHMARK.points.map((p) => ({ years: p.years, yield: p.yield, status: p.status === "Verified" ? "verified" : "interpolated" })),
};
