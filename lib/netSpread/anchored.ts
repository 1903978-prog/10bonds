import { LADDER_STEPS, specRules, type LadderStep } from "../portfolioSpec";
import { anchoredBands, bandLabel, POSITIONS, type AnchorBand } from "../riskAnchors";
import { extremeOf, solvePosition, type NsCand, type NsRules, type NsSolve } from "./solve";

// One key = one currency x minimum order x horizon (a term or an exact year). The 30 positions (owner, 28/10/2026, anchored bands):
//   1. portfolio 30 = riskiest list under every rule (R30), portfolio 1 = safest (R1); both then take the highest net spread;
//   2. portfolios 2..29 sit on the bands between them (lib/riskAnchors.ts) and take the highest net spread inside their band and 3-class window;
//   3. a position with no list under the strict rules is retried with ladder steps 1, 2, 3 in order and marked "adjusted"; the issuer rule,
//      the exclusions and the class spread of 2 are never relaxed.
// Nothing else is solved: no repeats rule, no loss ceilings.

export type KeyPosition = {
  position: number;
  status: NsSolve["status"];
  sel: NsCand[];
  /** Ladder step the list was found at (0 = strict); null when there is no list. */
  step: LadderStep | null;
  /** The position's band (sum of the ten classes, tenths), its allowed classes, and its target in tenths. */
  band: AnchorBand;
  seconds: number;
  candidates: number;
  reason: string | null;
};
export type KeyResult = {
  /** Anchors as sums of ten classes (tenths of the average risk); null when no list exists under any step. */
  r1: number | null; r30: number | null; anchorStep: LadderStep | null;
  positions: KeyPosition[];
};

/** Candidates per ladder step: step 2 and 3 use the wider bond duration window, so the pool is supplied per step. */
export type PoolFor = (step: LadderStep) => NsCand[];

const emptyBand = (n: number): AnchorBand => ({ position: n, sumLo: 0, sumHi: 0, classLo: 1, classHi: 3, target: 0 });
const none = (n: number, why: string): KeyPosition => ({ position: n, status: "infeasible", sel: [], step: null, band: emptyBand(n), seconds: 0, candidates: 0, reason: why });

/** The anchors of a key: the first ladder step at which any list exists decides both (the extremes of one feasible set). */
export async function anchorsOf(poolFor: PoolFor, duration: number, opts: { timeLimit?: number; withLists?: boolean } = {}) {
  for (const step of LADDER_STEPS) {
    const rules = specRules(duration, step);
    const pool = poolFor(step);
    const hi = await extremeOf(pool, "max", rules, { timeLimit: opts.timeLimit, withList: opts.withLists });
    if (hi.sum === null) continue;
    const lo = await extremeOf(pool, "min", rules, { timeLimit: opts.timeLimit, withList: opts.withLists });
    if (lo.sum === null) continue;
    return { step, r1: lo.sum, r30: hi.sum, lo, hi };
  }
  return null;
}

/** All 30 positions of a key, or only position `only` (a live request needs one). */
export async function solveKey(poolFor: PoolFor, duration: number, opts: { timeLimit?: number; only?: number; onPosition?: (n: number) => void } = {}): Promise<KeyResult> {
  const a = await anchorsOf(poolFor, duration, { timeLimit: opts.timeLimit, withLists: opts.only === undefined || opts.only === 1 || opts.only === POSITIONS });
  if (!a) {
    const why = "No list of 10 bonds meets the rules at any step of the ladder";
    return { r1: null, r30: null, anchorStep: null, positions: Array.from({ length: POSITIONS }, (_, i) => none(i + 1, why)) };
  }
  const table = anchoredBands(a.r1, a.r30);
  const out: KeyPosition[] = [];
  const anchorOf = (n: number): KeyPosition => {
    const e = n === 1 ? a.lo : a.hi;
    return {
      position: n, status: e.status, sel: e.sel, step: e.sel.length ? a.step : null,
      band: { ...table.bands[n - 1], classLo: e.classLo, classHi: e.classHi },
      seconds: e.seconds, candidates: e.candidates, reason: e.sel.length ? null : "The solver stopped on its time limit before finding the list",
    };
  };
  for (const band of table.bands) {
    const n = band.position;
    if (opts.only !== undefined && opts.only !== n) { out.push({ ...none(n, "not solved (single position)"), band, status: "uncertified" }); continue; }
    if (n === 1 || n === POSITIONS) { out.push(anchorOf(n)); opts.onPosition?.(n); continue; }
    let pos: KeyPosition | null = null;
    let tried = 0;
    for (const step of LADDER_STEPS) {
      const rules: NsRules = specRules(duration, step);
      const pool = poolFor(step);
      const r = await solvePosition(pool, band.classLo, band.classHi, { lo: band.sumLo, hi: band.sumHi }, rules, { timeLimit: opts.timeLimit });
      tried = r.candidates;
      if (r.sel.length) { pos = { position: n, status: r.status, sel: r.sel, step, band, seconds: r.seconds, candidates: r.candidates, reason: null }; break; }
    }
    out.push(pos ?? { position: n, status: "infeasible", sel: [], step: null, band, seconds: 0, candidates: tried, reason: `No list of 10 bonds meets the rules in average risk ${bandLabel(band)} (classes ${band.classLo}-${band.classHi}), also after the ladder steps` });
    opts.onPosition?.(n);
  }
  return { r1: a.r1, r30: a.r30, anchorStep: a.step, positions: out };
}
