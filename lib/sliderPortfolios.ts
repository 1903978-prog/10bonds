import { LIMITS } from "./limits";
import { bondRisk } from "./ratings";
import { efficientPoints, FRONTIER_POINTS, pickEven, strictlyUp } from "./frontierPoints";
import { targetOf, type ExactFrontier } from "./exactFrontier";

// The one "Return & risk" slider (the owner, 24/10/2026): up to 30 positions along the efficient frontier, expected
// loss on your money against average return, for one horizon and bond filter.
// Each position is the exact lowest-loss list for its return (lib/exactFrontier.ts, with the diversification guard: one
// bond per issuer, at most 2 at B+ or below); the search page gives the same list for the position's query (guard=1).
// Position 1 is the true lowest-loss list, the last one the true highest-return list; the ones between sit at even
// distances along the curve (lib/frontierPoints.ts).
// Lists that repeat or are beaten by another are left out, so there are never more positions than distinct lists and
// they are numbered 1..k with return and loss going up. (Replaced the earlier 10 risk ceilings x low/medium/high.)

export const SLIDER_POSITIONS = FRONTIER_POINTS;
export const SLIDER_START = 15;

export type SliderQuery = { ytm: number; risk: number; guard: true };

export type SliderPosition = {
  position: number;
  /** The target asked for. */
  target: number | null;
  /** What to search to get this position's list. */
  query: SliderQuery | null;
  /** Achieved figures of the list shown (%, risk scores). */
  ytm: number | null;
  expectedLoss: number | null;
  avgRisk: number | null;
  worstRisk: number | null;
  isins: string[];
  /** Kept for older readers: positions never repeat a list now. */
  sameAs: number | null;
  unavailable: boolean;
};

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** The positions for one horizon and bond filter (none if no 10-issuer list exists). Deterministic for the same data. */
export function buildSlider(frontier: ExactFrontier, count = SLIDER_POSITIONS): SliderPosition[] {
  // Shown figures are rounded, so the strict check runs on what the customer sees.
  const eff = efficientPoints(frontier.points).map((p) => ({ p, ytm: r2(p.ytm), el: r3(p.el) }));
  // Rounded figures can tie: keep the first of a tie, except at the top, where the true highest-return list stays.
  const shown = strictlyUp(eff.slice(0, -1), null);
  const last = eff[eff.length - 1];
  while (last && shown.length && !(last.ytm > shown[shown.length - 1].ytm && last.el > shown[shown.length - 1].el)) shown.pop();
  if (last) shown.push(last);
  const pts = strictlyUp(pickEven(shown, count), "slider");
  return pts.map(({ p, ytm, el }, i) => {
    const risks = p.rows.map((b) => bondRisk(b) ?? LIMITS.risk.max);
    const target = targetOf(p);
    return {
      position: i + 1,
      target,
      query: { ytm: target, risk: LIMITS.risk.max, guard: true },
      ytm,
      expectedLoss: el,
      avgRisk: Math.round(avg(risks) * 10) / 10,
      worstRisk: Math.max(...risks),
      isins: p.isins,
      sameAs: null,
      unavailable: false,
    };
  });
}

/** Simple word for a position, shown to customers instead of risk scores: by the riskiest bond of its list. */
export function moodOf(p: Pick<SliderPosition, "worstRisk"> | null | undefined, at: number, of: number): "conservative" | "balanced" | "higher" {
  const R = p?.worstRisk ?? Math.ceil((at / Math.max(1, of)) * LIMITS.risk.max);
  return R <= 3 ? "conservative" : R <= 7 ? "balanced" : "higher";
}
