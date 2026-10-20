import type { PublicBond } from "../types";
import { rankBonds } from "../ranking";
import { bondRisk } from "../ratings";
import { CURVE_RATINGS, shiftedCurve, type CurveConfig } from "./curve";
import { bundCurve, type BundCurve } from "./benchmark";
import { evaluateBond, type EvalContext, type Evaluation, type RiskStatus } from "./evaluate";
import { rankRiskAdjusted } from "./rank";

// Shadow mode: the risk-adjusted ranking computed next to the current one, for the admin comparison and the
// validation report. Nothing here changes what customers see.

export type Scenario = { duration: number; ytm: number; risk: number };
export const DEFAULT_SCENARIO: Scenario = { duration: 5, ytm: 4, risk: 7 }; // the site's opening slider values

export type Row = {
  rank: number; isin: string; issuer: string; name: string; ytm: number; duration: number; risk: number | null;
  rating: string | null; ratingSource: string | null; status: RiskStatus; reason: string | null;
  requiredBp: number | null; spreadBp: number | null; surplusBp: number | null; riskAdjustedYtm: number | null; benchmarkYtm: number | null;
};

const toRow = (rank: number, b: PublicBond, e: Evaluation): Row => ({
  rank, isin: b.isin, issuer: b.issuer ?? b.name, name: b.name, ytm: b.grossYtm!, duration: b.modifiedDuration!, risk: bondRisk(b),
  rating: e.rating, ratingSource: e.ratingSource, status: e.status, reason: e.reason,
  requiredBp: e.requiredBp, spreadBp: e.spreadBp, surplusBp: e.surplusBp, riskAdjustedYtm: e.riskAdjustedYtm, benchmarkYtm: e.benchmarkYtm,
});

export function contextFor(bonds: PublicBond[], asOf: string | null, curve: CurveConfig, reviews?: ReadonlyMap<string, "approved" | "rejected">, bund?: BundCurve): EvalContext {
  const at = asOf ?? new Date().toISOString();
  return { curve, bund: bund ?? bundCurve(bonds, at), asOf: at, reviews };
}

/** Current vs risk-adjusted top 10 for one set of slider values. */
export function compareScenario(bonds: PublicBond[], ctx: EvalContext, sc: Scenario) {
  const current = rankBonds(bonds, sc.duration, sc.ytm, undefined, sc.risk);
  const next = rankRiskAdjusted(bonds, sc.duration, sc.ytm, ctx, undefined, sc.risk);
  const oldRows = current.results.map((b) => toRow(b.rank, b, evaluateBond(b, ctx)));
  const newRows = next.results.map((b) => toRow(b.rank, b, b.risk));
  const inNew = new Set(newRows.map((r) => r.isin));
  const avg = (rows: Row[], f: (r: Row) => number | null) => {
    const xs = rows.map(f).filter((x): x is number => x !== null);
    return xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100 : null;
  };
  const sum = (rows: Row[]) => ({ count: rows.length, ytm: avg(rows, (r) => r.ytm), duration: avg(rows, (r) => r.duration), risk: avg(rows, (r) => r.risk), surplusBp: avg(rows, (r) => r.surplusBp) });
  return {
    scenario: sc,
    current: { rows: oldRows, summary: sum(oldRows) },
    riskAdjusted: { rows: newRows, summary: sum(newRows), targetReached: next.targetReached, counts: next.counts },
    overlap: oldRows.filter((r) => inNew.has(r.isin)).length,
    bund: ctx.bund.points.length,
  };
}

/** Every EUR bond of the copy through the model: counts, bonds below the hurdle, exceptional spreads, reasons. */
export function universeReport(bonds: PublicBond[], ctx: EvalContext) {
  const evaluations = bonds.filter((b) => b.currency === "EUR").map((b) => evaluateBond(b, ctx));
  const counts: Record<string, number> = {};
  const reasons: Record<string, number> = {};
  for (const e of evaluations) {
    counts[e.status] = (counts[e.status] ?? 0) + 1;
    if (e.status === "insufficient_data" || e.status === "unsupported") {
      const k = e.reason!.replace(/[\d.]+y outside/, "outside");
      reasons[k] = (reasons[k] ?? 0) + 1;
    }
  }
  const byB = new Map(bonds.map((b) => [b.isin, b]));
  const rows = (s: RiskStatus[]) => evaluations.filter((e) => s.includes(e.status)).map((e) => toRow(0, byB.get(e.isin)!, e));
  return {
    evaluations,
    counts,
    reasons,
    belowHurdle: rows(["below_hurdle"]).sort((a, b) => a.surplusBp! - b.surplusBp!),
    exceptional: rows(["review", "rejected"]).sort((a, b) => b.surplusBp! - a.surplusBp!),
    eligible: rows(["eligible"]).sort((a, b) => b.surplusBp! - a.surplusBp!),
  };
}

const BBB_BAND = ["BBB+", "BBB", "BBB-"] as const;

/** How the default scenario and the universe counts move when the curve moves by ±10, ±25, ±50 bp. */
export function sensitivity(bonds: PublicBond[], ctx: EvalContext, sc: Scenario = DEFAULT_SCENARIO) {
  const base = rankRiskAdjusted(bonds, sc.duration, sc.ytm, ctx, undefined, sc.risk).results.map((r) => r.isin);
  const out: { shift: number; scope: "all" | "BBB"; eligible: number; belowHurdle: number; exceptional: number; top: number; sameAsBase: number }[] = [];
  for (const scope of ["all", "BBB"] as const) {
    for (const shift of [-50, -25, -10, 10, 25, 50]) {
      const curve = shiftedCurve(ctx.curve, shift, scope === "all" ? CURVE_RATINGS : BBB_BAND);
      const c = { ...ctx, curve };
      const u = universeReport(bonds, c);
      const top = rankRiskAdjusted(bonds, sc.duration, sc.ytm, c, undefined, sc.risk).results.map((r) => r.isin);
      out.push({ shift, scope, eligible: u.counts.eligible ?? 0, belowHurdle: u.counts.below_hurdle ?? 0, exceptional: (u.counts.review ?? 0) + (u.counts.rejected ?? 0), top: top.length, sameAsBase: top.filter((i) => base.includes(i)).length });
    }
  }
  return out;
}
