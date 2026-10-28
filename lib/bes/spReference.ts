// Versioned reference default tables for the Bond Efficiency Score (BES). INTERNAL / ADMIN ONLY.
// Corporate: S&P Global Ratings, "2024 Annual Global Corporate Default and Rating Transition Study" (27 Mar 2025), Table 24,
// global corporate average cumulative default rates 1981-2024, % over 1..15 years. Read from
// https://maalot.co.il/Publications/FTS20250331162126.pdf on 28/10/2026 and checked against the 1/5/10-year anchors in the brief.
// Usage rights: public reading only. Republishing the table is not cleared, so it is never shown to customers (admin page only).
// Sovereign foreign-currency: lib/sovereign.ts (S&P 2025 sovereign study Table 16, supplied by the owner). The local-currency table is NOT loaded (see BES report).

export const SP_CORPORATE_VERSION = "sp-corp-2024-t24";
export const SP_CORPORATE_YEARS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
export const SP_CORPORATE_SOURCE = {
  agency: "S&P Global Ratings",
  report: "2024 Annual Global Corporate Default and Rating Transition Study",
  published: "2025-03-27",
  period: "1981-2024",
  table: "Table 24 - Global corporate average cumulative default rates",
  url: "https://maalot.co.il/Publications/FTS20250331162126.pdf",
  usageRights: "unresolved - internal use only, not shown to customers",
};
export const SP_CORPORATE: [category: string, pct: number[]][] = [
  ["AAA", [0.00, 0.03, 0.13, 0.23, 0.34, 0.44, 0.49, 0.57, 0.62, 0.67, 0.70, 0.73, 0.75, 0.81, 0.86]],
  ["AA", [0.02, 0.05, 0.11, 0.19, 0.28, 0.37, 0.45, 0.52, 0.59, 0.65, 0.71, 0.76, 0.81, 0.86, 0.90]],
  ["A", [0.05, 0.11, 0.19, 0.29, 0.39, 0.51, 0.65, 0.78, 0.90, 1.03, 1.14, 1.25, 1.35, 1.45, 1.56]],
  ["BBB", [0.14, 0.38, 0.67, 1.01, 1.36, 1.71, 2.00, 2.30, 2.58, 2.86, 3.13, 3.35, 3.56, 3.78, 4.01]],
  ["BB", [0.56, 1.76, 3.12, 4.48, 5.75, 6.93, 7.94, 8.86, 9.68, 10.44, 11.06, 11.65, 12.17, 12.60, 13.05]],
  ["B", [2.93, 6.93, 10.46, 13.31, 15.60, 17.45, 18.90, 20.06, 21.08, 22.02, 22.82, 23.43, 24.02, 24.57, 25.11]],
  ["CCC/C", [26.12, 35.92, 41.32, 44.35, 46.53, 47.57, 48.61, 49.29, 49.89, 50.43, 50.85, 51.32, 51.86, 52.26, 52.30]],
];

/** Row of the S&P corporate table for an S&P-scale notch (AAA = 0, lib/ratings.ts); everything from CCC+ down is the aggregate CCC/C row. */
export function spCorporateRow(notch: number): { category: string; pct: number[] } {
  const n = Math.max(0, Math.round(notch));
  const cat = n === 0 ? 0 : n <= 3 ? 1 : n <= 6 ? 2 : n <= 9 ? 3 : n <= 12 ? 4 : n <= 15 ? 5 : 6;
  return { category: SP_CORPORATE[cat][0], pct: SP_CORPORATE[cat][1] };
}
