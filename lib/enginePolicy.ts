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
export type EnginePolicy = { spread: SpreadMode; composition: CompositionMode };

export const ENGINE_POLICY_VERSION = "engine-1";
export const DEFAULT_ENGINE: EnginePolicy = { spread: "hard_constraint", composition: "house_window" };

let engine: EnginePolicy = DEFAULT_ENGINE;
export const activeEngine = () => engine;
/** Tests and comparison scripts only; no screen or setting changes the engine policy yet (needs Livio's approval). */
export function setEngine(e: EnginePolicy | null): void { engine = e ?? DEFAULT_ENGINE; }

/** Empty for the default policy (keeps today's cache keys), otherwise names every switch moved. */
export const engineSignature = (e: EnginePolicy = engine): string =>
  e.spread === DEFAULT_ENGINE.spread && e.composition === DEFAULT_ENGINE.composition ? "" : `|${ENGINE_POLICY_VERSION}:${e.spread}:${e.composition}`;
