import type { PublicBond } from "../types";
import { candidatesOf } from "../coherentFrontier";
import { activePolicy } from "../coherence";
import { TERMS } from "../limits";
import { allowedClasses, MATRIX_POSITIONS } from "../riskMatrix";
import { checkNsList, nsListOk, type NsCheck } from "./check";
import { metricsOf, type NsMetrics } from "./metrics";
import { portfolioBes, type PortfolioBes } from "./reference";
import { sampleFeasible } from "./sample";
import { solveNetSpread, type NsCand, type NsRules, type NsSolve } from "./solve";

// Builds the 90 Methodology 5 portfolios (3 horizons x 30 positions) from the bond-level figures of the Bond Efficiency run (lib/bes) and the
// approved rules (risk matrix lib/riskMatrix.ts, issuer / sector caps of the active policy, duration window). Runs on a runner, never on a slider move.

export const NS_METHOD = "ns-5.0";
export const HORIZON_NAMES = { short: "SHORT", mid: "MEDIUM", long: "LONG" } as const;
export type HorizonName = (typeof HORIZON_NAMES)[keyof typeof HORIZON_NAMES];
export const SAMPLE_SIZE = 100;

/** Bond-level figures taken from the published Bond Efficiency run (nothing is recomputed here). */
export type BesBond = { isin: string; netSpreadBp: number; grossSpreadBp: number; annualLossBp: number; bes: number | null; status: "valid" | "limited" };

export type PreviousPortfolio = { isins: string[]; source: string };
export type Reference = { days: number; samples: number[] } | null;

export type PositionResult = {
  rowNo: number; horizon: HorizonName; position: number; duration: number; allowed: number[];
  status: "optimal" | "uncertified" | "infeasible" | "error";
  dataStatus: "valid" | "limited" | "unavailable";
  isins: string[]; bonds: NsCand[]; metrics: NsMetrics | null;
  checks: NsCheck[]; candidates: number; seconds: number; repeatOf: number | null; failure: string | null;
  portfolioBes: PortfolioBes; opportunityPct: number | null; sample: number[];
  previous: PreviousCompare | null;
};
export type PreviousCompare = {
  source: string; reproducible: boolean; note: string | null;
  netSpreadBp: number | null; ytm: number | null; duration: number | null; riskMin: number | null; riskMax: number | null;
  added: string[]; removed: string[]; feasibleUnderSameRules: boolean | null; improvementBp: number | null; regression: boolean;
};

export const rulesFor = (duration: number): NsRules => { const p = activePolicy(); return { perIssuer: p.maxPerIssuer, perSector: p.maxPerSector, duration }; };

/** Eligible candidates of one horizon with their bond-level net spread (bonds without a valid figure are not eligible; nothing is assumed). */
export function nsCandidates(bonds: PublicBond[], duration: number, bes: Map<string, BesBond>): NsCand[] {
  const out: NsCand[] = [];
  for (const c of candidatesOf(bonds, duration, false)) {
    const x = bes.get(c.b.isin);
    if (!x) continue;
    out.push({ isin: c.b.isin, group: c.group ?? c.b.isin, sector: c.sector, cls: c.cls, dur: c.dur, ns: x.netSpreadBp, grossBp: x.grossSpreadBp, lossBp: x.annualLossBp, ytm: c.ret, bes: x.bes });
  }
  return out;
}

function compare(prev: PreviousPortfolio | undefined, all: Map<string, NsCand>, sel: NsCand[], allowed: readonly number[], rules: NsRules, newNet: number): PreviousCompare | null {
  if (!prev) return null;
  const rows = prev.isins.map((i) => all.get(i));
  const base = { source: prev.source, added: sel.map((c) => c.isin).filter((i) => !prev.isins.includes(i)).sort(), removed: prev.isins.filter((i) => !sel.some((c) => c.isin === i)).sort() };
  if (rows.some((r) => !r)) {
    return { ...base, reproducible: false, note: `${rows.filter((r) => !r).length} of the earlier bonds have no valid net spread or are no longer eligible, so the two lists cannot be compared on one basis.`, netSpreadBp: null, ytm: null, duration: null, riskMin: null, riskMax: null, feasibleUnderSameRules: null, improvementBp: null, regression: false };
  }
  const old = rows as NsCand[];
  const m = metricsOf(old);
  const feasible = nsListOk(old, allowed, rules);
  const improvement = Math.round((newNet - m.netSpreadBp) * 100) / 100;
  return { ...base, reproducible: true, note: feasible ? null : "The earlier list breaks a rule of this methodology, so it is not a feasible alternative.", netSpreadBp: m.netSpreadBp, ytm: m.ytm, duration: m.duration, riskMin: m.minRisk, riskMax: m.maxRisk, feasibleUnderSameRules: feasible, improvementBp: improvement, regression: feasible && improvement < -0.01 };
}

export type BuildInput = {
  bonds: PublicBond[]; bes: Map<string, BesBond>; seedKey: string;
  previous?: Map<string, PreviousPortfolio>; // key "SHORT:7"
  reference?: (h: HorizonName, position: number) => Reference;
  timeLimit?: number; onProgress?: (done: number) => void;
};

/** All 90 positions. A position that fails is reported as such (the caller keeps the last valid result as stale); nothing here throws for one position. */
export async function buildAll(inp: BuildInput): Promise<PositionResult[]> {
  const out: PositionResult[] = [];
  let rowNo = 0;
  for (const t of TERMS) {
    const horizon = HORIZON_NAMES[t.key];
    const rules = rulesFor(t.duration);
    const cands = nsCandidates(inp.bonds, t.duration, inp.bes);
    const byIsin = new Map(cands.map((c) => [c.isin, c]));
    const solved = new Map<string, { position: number; r: NsSolve }>();
    for (let position = 1; position <= MATRIX_POSITIONS; position++) {
      rowNo++;
      const allowed = [...allowedClasses(position)];
      const base = { rowNo, horizon, position, duration: t.duration, allowed };
      try {
        // Positions that share the same allowed classes have the same exact optimum: solved once, reported as a repeat.
        const key = allowed.join(",");
        let hit = solved.get(key);
        if (!hit) { hit = { position, r: await solveNetSpread(cands, allowed, rules, { timeLimit: inp.timeLimit }) }; solved.set(key, hit); }
        const { r } = hit;
        const empty = (status: PositionResult["status"], failure: string | null): PositionResult => ({ ...base, status, dataStatus: "unavailable", isins: [], bonds: [], metrics: null, checks: [], candidates: r.candidates, seconds: r.seconds, repeatOf: null, failure, portfolioBes: portfolioBes(0, null), opportunityPct: null, sample: [], previous: null });
        if (r.status === "infeasible" || !r.sel.length) { out.push(empty("infeasible", "No list of 10 bonds meets every rule of this position")); continue; }
        const checks = checkNsList(r.sel, allowed, rules);
        if (checks.some((c) => !c.ok)) { out.push(empty("error", `Independent check failed: ${checks.filter((c) => !c.ok).map((c) => c.detail).join("; ")}`)); continue; }
        const metrics = metricsOf(r.sel);
        const sample = sampleFeasible(cands, allowed, rules, SAMPLE_SIZE, `${inp.seedKey}|${horizon}|${position}`);
        const below = sample.filter((x) => x < metrics.netSpreadBp - 1e-9).length;
        out.push({
          ...base, status: r.status, dataStatus: r.sel.some((c) => (inp.bes.get(c.isin)?.status ?? "limited") === "limited") ? "limited" : "valid",
          isins: r.sel.map((c) => c.isin).sort(), bonds: [...r.sel].sort((a, b) => a.isin.localeCompare(b.isin)), metrics, checks, candidates: r.candidates, seconds: hit.position === position ? r.seconds : 0,
          repeatOf: hit.position === position ? null : hit.position, failure: null,
          portfolioBes: portfolioBes(metrics.netSpreadBp, inp.reference?.(horizon, position) ?? null),
          opportunityPct: sample.length ? Math.round((1000 * below) / sample.length) / 10 : null, sample,
          previous: compare(inp.previous?.get(`${horizon}:${position}`), byIsin, r.sel, allowed, rules, metrics.netSpreadBp),
        });
      } catch (e) {
        out.push({ ...base, status: "error", dataStatus: "unavailable", isins: [], bonds: [], metrics: null, checks: [], candidates: 0, seconds: 0, repeatOf: null, failure: (e as Error).message.slice(0, 300), portfolioBes: portfolioBes(0, null), opportunityPct: null, sample: [], previous: null });
      }
      inp.onProgress?.(rowNo);
    }
  }
  return out;
}
