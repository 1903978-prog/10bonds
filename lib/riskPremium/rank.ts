import type { PublicBond, RankedBond } from "../types";
import { LIMITS, isOpenEnded } from "../limits";
import { issuerKey, portfolioPool, RESULT_COUNT, withinRisk } from "../ranking";
import { evaluateBond, type EvalContext, type Evaluation, type RiskStatus } from "./evaluate";

// Risk-adjusted Portfolio ranking (shadow mode until Livio activates it).
//
// Candidate pool, documented: the same pool as today's ranking (rated bonds within the risk slider, duration within
// ±20% of the target, widened in half-years when fewer than 10 issuers), then only bonds that pass every check of the
// risk premium model (lib/riskPremium/evaluate.ts): EUR corporate, investment grade, 4-6y maturity, Bund benchmark,
// no exceptional spread unless approved, spread strictly above the required premium.
//
// Ranking metric: risk compensation surplus = spread over the maturity-matched Bund - required premium. It is the
// benchmark-adjusted risk-adjusted yield, used for every bond (never mixed with raw-yield scores), and for two bonds
// of the same maturity it gives exactly the pairwise hurdle rule. Ties: higher credit quality, fresher price, closer
// to the target duration, closer to the target yield, ISIN. (No liquidity data exists in the copy, so that tie-break
// is skipped.)
//
// Target yield stays a real constraint, as today: the list's average yield must reach it. Among lists that do, the
// one with the best average surplus wins (today's ranking instead picks the lowest average risk; this is the one
// documented change). If no list of eligible bonds can reach the target, the closest one is shown and flagged.
// One bond per issuer. Fewer than 10 eligible issuers: fewer rows, never filled with bonds that failed a check.

const AVG_DURATION_SLACK = 0.05;
const AVG_DURATION_PENALTY = 0.5;

export type RiskRanking = {
  results: (RankedBond & { risk: Evaluation })[];
  band: number;
  /** Every bond of the pool with its status, for the admin comparison. */
  evaluations: Evaluation[];
  counts: Record<RiskStatus, number>;
  targetReached: boolean;
  versionId: number;
  version: string;
};

/** Better first: higher surplus, then higher quality, fresher price, closer duration, closer yield, ISIN. */
export function riskOrder(targetDuration: number, targetYtm: number) {
  return (a: Evaluation, b: Evaluation) =>
    b.surplusBp! - a.surplusBp! ||
    a.notch! - b.notch! ||
    (Date.parse(b.ytmAsOf ?? "") || 0) - (Date.parse(a.ytmAsOf ?? "") || 0) ||
    Math.abs(a.duration! - targetDuration) - Math.abs(b.duration! - targetDuration) ||
    Math.abs(a.ytm! - targetYtm) - Math.abs(b.ytm! - targetYtm) ||
    a.isin.localeCompare(b.isin);
}

export function rankRiskAdjusted(
  bonds: PublicBond[], targetDuration: number, targetYtm: number, ctx: EvalContext, count = RESULT_COUNT, risk: number = LIMITS.risk.max,
): RiskRanking {
  const { pool, band } = portfolioPool(withinRisk(bonds, risk), targetDuration, count);
  const byIsin = new Map(pool.map((b) => [b.isin, b]));
  const evaluations = pool.map((b) => evaluateBond(b, ctx));
  const counts = Object.fromEntries(["eligible", "below_hurdle", "review", "rejected", "below_floor", "insufficient_data", "unsupported"].map((s) => [s, 0])) as Record<RiskStatus, number>;
  for (const e of evaluations) counts[e.status]++;

  const order = riskOrder(targetDuration, targetYtm);
  const cands = evaluations.filter((e) => e.status === "eligible").sort(order).map((e) => ({ e, key: issuerKey(byIsin.get(e.isin)!) }));
  const seen = new Set<string>();
  const start = cands.filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true))).slice(0, count);

  let chosen = start;
  const n = start.length;
  const avgYtm = (s: typeof start) => s.reduce((t, c) => t + c.e.ytm!, 0) / s.length;
  if (n && avgYtm(start) < targetYtm - 1e-9) {
    // Swap bonds in and out while that improves: reach the target average yield first, keep the average duration
    // near the target, then the best average surplus.
    const slack = AVG_DURATION_SLACK * targetDuration;
    const cost = (ytm: number, dur: number, surplus: number) =>
      Math.max(0, targetYtm - ytm / n) * 1000 +
      Math.max(0, (isOpenEnded(targetDuration) ? targetDuration - dur / n : Math.abs(dur / n - targetDuration)) - slack) * AVG_DURATION_PENALTY -
      surplus / n / 100;
    const set = [...start];
    let ytm = set.reduce((s, c) => s + c.e.ytm!, 0);
    let dur = set.reduce((s, c) => s + c.e.duration!, 0);
    let sur = set.reduce((s, c) => s + c.e.surplusBp!, 0);
    let best = cost(ytm, dur, sur);
    for (let iter = 0; iter < 400; iter++) {
      let move: { i: number; j: (typeof cands)[number]; c: number } | null = null;
      const used = new Set(set.map((c) => c.key));
      for (let i = 0; i < n; i++) {
        const out = set[i];
        for (const j of cands) {
          if (j.e.isin === out.e.isin || (j.key !== out.key && used.has(j.key))) continue;
          const c = cost(ytm - out.e.ytm! + j.e.ytm!, dur - out.e.duration! + j.e.duration!, sur - out.e.surplusBp! + j.e.surplusBp!);
          if (c < best - 1e-9 && (!move || c < move.c)) move = { i, j, c };
        }
      }
      if (!move) break;
      const out = set[move.i];
      ytm += move.j.e.ytm! - out.e.ytm!;
      dur += move.j.e.duration! - out.e.duration!;
      sur += move.j.e.surplusBp! - out.e.surplusBp!;
      set[move.i] = move.j;
      best = move.c;
    }
    chosen = set;
  }

  const ordered = chosen.map((c) => c.e).sort(order);
  return {
    results: ordered.map((e, i) => ({ ...byIsin.get(e.isin)!, rank: i + 1, ratingNotch: e.notch, score: e.riskAdjustedYtm!, risk: e })),
    band,
    evaluations,
    counts,
    targetReached: n > 0 && avgYtm(chosen) >= targetYtm - 1e-9,
    versionId: ctx.curve.id,
    version: ctx.curve.version,
  };
}
