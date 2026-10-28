import { MAX_RISK_SPREAD, POSITIONS } from "./riskAnchors";
import { termOf } from "./limits";

// THE portfolio specification (owner, 28/10/2026). One versioned config read by the optimiser (lib/netSpread/solve.ts, anchored.ts), the validator
// (lib/netSpread/check.ts, lib/sliderSnapshotBuild.ts), the nightly job (scripts/portfolio-build.ts) and the admin rebuild. Nothing
// else holds a portfolio rule: change a number here, bump SPEC_VERSION, and every stored list is rebuilt. Written out in docs/PORTFOLIO_SPEC.md.

export const SPEC_VERSION = "ps3-2026-10-28";

export const PORTFOLIO_SPEC = {
  version: SPEC_VERSION,
  /** 30 positions per horizon, anchored on the riskiest and the safest feasible list (lib/riskAnchors.ts); the bond risk spread allowed inside any portfolio. */
  positions: POSITIONS,
  maxRiskSpread: MAX_RISK_SPREAD,
  /** Ten bonds, 10% each. */
  size: 10,
  weight: 0.1,
  /** Bonds per consolidated issuer group, and per major sector. Issuer is never relaxed for any position. */
  perIssuerGroup: 1,
  perSector: 3,
  /** The average duration of the ten bonds lies within this share of the horizon (Short 2 y, Medium 4 y, Long 10 y). */
  avgDurationTolerance: 0.05,
  /** Each bond's duration lies within this share of the horizon; Long is wider (owner decision 1b, 28/10/2026). */
  bondDurationWindow: { short: 0.2, mid: 0.2, long: 0.3 },
  /** No bond carries more than this share of the list's annual expected loss. */
  lossShare: 0.25,
  /** A price older than this many trading days (Mon-Fri) behind the newest quote of the copy is stale and the bond is left out. */
  staleTradingDays: 10,
  /** Stored results are read in under this many milliseconds; every position is solved in the nightly job. */
  readBudgetMs: 300,
  /** Nightly rebuild: 06:00 Asia/Bangkok = 23:00 UTC. */
  nightlyUtc: "23:00",
  /** Portfolio BES is shown only after this many days of reference history; net spread is optimised and shown from day one. */
  besCalibrationDays: 20,
} as const;

/**
 * The relaxation ladder (owner, 28/10/2026). A position with no list under the strict rules is retried with step 1, then 2, then 3; each step keeps
 * the earlier ones. The issuer rule, the exclusions and the class spread of 2 are never relaxed. A list found at step 1 or later is marked "adjusted".
 *   step 1: sovereigns, supranationals and agencies are exempt from the sector cap; every other sector may hold 4 instead of 3.
 *   step 2: each bond within 35% of the horizon (Long 50%), the average within 10%.
 *   step 3: no bond above 35% of the list's expected loss.
 */
export type LadderStep = 0 | 1 | 2 | 3;
export const LADDER_STEPS: readonly LadderStep[] = [0, 1, 2, 3];
export type Rules = { perIssuer: number; perSector: number; /** Sovereigns, supranationals and agencies do not count towards the sector cap. */ sectorExempt: boolean; duration: number; avgTol: number; lossShare: number; step: LadderStep };

const WIDE_WINDOW = { short: 0.35, mid: 0.35, long: 0.5 } as const;
/** Share of a duration window each bond may be away from the horizon at a ladder step. */
export const poolWindowOf = (duration: number, step: LadderStep = 0): number => (step >= 2 ? WIDE_WINDOW : PORTFOLIO_SPEC.bondDurationWindow)[termOf(duration) ?? "mid"];

/** The portfolio rules of one horizon at a ladder step, as every solver, checker and sampler receives them. */
export const specRules = (duration: number, step: LadderStep = 0): Rules => ({
  perIssuer: PORTFOLIO_SPEC.perIssuerGroup,
  perSector: step >= 1 ? PORTFOLIO_SPEC.perSector + 1 : PORTFOLIO_SPEC.perSector,
  sectorExempt: step >= 1,
  duration,
  avgTol: step >= 2 ? 0.1 : PORTFOLIO_SPEC.avgDurationTolerance,
  lossShare: step >= 3 ? 0.35 : PORTFOLIO_SPEC.lossShare,
  step,
});

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
