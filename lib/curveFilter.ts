import type { CurvePoint } from "./singleBond";

/** Risk steps with a bond that are hidden by dropDominated (shown greyed so the gap is explained). */
export function dominatedLevels(points: CurvePoint[]): CurvePoint[] {
  const kept = new Set(dropDominated(points).map((p) => p.level));
  return points.filter((p) => p.ytm !== null && !kept.has(p.level));
}

/** Keep only risk steps whose best yield after expected losses beats every lower-risk step (more risk must pay more). Empty steps stay as "no bond". */
export function dropDominated(points: CurvePoint[]): CurvePoint[] {
  let best = -Infinity;
  const keep = new Set<number>();
  for (const p of [...points].sort((a, b) => a.level - b.level)) {
    if (p.ytm === null) continue;
    const v = p.adj ?? p.ytm;
    if (v > best) keep.add(p.level);
    best = Math.max(best, v);
  }
  return points.filter((p) => p.ytm === null || keep.has(p.level));
}
