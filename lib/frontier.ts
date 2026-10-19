import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";

/** Horizon of the landing chart's red line, in years, and its duration band (±20%). */
export const FRONTIER_HORIZON = 5;
export const FRONTIER_BAND = 0.2;

export type Frontier = {
  // Every rated bond with a yield: [risk 1..10, yield %], rounded so the payload stays small.
  dots: [number, number][];
  // Best yield per risk step for the 5-year horizon, only where it pays more than every lower-risk step.
  line: { level: number; ytm: number }[];
};

/**
 * The landing chart (Livio, 19/10/2026): a grey dot for each bond of every duration, and in red the efficient frontier,
 * the highest-yield bond of each risk score within ±20% of a 5-year horizon.
 */
export function frontierOf(bonds: PublicBond[]): Frontier {
  const dots: [number, number][] = [];
  const best = new Map<number, number>();
  const lo = FRONTIER_HORIZON * (1 - FRONTIER_BAND), hi = FRONTIER_HORIZON * (1 + FRONTIER_BAND);
  for (const b of bonds) {
    const risk = bondRisk(b);
    if (risk === null || b.grossYtm === null || !Number.isFinite(b.grossYtm)) continue;
    dots.push([risk, Math.round(b.grossYtm * 100) / 100]);
    const d = b.modifiedDuration;
    if (d !== null && d >= lo && d <= hi && b.grossYtm > (best.get(risk) ?? -Infinity)) best.set(risk, b.grossYtm);
  }
  const line: Frontier["line"] = [];
  let top = -Infinity;
  for (let level = 1; level <= 10; level++) {
    const y = best.get(level);
    if (y === undefined || y <= top) continue;
    line.push({ level, ytm: Math.round(y * 100) / 100 });
    top = y;
  }
  return { dots, line };
}
