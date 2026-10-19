import type { CurvePoint } from "./singleBond";

/** Keep only risk steps whose best yield beats every lower-risk step (more risk must pay more). Empty steps stay as "no bond". */
export function dropDominated(points: CurvePoint[]): CurvePoint[] {
  let best = -Infinity;
  const keep = new Set<number>();
  for (const p of [...points].sort((a, b) => a.level - b.level)) {
    if (p.ytm === null) continue;
    if (p.ytm > best) keep.add(p.level);
    best = Math.max(best, p.ytm);
  }
  return points.filter((p) => p.ytm === null || keep.has(p.level));
}
