// Versioned engine policy switches (quant correction, 27/10/2026). They separate what the paper treats as different things:
//  spread:      "hard_constraint"  the rating-by-maturity spread table is enforced inside the optimiser (PR #243, Livio 26/10/2026:
//                                   all customers). In force today.
//               "diagnostic_only"  paper 5.1 / 7.4: the table only labels bonds (lib/spreadDiagnostic.ts), never removes one.
//  composition: "house_window"     the rating window, core and worst-class rules of lib/coherence.ts (house policy of 25/10/2026,
//                                   not in the paper). In force today.
//               "ceiling_only"     only the risk ceiling: a ceiling of class 6 allows classes 1-6 and requires none of class 6.
// The defaults reproduce today's behaviour exactly: the cache key and every stored certificate change only when a
// switch is moved off its default, so nothing that exists is invalidated or silently reinterpreted.
// The slider ends (PR #320) are separate end rules and are not affected by these switches.

export type SpreadMode = "hard_constraint" | "diagnostic_only";
export type CompositionMode = "house_window" | "ceiling_only";
//  loss:        "v1_linear"        cumulative default chance read in straight lines between the table's years, stretched in a
//                                   straight line beyond 15 years (in force today).
//               "v2_hazard"        interpolated in cumulative-hazard space (never negative hazard, never above 100%), tail beyond
//                                   15 years continues the last observed hazard and is flagged uncertain (lib/lossModel.ts).
export type LossModelId = "v1_linear" | "v2_hazard";
export type EnginePolicy = { spread: SpreadMode; composition: CompositionMode; loss: LossModelId };

export const ENGINE_POLICY_VERSION = "engine-2";
/** The policy in force until 27/10/2026 (spread table as constraint, house rating window): kept so it can still be run and compared. */
export const LEGACY_ENGINE: EnginePolicy = { spread: "hard_constraint", composition: "house_window", loss: "v1_linear" };
/** In force since 27/10/2026 (Livio "1B 2B"): spread table only labels bonds, no house rating window; issuer, sector, loss-share, weak-bond and duration limits stay. */
export const DEFAULT_ENGINE: EnginePolicy = { spread: "diagnostic_only", composition: "ceiling_only", loss: "v1_linear" };

let engine: EnginePolicy = DEFAULT_ENGINE;
export const activeEngine = () => engine;
/** Tests and comparison scripts only; no screen or setting changes the engine policy yet (needs Livio's approval). */
export function setEngine(e: EnginePolicy | null): void { engine = e ?? DEFAULT_ENGINE; }

/** Empty only for the legacy policy (its cache keys are unchanged); every other policy, the new default included, names all its switches so saved lists of the old policy are never served. */
export const engineSignature = (e: EnginePolicy = engine): string =>
  e.spread === LEGACY_ENGINE.spread && e.composition === LEGACY_ENGINE.composition && e.loss === LEGACY_ENGINE.loss ? "" : `|${ENGINE_POLICY_VERSION}:${e.spread}:${e.composition}:${e.loss}`;

// What the API does when the optimiser has no list for the asked position (paper 7.1: report infeasibility, never force a list):
//  "legacy_ranking"  today: the plain ranker (lib/ranking.ts, knows none of the optimiser's rules) fills in and the answer says
//                    so in `status: "FALLBACK_RANKING"`.
//  "none"            no list: `status: "INFEASIBLE"`. Needs the Finder page to show a "no list for this position" state first
//                    (not built; switching it on before that is a customer-visible change that needs approval).
export type FallbackMode = "legacy_ranking" | "none";
let fallback: FallbackMode = "legacy_ranking";
export const activeFallback = () => fallback;
export function setFallback(m: FallbackMode): void { fallback = m; }
