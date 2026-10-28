// The German government (Bund) yield curve, 1 to 30 years: ONE source for the Knowledge chart and the BES benchmark.
// "verified" = published benchmark point; "interpolated" = linear estimate between verified points.

export type BundRow = { years: number; yield: number; status: "verified" | "interpolated" };

const V = "verified" as const;
const I = "interpolated" as const;

export const BUND_BENCHMARK: { asOf: string; currency: "EUR"; rows: BundRow[] } = {
  asOf: "2026-10-27",
  currency: "EUR",
  rows: [
    [1, 2.94, V], [2, 3.07, V], [3, 3.1, V], [4, 3.13, I], [5, 3.16, V], [6, 3.21, I], [7, 3.26, V], [8, 3.31, I], [9, 3.37, I], [10, 3.42, V],
    [11, 3.45, I], [12, 3.49, I], [13, 3.52, I], [14, 3.56, I], [15, 3.59, V], [16, 3.61, I], [17, 3.63, I], [18, 3.64, I], [19, 3.66, I], [20, 3.68, V],
    [21, 3.69, I], [22, 3.7, I], [23, 3.71, I], [24, 3.72, I], [25, 3.73, I], [26, 3.74, I], [27, 3.75, I], [28, 3.76, I], [29, 3.77, I], [30, 3.78, V],
  ].map(([years, y, status]) => ({ years: years as number, yield: y as number, status: status as BundRow["status"] })),
};
