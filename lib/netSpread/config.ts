import type { BandConfig } from "../riskBands";
import { riskClassConfig } from "../riskClassBands";

/** Methodology 5 uses Methodology 4's risk matrix; the tag keeps its stored lists apart from Methodology 4's. */
export const netSpreadConfig = (): BandConfig => ({ ...riskClassConfig(), tag: "ns5" });
