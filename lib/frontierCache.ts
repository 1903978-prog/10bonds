import type { BondSource } from "./bonds";
import type { BondFilter } from "./bondFilter";
import { signatureOf } from "./bestTable";
import { exactFrontier, NO_STEPS, type ExactFrontier } from "./exactFrontier";
import { stepGap, stepSignature } from "./stepGap";

/** "m1" = Methodology 1 (what customers get); "spread" = Methodology with spread rules (admin only, lib/stepGap.ts). */
export type FrontierMethod = "m1" | "spread";
export const parseMethod = (raw: string | null, admin: boolean): FrontierMethod => (admin && raw === "spread" ? "spread" : "m1");
export const gapOf = (m: FrontierMethod) => (m === "spread" ? stepGap : NO_STEPS);

// The exact frontier per data copy, filter and horizon, kept in memory: the slider positions and every search of a
// slider position (guard=1) read the same one, so both always give the same list. A customer's own exclusions make
// their own frontier, worked out on the spot and not kept.

const memo = new Map<string, ExactFrontier>();

export const frontierKey = (src: BondSource, f: BondFilter, duration: number, m: FrontierMethod = "m1") =>
  [signatureOf(src), f.currency, f.size, duration, m, stepSignature()].join("|");

export function frontierFor(src: BondSource, f: BondFilter, duration: number, m: FrontierMethod = "m1"): ExactFrontier {
  const key = frontierKey(src, f, duration, m);
  let hit = memo.get(key);
  if (!hit) {
    hit = exactFrontier(src.bonds, duration, gapOf(m));
    if (memo.size > 48) memo.clear();
    memo.set(key, hit);
  }
  return hit;
}

const warming = new Set<string>();

/** Works out the frontiers for these horizons in the background, one per turn, so later requests read them at once. */
export function warmFrontiers(src: BondSource, f: BondFilter, durations: number[]): void {
  const todo = durations.filter((d) => !memo.has(frontierKey(src, f, d)) && !warming.has(frontierKey(src, f, d)));
  if (!todo.length) return;
  for (const d of todo) warming.add(frontierKey(src, f, d));
  const next = (i: number) => {
    if (i >= todo.length) return;
    setImmediate(() => {
      try { frontierFor(src, f, todo[i]); } catch (e) { console.error("[frontier] warm failed:", (e as Error).message); }
      warming.delete(frontierKey(src, f, todo[i]));
      next(i + 1);
    });
  };
  next(0);
}
