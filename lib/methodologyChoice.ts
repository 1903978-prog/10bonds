import { getSetting, setSetting } from "./accounts";
import type { FrontierMethod } from "./frontierCache";
import type { BandConfig } from "./riskBands";
import { loadBandConfig } from "./riskBandsStore";
import { riskClassConfig } from "./riskClassBands";
import { netSpreadConfig } from "./netSpread/config";

// Which methodology the public site uses (owner, 28/10/2026). The admin switches it at /admin/methodology; the choice is saved in app.settings.
// Every methodology is served from stored lists (written by the precompute job), never by a solver in the web process.
import { METHODOLOGIES, type Methodology } from "./methodologyList";
export { METHODOLOGIES, type Methodology };
export const DEFAULT_METHODOLOGY: Methodology = 3;
const KEY = "public_methodology";

/** 1..5 from "1".."5" (or the older admin value "m1" = Methodology 1, "spread" = Methodology 3); null for anything else. */
export function parseMethodology(raw: string | null | undefined): Methodology | null {
  if (raw === "m1") return 1;
  if (raw === "spread") return 3;
  const n = Number(raw);
  return raw && Number.isInteger(n) && n >= 1 && n <= 5 ? (n as Methodology) : null;
}

const CACHE_MS = 15_000;
let cache: { at: number; v: Methodology } | null = null;

export async function activeMethodology(): Promise<Methodology> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.v;
  let v = DEFAULT_METHODOLOGY;
  try { v = parseMethodology(await getSetting(KEY)) ?? DEFAULT_METHODOLOGY; } catch { if (cache) return cache.v; }
  cache = { at: Date.now(), v };
  return v;
}

export async function setActiveMethodology(n: Methodology): Promise<void> {
  await setSetting(KEY, String(n));
  cache = { at: Date.now(), v: n };
}

/** The methodology of a request: the admin may force one with m=1..5 (to compare), everyone else gets the site's choice. */
export async function methodologyFor(raw: string | null, admin: boolean): Promise<Methodology> {
  return (admin ? parseMethodology(raw) : null) ?? (await activeMethodology());
}

/** The frontier engine behind a methodology: 1 = exact frontier, 2 to 4 = the spread-rules engine (2 as coherent lists, 3 and 4 as stored bands). */
export const engineOf = (n: Methodology): FrontierMethod => (n === 1 ? "m1" : "spread");
export const usesBands = (n: Methodology) => n >= 3;
/** The band table of a banded methodology (3 = the editable one, 4 = the fixed risk-score table, 5 = the same table with its own stored net-spread lists). */
export async function bandTableOf(n: Methodology): Promise<BandConfig> {
  return n === 5 ? netSpreadConfig() : n === 4 ? riskClassConfig() : loadBandConfig();
}
