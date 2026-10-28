import { BAND_COUNT, DEFAULT_PER_CELL, type BandConfig, type RiskBand } from "./riskBands";
import { allowedClasses, windowOf } from "./riskMatrix";

// Methodology 4 (owner, 28/10/2026): the mandatory risk-category matrix (lib/riskMatrix.ts). Position n may only hold bonds whose own risk class
// is allowed for n. No average-risk target: inside the allowed classes the optimiser works on return versus expected loss; positions that share
// the same classes step from the lowest expected loss up to the highest return (`step`).
export const riskClassBands = (): RiskBand[] =>
  Array.from({ length: BAND_COUNT }, (_, i) => ({ k: i + 1, min: 1, max: 10, allowed: [...allowedClasses(i + 1)], step: windowOf(i + 1) }));

export const riskClassConfig = (): BandConfig => ({ bands: riskClassBands(), perCell: DEFAULT_PER_CELL });
