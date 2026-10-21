import type { PublicBond, RankedBond } from "./types";
import { bondRisk } from "./ratings";
import { FRONTIER_SEARCH, monotonicRun } from "./frontier";

/** Set once the visitor has seen the intro (or skipped it); without it the home page opens with the intro. */
export const INTRO_COOKIE = "tb_intro";

/** The intro's three horizons (years, rounded duration) and the horizon each one's example search uses. */
export const INTRO_HORIZONS = [
  { from: 1, to: 3, example: 2 },
  { from: 4, to: 6, example: 5 },
  { from: 7, to: 10, example: 8 },
] as const;
/** Highest risk accepted in the intro's examples. */
export const INTRO_RISK = 5;

export type IntroExample = { duration: number; risk: number; rows: { issuer: string; ytm: number }[]; more: number; dots: number[] };

export type IntroData = {
  // Every rated bond with a yield: [risk 1..10, yield %, horizon 1..3 (0 = none of them)].
  dots: [number, number, number][];
  // Per horizon, the efficient frontier as positions in `dots`, safest first.
  fronts: number[][];
  // Visitor-sized example results (top 3 names, the rest only counted) and the positions in `dots` of the whole top 10.
  examples: IntroExample[];
};

const horizonOf = (d: number | null) => {
  if (d === null || !Number.isFinite(d)) return 0;
  const y = Math.round(d);
  return INTRO_HORIZONS.findIndex((h) => y >= h.from && y <= h.to) + 1;
};

/** The dots and, per horizon, the frontier (same rule as the landing chart: top 5% yield per risk level 1..8, rising only). */
export function introDots(bonds: PublicBond[]): { dots: IntroData["dots"]; fronts: number[][]; at: Map<string, number> } {
  const dots: IntroData["dots"] = [];
  const at = new Map<string, number>();
  const byLevel = INTRO_HORIZONS.map(() => new Map<number, number[]>());
  for (const b of bonds) {
    const risk = bondRisk(b);
    if (risk === null || b.grossYtm === null || !Number.isFinite(b.grossYtm)) continue;
    const h = horizonOf(b.modifiedDuration);
    if (h) byLevel[h - 1].set(risk, [...(byLevel[h - 1].get(risk) ?? []), dots.length]);
    at.set(b.isin, dots.length);
    dots.push([risk, Math.round(b.grossYtm * 100) / 100, h]);
  }
  const fronts = byLevel.map((levels) => {
    const picks: number[] = [];
    for (let r = FRONTIER_SEARCH.minRisk; r <= FRONTIER_SEARCH.maxRisk; r++) {
      const ys = (levels.get(r) ?? []).sort((a, b) => dots[a][1] - dots[b][1]);
      if (ys.length) picks.push(ys[Math.min(ys.length - 1, Math.floor(0.95 * ys.length))]);
    }
    return monotonicRun(picks, (i) => dots[i][1]);
  });
  return { dots, fronts, at };
}

/** An example result as a visitor sees it: 3 names with their yield, the other bonds of the top 10 only counted. */
export function exampleOf(results: RankedBond[], duration: number, at: Map<string, number>): IntroExample {
  const top = results.slice(0, 10);
  return {
    duration,
    risk: INTRO_RISK,
    rows: top.slice(0, 3).map((b) => ({ issuer: b.issuer ?? b.name, ytm: b.grossYtm! })),
    more: Math.max(0, top.length - 3),
    dots: top.map((b) => at.get(b.isin)).filter((i): i is number => i !== undefined),
  };
}
