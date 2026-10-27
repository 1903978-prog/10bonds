import type { BondSource } from "./bonds";
import type { PublicBond } from "./types";
import type { BondFilter } from "./bondFilter";
import { signatureOf } from "./bestTable";
import { exactFrontier, NO_STEPS, type ExactFrontier } from "./exactFrontier";
import { stepGap, stepSignature } from "./stepGap";
import { coherentFrontier, type CoherentFrontier } from "./coherentFrontier";
import { policySignature } from "./coherence";
import { engineSignature } from "./enginePolicy";
import { GROUP_TABLE_VERSION } from "./issuerGroups";
import { loadSavedFrontier, saveFrontier } from "./frontierStore";
import { runLow } from "./highsSolver";

/** "spread" = Methodology with spread rules (what everyone gets); "m1" = Methodology 1 (admin comparison only, lib/stepGap.ts). */
export type FrontierMethod = "m1" | "spread";
// Everyone gets the spread-rules methodology (the owner, 26/10/2026); only the admin can switch back to Methodology 1 (m=m1) to compare.
export const parseMethod = (raw: string | null, admin: boolean): FrontierMethod => (admin && raw === "m1" ? "m1" : "spread");
export const gapOf = (m: FrontierMethod) => (m === "spread" ? stepGap : NO_STEPS);

// The exact frontier per data copy, filter and horizon, kept in memory: the slider positions and every search of a
// slider position (guard=1) read the same one, so both always give the same list. A customer's own exclusions make
// their own frontier, worked out on the spot and not kept.

const memo = new Map<string, ExactFrontier>();

// The spread-rules methodology is the coherent optimiser (lib/coherentFrontier.ts): mixed-integer solves that take
// seconds to minutes, so they are built in the background, one solve per turn, and cached by data copy, filter,
// horizon, rules version and issuer-group table. Until ready, frontierFor throws FrontierPending (HTTP 202 callers).
export class FrontierPending extends Error {
  constructor() { super("The coherent lists are still being calculated."); }
}
const coherentMemo = new Map<string, CoherentFrontier>();
const coherentBuilding = new Map<string, Promise<CoherentFrontier>>();

/** A customer's own exclusions (blacklist): `key` names the set, `fn` says which bonds are left out. */
export type Without = { key: string; fn: (b: PublicBond) => boolean };

export const frontierKey = (src: BondSource, f: BondFilter, duration: number, m: FrontierMethod = "m1", without?: Without | null) =>
  [signatureOf(src), f.currency, f.size, duration, m, stepSignature(), ...(m === "spread" ? [policySignature() + engineSignature(), GROUP_TABLE_VERSION] : []), ...(without ? [`x:${without.key}`] : [])].join("|");

// The web server never solves the standard lists itself (a solve needs about 340 MB for over a minute, which a small
// machine cannot spare while serving visitors): they come from the database, saved by the "Precompute portfolio lists"
// job (scripts/precompute-frontiers.ts sets ALLOW_LIVE_SOLVE=1). Only a customer's own exclusions are solved on the spot.
const liveSolveAllowed = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_LIVE_SOLVE === "1";
// A list that could not be built is not tried again for 20 s, so polling visitors do not make the server retry in a loop.
const buildFailedAt = new Map<string, number>();

/** The coherent frontier for this copy, filter and horizon once built; started in the background if not. */
export function coherentBuild(src: BondSource, f: BondFilter, duration: number, without?: Without | null): Promise<CoherentFrontier> {
  const key = frontierKey(src, f, duration, "spread", without);
  const hit = coherentMemo.get(key);
  if (hit) return Promise.resolve(hit);
  if (Date.now() - (buildFailedAt.get(key) ?? 0) < 20_000) return Promise.reject(new Error("This list is not prepared yet."));
  let p = coherentBuilding.get(key);
  if (!p) {
    // A customer's own exclusions are worked out on the spot; everyone else's lists are saved in the database and read back after a restart.
    p = (async () => {
      if (!without) {
        const saved = await loadSavedFrontier(key);
        if (saved?.data.points?.length) {
          const pts = saved.data.points;
          const hit: CoherentFrontier = { ...saved.data, at: (t: number) => pts.find((x) => x.ytm >= t - 1e-9) ?? null, ...(saved.stale ? { stale: true } : {}) };
          // Saved for slightly older prices: serve it now, and work out the exact list in the background (low priority).
          if (saved.stale && liveSolveAllowed()) {
            void runLow(() => coherentFrontier(src.bonds, duration))
              .then(async (r) => { await saveFrontier(key, r); if (coherentMemo.size > 24) coherentMemo.clear(); coherentMemo.set(key, r); })
              .catch((e) => console.error("[coherent] refresh failed:", (e as Error).message));
          }
          return hit;
        }
      }
      if (!without && !liveSolveAllowed()) throw new Error("This list is not prepared yet.");
      const r = await coherentFrontier(without ? src.bonds.filter((b) => !without.fn(b)) : src.bonds, duration);
      if (!without) await saveFrontier(key, r);
      return r;
    })()
      .then((r) => { if (coherentMemo.size > 24) coherentMemo.clear(); coherentMemo.set(key, r); return r; })
      .finally(() => coherentBuilding.delete(key));
    p.catch((e) => { buildFailedAt.set(key, Date.now()); if (buildFailedAt.size > 200) buildFailedAt.clear(); console.error("[coherent] build failed:", (e as Error).message); });
    coherentBuilding.set(key, p);
  }
  return p;
}

export function frontierFor(src: BondSource, f: BondFilter, duration: number, m: FrontierMethod = "m1", without?: Without | null): ExactFrontier {
  const key = frontierKey(src, f, duration, m, without);
  if (m === "spread") {
    const ready = coherentMemo.get(key);
    if (ready) return ready;
    void coherentBuild(src, f, duration, without).catch(() => {});
    throw new FrontierPending();
  }
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
