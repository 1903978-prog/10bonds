import type { RankedBond } from "./types";
import { LIMITS } from "./limits";
import { listLifeLoss } from "./expectedLoss";
import { pdOf } from "./tiers";
import { bondRisk } from "./ratings";
import { issuerKey, RESULT_COUNT } from "./ranking";

// The one "Return & risk" slider (the owner's spec, 24/10/2026): 30 positions = 10 risk ceilings x 3 return levels.
// Position s (1..30): risk ceiling R = ceil(s / 3), return level k = 1 + (s - 1) mod 3 (1 low, 2 medium, 3 high).
// The ceiling is a hard limit: no bond in the list is riskier than R (R = 1: AAA only).
//
// Targets per ceiling, with C_R = the highest average yield of a 10-bond list under ceiling R (the top-return list):
// - R = 1: F_1 = yield of the AAA list with the lowest expected loss; targets F_1, F_1 + (C_1 - F_1) / 2, C_1.
// - R >= 2: Delta = C_R - C_(R-1); targets C_(R-1) + Delta / 3, C_(R-1) + 2 Delta / 3, C_R.
//   So targets never go down along the slider. The first feasible ceiling above an infeasible one starts like R = 1.
// Low and medium: the existing engine's list with the lowest expected loss that still reaches the target (PR #98).
// High: the top-return list. The same ranking as every search (lib/pickRanking.ts), passed in as `rank`.
//
// Then, along the slider: a list that pays less than the one before, or the same but with no lower expected loss, or
// the very same bonds, is not shown as a new portfolio: the position reuses the previous one (identical numbers,
// never made-up differences). Ceilings with fewer than 10 issuers are unavailable and reuse the last feasible list;
// positions before the first feasible list are marked unavailable.

export const SLIDER_POSITIONS = 30;
export const SLIDER_START = 15; // risk ceiling 5, high

export const ceilingOf = (s: number) => Math.ceil(s / 3);
export const levelOf = (s: number) => 1 + ((s - 1) % 3);

/** A ranking: the 10 bonds for a target average yield (%) and a risk ceiling. */
export type Ranker = (ytm: number, risk: number) => Promise<RankedBond[]>;

export type SliderPosition = {
  position: number;
  ceiling: number;
  level: number;
  /** The target asked for; null where the ceiling has no feasible list. */
  target: number | null;
  /** What to search to get this position's list (the reused one's when `sameAs` is set). */
  query: { ytm: number; risk: number } | null;
  /** Achieved figures of the list shown (%, risk scores). */
  ytm: number | null;
  expectedLoss: number | null;
  avgRisk: number | null;
  worstRisk: number | null;
  isins: string[];
  /** Set when this position shows the same list as an earlier one. */
  sameAs: number | null;
  unavailable: boolean;
};

type Pick = { query: { ytm: number; risk: number }; rows: RankedBond[]; ytm: number; el: number; avgRisk: number; worstRisk: number; isins: string[] };

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const r2 = (n: number) => Math.round(n * 100) / 100;

function measure(query: Pick["query"], rows: RankedBond[]): Pick | null {
  if (rows.length < RESULT_COUNT || new Set(rows.map(issuerKey)).size < RESULT_COUNT) return null;
  const risks = rows.map((b) => bondRisk(b) ?? LIMITS.risk.max);
  return {
    query,
    rows,
    ytm: avg(rows.map((b) => b.grossYtm!)),
    el: listLifeLoss(rows.map(pdOf)),
    avgRisk: avg(risks),
    worstRisk: Math.max(...risks),
    isins: rows.map((b) => b.isin).sort(),
  };
}

/** The 30 positions for one horizon and bond filter. Deterministic for the same data and ranking. */
export async function buildSlider(rank: Ranker): Promise<SliderPosition[]> {
  const run = async (ytm: number, risk: number) => measure({ ytm: r2(ytm), risk }, await rank(r2(ytm), risk));
  const out: SliderPosition[] = [];
  let prevCap: number | null = null; // C_(R-1) of the last feasible ceiling
  let shown: { pick: Pick; position: number } | null = null;
  for (let R = LIMITS.risk.min; R <= LIMITS.risk.max; R++) {
    const top = await run(LIMITS.ytm.max, R);
    const C: number | null = top ? Math.max(top.ytm, prevCap ?? -Infinity) : null;
    let targets: (number | null)[] = [null, null, null];
    let floor: Pick | null = null;
    if (top && C !== null) {
      if (prevCap === null) {
        floor = await run(LIMITS.ytm.min, R);
        const F = floor?.ytm ?? C;
        targets = [F, F + (C - F) / 2, C];
      } else {
        const d = C - prevCap;
        targets = [prevCap + d / 3, prevCap + (2 * d) / 3, C];
      }
    }
    for (let k = 1; k <= 3; k++) {
      const position = (R - 1) * 3 + k;
      const target = targets[k - 1];
      let pick: Pick | null = null;
      if (target !== null) pick = k === 3 ? top : k === 1 && floor ? floor : await run(target, R);
      // Reuse the list already shown when this one is no better along the slider.
      const reuse = !!shown && (!pick
        || pick.ytm < shown.pick.ytm - 1e-9
        || (pick.ytm <= shown.pick.ytm + 1e-9 && pick.el >= shown.pick.el - 1e-9)
        || pick.isins.join() === shown.pick.isins.join());
      if (!reuse && pick) shown = { pick, position };
      const p = reuse ? shown!.pick : pick;
      out.push({
        position,
        ceiling: R,
        level: k,
        target: target === null ? null : r2(target),
        query: p?.query ?? null,
        ytm: p ? r2(p.ytm) : null,
        expectedLoss: p ? Math.round(p.el * 1000) / 1000 : null,
        avgRisk: p ? Math.round(p.avgRisk * 10) / 10 : null,
        worstRisk: p?.worstRisk ?? null,
        isins: p?.isins ?? [],
        sameAs: reuse ? shown!.position : null,
        unavailable: !p,
      });
    }
    if (top && C !== null) prevCap = C;
  }
  return out;
}

/** Simple word for a position, shown to customers instead of risk scores. */
export function moodOf(position: number): "conservative" | "balanced" | "higher" {
  const R = ceilingOf(position);
  return R <= 3 ? "conservative" : R <= 7 ? "balanced" : "higher";
}
