import type { PublicBond } from "../types";
import { issuerKey, rankBonds, withinRisk } from "../ranking";
import { nearHorizon } from "../limits";
import type { Outlier } from "../outliers";
import { bondRisk } from "../ratings";
import { CURVE_RATINGS, shiftedCurve, type CurveConfig } from "./curve";
import { bundCurve, yearsToMaturity, type BundCurve } from "./benchmark";
import { evaluateBond, type EvalContext, type Evaluation, type RiskStatus } from "./evaluate";
import { MAX_ABOVE_TARGET, rankRiskAdjusted, type RiskRanking } from "./rank";

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

export type BracketRow = Row & { inTop: boolean; why: string };

const pts = (x: number) => `${Math.round(x)} bp`;

/**
 * Every EUR bond in the curve's maturity bracket for one search, each with why it is in the risk-adjusted top 10 or
 * why it is not (Livio, 20/10/2026). Extra yield is measured over the maturity-matched Bund (AAA).
 * Checks in the order the ranking applies them: outlier, risk limit, duration window, the model's checks, yield cap,
 * issuer already used, Pareto dominance, then "not picked".
 */
export function bracketExplain(bonds: PublicBond[], outliers: Outlier[], ctx: EvalContext, sc: Scenario, next: RiskRanking): BracketRow[] {
  const inBracket = (b: PublicBond) => {
    const m = yearsToMaturity(b.maturity, ctx.asOf);
    return b.currency === "EUR" && m !== null && m >= ctx.curve.minMaturity - 1e-9 && m <= ctx.curve.maxMaturity + 1e-9;
  };
  const top = new Map(next.results.map((r) => [r.isin, r]));
  const topIssuers = new Map(next.results.map((r) => [issuerKey(r), r]));
  const evals = new Map(next.evaluations.map((e) => [e.isin, e]));
  const cands = next.evaluations.filter((e) => e.status === "eligible" && e.ytm! <= sc.ytm + MAX_ABOVE_TARGET + 1e-9);
  const riskOf = (e: Evaluation) => e.notch!;
  const out: BracketRow[] = [];

  for (const o of outliers.filter((o) => inBracket(o.bond))) {
    const why = o.reason === "name" ? "Outlier: name says subordinated, hybrid or perpetual" : outlierWhy(o);
    out.push({ ...toRow(0, o.bond, evaluateBond(o.bond, ctx)), inTop: false, why });
  }
  for (const b of bonds.filter(inBracket)) {
    const e = evals.get(b.isin) ?? evaluateBond(b, ctx);
    const row = toRow(top.get(b.isin)?.rank ?? 0, b, e);
    let why: string;
    if (top.has(b.isin)) why = `In the top 10: ${pts(e.spreadBp!)} over AAA Bund, ${pts(e.surplusBp!)} more than the ${e.requiredBp} bp required`;
    else if (!withinRisk([b], sc.risk).length) why = `Riskier than the risk limit (risk ${row.risk} > ${sc.risk})`;
    else if (!nearHorizon(b.modifiedDuration!, sc.duration, next.band + 1e-9)) why = `Duration ${b.modifiedDuration!.toFixed(1)}y outside the search window (${sc.duration} ± ${next.band}y)`;
    else if (e.status === "below_hurdle") why = `Extra yield over AAA Bund ${pts(e.spreadBp!)} is not above the ${e.requiredBp} bp its rating requires`;
    else if (e.status !== "eligible") why = e.reason ?? STATUS_TEXT[e.status];
    else if (e.ytm! > sc.ytm + MAX_ABOVE_TARGET + 1e-9) why = `Yield more than ${MAX_ABOVE_TARGET} points above the ${sc.ytm}% target`;
    else if (topIssuers.has(issuerKey(b))) why = `Issuer already in the list with a better bond (${topIssuers.get(issuerKey(b))!.name})`;
    else {
      // Outliers were removed before this point (lib/bonds.ts), so an outlier can never dominate another bond.
      const dom = cands.find((c) => c.isin !== b.isin && c.ytm! >= e.ytm! && riskOf(c) <= riskOf(e) && (c.ytm! > e.ytm! || riskOf(c) < riskOf(e)));
      const domBond = dom ? bonds.find((x) => x.isin === dom.isin) : undefined;
      why = dom
        ? `Not Pareto-efficient: ${domBond ? `${domBond.issuer ?? domBond.name} (${dom.isin})` : "another bond"} pays ${dom.ytm!.toFixed(2)}% at the same or lower risk`
        : `Not picked: ${pts(e.surplusBp!)} surplus is lower than the bonds chosen to keep the average near ${sc.ytm}%`;
    }
    out.push({ ...row, inTop: top.has(b.isin), why });
  }
  return out.sort((a, b) => Number(b.inTop) - Number(a.inTop) || (a.inTop ? a.rank - b.rank : (b.surplusBp ?? -1e9) - (a.surplusBp ?? -1e9)));
}

/** Why an outlier is left out, in words. */
export function outlierWhy(o: Outlier): string {
  if (o.reason === "name") return "Outlier: name says subordinated, hybrid or perpetual";
  const z = o.peerSd ? (o.bond.grossYtm! - o.peerMean!) / o.peerSd : Infinity;
  return `Outlier: yield ${o.bond.grossYtm!.toFixed(2)}% is ${Number.isFinite(z) ? z.toFixed(1) : "far more than"} std dev above the ${o.peerMean!.toFixed(2)}% average of similar bonds (hidden risk, e.g. subordinated)`;
}

const STATUS_TEXT: Record<RiskStatus, string> = {
  eligible: "Eligible", below_hurdle: "Below required compensation", review: "Exceptional spread: left out", rejected: "Exceptional spread: rejected",
  below_floor: "Below the BBB- floor", insufficient_data: "Insufficient data", unsupported: "The curve does not apply",
};

/** Current vs risk-adjusted top 10 for one set of slider values. */
export function compareScenario(bonds: PublicBond[], ctx: EvalContext, sc: Scenario, outliers?: Outlier[]) {
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
    bracket: outliers ? bracketExplain(bonds, outliers, ctx, sc, next) : [],
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
