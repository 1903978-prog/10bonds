import { windowModel } from "./riskWindow";
import type { PublicBond, RankedBond } from "./types";
import { bondNotch } from "./ratings";
import { LIMITS } from "./limits";
import { lossAdjustedYield, listLifeLoss } from "./expectedLoss";
import { lgdOf } from "./seniority";
import { portfolioPool, RESULT_COUNT, UNRATED_NOTCH, withinRisk } from "./ranking";
import { RETURN_UNIT, type ExactFrontier, type FrontierList } from "./exactFrontier";
import { activePolicy, checkList, END_POLICY, factsOf, policySignature, type CoherenceFacts, type CoherencePolicy } from "./coherence";
import { activeEngine, engineSignature, type EnginePolicy } from "./enginePolicy";
import { generateScenarios, portfolioRisk, PRESETS, CORRELATION_MODEL_VERSION, type FactorPreset } from "./correlatedLoss";
import { pdOf } from "./tiers";
import { issuerVerified } from "./issuerGroups";
import { stepGap } from "./stepGap";
import { lifeYears } from "./lifeYears";
import { loadSolver, MIP_ABS_GAP, SOLVER_OPTIONS } from "./highsSolver";
import { isSovereignBond } from "./sovereign";

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

type Cand = CoherenceFacts & { /** Position in the candidate list (scenario matrix column). */ ci: number; b: PublicBond; ret: number; dur: number; u: number; notch: number; years: number; /** Groups holding a safer, lower-default bond that pays within the spread rule's step of this one (lib/stepGap.ts). */ beatenBy: Set<string> };

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
  /** Present only when the experimental CVaR constraint was active: its setting and the model it was drawn from. */
  cvar?: CvarSetting & { model: string; calibrated: false; constraintTrainingS: number };
};
export type CoherentFrontier = ExactFrontier & { cert: Certificate; policy: CoherencePolicy; /** Served from a list saved for slightly older prices while the exact one is rebuilt (lib/frontierCache.ts). */ stale?: boolean };

/**
 * EXPERIMENTAL tail-risk constraint (paper 7.3, eq. 33-34): CVaR95 of the list's loss <= C, on a representative scenario sample drawn
 * from the factor model of lib/correlatedLoss.ts (NOT calibrated). C is in % of the money and must be given: the project has no
 * approved budget. Off unless asked for; production never passes it.
 */
export type CvarSetting = { /** budget C, % of the money */ C: number; /** scenarios used inside the optimiser */ scenarios: number; seed: number; preset: FactorPreset["id"]; /** scenarios of the independent validation sample */ validationScenarios?: number };
export type CvarCtx = { setting: CvarSetting; S: number; byScenario: { ci: number; loss: number }[][] };
const cvarOf = new WeakMap<object, CvarCtx>();
const ALPHA = 0.95;

/** The scenario sample the optimiser constrains on, for these candidates (also used by tests to enumerate the true optimum). */
export function cvarContext(cands: Cand[], setting: CvarSetting): CvarCtx {
  const sc = generateScenarios(cands.map((c) => ({ pd: pdOf(c.b) / 100, lgd: lgdOf(c.b), sector: c.sector, country: c.b.country ?? "n/a" })), PRESETS[setting.preset], setting.scenarios, setting.seed);
  const byScenario: CvarCtx["byScenario"] = Array.from({ length: sc.S }, () => []);
  for (const e of sc.events) byScenario[e.s].push({ ci: e.i, loss: e.loss });
  return { setting, S: sc.S, byScenario };
}

/** CVaR95 (% of the money) of the list of candidate positions `ci` on a scenario sample. */
export function listCvar(ctx: CvarCtx, ci: Set<number>): number {
  const L = new Float64Array(ctx.S);
  ctx.byScenario.forEach((ev, s) => { for (const e of ev) if (ci.has(e.ci)) L[s] += (e.loss * 100) / N; });
  const sorted = Float64Array.from(L).sort();
  const tail = (1 - ALPHA) * ctx.S;
  const whole = Math.floor(tail + 1e-9);
  let sum = 0;
  for (let k = 0; k < whole; k++) sum += sorted[ctx.S - 1 - k];
  if (tail - whole > 1e-9) sum += (tail - whole) * sorted[ctx.S - 1 - whole];
  return sum / tail;
}

type Spec = { objective: "loss" | "ret"; retMin?: number; lossMax?: number; /** 30-band mode: average risk class of the list within [lo, hi]. */ riskBand?: { lo: number; hi: number }; /** The two ends of the slider: no spread rule, and at least this many risk 1 bonds. */ end?: { minRisk1: number } };
type Outcome = { status: "optimal" | "infeasible" | "uncertified"; sel: Cand[] };

export function candidatesOf(bonds: PublicBond[], duration: number, spreadRule = true): Cand[] {
  const { pool } = portfolioPool(withinRisk(bonds, LIMITS.risk.max), duration, N);
  const cands = pool
    .filter((b) => b.grossYtm !== null && b.grossYtm > 0 && Number.isFinite(b.grossYtm) && b.modifiedDuration !== null && Number.isFinite(b.modifiedDuration) && issuerVerified(b))
    .map((b) => ({ ...factsOf(b), ci: 0, b, ret: b.grossYtm!, dur: b.modifiedDuration!, u: Math.floor(b.grossYtm! / RETURN_UNIT + 1e-9), notch: bondNotch(b) ?? UNRATED_NOTCH, years: lifeYears(b), beatenBy: new Set<string>() }));
  // A bond whose default chance cannot be worked out (no usable maturity) cannot be priced into the model: left out.
  for (let i = cands.length - 1; i >= 0; i--) if (!Number.isFinite(cands[i].pd) || !Number.isFinite(cands[i].years)) cands.splice(i, 1);
  cands.forEach((c, k) => { c.ci = k; });
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
  for (let again = !spec.end; again; ) {
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
  if (spec.riskBand) {
    add("rlo", sum(all, (i) => cs[i].cls), ">=", spec.riskBand.lo * N - 1e-9);
    add("rhi", sum(all, (i) => cs[i].cls), "<=", spec.riskBand.hi * N + 1e-9);
  }
  add("core", sum(all.filter((i) => cs[i].cls >= m - 1), () => 1), ">=", p.minCore);
  add("worst", sum(all.filter((i) => cs[i].cls === m), () => 1), ">=", p.minWorst);
  if (spec.end) add("risk1", sum(all.filter((i) => cs[i].cls === 1), () => 1), ">=", spec.end.minRisk1);
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
  // Risk consistency: all ten bonds inside one window of three consecutive risk classes (lib/riskWindow.ts), also at the slider ends.
  const win = windowModel(cs.map((c) => c.cls), (i) => `x${i}`);
  rows.push(...win.rows);
  const objective = spec.objective === "loss" ? `Minimize\n obj: ${sum(all, (i) => cs[i].pd)}` : `Maximize\n obj: ${sum(all, (i) => cs[i].ret)}`;

  // Loss share: S = the list's summed default chance, and every bond's own default chance <= share x S (sparse rows).
  const shareRows = [
    ` sdef: S - ${joinLines(all.filter((i) => cs[i].pd > 1e-12).map((i) => `${num(cs[i].pd)} x${i}`), " - ")} = 0`,
    ...all.filter((i) => cs[i].pd > 1e-12).map((i) => ` sh${i}: ${num(cs[i].pd)} x${i} - ${num(p.maxLossShare)} S <= 0`),
  ];
  // Spread rule: a chosen bond needs every group holding a safer bond that beats it to be chosen too (b <= that group's bonds).
  const members = by((c) => c.group!);
  const spreadRows: string[] = [];
  if (!spec.end) for (const i of all) for (const g of cs[i].beatenBy) spreadRows.push(` sp${spreadRows.length}: x${i} - ${joinLines((members.get(g) ?? []).map((j) => `x${j}`), " - ")} <= 0`);
  // Tail risk (eq. 33-34): xi_s >= L_s - eta, eta + sum(xi)/((1-alpha) S) <= C; scenarios with no default among the bonds here need no row (eta >= 0).
  const cv = cvarOf.get(stats);
  const cvarRows: string[] = [];
  let cvarBounds = "";
  if (cv) {
    const local = new Map(cs.map((c, i) => [c.ci, i]));
    const used: number[] = [];
    cv.byScenario.forEach((ev, s) => {
      const terms = ev.filter((e) => local.has(e.ci)).map((e) => `${num((e.loss * 100) / N)} x${local.get(e.ci)}`);
      if (!terms.length) return;
      used.push(s);
      cvarRows.push(` cv${s}: xi${s} + eta - ${joinLines(terms, " - ")} >= 0`);
    });
    cvarRows.push(` cvar: eta${used.map((s, k) => `${k % 8 === 0 ? " +\n  " : " + "}${num(1 / ((1 - ALPHA) * cv.S))} xi${s}`).join("")} <= ${num(cv.setting.C)}`);
    cvarBounds = " eta >= 0\n";
  }
  const lp = `${objective}\nSubject To\n${[...rows, ...shareRows, ...spreadRows, ...cvarRows].join("\n")}\nBounds\n S >= 0\n${cvarBounds}Binary\n ${[...all.map((i) => `x${i}`), ...win.binaries].reduce((out, t, k) => out + (k === 0 ? "" : k % 20 === 0 ? "\n " : " ") + t, "")}\nEnd`;
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
    .map((o) => ({ ...o.b, ratingNotch: bondNotch(o.b), score: lossAdjustedYield(o.ret, bondNotch(o.b) ?? UNRATED_NOTCH, o.b.modifiedDuration!, lgdOf(o.b), isSovereignBond(o.b)), rank: 0 }))
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

/**
 * The two ends of the slider (the owner, 27/10/2026), solved with the end rules instead of the coherence rules:
 *   high return end = the 10 highest-return bonds of 10 issuer groups, any risk up to the ceiling (no rating window, no
 *   sector or loss-share cap, no cap on weak bonds, no spread rule), least loss among equals;
 *   low return end = the least-loss list that takes as many risk 1 (AAA) bonds as there are issuer groups for, up to 10,
 *   and fills the rest from the next classes only as far as needed (no sector or loss-share cap).
 * Both keep: 10 bonds, one per issuer group, each bond within +-20% and the average within +-5% of the horizon.
 */

async function highEnd(cands: Cand[], duration: number, ceiling: number, stats: Certificate): Promise<Cand[] | null> {
  const cs = cands.filter((c) => c.cls <= ceiling);
  const r = await solve(cs, ceiling, END_POLICY, duration, { objective: "ret", end: { minRisk1: 0 } }, stats);
  if (!r.sel.length) return null;
  const r2 = await solve(cs, ceiling, END_POLICY, duration, { objective: "loss", retMin: retOf(r.sel) - 1e-7, end: { minRisk1: 0 } }, stats);
  return r2.sel.length ? r2.sel : r.sel;
}

async function lowEnd(cands: Cand[], duration: number, stats: Certificate): Promise<Cand[] | null> {
  const risk1 = new Set(cands.filter((c) => c.cls === 1).map((c) => c.group)).size;
  const need = Math.min(N, risk1);
  for (let ceil = need >= N ? 1 : 2; ceil <= 10; ceil++) {
    const cs = cands.filter((c) => c.cls <= ceil);
    const r = await solve(cs, ceil, END_POLICY, duration, { objective: "loss", end: { minRisk1: need } }, stats);
    if (!r.sel.length) continue;
    const r2 = await solve(cs, ceil, END_POLICY, duration, { objective: "ret", lossMax: lossOf(r.sel) + TOL, end: { minRisk1: need } }, stats);
    return r2.sel.length ? r2.sel : r.sel;
  }
  return null;
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
export async function coherentFrontier(bonds: PublicBond[], duration: number, p: CoherencePolicy = activePolicy(), ceiling: number = LIMITS.risk.max, opts: { /** Diagnostics only: leave the spread rule out to see which rule binds. */ noSpreadRule?: boolean; /** Versioned spread / composition switches (lib/enginePolicy.ts); default = the active engine policy. */ engine?: EnginePolicy; /** EXPERIMENTAL tail-risk constraint (see CvarSetting); never passed by production code. */ cvar?: CvarSetting } = {}): Promise<CoherentFrontier> {
  const t0 = Date.now();
  const engine = opts.engine ?? activeEngine();
  // The loss model is read from the active engine policy deep inside the bond figures: a different one must be activated with setEngine first.
  if (engine.loss !== activeEngine().loss) throw new Error(`Loss model ${engine.loss} asked for, but ${activeEngine().loss} is active (setEngine first).`);
  // Composition "ceiling_only": no rating window, core or worst-class rule; only the ceiling limits the classes.
  if (engine.composition === "ceiling_only") p = { ...p, maxDispersion: 9, minCore: 0, minWorst: 1 };
  const stats: Certificate = { policy: policySignature(p) + engineSignature(engine), solves: 0, optimal: 0, infeasible: 0, uncertified: 0, absGap: TOL, relGap: 0, seconds: 0, certified: true };
  const cands = candidatesOf(bonds, duration, engine.spread === "hard_constraint" && !opts.noSpreadRule);
  if (opts.cvar && cands.length >= N) {
    const ctx = cvarContext(cands, opts.cvar);
    cvarOf.set(stats, ctx);
    stats.cvar = { ...opts.cvar, model: CORRELATION_MODEL_VERSION, calibrated: false, constraintTrainingS: ctx.S };
  }
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
  const low = (await lowEnd(cands, duration, stats)) ?? first.sel;
  const top = (await highEnd(cands, duration, ceiling, stats)) ?? (await topList(cands, p, duration, ceiling, stats)) ?? first.sel;
  const points: FrontierList[] = [{ ...listOf(low), end: "low" }];
  const lo = retOf(low), hi = retOf(top);
  let reached = lo;
  for (let k = 1; k < GRID && reached < hi - 1e-6; k++) {
    const T = Math.max(lo + ((hi - lo) * k) / GRID, reached + 1e-4);
    if (T > hi + 1e-9) break;
    const r = await bestAt(cands, p, duration, ceiling, T, bound, stats);
    if (!r) break;
    points.push(listOf(r.sel));
    reached = Math.max(reached, retOf(r.sel));
  }
  points.push({ ...listOf(top), end: "high" });
  const out = finish(points);
  const cv = cvarOf.get(stats);
  if (cv) {
    const ciOf = new Map(cands.map((c) => [c.b.isin, c]));
    for (const pt of out.points) {
      const members = pt.rows.map((r) => ciOf.get(r.isin)!);
      const exposures = members.map((c) => ({ pd: pdOf(c.b) / 100, lgd: lgdOf(c.b), sector: c.sector, country: c.b.country ?? "n/a" }));
      pt.cvar = { training: listCvar(cv, new Set(members.map((c) => c.ci))), validation: portfolioRisk(exposures, PRESETS[cv.setting.preset], cv.setting.validationScenarios ?? 200_000, cv.setting.seed + 1000).cvar95Pct };
      if (pt.cvar.training > cv.setting.C + 1e-6) throw new Error(`CVaR constraint violated on its own scenarios: ${pt.cvar.training} > ${cv.setting.C}`);
    }
  }
  // Last guard: every list returned really satisfies every rule.
  for (const pt of out.points) {
    const bad = checkList(pt.rows.map((r) => factsOf(r)), pt.end ? END_POLICY : p, ceiling).filter((c) => !c.ok);
    const avgDur = pt.rows.reduce((s, r) => s + r.modifiedDuration!, 0) / pt.rows.length;
    if (bad.length || Math.abs(avgDur - duration) > duration * 0.05 + 1e-6) throw new Error(`Coherent list breaks a rule: ${bad.map((c) => c.rule + " " + c.detail).join("; ") || "average duration " + avgDur}`);
  }
  return out;
}

/**
 * 30-BAND MODE (owner 27/10/2026, separate from the live slider; nothing in production calls it): the highest-return list of 10 whose AVERAGE risk
 * class lies in [lo, hi], under the given policy (one bond per issuer group, durations, sector / loss-share / weak-bond caps, ceiling). Among lists with the
 * same maximum return (within the solver tolerance) the one with the least expected loss. null = no list exists in the band under this policy.
 * The policy's rating window and worst-class rules are not used here: the band itself fixes the average risk.
 */
export async function bestInBand(cands: Cand[], p: CoherencePolicy, duration: number, band: { lo: number; hi: number }, stats: Certificate): Promise<{ status: "optimal" | "infeasible" | "uncertified"; sel: Cand[] }> {
  const q: CoherencePolicy = { ...p, maxDispersion: 9, minCore: 0, minWorst: 0 };
  const top = await solve(cands, LIMITS.risk.max, q, duration, { objective: "ret", riskBand: band }, stats);
  if (top.status === "infeasible" || !top.sel.length) return top;
  const r2 = await solve(cands, LIMITS.risk.max, q, duration, { objective: "loss", retMin: retOf(top.sel) - 1e-7, riskBand: band }, stats);
  return r2.sel.length && r2.status === "optimal" ? r2 : top;
}
export type BandCand = Cand;
export const newCertificate = (): Certificate => ({ policy: "bands", solves: 0, optimal: 0, infeasible: 0, uncertified: 0, absGap: TOL, relGap: 0, seconds: 0, certified: true });
export { listOf as listOfCands, lossOf as lossOfCands, retOf as retOfCands, TOL as SOLVER_TOL };
/** One exact solve under the regular rules with no rating window (only the ceiling), optionally inside an average-risk band, a return floor or a loss cap. 30-band mode only. */
export async function solveFree(cands: Cand[], p: CoherencePolicy, duration: number, spec: { objective: "loss" | "ret"; retMin?: number; lossMax?: number; riskBand?: { lo: number; hi: number } }, stats: Certificate): Promise<{ status: "optimal" | "infeasible" | "uncertified"; sel: Cand[] }> {
  return solve(cands, LIMITS.risk.max, { ...p, maxDispersion: 9, minCore: 0, minWorst: 0 }, duration, spec, stats);
}
/** The two approved slider ends (low-risk end with as many risk 1 bonds as exist, and the maximum-yield end), built under their own end rules. */
export async function approvedEnds(cands: Cand[], duration: number, stats: Certificate): Promise<{ low: Cand[] | null; high: Cand[] | null }> {
  return { low: await lowEnd(cands, duration, stats), high: await highEnd(cands, duration, LIMITS.risk.max, stats) };
}
