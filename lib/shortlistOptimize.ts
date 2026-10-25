import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";
import { isExcludedRank } from "./seniority";
import { RESULT_COUNT } from "./ranking";
import { candidatesOf } from "./coherentFrontier";
import { loadSolver, MIP_ABS_GAP, SOLVER_OPTIONS } from "./highsSolver";
import { bondNote } from "./bondNotes";
import { listLifeLoss } from "./expectedLoss";
import { UNCLASSIFIED } from "./sectors";

// Admin only (the owner, 25/10/2026): "Alternative set" for a shortlist. The exact solver (HiGHS, the one the coherent
// optimiser uses) picks 10 real bonds of 10 different issuer groups from the live copy under the owner's constraints:
//   average duration within +-5% of the horizon (4 years: 3.8-4.2), each bond within +-20% (the site's pool);
//   risk scale 1..4 only (AAA to BBB+); one bond per issuer group (equal weight = at most 10% each); at most
//   2 bonds per major sector (lib/sectors.ts; issuers not yet classified are not capped, each is its own issuer group anyway); no subordinated, AT1, Tier 2, credit-linked, equity / index-linked,
//   structured or conditional-coupon notes; the site's own price checks already left out flagged bonds.
// Expected loss on your money = the finder's (default chance to maturity x loss given default by debt rank, averaged).
// Nothing here is used in any ranking or shown to customers; it is a model-selected alternative, not advice.

export const ALT = { horizon: 4, maxRisk: 4, perSector: 2, targets: [4.6, 4.65, 4.8] as const };

/** Structures the owner leaves out, found in the name: credit-linked, equity / index / share-linked, structured, conditional, AT1, Tier 2, CoCo. */
export const STRUCTURED = /(credit|equity|index|share|basket|fund|commodity|inflation)[- ]?linked|\b(cln|eln)\b|structured|conditional|autocall|reverse convertible|convertible|\bat1\b|additional tier|tier ?[12]\b|\bt[12]\b|\blt2\b|\bcoco\b|contingent|perp/i;

export type Eligible = { bonds: PublicBond[]; dropped: { structure: number; risk: number; rank: number } };

/** The live bonds this search may use. */
export function eligibleBonds(bonds: PublicBond[], maxRisk = ALT.maxRisk): Eligible {
  const dropped = { structure: 0, risk: 0, rank: 0 };
  const out = bonds.filter((b) => {
    if (isExcludedRank(b)) { dropped.rank++; return false; }
    if (STRUCTURED.test(b.name) || bondNote(b.isin)) { dropped.structure++; return false; }
    const r = bondRisk(b);
    if (r === null || r > maxRisk) { dropped.risk++; return false; }
    return true;
  });
  return { bonds: out, dropped };
}

type Cand = ReturnType<typeof candidatesOf>[number];
export type Spec = { horizon: number; perSector: number; /** summed-default-chance cap (see lossCap) */ lossMax?: number; retMin?: number; objective: "ret" | "loss"; durTol?: number };
export type Solved = { status: "optimal" | "infeasible" | "uncertified"; bonds: PublicBond[]; ytm: number; el: number };

const N = RESULT_COUNT;
const num = (x: number) => x.toFixed(6);
const sum = (idx: number[], coef: (i: number) => number) => idx.map((i) => `${num(coef(i))} x${i}`).reduce((out, t, k) => out + (k === 0 ? "" : k % 8 === 0 ? " +\n  " : " + ") + t, "");

/** Cap on the solver's summed default chance that equals an expected loss of `el` % (EL = average default chance x 60%). */
export const lossCap = (el: number) => (N * el) / 0.6 + 1e-9;

/** One exact solve over `bonds` (already filtered by eligibleBonds). */
export async function solveSet(bonds: PublicBond[], spec: Spec): Promise<Solved> {
  const cs: Cand[] = candidatesOf(bonds, spec.horizon, false);
  const none: Solved = { status: "infeasible", bonds: [], ytm: 0, el: 0 };
  if (cs.length < N) return none;
  const tol = spec.durTol ?? 0.05;
  const all = cs.map((_, i) => i);
  const rows: string[] = [];
  const add = (name: string, body: string, op: string, rhs: number) => { if (body) rows.push(` ${name}: ${body} ${op} ${num(rhs)}`); };
  add("cnt", sum(all, () => 1), "=", N);
  add("dlo", sum(all, (i) => cs[i].dur), ">=", N * spec.horizon * (1 - tol));
  add("dhi", sum(all, (i) => cs[i].dur), "<=", N * spec.horizon * (1 + tol));
  if (spec.retMin !== undefined) add("ret", sum(all, (i) => cs[i].ret), ">=", spec.retMin * N);
  if (spec.lossMax !== undefined) add("los", sum(all, (i) => cs[i].pd), "<=", spec.lossMax);
  const by = (key: (c: Cand) => string) => {
    const g = new Map<string, number[]>();
    for (const i of all) g.set(key(cs[i]), [...(g.get(key(cs[i])) ?? []), i]);
    return g;
  };
  let k = 0;
  for (const [, idx] of by((c) => c.group!)) if (idx.length > 1) add(`grp${k++}`, sum(idx, () => 1), "<=", 1);
  k = 0;
  for (const [sector, idx] of by((c) => c.sector)) if (sector !== UNCLASSIFIED && idx.length > spec.perSector) add(`sec${k++}`, sum(idx, () => 1), "<=", spec.perSector);
  const objective = spec.objective === "ret" ? `Maximize\n obj: ${sum(all, (i) => cs[i].ret)}` : `Minimize\n obj: ${sum(all, (i) => cs[i].pd)}`;
  const lp = `${objective}\nSubject To\n${rows.join("\n")}\nBinary\n ${all.map((i) => `x${i}`).reduce((out, t, j) => out + (j === 0 ? "" : j % 20 === 0 ? "\n " : " ") + t, "")}\nEnd`;
  if (/NaN|Infinity/.test(lp)) throw new Error("Alternative-set model has a non-finite number");
  const highs = await loadSolver();
  await new Promise((r) => setImmediate(r));
  const res = highs.solve(lp, { ...SOLVER_OPTIONS, mip_abs_gap: spec.objective === "ret" ? 1e-6 : MIP_ABS_GAP });
  if (res.Status === "Infeasible" || res.Status === "Primal infeasible or unbounded") return none;
  const sel = all.filter((i) => (res.Columns[`x${i}`]?.Primal ?? 0) > 0.5).map((i) => cs[i]);
  if (sel.length !== N) return none;
  return { status: res.Status === "Optimal" ? "optimal" : "uncertified", bonds: sel.map((c) => c.b), ytm: sel.reduce((s, c) => s + c.ret, 0) / N, el: listLifeLoss(sel.map((c) => c.pd)) };
}
