import { DEFAULT_PER_CELL, type BandConfig, type RiskBand } from "../riskBands";
import { PORTFOLIO_SPEC } from "../portfolioSpec";
import { POSITIONS } from "../riskAnchors";

/**
 * The band table of the unified engine. The 30 bands depend on the key (R1 and R30 of each currency x minimum order x horizon, lib/riskAnchors.ts), so they are
 * stored with each set; this config only names the 30 positions. The tag carries the spec version, so a new spec never serves old lists.
 */
export const specBands = (): RiskBand[] => Array.from({ length: POSITIONS }, (_, i) => ({ k: i + 1, min: 1, max: 10 }));
export const specConfig = (): BandConfig => ({ bands: specBands(), perCell: DEFAULT_PER_CELL, tag: `spec:${PORTFOLIO_SPEC.version}` });
