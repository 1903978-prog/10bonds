import { LADDER_STEPS, specRules, type LadderStep } from "../portfolioSpec";
import { anchoredBands, bandLabel, POSITIONS, type AnchorBand } from "../riskAnchors";
import { extremeOf, solvePosition, type NsCand, type NsSolve } from "./solve";

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
  /** True when the list is not the strict answer for its band: found at ladder step >= 1, in another 3-class window, under the return floor, or reused from the position below. */
  adjusted: boolean;
  /** Band of the position whose list this is when it was reused from the position below (the list is checked against that band). */
  reusedBand?: AnchorBand;
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

const meanYtm = (sel: NsCand[]) => sel.reduce((t, c) => t + c.ytm, 0) / (sel.length || 1);
/** Floor handed to the solver: the list below returns this much; a hair lower so the rounding of the model text never makes an equal list infeasible. */
const meanLoss = (sel: NsCand[]) => sel.reduce((t, c) => t + c.lossBp, 0) / (sel.length || 1);
const lossFloorOf = (sel: NsCand[] | null) => (sel && sel.length ? meanLoss(sel) - 1e-6 : undefined);
const floorOf = (sel: NsCand[] | null) => (sel && sel.length ? meanYtm(sel) - 1e-6 : undefined);
/** Other 3-class windows, nearest to the position's own first (the class spread of 2 is never relaxed). */
const otherWindows = (lo: number) => Array.from({ length: 8 }, (_, i) => i + 1).filter((w) => w !== lo).sort((a, b) => Math.abs(a - lo) - Math.abs(b - lo) || a - b);

const emptyBand = (n: number): AnchorBand => ({ position: n, sumLo: 0, sumHi: 0, classLo: 1, classHi: 3, target: 0 });
const none = (n: number, why: string): KeyPosition => ({ position: n, status: "infeasible", sel: [], step: null, band: emptyBand(n), adjusted: false, seconds: 0, candidates: 0, reason: why });

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
      position: n, status: e.status, sel: e.sel, step: e.sel.length ? a.step : null, adjusted: e.sel.length > 0 && a.step >= 1,
      band: { ...table.bands[n - 1], classLo: e.classLo, classHi: e.classHi },
      seconds: e.seconds, candidates: e.candidates, reason: e.sel.length ? null : "The solver stopped on its time limit before finding the list",
    };
  };
  // Return must rise with risk (owner, 28/10/2026): every list returns at least as much as the one below it (floor = the previous list's average return).
  // The floor only binds when the unconstrained best list would be dominated. If no list reaches it, the position is "adjusted" and reuses the list below.
  let below: KeyPosition | null = null;
  const solved = async (n: number, band: AnchorBand, windows: number[], steps: readonly LadderStep[], sum: { lo: number; hi: number }, floor: number | undefined, lossFloor?: number): Promise<{ r: NsSolve; step: LadderStep; band: AnchorBand; tried: number } | null> => {
    let tried = 0;
    for (const step of steps) {
      for (const lo of windows) {
        const own = lo === band.classLo;
        const r = await solvePosition(poolFor(step), lo, lo + 2, sum, specRules(duration, step), { timeLimit: opts.timeLimit, retMin: floor, lossMin: lossFloor });
        tried = r.candidates;
        if (r.sel.length) return { r, step, band: own ? band : { ...band, classLo: lo, classHi: lo + 2 }, tried };
      }
    }
    void n;
    return null;
  };
  for (const band of table.bands) {
    const n = band.position;
    if (opts.only !== undefined && opts.only !== n) { out.push({ ...none(n, "not solved (single position)"), band, status: "uncertified" }); continue; }
    const floor: number | undefined = opts.only === undefined ? floorOf((below as KeyPosition | null)?.sel ?? null) : undefined;
    const lossFloor: number | undefined = opts.only === undefined ? lossFloorOf((below as KeyPosition | null)?.sel ?? null) : undefined;
    let pos: KeyPosition | null = null;
    if (n === 1) pos = anchorOf(n);
    else if (n === POSITIONS) {
      pos = anchorOf(n);
      if (pos.sel.length && ((floor !== undefined && meanYtm(pos.sel) < floor) || (lossFloor !== undefined && meanLoss(pos.sel) < lossFloor))) {
        const e = a.hi;
        const f: Awaited<ReturnType<typeof solved>> = await solved(n, pos.band, [e.classLo, ...otherWindows(e.classLo)], LADDER_STEPS.filter((x) => x >= a.step), { lo: a.r30, hi: a.r30 }, floor, lossFloor);
        pos = f ? { position: n, status: f.r.status, sel: f.r.sel, step: f.step, band: f.band, adjusted: true, seconds: f.r.seconds, candidates: f.tried, reason: null } : null;
      }
    } else {
      const sum = { lo: band.sumLo, hi: band.sumHi };
      const f: Awaited<ReturnType<typeof solved>> = (await solved(n, band, [band.classLo], LADDER_STEPS, sum, floor, lossFloor)) ?? (await solved(n, band, otherWindows(band.classLo), LADDER_STEPS, sum, floor, lossFloor));
      if (f) pos = { position: n, status: f.r.status, sel: f.r.sel, step: f.step, band: f.band, adjusted: f.step >= 1 || f.band !== band, seconds: f.r.seconds, candidates: f.tried, reason: null };
    }
    if (!pos || !pos.sel.length) {
      // No list of its own: the closest non-dominated list is the one below (same figures, so never dominated), marked "adjusted".
      if (below && below.sel.length && n !== 1) {
        pos = { position: n, status: below.status, sel: below.sel, step: Math.max(1, below.step ?? 1) as LadderStep, band, adjusted: true, reusedBand: below.reusedBand ?? below.band, seconds: 0, candidates: below.candidates, reason: null };
      } else pos = { position: n, status: "infeasible", sel: [], step: null, band, adjusted: false, seconds: 0, candidates: pos?.candidates ?? 0, reason: `No list of 10 bonds meets the rules in average risk ${bandLabel(band)} (classes ${band.classLo}-${band.classHi}), also after the ladder steps` };
    }
    if (pos.sel.length) below = pos;
    out.push(pos);
    opts.onPosition?.(n);
  }
  return { r1: a.r1, r30: a.r30, anchorStep: a.step, positions: out };
}
