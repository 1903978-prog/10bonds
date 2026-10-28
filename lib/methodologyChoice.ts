import { getSetting, setSetting } from "./accounts";
import type { FrontierMethod } from "./frontierCache";
import type { BandConfig } from "./riskBands";
import { loadBandConfig } from "./riskBandsStore";
import { riskClassConfig } from "./riskClassBands";

// Which methodology the public site uses (owner, 28/10/2026). The admin switches it at /admin/methodology; the choice is saved in app.settings.
// Every methodology is served from stored lists (written by the precompute job), never by a solver in the web process.
export type Methodology = 1 | 2 | 3 | 4;
export const METHODOLOGIES: { n: Methodology; name: string; text: string }[] = [
  { n: 1, name: "Methodology 1", text: "Exact efficient frontier, no spread rule (lib/exactFrontier.ts)." },
  { n: 2, name: "Methodology 2", text: "Spread logic: minimum extra return per rating step and the coherence rules, solved with HiGHS (lib/coherence.ts)." },
  { n: 3, name: "Methodology 3", text: "30 average-risk bands, stored lists (edit the bands at /admin/risk-bands). What runs live today." },
  { n: 4, name: "Methodology 4", text: "Mandatory risk-category matrix: each of the 30 positions may only hold bonds of its allowed risk classes (position 1 = class 1 only ... 30 = class 10 only), class spread at most 2." },
];
export const DEFAULT_METHODOLOGY: Methodology = 3;
const KEY = "public_methodology";

/** 1..4 from "1".."4" (or the older admin value "m1" = Methodology 1, "spread" = Methodology 3); null for anything else. */
export function parseMethodology(raw: string | null | undefined): Methodology | null {
  if (raw === "m1") return 1;
  if (raw === "spread") return 3;
  const n = Number(raw);
  return raw && Number.isInteger(n) && n >= 1 && n <= 4 ? (n as Methodology) : null;
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

/** The methodology of a request: the admin may force one with m=1..4 (to compare), everyone else gets the site's choice. */
export async function methodologyFor(raw: string | null, admin: boolean): Promise<Methodology> {
  return (admin ? parseMethodology(raw) : null) ?? (await activeMethodology());
}

/** The frontier engine behind a methodology: 1 = exact frontier, 2 to 4 = the spread-rules engine (2 as coherent lists, 3 and 4 as stored bands). */
export const engineOf = (n: Methodology): FrontierMethod => (n === 1 ? "m1" : "spread");
export const usesBands = (n: Methodology) => n >= 3;
/** The band table of a banded methodology (3 = the editable one, 4 = the fixed risk-score table). */
export async function bandTableOf(n: Methodology): Promise<BandConfig> {
  return n === 4 ? riskClassConfig() : loadBandConfig();
}
