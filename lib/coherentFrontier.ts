import type { PublicBond, RankedBond } from "./types";
import { bondNotch } from "./ratings";
import { LIMITS } from "./limits";
import { lossAdjustedYield, listLifeLoss } from "./expectedLoss";
import { lgdOf } from "./seniority";
import { portfolioPool, RESULT_COUNT, UNRATED_NOTCH, withinRisk } from "./ranking";
import { RETURN_UNIT, type ExactFrontier, type FrontierList } from "./exactFrontier";
import { activePolicy, checkList, factsOf, policySignature, type CoherenceFacts, type CoherencePolicy } from "./coherence";
import { issuerVerified } from "./issuerGroups";
import { stepGap } from "./stepGap";
import { lifeYears } from "./lifeYears";
import { loadSolver, MIP_ABS_GAP, SOLVER_OPTIONS } from "./highsSolver";

// The exact optimiser under the rating coherence and credit concentration rules (lib/coherence.ts), Methodology with
// spread rules only (admin). One mixed-integer programme per candidate worst class m = 1..R, solved by HiGHS (branch and
// cut): choose 10 bonds, minimise the summed default chance to maturity (= the expected loss on the money, at the same
// loss given default for every bond) such that
//   average return >= T; average duration within +-5% of the horizon (each bond's within +-20%, lib/ranking.ts);
//   classes only m-2..m; >= 7 bonds in classes m-1..m; >= 2 in class m; <= 2 rated B+ or below;
//   <= 1 per issuer group; <= 3 per major sector; each bond's default chance <= 25% of the list's total;
//   the spread rule (lib/stepGap.ts): a bond is only chosen if, for every safer, lower-default bond paying at least its
//   return less the step's minimum, that bond or another bond of its issuer group is chosen too.
// The loss-share rule is added row by row as the solver finds a violation (a cutting-plane loop that ends only when the
// solution satisfies it), so the answer is exactly the optimum of the full programme. Nothing is relaxed: when a
// programme is infeasible for a target, that target simply has no list. A solve that stops on its time limit is
// reported as uncertified, never as exact.
// Across m the best loss wins; equal losses (within 1e-7) go to the higher return. The efficient points are found by
// walking up the returns: each solve's list is optimal for every target up to its own return, so the next target is
// the larger of the next grid step and just above that return.

const N = RESULT_COUNT;
const TOL = MIP_ABS_GAP;
const GRID = 44;

type Cand = CoherenceFacts & { b: PublicBond; ret: number; dur: number; u: number; notch: number; years: number; /** Groups holding a safer, lower-default bond that pays within the spread rule's step of this one (lib/stepGap.ts). */ beatenBy: Set<string> };

export type Certificate = {
  /** Policy rules and version this result was computed with (lib/coherence.ts policySignature). */
  policy: string;
  solves: number;
  optimal: number;
  infeasible: number;
  /** Solves stopped by the time limit: their lists are not proven optimal. */
  uncertified: number;
  absGap: number;
  relGap: 0;
  seconds: number;
  /** True only when every solve that produced a list ended Optimal within the tolerances. */
  certified: boolean;
};
export type CoherentFrontier = ExactFrontier & { cert: Certificate; policy: CoherencePolicy };

type Spec = { objective: "loss" | "ret"; retMin?: number; lossMax?: number };
type Outcome = { status: "optimal" | "infeasible" | "uncertified"; sel: Cand[] };

export function candidatesOf(bonds: PublicBond[], duration: number, spreadRule = true): Cand[] {
  const { pool } = portfolioPool(withinRisk(bonds, LIMITS.risk.max), duration, N);
  const cands = pool
    .filter((b) => b.grossYtm !== null && b.grossYtm > 0 && Number.isFinite(b.grossYtm) && b.modifiedDuration !== null && Number.isFinite(b.modifiedDuration) && issuerVerified(b))
    .map((b) => ({ ...factsOf(b), b, ret: b.grossYtm!, dur: b.modifiedDuration!, u: Math.floor(b.grossYtm! / RETURN_UNIT + 1e-9), notch: bondNotch(b) ?? UNRATED_NOTCH, years: lifeYears(b), beatenBy: new Set<string>() }));
  // A bond whose default chance cannot be worked out (no usable maturity) cannot be priced into the model: left out.
  for (let i = cands.length - 1; i >= 0; i--) if (!Number.isFinite(cands[i].pd) || !Number.isFinite(cands[i].years)) cands.splice(i, 1);
  if (spreadRule) for (const b of cands) for (const d of cands) {
    if (d.group !== b.group && d.notch < b.notch && d.pd < b.pd - 1e-12 && d.ret >= b.ret - stepGap(d.notch, b.notch, b.years) - 1e-9) b.beatenBy.add(d.group!);
  }
  return cands;
}

const num = (x: number) => x.toFixed(6);
// The LP reader refuses lines over about 560 characters, so long sums continue on new lines.
const joinLines = (terms: string[], op: string) => terms.reduce((out, t, k) => out + (k === 0 ? "" : k % 8 === 0 ? `\n  ${op.trim()} ` : op) + t, "");
const sum = (idx: number[], coef: (i: number) => number) => idx.map((i) => `${num(coef(i))} x${i}`).reduce((out, t, k) => out + (k === 0 ? "" : k % 8 === 0 ? " +\n  " : " + ") + t, "");

async function solve(cs0: Cand[], m: number, p: CoherencePolicy, duration: number, spec: Spec, stats: Certificate): Promise<Outcome> {
  let cs = cs0;
  // A bond whose beating group has no bond in this subproblem can never satisfy the spread rule: out (exact).
  // Repeated until stable: dropping a bond can empty a group that another bond's rule points to.
  for (let again = true; again; ) {
    const groups = new Set(cs.map((c) => c.group!));
    const kept = cs.filter((c) => [...c.beatenBy].every((g) => groups.has(g)));
    again = kept.length < cs.length;
    cs = kept;
  }
  // Fewer bonds than the list needs, or fewer than the worst class needs: infeasible without asking the solver.
  if (cs.length < N || cs.filter((c) => c.cls === m).length < p.minWorst) { stats.infeasible++; return { status: "infeasible", sel: [] }; }
  const highs = await loadSolver();
  const all = cs.map((_, i) => i);
  const rows: string[] = [];
  const add = (name: string, body: string, op: string, rhs: number) => { if (body) rows.push(` ${name}: ${body} ${op} ${num(rhs)}`); };
  add("cnt", sum(all, () => 1), "=", N);
  add("dlo", sum(all, (i) => cs[i].dur), ">=", N * duration * 0.95);
  add("dhi", sum(all, (i) => cs[i].dur), "<=", N * duration * 1.05);
  if (spec.retMin !== undefined) add("ret", sum(all, (i) => cs[i].ret), ">=", spec.retMin * N);
  if (spec.lossMax !== undefined) add("los", sum(all, (i) => cs[i].pd), "<=", spec.lossMax);
  add("core", sum(all.filter((i) => cs[i].cls >= m - 1), () => 1), ">=", p.minCore);
  add("worst", sum(all.filter((i) => cs[i].cls === m), () => 1), ">=", p.minWorst);
  add("weak", sum(all.filter((i) => cs[i].weak), () => 1), "<=", p.maxWeak);
  const by = (key: (c: Cand) => string) => {
    const g = new Map<string, number[]>();
    for (const i of all) g.set(key(cs[i]), [...(g.get(key(cs[i])) ?? []), i]);
    return g;
  };
  let k = 0;
  for (const [, idx] of by((c) => c.group!)) if (idx.length > p.maxPerIssuer) add(`grp${k++}`, sum(idx, () => 1), "<=", p.maxPerIssuer);
  k = 0;
  for (const [, idx] of by((c) => c.sector)) if (idx.length > p.maxPerSector) add(`sec${k++}`, sum(idx, () => 1), "<=", p.maxPerSector);
  const objective = spec.objective === "loss" ? `Minimize\n obj: ${sum(all, (i) => cs[i].pd)}` : `Maximize\n obj: ${sum(all, (i) => cs[i].ret)}`;

  // Loss share: S = the list's summed default chance, and every bond's own default chance <= share x S (sparse rows).
  const shareRows = [
    ` sdef: S - ${joinLines(all.filter((i) => cs[i].pd > 1e-12).map((i) => `${num(cs[i].pd)} x${i}`), " - ")} = 0`,
    ...all.filter((i) => cs[i].pd > 1e-12).map((i) => ` sh${i}: ${num(cs[i].pd)} x${i} - ${num(p.maxLossShare)} S <= 0`),
  ];
  // Spread rule: a chosen bond needs every group holding a safer bond that beats it to be chosen too (b <= that group's bonds).
  const members = by((c) => c.group!);
  const spreadRows: string[] = [];
  for (const i of all) for (const g of cs[i].beatenBy) spreadRows.push(` sp${spreadRows.length}: x${i} - ${joinLines((members.get(g) ?? []).map((j) => `x${j}`), " - ")} <= 0`);
  const lp = `${objective}\nSubject To\n${[...rows, ...shareRows, ...spreadRows].join("\n")}\nBounds\n S >= 0\nBinary\n ${all.map((i) => `x${i}`).reduce((out, t, k) => out + (k === 0 ? "" : k % 20 === 0 ? "\n " : " ") + t, "")}\nEnd`;
  if (/NaN|Infinity/.test(lp)) throw new Error("Coherent model has a non-finite number");
  await new Promise((r) => setImmediate(r));
  stats.solves++;
  let res: Awaited<ReturnType<typeof highs.solve>>;
  try { res = await highs.solve(lp, SOLVER_OPTIONS); } catch (e) {
    const longest = Math.max(...lp.split("\n").map((l) => l.length));
    throw new Error(`${(e as Error).message} [model: ${cs.length} bonds, ${spreadRows.length} spread rows, ${lp.length} characters, longest line ${longest}, m=${m}]`);
  }
  if (res.Status === "Infeasible" || res.Status === "Primal infeasible or unbounded") { stats.infeasible++; return { status: "infeasible", sel: [] }; }
  const sel = all.filter((i) => (res.Columns[`x${i}`]?.Primal ?? 0) > 0.5).map((i) => cs[i]);
  if (res.Status !== "Optimal") { stats.uncertified++; return { status: "uncertified", sel }; }
  stats.optimal++;
  return { status: "optimal", sel };
}

const lossOf = (sel: Cand[]) => sel.reduce((s, c) => s + c.pd, 0);
const retOf = (sel: Cand[]) => sel.reduce((s, c) => s + c.ret, 0) / sel.length;

function listOf(picked: Cand[]): FrontierList {
  const rows: RankedBond[] = picked
    .map((o) => ({ ...o.b, ratingNotch: bondNotch(o.b), score: lossAdjustedYield(o.ret, bondNotch(o.b) ?? UNRATED_NOTCH, o.b.modifiedDuration!, lgdOf(o.b)), rank: 0 }))
    .sort((a, b) => b.score - a.score || b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin))
    .map((x, i) => ({ ...x, rank: i + 1 }));
  return { u: picked.reduce((s, o) => s + o.u, 0), ytm: retOf(picked), el: listLifeLoss(picked.map((o) => o.pd)), isins: rows.map((x) => x.isin).sort(), rows };
}

/** The best list over the candidate classes for one target, or null when no class has a list. `bound` = last known loss per class. */
async function bestAt(cands: Cand[], p: CoherencePolicy, duration: number, ceiling: number, T: number | undefined, bound: Map<number, number>, stats: Certificate): Promise<{ sel: Cand[]; m: number } | null> {
  const classes = [...bound.keys()].sort((a, b) => bound.get(a)! - bound.get(b)! || a - b);
  let best = Infinity;
  const hits: { m: number; sel: Cand[] }[] = [];
  for (const m of classes) {
    if (bound.get(m)! > best + TOL) break;
    const cs = cands.filter((c) => c.cls <= m && c.cls >= Math.max(1, m - p.maxDispersion) && c.cls <= ceiling);
    const r = await solve(cs, m, p, duration, { objective: "loss", retMin: T, lossMax: Number.isFinite(best) ? best + TOL : undefined }, stats);
    if (r.status === "infeasible") { bound.set(m, Number.isFinite(best) ? best + TOL : Infinity); continue; }
    if (!r.sel.length) continue;
    const l = lossOf(r.sel);
    bound.set(m, l);
    if (l < best - TOL) { best = l; hits.length = 0; hits.push({ m, sel: r.sel }); } else if (l <= best + TOL) hits.push({ m, sel: r.sel });
  }
  for (const m of [...bound.keys()]) if (bound.get(m) === Infinity) bound.delete(m);
  if (!hits.length) return null;
  // Equal least loss: the higher return wins (second stage per tied class).
  let top: { sel: Cand[]; m: number } | null = null;
  for (const h of hits) {
    const cs = cands.filter((c) => c.cls <= h.m && c.cls >= Math.max(1, h.m - p.maxDispersion));
    const r = await solve(cs, h.m, p, duration, { objective: "ret", retMin: T, lossMax: best + TOL }, stats);
    const sel = r.sel.length ? r.sel : h.sel;
    if (!top || retOf(sel) > retOf(top.sel) + 1e-9) top = { sel, m: h.m };
  }
  return top;
}

/** The highest-return list over all classes (least loss among equals). */
async function topList(cands: Cand[], p: CoherencePolicy, duration: number, ceiling: number, stats: Certificate): Promise<Cand[] | null> {
  let best: Cand[] | null = null;
  for (let m = 1; m <= ceiling; m++) {
    const cs = cands.filter((c) => c.cls <= m && c.cls >= Math.max(1, m - p.maxDispersion));
    const r = await solve(cs, m, p, duration, { objective: "ret" }, stats);
    if (!r.sel.length) continue;
    const r2 = await solve(cs, m, p, duration, { objective: "loss", retMin: retOf(r.sel) - 1e-7 }, stats);
    const sel = r2.sel.length ? r2.sel : r.sel;
    if (!best || retOf(sel) > retOf(best) + 1e-9 || (Math.abs(retOf(sel) - retOf(best)) <= 1e-9 && lossOf(sel) < lossOf(best))) best = sel;
  }
  return best;
}

/**
 * The efficient frontier of coherent lists for one horizon over the bonds given (already filtered: rated only, outliers
 * out, blacklist out). Each point is the exact least-loss list for its return under every rule, with the solver's
 * certificate in `cert`. Takes some seconds to minutes; yields to the server between solves.
 */
export async function coherentFrontier(bonds: PublicBond[], duration: number, p: CoherencePolicy = activePolicy(), ceiling: number = LIMITS.risk.max, opts: { /** Diagnostics only: leave the spread rule out to see which rule binds. */ noSpreadRule?: boolean } = {}): Promise<CoherentFrontier> {
  const t0 = Date.now();
  const stats: Certificate = { policy: policySignature(p), solves: 0, optimal: 0, infeasible: 0, uncertified: 0, absGap: TOL, relGap: 0, seconds: 0, certified: true };
  const cands = candidatesOf(bonds, duration, !opts.noSpreadRule);
  const finish = (points: FrontierList[]): CoherentFrontier => {
    stats.seconds = Math.round((Date.now() - t0) / 100) / 10;
    stats.certified = stats.uncertified === 0;
    const efficient = points
      .sort((a, b) => b.ytm - a.ytm || a.el - b.el)
      .filter(((min) => (x: FrontierList) => (x.el < min - 1e-12 ? ((min = x.el), true) : false))(Infinity))
      .reverse();
    return { points: efficient, size: cands.length, at: (target) => efficient.find((x) => x.ytm >= target - 1e-9) ?? null, cert: stats, policy: p };
  };
  if (cands.length < N) return finish([]);

  const bound = new Map<number, number>();
  for (let m = 1; m <= ceiling; m++) bound.set(m, 0);
  const first = await bestAt(cands, p, duration, ceiling, undefined, bound, stats);
  if (!first) return finish([]);
  const top = (await topList(cands, p, duration, ceiling, stats)) ?? first.sel;
  const points: FrontierList[] = [listOf(first.sel)];
  const lo = retOf(first.sel), hi = retOf(top);
  let reached = lo;
  for (let k = 1; k < GRID && reached < hi - 1e-6; k++) {
    const T = Math.max(lo + ((hi - lo) * k) / GRID, reached + 1e-4);
    if (T > hi + 1e-9) break;
    const r = await bestAt(cands, p, duration, ceiling, T, bound, stats);
    if (!r) break;
    points.push(listOf(r.sel));
    reached = Math.max(reached, retOf(r.sel));
  }
  points.push(listOf(top));
  const out = finish(points);
  // Last guard: every list returned really satisfies every rule.
  for (const pt of out.points) {
    const bad = checkList(pt.rows.map((r) => factsOf(r)), p, ceiling).filter((c) => !c.ok);
    const avgDur = pt.rows.reduce((s, r) => s + r.modifiedDuration!, 0) / pt.rows.length;
    if (bad.length || Math.abs(avgDur - duration) > duration * 0.05 + 1e-6) throw new Error(`Coherent list breaks a rule: ${bad.map((c) => c.rule + " " + c.detail).join("; ") || "average duration " + avgDur}`);
  }
  return out;
}
