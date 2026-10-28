import type { BandConfig } from "../riskBands";
import { riskClassConfig } from "../riskClassBands";
import { PORTFOLIO_SPEC } from "../portfolioSpec";

/** The band table of the unified engine: the risk matrix's 30 positions. The tag keeps its stored lists apart from any other methodology's and carries the spec version, so a new spec never serves old lists. */
export const specConfig = (): BandConfig => ({ ...riskClassConfig(), tag: `spec:${PORTFOLIO_SPEC.version}` });
