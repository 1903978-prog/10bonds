import type { PublicBond, RankedBond } from "./types";
import type { Outlier } from "./outliers";
import { nearHorizon } from "./limits";
import { issuerKey, withinRisk } from "./ranking";
import { lossAdjustedYield } from "./expectedLoss";
import { bondNotch, bondRisk } from "./ratings";
import { bracketExplain, outlierWhy, type Scenario } from "./riskPremium/shadow";
import type { RiskRanking } from "./riskPremium/rank";
import type { EvalContext } from "./riskPremium/evaluate";

// "Why in or out" for one search (Premium, Pro and admin; the owner, 20/10/2026): every bond of the search window with the
// reason it is in the top 10 or not, in the order the ranking applies its rules. Built from the same ranking the
// results came from (lib/pickRanking.ts), so the table always matches the list on screen.

export type WhyRow = {
  rank: number; inTop: boolean; issuer: string; name: string; isin: string; ytm: number; duration: number; risk: number | null;
  surplusBp?: number | null; why: string;
};
export const WHY_MAX_ROWS = 400;

const pct = (x: number) => `${x.toFixed(2)}%`;

/** The reasons for today's ranking (lowest chance of a loss that reaches the target yield, one bond per issuer). */
export function explainCurrent(bonds: PublicBond[], outliers: Outlier[], sc: Scenario, results: RankedBond[], band: number): WhyRow[] {
  const inWindow = (b: PublicBond) => b.modifiedDuration !== null && nearHorizon(b.modifiedDuration, sc.duration, band + 1e-9);
  const top = new Map(results.map((r) => [r.isin, r]));
  const topIssuers = new Map(results.map((r) => [issuerKey(r), r]));
  const reached = results.length > 0 && results.reduce((s, r) => s + r.grossYtm!, 0) / results.length >= sc.ytm - 1e-9;
  const lowest = results.length ? Math.min(...results.map((r) => r.grossYtm!)) : 0;
  const row = (b: PublicBond, why: string): WhyRow => ({
    rank: top.get(b.isin)?.rank ?? 0, inTop: top.has(b.isin), issuer: b.issuer ?? b.name, name: b.name, isin: b.isin,
    ytm: b.grossYtm!, duration: b.modifiedDuration!, risk: bondRisk(b), why,
  });
  const out: WhyRow[] = [];
  const currency = new Set(bonds.map((b) => b.currency));
  for (const o of outliers) if (currency.has(o.bond.currency) && inWindow(o.bond)) out.push(row(o.bond, outlierWhy(o)));
  for (const b of bonds.filter(inWindow)) {
    const after = (bb: PublicBond) => lossAdjustedYield(bb.grossYtm!, bondNotch(bb) ?? 10, bb.modifiedDuration!);
    let why: string;
    if (top.has(b.isin)) why = `In the top 10: return ${pct(b.grossYtm!)}, ${pct(after(b))} after expected losses`;
    else if (!withinRisk([b], sc.risk).length) why = `Riskier than the risk limit (risk ${bondRisk(b)} > ${sc.risk})`;
    else if (topIssuers.has(issuerKey(b))) why = `Issuer already in the list with another bond (${topIssuers.get(issuerKey(b))!.name})`;
    else if (b.grossYtm! < lowest - 1e-9) why = `Not picked: return lower than every bond chosen (lowest ${pct(lowest)})`;
    else if (reached) why = `Not picked: the list reaches the ${sc.ytm}% target with lower average risk`;
    else why = `Not picked: ${pct(after(b))} after expected losses is lower than the bonds chosen`;
    out.push(row(b, why));
  }
  return order(out);
}

/** The reasons for the risk-adjusted ranking (spread over the maturity-matched Bund vs its required premium). */
export function explainRiskAdjusted(bonds: PublicBond[], outliers: Outlier[], sc: Scenario, ranking: RiskRanking, ctx: EvalContext): WhyRow[] {
  const currency = new Set(bonds.map((b) => b.currency));
  return order(bracketExplain(bonds, outliers.filter((o) => currency.has(o.bond.currency)), ctx, sc, ranking).map((r) => ({
    rank: r.rank, inTop: r.inTop, issuer: r.issuer, name: r.name, isin: r.isin, ytm: r.ytm, duration: r.duration, risk: r.risk,
    surplusBp: r.surplusBp, why: r.why,
  })));
}

const order = (rows: WhyRow[]) =>
  rows.sort((a, b) => Number(b.inTop) - Number(a.inTop) || (a.inTop ? a.rank - b.rank : b.ytm - a.ytm)).slice(0, WHY_MAX_ROWS);
