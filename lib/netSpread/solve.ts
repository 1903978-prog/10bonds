import { loadSolver, SOLVER_OPTIONS } from "../highsSolver";
import { PORTFOLIO_SPEC, type Rules } from "../portfolioSpec";

// The optimiser of the portfolio spec (owner, 28/10/2026). Every function picks 10 bonds, equal weight, that obey every hard rule:
// only the allowed risk classes (three consecutive classes, so max - min <= 2), average duration within the step's tolerance of the horizon,
// one bond per issuer group, the sector cap, no bond above the step's share of the list's expected loss. One mixed-integer solve by HiGHS
// (lib/highsSolver.ts, worker thread). Objectives: highest equal-weight net spread (bp per year), then lowest annual expected loss among equal
// ones (second solve); or the highest / lowest average risk (the two anchors, lib/riskAnchors.ts), then the same net spread rule.
// Never maximises the sum of bond BES values (a percentile inside a peer group is not an economic amount).

export const NS_SIZE = PORTFOLIO_SPEC.size;
export const NS_TIE = 1e-4; // bp: two net spreads closer than this count as equal for the tie-break (inputs carry 2 decimals)

export type NsCand = {
  isin: string;
  /** Issuer group (one bond per group) and sector (cap), exactly as the band engine uses them. */
  group: string;
  sector: string;
  /** Sovereign, supranational or agency: not counted towards the sector cap from ladder step 1. */
  exempt?: boolean;
  /** Own risk class 1..10 and modified duration (years). */
  cls: number;
  dur: number;
  /** Basis points per year: credit-adjusted net spread (objective), gross spread, annual expected credit loss. */
  ns: number;
  grossBp: number;
  lossBp: number;
  ytm: number;
  /** Bond-level BES 0-100, secondary indicator only. */
  bes: number | null;
};
export type NsRules = Rules;
export type NsSolve = { status: "optimal" | "infeasible" | "uncertified"; sel: NsCand[]; objectiveBp: number | null; seconds: number; candidates: number };
/** Sum of the ten bond risk classes (tenths of the average risk), inclusive. */
export type SumRange = { lo: number; hi: number };

const num = (x: number) => x.toFixed(6);
const terms = (idx: number[], coef: (i: number) => number) =>
  idx.reduce((out, i, k) => out + (k === 0 ? "" : k % 8 === 0 ? " +\n  " : " + ") + `${num(coef(i))} x${i}`, "");

type Stage = { objective: "ns" | "loss" | "risk-max" | "risk-min"; nsMin?: number; sum?: SumRange; /** Floor for the average return (ytm, same unit as NsCand.ytm): a riskier position never returns less than the one below it. */ retMin?: number; /** Floor for the average annual expected loss (bp): a riskier position never has a lower expected loss. */ lossMin?: number };

async function stage(cs: NsCand[], rules: NsRules, st: Stage, timeLimit: number): Promise<{ status: NsSolve["status"]; sel: NsCand[] }> {
  const all = cs.map((_, i) => i);
  const rows: string[] = [];
  const add = (name: string, idx: number[], coef: (i: number) => number, op: string, rhs: number) => { if (idx.length) rows.push(` ${name}: ${terms(idx, coef)} ${op} ${num(rhs)}`); };
  add("cnt", all, () => 1, "=", NS_SIZE);
  add("dlo", all, (i) => cs[i].dur, ">=", NS_SIZE * rules.duration * (1 - rules.avgTol));
  add("dhi", all, (i) => cs[i].dur, "<=", NS_SIZE * rules.duration * (1 + rules.avgTol));
  if (st.nsMin !== undefined) add("nsmin", all, (i) => cs[i].ns, ">=", st.nsMin * NS_SIZE);
  if (st.retMin !== undefined) add("retmin", all, (i) => cs[i].ytm, ">=", st.retMin * NS_SIZE);
  if (st.lossMin !== undefined) add("lossmin", all, (i) => cs[i].lossBp, ">=", st.lossMin * NS_SIZE);
  if (st.sum) { add("rlo", all, (i) => cs[i].cls, ">=", st.sum.lo); add("rhi", all, (i) => cs[i].cls, "<=", st.sum.hi); }
  // No bond above `lossShare` of the list's annual expected loss: loss_i x_i <= share * T, with T the list's total (one extra row, two terms per bond).
  const lossy = all.filter((i) => cs[i].lossBp > 0);
  if (lossy.length) {
    rows.push(` tot: ${terms(lossy, (i) => cs[i].lossBp)} - 1.000000 t = 0.000000`);
    for (const i of lossy) rows.push(` sh${i}: ${num(cs[i].lossBp)} x${i} - ${num(rules.lossShare)} t <= 0.000000`);
  }
  const by = (key: (c: NsCand) => string, pick: (c: NsCand) => boolean) => {
    const g = new Map<string, number[]>();
    for (const i of all) if (pick(cs[i])) g.set(key(cs[i]), [...(g.get(key(cs[i])) ?? []), i]);
    return g;
  };
  let k = 0;
  for (const idx of by((c) => c.group, () => true).values()) if (idx.length > rules.perIssuer) add(`grp${k++}`, idx, () => 1, "<=", rules.perIssuer);
  k = 0;
  for (const idx of by((c) => c.sector, (c) => !(rules.sectorExempt && c.exempt)).values()) if (idx.length > rules.perSector) add(`sec${k++}`, idx, () => 1, "<=", rules.perSector);
  const obj =
    st.objective === "ns" ? `Maximize\n obj: ${terms(all, (i) => cs[i].ns)}`
    : st.objective === "loss" ? `Minimize\n obj: ${terms(all, (i) => cs[i].lossBp)}`
    : st.objective === "risk-max" ? `Maximize\n obj: ${terms(all, (i) => cs[i].cls)}`
    : `Minimize\n obj: ${terms(all, (i) => cs[i].cls)}`;
  const lp = `${obj}\nSubject To\n${rows.join("\n")}\nBounds\n${lossy.length ? " t >= 0\n" : ""}Binary\n ${all.map((i) => `x${i}`).reduce((out, t, j) => out + (j === 0 ? "" : j % 20 === 0 ? "\n " : " ") + t, "")}\nEnd`;
  if (/NaN|Infinity/.test(lp)) throw new Error("Net-spread model has a non-finite number");
  await new Promise((r) => setImmediate(r));
  const highs = await loadSolver();
  const res = await highs.solve(lp, { ...SOLVER_OPTIONS, mip_abs_gap: 1e-6, time_limit: timeLimit });
  if (res.Status === "Infeasible" || res.Status === "Primal infeasible or unbounded") return { status: "infeasible", sel: [] };
  const sel = all.filter((i) => (res.Columns[`x${i}`]?.Primal ?? 0) > 0.5).map((i) => cs[i]);
  return { status: res.Status === "Optimal" && sel.length === NS_SIZE ? "optimal" : "uncertified", sel };
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const sumCls = (sel: NsCand[]) => sel.reduce((s, c) => s + c.cls, 0);
/** Candidates of the allowed classes, in a fixed order (ISIN), so one input always gives one answer. */
export const eligible = (cands: NsCand[], classLo: number, classHi: number) => cands.filter((c) => c.cls >= classLo && c.cls <= classHi).sort((a, b) => a.isin.localeCompare(b.isin));

type Solved = { status: NsSolve["status"]; sel: NsCand[] };
const merge = (a: NsSolve["status"], b: NsSolve["status"]): NsSolve["status"] => (a === "optimal" && b === "optimal" ? "optimal" : "uncertified");

/** Highest net spread; among equal net spreads the lowest annual expected loss (second solve). Optional: the sum of the ten classes inside a range. */
export async function best(cs: NsCand[], rules: NsRules, limit: number, sum?: SumRange, retMin?: number, lossMin?: number): Promise<Solved> {
  if (cs.length < NS_SIZE) return { status: "infeasible", sel: [] };
  const top = await stage(cs, rules, { objective: "ns", sum, retMin, lossMin }, limit);
  if (top.status === "infeasible" || !top.sel.length) return { status: "infeasible", sel: [] };
  const net = mean(top.sel.map((c) => c.ns));
  const low = await stage(cs, rules, { objective: "loss", nsMin: net - NS_TIE, sum, retMin, lossMin }, limit);
  // The tie-break list is only used when it keeps the proven net spread.
  if (!low.sel.length || mean(low.sel.map((c) => c.ns)) < net - 2 * NS_TIE) return top;
  return { status: merge(top.status, low.status), sel: low.sel };
}

const done = (r: Solved, cs: NsCand[], t0: number): NsSolve => ({ status: r.status, sel: r.sel, objectiveBp: r.sel.length ? mean(r.sel.map((c) => c.ns)) : null, seconds: Math.round((Date.now() - t0) / 100) / 10, candidates: cs.length });

/** Exact best list for one position: the allowed classes, a range for the sum of classes. */
export async function solvePosition(cands: NsCand[], classLo: number, classHi: number, sum: SumRange, rules: NsRules, opts: { timeLimit?: number; /** Floor for the list's average return (ytm). */ retMin?: number; /** Floor for the list's average annual expected loss (bp). */ lossMin?: number } = {}): Promise<NsSolve> {
  const t0 = Date.now();
  const cs = eligible(cands, classLo, classHi);
  return done(await best(cs, rules, opts.timeLimit ?? SOLVER_OPTIONS.time_limit, sum, opts.retMin, opts.lossMin), cs, t0);
}

/** Exact best list with no risk target, for a given class window (kept for tests and single-position callers). */
export async function solveNetSpread(cands: NsCand[], classLo: number, classHi: number, rules: NsRules, opts: { timeLimit?: number } = {}): Promise<NsSolve> {
  const t0 = Date.now();
  const cs = eligible(cands, classLo, classHi);
  return done(await best(cs, rules, opts.timeLimit ?? SOLVER_OPTIONS.time_limit), cs, t0);
}

export type Extreme = { status: NsSolve["status"]; /** Sum of the ten classes (tenths of average risk) of the extreme; null when no list exists at all. */ sum: number | null; classLo: number; classHi: number; sel: NsCand[]; seconds: number; candidates: number };

const WINDOWS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * The riskiest ("max") or safest ("min") list under every rule of the rules' step: the extreme sum of classes over every 3-class window
 * (windows are tried from the riskiest down / safest up and stop once they cannot beat the best found). Only the SUM is solved here when
 * `withList` is false (the cheap path); with the list, the extreme sum is then fixed and the highest net spread (then lowest loss) wins.
 */
export async function extremeOf(cands: NsCand[], dir: "max" | "min", rules: NsRules, opts: { timeLimit?: number; withList?: boolean } = {}): Promise<Extreme> {
  const t0 = Date.now();
  const limit = opts.timeLimit ?? SOLVER_OPTIONS.time_limit;
  const order = dir === "max" ? [...WINDOWS].reverse() : WINDOWS;
  let bestSum: number | null = null;
  const hits: { w: number; status: NsSolve["status"] }[] = [];
  let status: NsSolve["status"] = "optimal";
  for (const w of order) {
    // A window cannot beat a sum already found: its largest (smallest) possible sum is 10 (w + 2) (10 w).
    if (bestSum !== null && (dir === "max" ? 10 * (w + 2) < bestSum : 10 * w > bestSum)) break;
    const cs = eligible(cands, w, w + 2);
    if (cs.length < NS_SIZE) continue;
    const r = await stage(cs, rules, { objective: dir === "max" ? "risk-max" : "risk-min" }, limit);
    if (!r.sel.length) continue;
    const s = sumCls(r.sel);
    if (r.status !== "optimal") status = "uncertified";
    if (bestSum === null || (dir === "max" ? s > bestSum : s < bestSum)) { bestSum = s; hits.length = 0; hits.push({ w, status: r.status }); }
    else if (s === bestSum) hits.push({ w, status: r.status });
  }
  if (bestSum === null) return { status: "infeasible", sum: null, classLo: 0, classHi: 0, sel: [], seconds: Math.round((Date.now() - t0) / 100) / 10, candidates: cands.length };
  if (!opts.withList) return { status, sum: bestSum, classLo: hits[0].w, classHi: hits[0].w + 2, sel: [], seconds: Math.round((Date.now() - t0) / 100) / 10, candidates: cands.length };
  // Among the windows that reach the extreme, the list with the highest net spread (then the lowest loss).
  let pick: { sel: NsCand[]; w: number; status: NsSolve["status"] } | null = null;
  for (const h of hits) {
    const cs = eligible(cands, h.w, h.w + 2);
    const r = await best(cs, rules, limit, { lo: bestSum, hi: bestSum });
    if (!r.sel.length) continue;
    const ns = mean(r.sel.map((c) => c.ns)), loss = mean(r.sel.map((c) => c.lossBp));
    const cur = pick && { ns: mean(pick.sel.map((c) => c.ns)), loss: mean(pick.sel.map((c) => c.lossBp)) };
    if (!pick || ns > cur!.ns + NS_TIE || (Math.abs(ns - cur!.ns) <= NS_TIE && loss < cur!.loss)) pick = { sel: r.sel, w: h.w, status: r.status };
  }
  if (!pick) return { status: "uncertified", sum: bestSum, classLo: hits[0].w, classHi: hits[0].w + 2, sel: [], seconds: Math.round((Date.now() - t0) / 100) / 10, candidates: cands.length };
  return { status: status === "optimal" && pick.status === "optimal" ? "optimal" : "uncertified", sum: bestSum, classLo: pick.w, classHi: pick.w + 2, sel: pick.sel, seconds: Math.round((Date.now() - t0) / 100) / 10, candidates: cands.length };
}
