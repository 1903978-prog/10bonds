import type { BandCand } from "./coherentFrontier";
import { loadSolver, SOLVER_OPTIONS } from "./highsSolver";
import { windowModel } from "./riskWindow";
import { LIST_SIZE, sumRange, type RiskBand, type Rules } from "./riskBands";

// The exact answer for one band (owner, 27/10/2026): of all lists of 10 bonds with the average risk inside the band, one bond per issuer
// group, sector cap, and average duration within 5% of the horizon, the one with the HIGHEST average yield; among lists with the same
// yield (within the solver tolerance) the LOWEST expected loss. Two mixed-integer solves by HiGHS (the solver of lib/highsSolver.ts).
// "optimal" = the solver proved both optima; "uncertified" = a time limit stopped it (the list is valid but not proven best).

export type BandSolve = { status: "optimal" | "infeasible" | "uncertified"; sel: BandCand[]; seconds: number };

const num = (x: number) => x.toFixed(6);
const terms = (idx: number[], coef: (i: number) => number) =>
  idx.reduce((out, i, k) => out + (k === 0 ? "" : k % 8 === 0 ? " +\n  " : " + ") + `${num(coef(i))} x${i}`, "");

const TIE = 1e-5;
type Stage = { objective: "ret" | "pd"; retMin?: number; pdMax?: number };

async function stage(cs: BandCand[], sr: { lo: number; hi: number }, rules: Rules, st: Stage, timeLimit: number): Promise<{ status: "optimal" | "infeasible" | "uncertified"; sel: BandCand[] }> {
  const all = cs.map((_, i) => i);
  const rows: string[] = [];
  const add = (name: string, idx: number[], coef: (i: number) => number, op: string, rhs: number) => { if (idx.length) rows.push(` ${name}: ${terms(idx, coef)} ${op} ${num(rhs)}`); };
  add("cnt", all, () => 1, "=", LIST_SIZE);
  add("rlo", all, (i) => cs[i].cls, ">=", sr.lo);
  add("rhi", all, (i) => cs[i].cls, "<=", sr.hi);
  add("dlo", all, (i) => cs[i].dur, ">=", LIST_SIZE * rules.duration * 0.95);
  add("dhi", all, (i) => cs[i].dur, "<=", LIST_SIZE * rules.duration * 1.05);
  if (st.pdMax !== undefined) add("pdc", all, (i) => cs[i].pd, "<=", st.pdMax * LIST_SIZE);
  if (st.retMin !== undefined) add("ret", all, (i) => cs[i].ret, ">=", st.retMin * LIST_SIZE);
  const by = (key: (c: BandCand) => string) => {
    const g = new Map<string, number[]>();
    for (const i of all) g.set(key(cs[i]), [...(g.get(key(cs[i])) ?? []), i]);
    return g;
  };
  let k = 0;
  for (const idx of by((c) => c.group ?? c.b.isin).values()) if (idx.length > rules.perIssuer) add(`grp${k++}`, idx, () => 1, "<=", rules.perIssuer);
  k = 0;
  for (const idx of by((c) => c.sector).values()) if (idx.length > rules.perSector) add(`sec${k++}`, idx, () => 1, "<=", rules.perSector);
  // Risk consistency: all ten bonds inside one window of three consecutive risk classes (lib/riskWindow.ts).
  const win = windowModel(cs.map((c) => c.cls), (i) => `x${i}`);
  rows.push(...win.rows);
  const objective = st.objective === "ret" ? `Maximize\n obj: ${terms(all, (i) => cs[i].ret)}` : `Minimize\n obj: ${terms(all, (i) => cs[i].pd)}`;
  const lp = `${objective}\nSubject To\n${rows.join("\n")}\nBinary\n ${[...all.map((i) => `x${i}`), ...win.binaries].reduce((out, t, j) => out + (j === 0 ? "" : j % 20 === 0 ? "\n " : " ") + t, "")}\nEnd`;
  if (/NaN|Infinity/.test(lp)) throw new Error("Band model has a non-finite number");
  await new Promise((r) => setImmediate(r));
  const highs = await loadSolver();
  const res = await highs.solve(lp, { ...SOLVER_OPTIONS, time_limit: timeLimit });
  if (res.Status === "Infeasible" || res.Status === "Primal infeasible or unbounded") return { status: "infeasible", sel: [] };
  const sel = all.filter((i) => (res.Columns[`x${i}`]?.Primal ?? 0) > 0.5).map((i) => cs[i]);
  return { status: res.Status === "Optimal" ? "optimal" : "uncertified", sel };
}

/** Exact best list for one band over the candidates; `timeLimit` seconds per solve (default the solver's own limit). */
export async function solveBand(cands: BandCand[], band: RiskBand, rules: Rules, opts: { timeLimit?: number; step?: { i: number; m: number } } = {}): Promise<BandSolve> {
  const t0 = Date.now();
  const sr = sumRange(band);
  const done = (status: BandSolve["status"], sel: BandCand[]): BandSolve => ({ status, sel, seconds: Math.round((Date.now() - t0) / 100) / 10 });
  if (!sr || cands.length < LIST_SIZE) return done("infeasible", []);
  const limit = opts.timeLimit ?? SOLVER_OPTIONS.time_limit;
  const top = await stage(cands, sr, rules, { objective: "ret" }, limit);
  if (top.status === "infeasible" || !top.sel.length) return done("infeasible", []);
  let best = top.sel.reduce((s, c) => s + c.ret, 0) / LIST_SIZE;
  // Positions sharing the same allowed classes step from the lowest expected loss up to the highest return: place i of m may lose at most
  // minPd + i/(m-1) of the way to the loss of the top-return list (the last place is the top-return list itself).
  let pdMax: number | undefined;
  let stepOptimal = true;
  const m = opts.step?.m ?? 1;
  if (m > 1 && opts.step!.i < m - 1) {
    const lo = await stage(cands, sr, rules, { objective: "pd" }, limit);
    const mean = (xs: BandCand[]) => xs.reduce((s, c) => s + c.pd, 0) / LIST_SIZE;
    if (lo.sel.length) {
      pdMax = mean(lo.sel) + (opts.step!.i / (m - 1)) * (mean(top.sel) - mean(lo.sel)) + 1e-6;
      stepOptimal = lo.status === "optimal";
      const capped = await stage(cands, sr, rules, { objective: "ret", pdMax }, limit);
      if (capped.sel.length) { best = capped.sel.reduce((s, c) => s + c.ret, 0) / LIST_SIZE; stepOptimal = stepOptimal && capped.status === "optimal"; }
    }
  }
  // Same yield (within the solver tolerance), least expected loss.
  // (1e-5 percentage points: the model's numbers carry 6 decimals, so a tighter floor could cut the first solve's own list off.)
  const low = await stage(cands, sr, rules, { objective: "pd", retMin: best - TIE, ...(pdMax !== undefined ? { pdMax } : {}) }, limit);
  if (!low.sel.length) return done(top.status, top.sel);
  return done(top.status === "optimal" && low.status === "optimal" && stepOptimal ? "optimal" : "uncertified", low.sel);
}
