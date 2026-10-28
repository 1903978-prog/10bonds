import { loadSolver, SOLVER_OPTIONS } from "../highsSolver";
import { ceilingShare, PORTFOLIO_SPEC } from "../portfolioSpec";

// Methodology 5 (owner, 28/10/2026): for one portfolio position, the 10 bonds with the HIGHEST equal-weight portfolio credit-adjusted net spread
// (bp per year) that obey every hard rule of the position: only the position's allowed risk classes (lib/riskMatrix.ts, class spread <= 2),
// average duration within 5% of the horizon, one bond per issuer group, sector cap. One mixed-integer solve by HiGHS (lib/highsSolver.ts, worker
// thread), then a second solve that fixes that net spread and picks the lowest annual expected credit loss among equal ones.
// Never maximises the sum of bond BES values (a percentile inside a peer group is not an economic amount).

export const NS_SIZE = PORTFOLIO_SPEC.size;
export const NS_TIE = 1e-4; // bp: two net spreads closer than this count as equal for the tie-break (inputs carry 2 decimals)

export type NsCand = {
  isin: string;
  /** Issuer group (one bond per group) and sector (cap), exactly as the band engine uses them. */
  group: string;
  sector: string;
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
export type NsRules = { perIssuer: number; perSector: number; duration: number };
export type NsSolve = { status: "optimal" | "infeasible" | "uncertified"; sel: NsCand[]; objectiveBp: number | null; seconds: number; candidates: number };

const num = (x: number) => x.toFixed(6);
const terms = (idx: number[], coef: (i: number) => number) =>
  idx.reduce((out, i, k) => out + (k === 0 ? "" : k % 8 === 0 ? " +\n  " : " + ") + `${num(coef(i))} x${i}`, "");

type Stage = { objective: "ns" | "loss"; nsMin?: number; /** Ceiling on the list's mean annual expected credit loss (bp). */ lossMax?: number };

async function stage(cs: NsCand[], rules: NsRules, st: Stage, timeLimit: number): Promise<{ status: NsSolve["status"]; sel: NsCand[] }> {
  const all = cs.map((_, i) => i);
  const rows: string[] = [];
  const add = (name: string, idx: number[], coef: (i: number) => number, op: string, rhs: number) => { if (idx.length) rows.push(` ${name}: ${terms(idx, coef)} ${op} ${num(rhs)}`); };
  add("cnt", all, () => 1, "=", NS_SIZE);
  add("dlo", all, (i) => cs[i].dur, ">=", NS_SIZE * rules.duration * (1 - PORTFOLIO_SPEC.avgDurationTolerance));
  add("dhi", all, (i) => cs[i].dur, "<=", NS_SIZE * rules.duration * (1 + PORTFOLIO_SPEC.avgDurationTolerance));
  if (st.lossMax !== undefined) add("lmax", all, (i) => cs[i].lossBp, "<=", st.lossMax * NS_SIZE);
  if (st.nsMin !== undefined) add("nsmin", all, (i) => cs[i].ns, ">=", st.nsMin * NS_SIZE);
  const by = (key: (c: NsCand) => string) => {
    const g = new Map<string, number[]>();
    for (const i of all) g.set(key(cs[i]), [...(g.get(key(cs[i])) ?? []), i]);
    return g;
  };
  let k = 0;
  for (const idx of by((c) => c.group).values()) if (idx.length > rules.perIssuer) add(`grp${k++}`, idx, () => 1, "<=", rules.perIssuer);
  k = 0;
  for (const idx of by((c) => c.sector).values()) if (idx.length > rules.perSector) add(`sec${k++}`, idx, () => 1, "<=", rules.perSector);
  const obj = st.objective === "ns" ? `Maximize\n obj: ${terms(all, (i) => cs[i].ns)}` : `Minimize\n obj: ${terms(all, (i) => cs[i].lossBp)}`;
  const lp = `${obj}\nSubject To\n${rows.join("\n")}\nBinary\n ${all.map((i) => `x${i}`).reduce((out, t, j) => out + (j === 0 ? "" : j % 20 === 0 ? "\n " : " ") + t, "")}\nEnd`;
  if (/NaN|Infinity/.test(lp)) throw new Error("Net-spread model has a non-finite number");
  await new Promise((r) => setImmediate(r));
  const highs = await loadSolver();
  const res = await highs.solve(lp, { ...SOLVER_OPTIONS, mip_abs_gap: 1e-6, time_limit: timeLimit });
  if (res.Status === "Infeasible" || res.Status === "Primal infeasible or unbounded") return { status: "infeasible", sel: [] };
  const sel = all.filter((i) => (res.Columns[`x${i}`]?.Primal ?? 0) > 0.5).map((i) => cs[i]);
  return { status: res.Status === "Optimal" && sel.length === NS_SIZE ? "optimal" : "uncertified", sel };
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const eligible = (cands: NsCand[], allowed: readonly number[]) => cands.filter((c) => allowed.includes(c.cls)).sort((a, b) => a.isin.localeCompare(b.isin));

type Solved = { status: NsSolve["status"]; sel: NsCand[] };
const merge = (a: NsSolve["status"], b: NsSolve["status"]): NsSolve["status"] => (a === "optimal" && b === "optimal" ? "optimal" : "uncertified");

/** Highest net spread under an optional loss ceiling; among equal net spreads the lowest annual expected loss (second solve). */
async function best(cs: NsCand[], rules: NsRules, limit: number, lossMax?: number): Promise<Solved> {
  const top = await stage(cs, rules, { objective: "ns", lossMax }, limit);
  if (top.status === "infeasible" || !top.sel.length) return { status: "infeasible", sel: [] };
  const net = mean(top.sel.map((c) => c.ns));
  const low = await stage(cs, rules, { objective: "loss", nsMin: net - NS_TIE, lossMax }, limit);
  // The tie-break list is only used when it keeps the proven net spread.
  if (!low.sel.length || mean(low.sel.map((c) => c.ns)) < net - 2 * NS_TIE) return top;
  return { status: merge(top.status, low.status), sel: low.sel };
}

/** Exact best list for one position with no loss ceiling. Candidates are sorted by ISIN first, so one input always gives one answer. */
export async function solveNetSpread(cands: NsCand[], allowed: readonly number[], rules: NsRules, opts: { timeLimit?: number } = {}): Promise<NsSolve> {
  const t0 = Date.now();
  const cs = eligible(cands, allowed);
  const done = (status: NsSolve["status"], sel: NsCand[]): NsSolve => ({ status, sel, objectiveBp: sel.length ? mean(sel.map((c) => c.ns)) : null, seconds: Math.round((Date.now() - t0) / 100) / 10, candidates: cs.length });
  if (cs.length < NS_SIZE) return done("infeasible", []);
  const r = await best(cs, rules, opts.timeLimit ?? SOLVER_OPTIONS.time_limit);
  return done(r.status, r.sel);
}

export type WindowSolve = { results: (NsSolve & { ceilingBp: number | null })[]; /** Lowest achievable and top-list annual expected loss (bp) of the window; null when infeasible. */ range: { lowBp: number; highBp: number } | null };

/**
 * The `m` positions that share one set of allowed classes (owner, 28/10/2026). The window's feasible range of annual expected loss runs from the
 * lowest loss any valid list reaches to the loss of the highest-net-spread list. Place i of m maximises net spread subject to its own ceiling at
 * (i+1)/m of that range (terciles for three places); the last place is the unconstrained optimum. Net spread and loss therefore never fall from
 * one place to the next, and equal lists (a flat range) are reported by the caller as repeats. Infeasible window: every place infeasible.
 */
export async function solveWindow(cands: NsCand[], allowed: readonly number[], rules: NsRules, m: number, opts: { timeLimit?: number; /** Solve only place `only` (a live request needs one); the other places come back infeasible-empty. */ only?: number } = {}): Promise<WindowSolve> {
  const t0 = Date.now();
  const cs = eligible(cands, allowed);
  const limit = opts.timeLimit ?? SOLVER_OPTIONS.time_limit;
  const secs = () => Math.round((Date.now() - t0) / 100) / 10;
  const one = (r: Solved, ceilingBp: number | null): NsSolve & { ceilingBp: number | null } => ({ status: r.status, sel: r.sel, objectiveBp: r.sel.length ? mean(r.sel.map((c) => c.ns)) : null, seconds: secs(), candidates: cs.length, ceilingBp });
  const none = (): WindowSolve => ({ results: Array.from({ length: m }, () => one({ status: "infeasible", sel: [] }, null)), range: null });
  if (cs.length < NS_SIZE) return none();
  const top = await best(cs, rules, limit);
  if (top.status === "infeasible" || !top.sel.length) return none();
  const highBp = mean(top.sel.map((c) => c.lossBp));
  if (m === 1) return { results: [one(top, null)], range: { lowBp: highBp, highBp } };
  const skipped = () => one({ status: "uncertified", sel: [] }, null);
  if (opts.only === m - 1) return { results: [...Array.from({ length: m - 1 }, skipped), one(top, highBp)], range: null };
  const floor = await stage(cs, rules, { objective: "loss" }, limit);
  const lowBp = floor.sel.length ? Math.min(highBp, mean(floor.sel.map((c) => c.lossBp))) : highBp;
  const results: WindowSolve["results"] = [];
  for (let i = 0; i < m - 1; i++) {
    if (opts.only !== undefined && opts.only !== i) { results.push(skipped()); continue; }
    const ceilingBp = lowBp + ceilingShare(i, m) * (highBp - lowBp);
    const r = highBp - lowBp < 1e-6 ? top : await best(cs, rules, limit, ceilingBp + 1e-6);
    // A failed ceiling solve is never replaced by another list: it is reported as it is.
    results.push(one(r.sel.length ? r : { status: "uncertified", sel: [] }, ceilingBp));
  }
  results.push(one(top, highBp));
  return { results, range: { lowBp, highBp } };
}
