// 10BONDS combined average cumulative corporate default rates by rating notch, in %, with the 10BONDS risk score (1-10)
// each rating maps to. Each figure is the simple average of the three agencies' long-run averages for that notch and
// horizon, rounded (2 decimals under 1%, else 1 decimal). On the site: "based on public historical default studies".
// Which studies and years were used: docs/handover/default-rates.md (internal, not shown on the site).
export const DEFAULT_YEARS = [1, 3, 5, 7, 10, 15] as const;
export const DEFAULT_RATES: [rating: string, risk: string, pct: number[]][] = [
  ["AAA", "1", [0.00, 0.01, 0.07, 0.17, 0.31, 0.51]],
  ["AA+", "2", [0.00, 0.04, 0.14, 0.26, 0.46, 0.69]],
  ["AA", "2", [0.01, 0.07, 0.20, 0.36, 0.60, 0.97]],
  ["AA−", "2", [0.03, 0.12, 0.30, 0.49, 0.78, 1.20]],
  ["A+", "3", [0.04, 0.17, 0.38, 0.62, 1.10, 1.80]],
  ["A", "3", [0.05, 0.21, 0.48, 0.80, 1.40, 2.20]],
  ["A−", "3", [0.07, 0.28, 0.59, 0.98, 1.70, 2.60]],
  ["BBB+", "4", [0.10, 0.44, 0.93, 1.50, 2.40, 3.90]],
  ["BBB", "5", [0.15, 0.65, 1.40, 2.10, 3.40, 5.30]],
  ["BBB−", "6", [0.26, 1.10, 2.40, 3.70, 5.50, 8.00]],
  ["BB+", "7", [0.41, 1.80, 3.60, 5.40, 7.90, 11.20]],
  ["BB", "7", [0.63, 2.70, 5.20, 7.60, 10.80, 14.80]],
  ["BB−", "7", [1.00, 4.30, 8.00, 11.20, 15.20, 20.10]],
  ["B+", "8", [1.60, 6.00, 10.30, 14.00, 18.40, 23.80]],
  ["B", "8", [2.60, 8.80, 14.00, 18.20, 23.10, 28.50]],
  ["B−", "8", [4.60, 13.20, 19.70, 24.50, 29.90, 35.40]],
  ["CCC+", "9", [12.00, 24.50, 32.30, 37.40, 42.60, 47.50]],
  ["CCC / C", "9–10", [24.50, 38.90, 45.60, 49.80, 54.10, 58.00]],
];
