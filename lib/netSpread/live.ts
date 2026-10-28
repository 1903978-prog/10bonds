import type { PublicBond } from "../types";
import type { BandCand } from "../coherentFrontier";
import { loadAllShown } from "../bonds";
import { batchIdOf } from "../bes/store";
import { specCandidates } from "./candidates";
import { poolsFor, type BesBond } from "./build";
import { solveKey } from "./anchored";
import { loadBes } from "./store";

// The live path of the unified engine: ONLY for a customer's blacklist, advanced filters or a cold start (every standard list is read from storage,
// lib/riskBandsServe.ts). It runs the same solver and the same rules as the nightly job on the bonds the request allows, for the one window the
// position belongs to; the net spread of each bond comes from the published Bond Efficiency run.

const BES_MS = 10 * 60_000;
let bes: { at: number; v: Map<string, BesBond> | null } | null = null;
async function besNow(): Promise<Map<string, BesBond> | null> {
  if (bes && Date.now() - bes.at < BES_MS) return bes.v;
  const got = await loadBes(batchIdOf((await loadAllShown()).bonds)).catch(() => null);
  bes = { at: Date.now(), v: got?.bonds ?? null };
  return bes.v;
}

export type SpecLive = { sel: BandCand[]; optimal: boolean };

/** The list of position `k` for these bonds (already filtered), or null when none exists, or no net-spread figures exist for the prices. */
export async function liveSpecList(bonds: PublicBond[], duration: number, k: number): Promise<SpecLive | null> {
  const figures = await besNow();
  if (!figures) return null;
  // The key's two anchors first (cheap: sums only), then the one position asked for.
  const r = (await solveKey(poolsFor(bonds, duration, figures), duration, { only: k, timeLimit: 20 })).positions[k - 1];
  if (!r?.sel.length) return null;
  const byIsin = new Map(specCandidates(bonds, duration, 3).map((c) => [c.b.isin, c]));
  const sel = r.sel.map((c) => byIsin.get(c.isin));
  return sel.every((c): c is BandCand => !!c) ? { sel, optimal: r.status === "optimal" } : null;
}
