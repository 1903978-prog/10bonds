import type { PublicBond } from "./types";
import { DURATION_STEPS, LIMITS } from "./limits";
import { bondRisk } from "./ratings";
import { portfolioPool, withinRisk } from "./ranking";

/**
 * Highest risk score that has any bond, per duration step of the slider, so the "highest risk accepted"
 * slider only offers levels with bonds behind them (no bond at risk 7+ means the slider runs 6 to 1).
 */
export function maxRiskByDuration(bonds: PublicBond[]): Record<string, number | null> {
  const rated = withinRisk(bonds, LIMITS.risk.max);
  const out: Record<string, number | null> = {};
  for (const d of DURATION_STEPS) {
    const risks = portfolioPool(rated, d).pool.map(bondRisk).filter((r): r is number => r !== null);
    out[String(Math.round(d * 100) / 100)] = risks.length ? Math.max(...risks) : null;
  }
  return out;
}
