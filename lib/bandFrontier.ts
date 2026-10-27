import type { PublicBond } from "./types";
import { activePolicy, checkList, END_POLICY, factsOf, type CoherencePolicy } from "./coherence";
import { approvedEnds, bestInBand, candidatesOf, lossOfCands, newCertificate, retOfCands, solveFree, SOLVER_TOL, type BandCand, type Certificate } from "./coherentFrontier";
import { listLifeLoss } from "./expectedLoss";
import { BANDS } from "./bandEngine";

// REVISED 30-BAND METHOD (owner 27/10/2026; separate from the live slider, nothing in production calls it).
// 1. Each of the 30 average-risk bands is used to DISCOVER lists: up to STEPS+2 exact trade-off lists per band (highest return, least loss, and points between).
// 2. All lists from all bands are pooled and the dominated ones removed.
// 3. Every surviving list is then tested against the WHOLE feasible set (no band): is there any list with at least its return and strictly less loss, or at least its loss
//    and strictly more return? If so, that list joins the pool and the test repeats. What survives is efficient for the declared feasible set (regular rules).
// 4. The two approved ends are added under their own rules and reported as a different feasible set.
// 5. Up to 30 slider positions are picked along the efficient set and every displayed list is re-verified from the raw bond data.

const E = 1e-6;

export type Pt = { sel: BandCand[]; ret: number; loss: number; el: number; src: string; key: string };
export const keyOf = (sel: BandCand[]) => sel.map((c) => c.b.isin).sort().join(",");
export const ptOf = (sel: BandCand[], src: string): Pt => ({ sel, ret: retOfCands(sel), loss: lossOfCands(sel), el: listLifeLoss(sel.map((c) => c.pd)), src, key: keyOf(sel) });

/** a is at least as good on both and better on one, beyond the solver tolerance. */
export const dominates = (a: { ret: number; loss: number }, b: { ret: number; loss: number }) => a.ret >= b.ret - E && a.loss <= b.loss + E && (a.ret > b.ret + E || a.loss < b.loss - E);

/** Removes dominated lists; of lists equal within tolerance the first is kept. */
export function nondominated<T extends { ret: number; loss: number }>(pts: T[]): T[] {
  const out: T[] = [];
  const sorted = pts.slice().sort((a, b) => b.ret - a.ret || a.loss - b.loss);
  for (const p of sorted) {
    if (sorted.some((q) => q !== p && dominates(q, p))) continue;
    if (out.some((q) => Math.abs(q.ret - p.ret) <= E && Math.abs(q.loss - p.loss) <= E)) continue;
    out.push(p);
  }
  return out.sort((a, b) => a.ret - b.ret);
}

/** Trade-off lists inside one band: highest return, then lower and lower loss caps, down to the least-loss list of the band. */
export async function tradeoffsInBand(cands: BandCand[], p: CoherencePolicy, duration: number, band: { lo: number; hi: number }, steps: number, stats: Certificate): Promise<Pt[]> {
  const top = await bestInBand(cands, p, duration, band, stats);
  if (!top.sel.length) return [];
  const pts: Pt[] = [ptOf(top.sel, `band ${band.lo}`)];
  const lo = await solveFree(cands, p, duration, { objective: "loss", riskBand: band }, stats);
  if (!lo.sel.length) return pts;
  const lo2 = await solveFree(cands, p, duration, { objective: "ret", lossMax: lossOfCands(lo.sel) + SOLVER_TOL, riskBand: band }, stats);
  const bottom = lo2.sel.length ? lo2.sel : lo.sel;
  const topLoss = lossOfCands(top.sel), botLoss = lossOfCands(bottom);
  if (topLoss - botLoss > 1e-4) {
    const delta = (topLoss - botLoss) / (steps + 1);
    for (let k = 1; k <= steps; k++) {
      const r = await solveFree(cands, p, duration, { objective: "ret", lossMax: topLoss - delta * k, riskBand: band }, stats);
      if (!r.sel.length) continue;
      const r2 = await solveFree(cands, p, duration, { objective: "loss", retMin: retOfCands(r.sel) - 1e-7, riskBand: band }, stats);
      pts.push(ptOf(r2.sel.length ? r2.sel : r.sel, `band ${band.lo}`));
    }
  }
  pts.push(ptOf(bottom, `band ${band.lo}`));
  return pts;
}

export type Frontier = {
  duration: number; candidates: number;
  perBand: { k: number; lo: number; hi: number; lists: number }[];
  pooled: number; afterBandFilter: number;
  /** Lists the whole-set test added that no band search had produced (found by an unrestricted solve). */
  addedByGlobalTest: number; globalRounds: number; globalSolves: number; /** false = the solve budget ran out before every gap was certified empty. */ complete: boolean; resolution: number;
  efficient: Pt[]; ends: { low: Pt | null; high: Pt | null };
  /** Efficient (regular rules) lists removed because an approved end list dominates them / end lists dominated by a regular list. */
  removedByEnds: number; endsDominatedByRegular: { low: boolean; high: boolean };
  cert: Certificate; seconds: number;
};

export async function buildFrontier(bonds: PublicBond[], duration: number, opts: { steps?: number; policy?: CoherencePolicy; resolution?: number; maxGapSolves?: number; noEnds?: boolean } = {}): Promise<Frontier> {
  const t0 = Date.now();
  const cands = candidatesOf(bonds, duration, false);
  const policy = opts.policy ?? activePolicy();
  const cert = newCertificate();
  const pool = new Map<string, Pt>();
  const perBand: Frontier["perBand"] = [];
  for (const b of BANDS) {
    const pts = await tradeoffsInBand(cands, policy, duration, b, opts.steps ?? 8, cert);
    perBand.push({ k: b.k, lo: b.lo, hi: b.hi, lists: pts.length });
    for (const q of pts) if (!pool.has(q.key)) pool.set(q.key, q);
  }
  const pooled = pool.size;
  let nd = nondominated([...pool.values()]);
  const afterBandFilter = nd.length;
  // Whole-set certification (no band). Seeds: the least-loss list and the highest-return list of the whole feasible set. Then every gap between two neighbouring
  // efficient lists A < B is probed with ONE unrestricted solve: the least-loss list with return at least A + resolution. If its loss is below B's, a list the band search
  // missed has been found and joins the pool; if not, nothing lies between A and B. When every gap (and the stretch above the last list) is empty, the pool is exactly the
  // efficient set of the declared feasible set, down to the resolution.
  const delta = opts.resolution ?? 1e-4;
  const maxSolves = opts.maxGapSolves ?? 2500;
  const solvesBefore = cert.solves;
  let added = 0, complete = true;
  const addPt = (sel: BandCand[]) => { const n = ptOf(sel, "whole-set test"); if (pool.has(n.key)) return false; pool.set(n.key, n); added++; return true; };
  const refineByReturn = async (sel: BandCand[]) => { const r = await solveFree(cands, policy, duration, { objective: "ret", lossMax: lossOfCands(sel) + SOLVER_TOL }, cert); return r.sel.length && retOfCands(r.sel) >= retOfCands(sel) ? r.sel : sel; };
  const seedLow = await solveFree(cands, policy, duration, { objective: "loss" }, cert);
  if (seedLow.sel.length) addPt(await refineByReturn(seedLow.sel));
  const seedTop = await solveFree(cands, policy, duration, { objective: "ret" }, cert);
  if (seedTop.sel.length) { const r = await solveFree(cands, policy, duration, { objective: "loss", retMin: retOfCands(seedTop.sel) - 1e-7 }, cert); addPt(r.sel.length ? r.sel : seedTop.sel); }
  const succ = async (a: Pt): Promise<BandCand[] | null> => {
    const r = await solveFree(cands, policy, duration, { objective: "loss", retMin: a.ret + delta }, cert);
    return r.sel.length ? await refineByReturn(r.sel) : null;
  };
  const certified = new Set<string>();
  let rounds = 0;
  nd = nondominated([...pool.values()]);
  for (;;) {
    let progressed = false;
    for (let i = 0; i < nd.length; i++) {
      const A = nd[i], B = nd[i + 1];
      const gk = `${A.key}|${B ? B.key : "end"}`;
      if (certified.has(gk)) continue;
      if (cert.solves - solvesBefore > maxSolves) { complete = false; break; }
      const S = await succ(A);
      const empty = B ? !S || lossOfCands(S) >= B.loss - E : !S;
      if (empty) { certified.add(gk); continue; }
      addPt(S!);
      progressed = true;
      break;
    }
    rounds++;
    if (!progressed) break;
    nd = nondominated([...pool.values()]);
  }
  const globalSolves = cert.solves - solvesBefore;
  // Approved ends: their own feasible set.
  const e = opts.noEnds ? { low: null, high: null } : await approvedEnds(cands, duration, cert);
  const low = e.low ? ptOf(e.low, "low end") : null, high = e.high ? ptOf(e.high, "high end") : null;
  const regular = nd;
  const endsDominatedByRegular = { low: !!low && regular.some((q) => dominates(q, low)), high: !!high && regular.some((q) => dominates(q, high)) };
  const ends = [low, high].filter((x): x is Pt => !!x);
  const keep = regular.filter((q) => !ends.some((x) => dominates(x, q)));
  const removedByEnds = regular.length - keep.length;
  const efficient = [...keep, ...ends.filter((x) => !keep.some((q) => q.key === x.key))].sort((a, b) => a.ret - b.ret);
  cert.seconds = (Date.now() - t0) / 1000;
  cert.certified = cert.uncertified === 0;
  return { duration, candidates: cands.length, perBand, pooled, afterBandFilter, addedByGlobalTest: added, globalRounds: rounds, globalSolves, complete, resolution: delta, efficient, ends: { low, high }, removedByEnds, endsDominatedByRegular, cert, seconds: cert.seconds };
}

/** Up to n positions along the efficient set, evenly spaced in return; always both ends. */
export function pickPositions(eff: Pt[], n = 30): Pt[] {
  if (eff.length <= n) return eff;
  const lo = eff[0].ret, hi = eff[eff.length - 1].ret;
  const out: Pt[] = [eff[0]];
  for (let k = 1; k < n - 1; k++) {
    const target = lo + ((hi - lo) * k) / (n - 1);
    const c = eff.find((x) => x.ret >= target - 1e-12 && x.ret > out[out.length - 1].ret);
    if (c && c !== out[out.length - 1] && c !== eff[eff.length - 1]) out.push(c);
  }
  out.push(eff[eff.length - 1]);
  return out;
}

export type Verification = { ok: boolean; problems: string[]; ret: number; dur: number; el: number; avgRisk: number; class1: number };
/** Re-derives every figure of a displayed list from the raw bond rows (not from the solver's candidate objects) and re-checks every rule. */
export function verifyList(isins: string[], bonds: PublicBond[], duration: number, policy: CoherencePolicy, isEnd: boolean): Verification {
  const by = new Map(bonds.map((b) => [b.isin, b]));
  const rows = isins.map((i) => by.get(i));
  const problems: string[] = [];
  if (rows.some((r) => !r)) return { ok: false, problems: ["ISIN not in the data"], ret: NaN, dur: NaN, el: NaN, avgRisk: NaN, class1: 0 };
  const bs = rows as PublicBond[];
  if (new Set(isins).size !== 10) problems.push("not 10 different ISINs");
  const facts = bs.map((b) => factsOf(b));
  const q = { ...policy, maxDispersion: 9, minCore: 0, minWorst: 0 };
  for (const c of checkList(facts, isEnd ? END_POLICY : q, 10)) if (!c.ok && c.rule !== "worst" && c.rule !== "core") problems.push(`${c.rule}: ${c.detail}`);
  const dur = bs.reduce((s, b) => s + b.modifiedDuration!, 0) / 10;
  if (Math.abs(dur - duration) > duration * 0.05 + 1e-9) problems.push(`average duration ${dur.toFixed(3)} outside +-5%`);
  for (const b of bs) if (Math.abs(b.modifiedDuration! - duration) > duration * 0.2 + 1e-9) problems.push(`${b.isin} duration ${b.modifiedDuration} outside +-20%`);
  return { ok: !problems.length, problems, ret: bs.reduce((s, b) => s + b.grossYtm!, 0) / 10, dur, el: listLifeLoss(facts.map((f) => f.pd)), avgRisk: facts.reduce((s, f) => s + f.cls, 0) / 10, class1: facts.filter((f) => f.cls === 1).length };
}
