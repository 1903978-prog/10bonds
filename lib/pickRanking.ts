import type { PublicBond, RankedBond } from "./types";
import { rankBonds } from "./ranking";
import { liveRiskConfig } from "./riskPremium/store";
import { rankRiskAdjusted, type RiskRanking } from "./riskPremium/rank";
import { contextFor } from "./riskPremium/shadow";
import { tunedPremiums } from "./riskPremium/bands";
import { V1_CURVE } from "./riskPremium/curve";
import type { EvalContext } from "./riskPremium/evaluate";

export type Engine = { method: "current" | "risk-adjusted"; version: string | null; weight: number; liveWeight: number; preview?: boolean; premiums?: Record<string, number> };

// The ranking users get for one search, shared by the results and the "why in or out" table so both always agree.
// Risk premium weight (lib/riskPremium/store.ts): 0 = the current ranking; above 0 the active curve, scaled by it,
// through the risk-adjusted ranking wherever the curve applies (otherwise the current one). The admin can try another
// weight and per-risk-score shifts (tryWeight, shifts); only the admin's own answer changes.
// skip: the customer's excluded bonds and issuers (lib/blacklist.ts), never picked; the Bund curve still sees every bond.
export async function pickRanking(
  all: PublicBond[], asOf: string | null, duration: number, ytm: number, risk: number, tryWeight: number | null = null, shifts: number[] | null = null,
  skip: ((b: PublicBond) => boolean) | null = null,
): Promise<{ results: RankedBond[]; band: number; engine: Engine; risky: { ranking: RiskRanking; ctx: EvalContext } | null }> {
  const bonds = skip ? all.filter((b) => !skip(b)) : all;
  const live = await liveRiskConfig().catch(() => null);
  const weight = tryWeight ?? live?.weight ?? 0;
  const base = live?.curve ?? (tryWeight !== null ? V1_CURVE : null);
  const engine: Engine = { method: "current", version: null, weight, liveWeight: live?.weight ?? 0, preview: tryWeight !== null };
  if (weight > 0 && base) {
    const curve = { ...base, premiums: tunedPremiums(base.premiums, weight, shifts) };
    const ctx = contextFor(all, asOf, curve, live?.reviews);
    const r = rankRiskAdjusted(bonds, duration, ytm, ctx, undefined, risk);
    engine.version = base.version;
    engine.premiums = curve.premiums;
    if (r.results.length) return { results: r.results, band: r.band, engine: { ...engine, method: "risk-adjusted" }, risky: { ranking: r, ctx } };
  }
  const ranked = rankBonds(bonds, duration, ytm, undefined, risk);
  return { ...ranked, engine, risky: null };
}
