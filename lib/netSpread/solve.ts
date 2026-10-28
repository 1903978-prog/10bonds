import { loadSolver, SOLVER_OPTIONS } from "../highsSolver";

// Methodology 5 (owner, 28/10/2026): for one portfolio position, the 10 bonds with the HIGHEST equal-weight portfolio credit-adjusted net spread
// (bp per year) that obey every hard rule of the position: only the position's allowed risk classes (lib/riskMatrix.ts, class spread <= 2),
// average duration within 5% of the horizon, one bond per issuer group, sector cap. One mixed-integer solve by HiGHS (lib/highsSolver.ts, worker
// thread), then a second solve that fixes that net spread and picks the lowest annual expected credit loss among equal ones.
// Never maximises the sum of bond BES values (a percentile inside a peer group is not an economic amount).

export const NS_SIZE = 10;
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

type Stage = { objective: "ns" | "loss"; nsMin?: number };

async function stage(cs: NsCand[], rules: NsRules, st: Stage, timeLimit: number): Promise<{ status: NsSolve["status"]; sel: NsCand[] }> {
  const all = cs.map((_, i) => i);
  const rows: string[] = [];
  const add = (name: string, idx: number[], coef: (i: number) => number, op: string, rhs: number) => { if (idx.length) rows.push(` ${name}: ${terms(idx, coef)} ${op} ${num(rhs)}`); };
  add("cnt", all, () => 1, "=", NS_SIZE);
  add("dlo", all, (i) => cs[i].dur, ">=", NS_SIZE * rules.duration * 0.95);
  add("dhi", all, (i) => cs[i].dur, "<=", NS_SIZE * rules.duration * 1.05);
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

/** Exact best list for one position. Candidates are sorted by ISIN first, so one input always gives one answer. */
export async function solveNetSpread(cands: NsCand[], allowed: readonly number[], rules: NsRules, opts: { timeLimit?: number } = {}): Promise<NsSolve> {
  const t0 = Date.now();
  const cs = cands.filter((c) => allowed.includes(c.cls)).sort((a, b) => a.isin.localeCompare(b.isin));
  const done = (status: NsSolve["status"], sel: NsCand[]): NsSolve => ({ status, sel, objectiveBp: sel.length ? mean(sel.map((c) => c.ns)) : null, seconds: Math.round((Date.now() - t0) / 100) / 10, candidates: cs.length });
  if (cs.length < NS_SIZE) return done("infeasible", []);
  const limit = opts.timeLimit ?? SOLVER_OPTIONS.time_limit;
  const top = await stage(cs, rules, { objective: "ns" }, limit);
  if (top.status === "infeasible" || !top.sel.length) return done("infeasible", []);
  const best = mean(top.sel.map((c) => c.ns));
  const low = await stage(cs, rules, { objective: "loss", nsMin: best - NS_TIE }, limit);
  // The tie-break list is only used when it keeps the proven net spread.
  if (!low.sel.length || mean(low.sel.map((c) => c.ns)) < best - 2 * NS_TIE) return done(top.status, top.sel);
  return done(top.status === "optimal" && low.status === "optimal" ? "optimal" : "uncertified", low.sel);
}
