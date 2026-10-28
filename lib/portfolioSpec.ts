import { MATRIX_POSITIONS, MAX_RISK_SPREAD, RISK_MATRIX, RISK_MATRIX_VERSION } from "./riskMatrix";
import { termOf } from "./limits";

// THE portfolio specification (owner, 28/10/2026). One versioned config read by the optimiser (lib/netSpread/solve.ts), the validator
// (lib/netSpread/check.ts, lib/sliderSnapshotBuild.ts), the nightly job (scripts/portfolio-efficiency.ts) and the admin rebuild. Nothing
// else holds a portfolio rule: change a number here, bump SPEC_VERSION, and every stored list is rebuilt. Written out in docs/PORTFOLIO_SPEC.md.

export const SPEC_VERSION = "ps1-2026-10-28";

export const PORTFOLIO_SPEC = {
  version: SPEC_VERSION,
  /** The mandatory 30-position risk matrix (lib/riskMatrix.ts) and the bond risk spread allowed inside any portfolio. */
  matrixVersion: RISK_MATRIX_VERSION,
  positions: MATRIX_POSITIONS,
  maxRiskSpread: MAX_RISK_SPREAD,
  /** Ten bonds, 10% each. */
  size: 10,
  weight: 0.1,
  /** Bonds per consolidated issuer group, and per major sector. Never relaxed for any position. */
  perIssuerGroup: 1,
  perSector: 3,
  /** The average duration of the ten bonds lies within this share of the horizon (Short 2 y, Medium 4 y, Long 10 y). */
  avgDurationTolerance: 0.05,
  /** Each bond's duration lies within this share of the horizon; Long is wider (owner decision 1b, 28/10/2026). */
  bondDurationWindow: { short: 0.2, mid: 0.2, long: 0.3 },
  /** A price older than this many trading days (Mon-Fri) behind the newest quote of the copy is stale and the bond is left out. */
  staleTradingDays: 5,
  /** Positions that share the same allowed classes are spread over terciles of expected loss (see ceilingShare). */
  repeatedWindows: "expected-loss terciles",
  /** Stored results are read in under this many milliseconds; every position is solved in the nightly job. */
  readBudgetMs: 300,
  /** Nightly rebuild: 06:00 Asia/Bangkok = 23:00 UTC. */
  nightlyUtc: "23:00",
  /** Portfolio BES is shown only after this many days of reference history; net spread is optimised and shown from day one. */
  besCalibrationDays: 20,
} as const;

/** Share of a duration window each bond may be away from the horizon: Long (6 to 15 years) 30%, the other terms 20%. */
export const poolWindowOf = (duration: number): number => PORTFOLIO_SPEC.bondDurationWindow[termOf(duration) ?? "mid"];

/** The portfolio rules of one horizon, as every solver, checker and sampler receives them. */
export const specRules = (duration: number) => ({ perIssuer: PORTFOLIO_SPEC.perIssuerGroup, perSector: PORTFOLIO_SPEC.perSector, duration });

/** Allowed bond risk classes per position, straight from the matrix. */
export const allowedFor = (position: number): readonly number[] => RISK_MATRIX[position - 1] ?? [];

/**
 * Expected-loss ceiling of place `i` (0-based) of `m` positions that share the same classes, as a share of the window's feasible range
 * [lowest achievable loss, loss of the highest-net-spread list]. Terciles for three places, halves for two; the top place has no ceiling
 * beyond the range itself, so it is the unconstrained optimum.
 */
export const ceilingShare = (i: number, m: number): number => (i + 1) / m;

const DAY = 86_400_000;
/** Mon-Fri days after `older` up to and including `newer`. Weekends do not count; public holidays are not modelled (a holiday makes the rule one day stricter). */
export function tradingDaysBetween(older: string | Date, newer: string | Date): number {
  const a = Date.parse(typeof older === "string" ? older.slice(0, 10) : older.toISOString().slice(0, 10));
  const b = Date.parse(typeof newer === "string" ? newer.slice(0, 10) : newer.toISOString().slice(0, 10));
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  let n = 0;
  for (let t = a + DAY; t <= b; t += DAY) { const d = new Date(t).getUTCDay(); if (d !== 0 && d !== 6) n++; }
  return n;
}

/** True when a quote is more than `staleTradingDays` trading days older than the newest one. A bond with no quote date cannot be judged and is kept (as lib/bonds.ts dropStale does). */
export const priceStale = (asOf: string | null | undefined, newest: string | null | undefined): boolean =>
  !!asOf && !!newest && tradingDaysBetween(asOf, newest) > PORTFOLIO_SPEC.staleTradingDays;

export const newestQuote = (bonds: { ytmAsOf?: string | null }[]): string | null => {
  let m: string | null = null;
  for (const b of bonds) if (b.ytmAsOf && (m === null || b.ytmAsOf > m)) m = b.ytmAsOf;
  return m;
};
