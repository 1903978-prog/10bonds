import type { SECTORS } from "../sectors";

type Sector = (typeof SECTORS)[number];

// SEC Standard Industrial Classification code (what EDGAR publishes per company) -> the twelve sectors of lib/sectors.ts.
// First matching range wins; ranges are inclusive. Rule-based and coarse by design: a company whose SIC has no range stays unclassified.
const RANGES: [number, number, Sector][] = [
  [100, 999, "Consumer staples"],
  [1000, 1099, "Materials"], [1200, 1299, "Energy"], [1300, 1399, "Energy"], [1400, 1499, "Materials"],
  [1500, 1799, "Industrials"],
  [2000, 2199, "Consumer staples"],
  [2200, 2399, "Consumer discretionary"],
  [2400, 2499, "Materials"], [2500, 2599, "Consumer discretionary"], [2600, 2699, "Materials"],
  [2700, 2799, "Communication services"],
  [2800, 2829, "Materials"], [2830, 2839, "Health care"], [2840, 2849, "Consumer staples"], [2850, 2899, "Materials"],
  [2900, 2999, "Energy"],
  [3000, 3099, "Materials"], [3100, 3199, "Consumer discretionary"], [3200, 3399, "Materials"], [3400, 3499, "Industrials"],
  [3570, 3579, "Technology"], [3500, 3569, "Industrials"], [3580, 3599, "Industrials"],
  [3600, 3629, "Industrials"], [3630, 3659, "Consumer discretionary"], [3660, 3699, "Technology"],
  [3700, 3719, "Consumer discretionary"], [3720, 3799, "Industrials"],
  [3800, 3819, "Industrials"], [3820, 3829, "Technology"], [3840, 3859, "Health care"], [3860, 3879, "Technology"],
  [3900, 3999, "Consumer discretionary"],
  [4000, 4799, "Industrials"], [4610, 4619, "Energy"],
  [4800, 4899, "Communication services"],
  [4922, 4923, "Energy"], [4900, 4999, "Utilities"], [4950, 4959, "Industrials"],
  [5000, 5099, "Industrials"], [5120, 5129, "Health care"], [5140, 5149, "Consumer staples"], [5100, 5199, "Consumer discretionary"],
  [5400, 5499, "Consumer staples"], [5912, 5912, "Consumer staples"], [5200, 5999, "Consumer discretionary"],
  [6000, 6499, "Financials"], [6500, 6599, "Real estate"], [6700, 6797, "Financials"], [6798, 6798, "Real estate"], [6799, 6799, "Financials"],
  [7000, 7099, "Consumer discretionary"], [7200, 7299, "Consumer discretionary"],
  [7370, 7379, "Technology"], [7300, 7399, "Industrials"],
  [7800, 7829, "Communication services"], [7900, 7999, "Consumer discretionary"],
  [8000, 8099, "Health care"], [8200, 8299, "Consumer discretionary"], [8700, 8799, "Industrials"],
  [9100, 9799, "Government & agencies"],
];
// Specific codes that sit inside a wider range above but belong elsewhere (checked first).
const EXACT: Record<number, Sector> = { 4924: "Utilities", 4932: "Utilities", 4941: "Utilities", 4961: "Utilities", 5122: "Health care", 6153: "Financials" };

/** Sector of an SEC SIC code, or null when the code has no rule. */
export function sectorOfSic(sic: number | string | null | undefined): Sector | null {
  const n = typeof sic === "string" ? parseInt(sic, 10) : sic;
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (EXACT[n]) return EXACT[n];
  for (const [lo, hi, s] of RANGES) if (n >= lo && n <= hi) return s;
  return null;
}
