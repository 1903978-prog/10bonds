import type { PublicBond } from "../types";
import type { BandCand } from "../coherentFrontier";
import { loadAllShown } from "../bonds";
import { batchIdOf } from "../bes/store";
import { allowedClasses } from "../riskMatrix";
import { specRules } from "../portfolioSpec";
import { specCandidates } from "./candidates";
import { nsCandidates, windowsOfMatrix, type BesBond } from "./build";
import { solveWindow } from "./solve";
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
  const group = windowsOfMatrix().find((g) => g.includes(k));
  if (!group) return null;
  const cands = nsCandidates(bonds, duration, figures);
  const win = await solveWindow(cands, [...allowedClasses(k)], specRules(duration), group.length, { only: group.indexOf(k), timeLimit: 20 });
  const r = win.results[group.indexOf(k)];
  if (!r?.sel.length) return null;
  const byIsin = new Map(specCandidates(bonds, duration).map((c) => [c.b.isin, c]));
  const sel = r.sel.map((c) => byIsin.get(c.isin));
  return sel.every((c): c is BandCand => !!c) ? { sel, optimal: r.status === "optimal" } : null;
}
