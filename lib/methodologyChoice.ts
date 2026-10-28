import type { FrontierMethod } from "./frontierCache";
import type { BandConfig } from "./riskBands";
import { loadBandConfig } from "./riskBandsStore";
import { specConfig } from "./netSpread/config";

// Which methodology the public site uses (owner, 28/10/2026): always Methodology 4, the unified portfolio spec. Methodologies 1 to 3 are admin-only, on demand
// (?m=1..3). Stored lists are written by the nightly job; the web process never solves a standard list.
import { METHODOLOGIES, type Methodology } from "./methodologyList";
export { METHODOLOGIES, type Methodology };
export const DEFAULT_METHODOLOGY: Methodology = 4;

/** 1..4 from "1".."4" (or the older admin value "m1" = Methodology 1, "spread" = Methodology 3); "5" (the former net-spread optimiser) is now 4; null for anything else. */
export function parseMethodology(raw: string | null | undefined): Methodology | null {
  if (raw === "m1") return 1;
  if (raw === "spread") return 3;
  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n < 1 || n > 5) return null;
  return (n === 5 ? 4 : n) as Methodology;
}

/** The public site's methodology: always the production one. A value saved earlier by the admin switch is ignored. */
export async function activeMethodology(): Promise<Methodology> {
  return DEFAULT_METHODOLOGY;
}

/** The methodology of a request: the admin may force 1..3 with m= (to compare), everyone else gets the production engine. */
export async function methodologyFor(raw: string | null, admin: boolean): Promise<Methodology> {
  return (admin ? parseMethodology(raw) : null) ?? DEFAULT_METHODOLOGY;
}

/** The frontier engine behind a methodology: 1 = exact frontier, 2 to 4 = the spread-rules engine (2 as coherent lists, 3 and 4 as stored bands). */
export const engineOf = (n: Methodology): FrontierMethod => (n === 1 ? "m1" : "spread");
export const usesBands = (n: Methodology) => n >= 3;
/** The band table of a banded methodology (3 = the editable one, 4 = the production spec's risk-matrix table). */
export async function bandTableOf(n: Methodology): Promise<BandConfig> {
  return n === 4 ? specConfig() : loadBandConfig();
}
