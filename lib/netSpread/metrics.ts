import type { NsCand } from "./solve";

// Equal-weight (10% each) portfolio figures of a stored list. Net spread, gross spread and credit loss are in basis points per year.
export type NsMetrics = {
  netSpreadBp: number; grossSpreadBp: number; creditLossBp: number; ytm: number; duration: number; avgRisk: number; minRisk: number; maxRisk: number;
  /** Secondary indicator: average of the ten bond BES values, only when all ten exist. */
  avgBondBes: number | null; besCoverage: number;
};
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function metricsOf(sel: NsCand[]): NsMetrics {
  const bes = sel.map((c) => c.bes).filter((x): x is number => x !== null);
  return {
    netSpreadBp: r2(mean(sel.map((c) => c.ns))), grossSpreadBp: r2(mean(sel.map((c) => c.grossBp))), creditLossBp: r2(mean(sel.map((c) => c.lossBp))),
    ytm: r2(mean(sel.map((c) => c.ytm))), duration: r2(mean(sel.map((c) => c.dur))), avgRisk: Math.round(mean(sel.map((c) => c.cls)) * 10) / 10,
    minRisk: Math.min(...sel.map((c) => c.cls)), maxRisk: Math.max(...sel.map((c) => c.cls)),
    avgBondBes: bes.length === sel.length && sel.length > 0 ? Math.round(mean(bes) * 10) / 10 : null, besCoverage: bes.length,
  };
}
