import type { PublicBond } from "./types";
import { yearsToMaturity } from "./riskPremium/benchmark";

/** Years left until the bond matures, from its price date (or today); its duration when the maturity is unknown. */
export function lifeYears(b: Pick<PublicBond, "maturity" | "ytmAsOf" | "modifiedDuration">, today = new Date().toISOString().slice(0, 10)): number {
  const y = yearsToMaturity(b.maturity, b.ytmAsOf ?? today);
  return y !== null && y > 0 ? y : b.modifiedDuration ?? 0;
}
