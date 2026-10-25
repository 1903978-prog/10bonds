import type { PublicBond } from "./types";
import { capOf, rankBonds } from "./ranking";
import { listLifeLoss } from "./expectedLoss";
import { pdOf } from "./tiers";
import { lgdOf } from "./seniority";
import { LIMITS } from "./limits";

/** One point of the curve: a target average yield and the expected loss on your money of the list it picks (%). */
export type CurvePoint = { ytm: number; loss: number };

export const CURVE_STEP = 0.1;

/**
 * The expected loss on your money (lib/expectedLoss.ts listLifeLoss) for every target yield from the lowest to the
 * highest possible for this duration and risk limit (the slider maximum), with the same ranking the search uses.
 * Points are rounded to 0.01% so the chart and the search agree.
 */
export function lossCurve(bonds: PublicBond[], duration: number, risk: number): { points: CurvePoint[]; max: number } {
  const top = rankBonds(bonds, duration, 99, 10, risk).results;
  const max = top.length ? capOf(top.map((b) => b.grossYtm!)) : LIMITS.ytm.min;
  const steps = Math.max(1, Math.ceil((max - LIMITS.ytm.min) / CURVE_STEP - 1e-9));
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const ytm = i === steps ? max : Math.round((LIMITS.ytm.min + i * CURVE_STEP) * 100) / 100;
    const { results } = rankBonds(bonds, duration, ytm, 10, risk);
    const loss = results.length ? listLifeLoss(results.map(pdOf), results.map(lgdOf)) : 0;
    points.push({ ytm, loss: Math.round(loss * 1000) / 1000 });
  }
  return { points, max };
}

/** The loss of the curve point closest to a target yield (the chart's dot when the results carry no figure). */
export function nearestLoss(points: CurvePoint[], ytm: number): number {
  let best = points[0];
  for (const p of points) if (Math.abs(p.ytm - ytm) < Math.abs(best.ytm - ytm)) best = p;
  return best?.loss ?? 0;
}
