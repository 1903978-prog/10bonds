import type { PublicBond } from "./types";
import { ALT, eligibleBonds, lossCap, solveSet, type Solved } from "./shortlistOptimize";

// Admin only: the "Alternative set" search for one shortlist, built in the background (a few solver runs of up to 20 s
// each, never on the request) and kept per bond copy, shortlist and its expected loss.

export type AltTarget = { target: number; status: Solved["status"]; ytm: number | null; el: number | null; withinLoss: boolean };
export type AltCore = {
  shortlistEl: number;
  eligible: number;
  dropped: { structure: number; risk: number; rank: number };
  /** Highest average return at an expected loss no higher than the shortlist's. */
  best: Solved;
  /** For each target return: the lowest expected loss that reaches it. */
  targets: AltTarget[];
  /** Only when the best return is under the first target: what the best return becomes with one rule relaxed. */
  blockers: { label: string; ytm: number | null }[];
  seconds: number;
};

const done = new Map<string, AltCore>();
const building = new Map<string, Promise<AltCore>>();
const failed = new Map<string, string>();

async function build(bonds: PublicBond[], shortlistEl: number): Promise<AltCore> {
  const t0 = Date.now();
  const { bonds: pool, dropped } = eligibleBonds(bonds);
  const cap = lossCap(shortlistEl);
  const base = { horizon: ALT.horizon, perSector: ALT.perSector };
  const best = await solveSet(pool, { ...base, objective: "ret", lossMax: cap });
  const targets: AltTarget[] = [];
  for (const target of ALT.targets) {
    const r = await solveSet(pool, { ...base, objective: "loss", retMin: target });
    targets.push({ target, status: r.status, ytm: r.status === "infeasible" ? null : r.ytm, el: r.status === "infeasible" ? null : r.el, withinLoss: r.status !== "infeasible" && r.el <= shortlistEl + 1e-9 });
  }
  const blockers: AltCore["blockers"] = [];
  if (best.status === "infeasible" || best.ytm < ALT.targets[0]) {
    const relaxed: [string, () => Promise<Solved>][] = [
      ["no limit of 2 bonds per sector", () => solveSet(pool, { ...base, perSector: 10, objective: "ret", lossMax: cap })],
      ["BBB bonds allowed too (risk up to 5)", () => solveSet(eligibleBonds(bonds, 5).bonds, { ...base, objective: "ret", lossMax: cap })],
      ["average duration within ±10% instead of ±5%", () => solveSet(pool, { ...base, durTol: 0.1, objective: "ret", lossMax: cap })],
      ["expected loss up to 25% above the shortlist's", () => solveSet(pool, { ...base, objective: "ret", lossMax: lossCap(shortlistEl * 1.25) })],
    ];
    for (const [label, run] of relaxed) {
      const r = await run();
      blockers.push({ label, ytm: r.status === "infeasible" ? null : r.ytm });
    }
  }
  return { shortlistEl, eligible: pool.length, dropped, best, targets, blockers, seconds: Math.round((Date.now() - t0) / 100) / 10 };
}

/** The finished search for this key, or null while it runs (it starts at once in the background). */
export function altFor(key: string, bonds: PublicBond[], shortlistEl: number): { core: AltCore } | { pending: true } | { error: string } {
  const hit = done.get(key);
  if (hit) return { core: hit };
  const err = failed.get(key);
  if (err) { failed.delete(key); return { error: err }; }
  if (!building.has(key)) {
    const p = build(bonds, shortlistEl);
    building.set(key, p);
    p.then((r) => { if (done.size > 16) done.clear(); done.set(key, r); })
      .catch((e) => { console.error("[shortlist-alt] failed:", (e as Error).message); failed.set(key, "The search failed. Try again."); })
      .finally(() => building.delete(key));
  }
  return { pending: true };
}
