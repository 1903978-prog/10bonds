import type { PublicBond } from "../types";
import { TERMS } from "../limits";
import { SPEC_VERSION, specRules, type LadderStep } from "../portfolioSpec";
import { POSITIONS, type AnchorBand } from "../riskAnchors";
import { sectorExempt, specCandidates } from "./candidates";
import { checkNsList, nsListOk, type NsCheck } from "./check";
import { metricsOf, type NsMetrics } from "./metrics";
import { portfolioBes, type PortfolioBes } from "./reference";
import { sampleFeasible } from "./sample";
import { solveKey, type PoolFor } from "./anchored";
import type { NsCand, NsRules } from "./solve";

// Builds the 90 portfolios (3 horizons x 30 positions) of one currency x minimum order from the bond-level figures of the Bond Efficiency run (lib/bes) and the
// portfolio spec (anchored risk bands lib/riskAnchors.ts, ladder lib/portfolioSpec.ts). Runs on a runner, never on a slider move.

export const NS_METHOD = `spec-${SPEC_VERSION}`;
export const HORIZON_NAMES = { short: "SHORT", mid: "MEDIUM", long: "LONG" } as const;
export type HorizonName = (typeof HORIZON_NAMES)[keyof typeof HORIZON_NAMES];
export const SAMPLE_SIZE = 100;
export const horizonOfYear = (y: number) => `YEAR${String(y).padStart(2, "0")}`;

/** Bond-level figures taken from the published Bond Efficiency run (nothing is recomputed here). */
export type BesBond = { isin: string; netSpreadBp: number; grossSpreadBp: number; annualLossBp: number; bes: number | null; status: "valid" | "limited" };

export type PreviousPortfolio = { isins: string[]; source: string };
export type Reference = { days: number; samples: number[] } | null;

export type PositionResult = {
  rowNo: number; horizon: string; position: number; duration: number; allowed: number[];
  /** The position's average-risk band (sum of the ten classes in tenths), the ladder step its list was found at (0 = strict), and the anchors of its key (R1, R30 as sums in tenths). */
  band: AnchorBand; step: LadderStep | null; r1: number | null; r30: number | null;
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

export const rulesFor = (duration: number, step: LadderStep = 0): NsRules => specRules(duration, step);

/** Eligible candidates of one horizon with their bond-level net spread (bonds without a valid figure are not eligible; nothing is assumed). */
export function nsCandidates(bonds: PublicBond[], duration: number, bes: Map<string, BesBond>, step: LadderStep = 0): NsCand[] {
  const out: NsCand[] = [];
  for (const c of specCandidates(bonds, duration, step)) {
    const x = bes.get(c.b.isin);
    if (!x) continue;
    out.push({ isin: c.b.isin, group: c.group ?? c.b.isin, sector: c.sector, exempt: sectorExempt(c.b), cls: c.cls, dur: c.dur, ns: x.netSpreadBp, grossBp: x.grossSpreadBp, lossBp: x.annualLossBp, ytm: c.ret, pd: c.pd, bes: x.bes });
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
  reference?: (h: string, position: number) => Reference;
  timeLimit?: number; onProgress?: (done: number) => void;
  /** Exact-year lists: no reference sample and no comparison with an earlier list (they only feed the finder). */
  light?: boolean;
};

const isinKey = (isins: string[]) => [...isins].sort().join(",");

/** Pools per ladder step, built once per key (steps 0 and 1 share the strict window, steps 2 and 3 the wide one). */
export function poolsFor(bonds: PublicBond[], duration: number, bes: Map<string, BesBond>): PoolFor {
  const memo = new Map<boolean, NsCand[]>();
  return (step) => {
    const wide = step >= 2;
    if (!memo.has(wide)) memo.set(wide, nsCandidates(bonds, duration, bes, step));
    return memo.get(wide)!;
  };
}

/** The 30 positions of one horizon. A position that fails is reported as such (the caller keeps the last valid result as stale); nothing here throws for one position. */
export async function buildHorizon(inp: BuildInput, horizon: string, duration: number, firstRow: number): Promise<PositionResult[]> {
  const poolFor = poolsFor(inp.bonds, duration, inp.bes);
  const byIsin = new Map(poolFor(3).map((c) => [c.isin, c]));
  let key;
  let failure: string | null = null;
  try { key = await solveKey(poolFor, duration, { timeLimit: inp.timeLimit, onPosition: inp.onProgress ? (n) => inp.onProgress!(firstRow + n - 1) : undefined }); } catch (e) { failure = (e as Error).message.slice(0, 300); }
  const out: PositionResult[] = [];
  const seen = new Map<string, number>();
  for (let position = 1; position <= POSITIONS; position++) {
    const rowNo = firstRow + position - 1;
    const r = key?.positions[position - 1];
    const own = r?.band ?? { position, sumLo: 0, sumHi: 0, classLo: 1, classHi: 3, target: 0 };
    // A list reused from the position below is checked against the band it was solved for; every other list against its own.
    const band = r?.reusedBand ?? own;
    const allowed = Array.from({ length: band.classHi - band.classLo + 1 }, (_, i) => band.classLo + i);
    const base = { rowNo, horizon, position, duration, allowed, band: r?.reusedBand ? { ...own, sumLo: r.reusedBand.sumLo, sumHi: r.reusedBand.sumHi } : own, step: r?.step ? (r.adjusted ? Math.max(1, r.step) : r.step) as LadderStep : r?.adjusted ? 1 : (r?.step ?? null), r1: key?.r1 ?? null, r30: key?.r30 ?? null };
    const empty = (status: PositionResult["status"], why: string | null): PositionResult => ({ ...base, status, dataStatus: "unavailable", isins: [], bonds: [], metrics: null, checks: [], candidates: r?.candidates ?? 0, seconds: r?.seconds ?? 0, repeatOf: null, failure: why, portfolioBes: portfolioBes(0, null), opportunityPct: null, sample: [], previous: null });
    try {
      if (!r) { out.push(empty("error", failure ?? "Horizon not solved")); continue; }
      if (r.status === "infeasible") { out.push(empty("infeasible", r.reason)); continue; }
      if (!r.sel.length) { out.push(empty("error", r.reason ?? "The solver stopped on its time limit before finding a list")); continue; }
      const rules = rulesFor(duration, r.step ?? 0);
      const checks = checkNsList(r.sel, allowed, rules, { sum: { lo: band.sumLo, hi: band.sumHi } });
      if (checks.some((c) => !c.ok)) { out.push(empty("error", `Independent check failed: ${checks.filter((c) => !c.ok).map((c) => c.detail).join("; ")}`)); continue; }
      const metrics = metricsOf(r.sel);
      const sample = inp.light ? [] : sampleFeasible(poolFor(r.step ?? 0), allowed, rules, SAMPLE_SIZE, `${inp.seedKey}|${horizon}|${position}`, SAMPLE_SIZE * 60, { lo: band.sumLo, hi: band.sumHi });
      const below = sample.filter((x) => x < metrics.netSpreadBp - 1e-9).length;
      const k = isinKey(r.sel.map((c) => c.isin));
      const first = seen.get(k) ?? null;
      if (first === null) seen.set(k, position);
      out.push({
        ...base, status: r.status, dataStatus: r.sel.some((c) => (inp.bes.get(c.isin)?.status ?? "limited") === "limited") ? "limited" : "valid",
        isins: r.sel.map((c) => c.isin).sort(), bonds: [...r.sel].sort((a, b) => a.isin.localeCompare(b.isin)), metrics, checks, candidates: r.candidates, seconds: r.seconds,
        repeatOf: first, failure: null,
        portfolioBes: portfolioBes(metrics.netSpreadBp, inp.reference?.(horizon, position) ?? null),
        opportunityPct: sample.length ? Math.round((1000 * below) / sample.length) / 10 : null, sample,
        previous: inp.light ? null : compare(inp.previous?.get(`${horizon}:${position}`), byIsin, r.sel, allowed, rules, metrics.netSpreadBp),
      });
    } catch (e) {
      out.push({ ...empty("error", (e as Error).message.slice(0, 300)) });
    }
    inp.onProgress?.(rowNo);
  }
  return out.sort((a, b) => a.position - b.position);
}

/** All 90 positions (3 terms x 30). */
export async function buildAll(inp: BuildInput): Promise<PositionResult[]> {
  const out: PositionResult[] = [];
  for (const [h, t] of TERMS.entries()) out.push(...(await buildHorizon(inp, HORIZON_NAMES[t.key], t.duration, h * POSITIONS + 1)));
  return out;
}
