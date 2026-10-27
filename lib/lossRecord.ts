import type { PublicBond } from "./types";
import { bondNotch } from "./ratings";
import { lifeYears } from "./lifeYears";
import { cumulativeDefault, bondLossChance } from "./expectedLoss";
import { cumulativeDefaultV2 } from "./lossModel";
import { LGD_BY_RANK, rankOf, type Rank } from "./seniority";
import { UNRATED_NOTCH } from "./ranking";
import { DEFAULT_RATES } from "./seo/defaultRates";

// The auditable expected-loss record of one bond (brief section 7). It states exactly what the optimiser's number is made of,
// what is assumed, and what the data feed does NOT contain, instead of implying security-level precision:
//   expected loss to maturity = cumulative default chance over the bond's remaining life x loss given default, undiscounted,
//   equal exposure, principal only (the paper's own "special case", eq. 13).
// Loss given default comes from the debt rank alone (lib/seniority.ts: 60 / 75 / 90%). The sensitivity range is the span of the
// neighbouring ranks of the SAME table (not an estimate): for a senior bond 60-75%, for senior non-preferred 60-90%, for subordinated 75-90%.
// Collateral, guarantees, governing law, recovery timing and sovereign restructuring terms are not in the data feed: they are listed
// in `missingInputs` and the record is never labelled "security-conditional".

export const LOSS_RECORD_MODEL = "rank-lgd-v1";

export type LossRecord = {
  isin: string;
  model: typeof LOSS_RECORD_MODEL;
  notch: number;
  ratingKnown: boolean;
  rank: Rank;
  horizonYears: number;
  /** Cumulative default chance to maturity, % (the active default model). */
  pdCumulativePct: number;
  /** The same spread over the remaining life, % per year (cumulative / years, at least one year). */
  pdAnnualisedPct: number;
  pdExtrapolated: boolean;
  lgd: number;
  lgdSource: "debt_rank_table";
  lgdConfidence: "low";
  lgdRange: [number, number];
  discounting: "none";
  /** Cumulative expected credit loss to maturity, % of the money invested. */
  elCumulativePct: number;
  /** Annualised: cumulative / max(1, years). Never mix with the cumulative figure. */
  elAnnualisedPct: number;
  elRangePct: [number, number];
  missingInputs: string[];
};

const ORDER: Rank[] = ["senior", "snp", "sub"];
export function lgdRange(rank: Rank): [number, number] {
  const i = ORDER.indexOf(rank);
  const near = [ORDER[Math.max(0, i - 1)], rank, ORDER[Math.min(2, i + 1)]].map((r) => LGD_BY_RANK[r]);
  return [Math.min(...near), Math.max(...near)];
}

export function lossRecordOf(b: PublicBond): LossRecord {
  const n = bondNotch(b);
  const notch = n ?? UNRATED_NOTCH;
  const years = lifeYears(b);
  const rank = rankOf(b);
  const lgd = LGD_BY_RANK[rank];
  const pd = Math.min(100, cumulativeDefault(notch, Math.max(0, years)));
  const [lo, hi] = lgdRange(rank);
  return {
    isin: b.isin, model: LOSS_RECORD_MODEL, notch, ratingKnown: n !== null, rank, horizonYears: years,
    pdCumulativePct: pd, pdAnnualisedPct: pd / Math.max(1, years), pdExtrapolated: cumulativeDefaultV2(notch, years).extrapolated,
    lgd, lgdSource: "debt_rank_table", lgdConfidence: "low", lgdRange: [lo, hi], discounting: "none",
    elCumulativePct: pd * lgd, elAnnualisedPct: (pd * lgd) / Math.max(1, years), elRangePct: [pd * lo, pd * hi],
    missingInputs: ["collateral / security", "guarantees", "governing law", "recovery timing", ...(b.currency ? [] : ["currency"]), "sovereign restructuring terms (no sovereign table)"],
  };
}

/**
 * Paper eq. 12 in its discrete yearly form: default in year k (chance F(k) - F(k-1)) loses LGD, discounted back at `rate` (a flat
 * annual rate as a fraction). With rate 0 it equals the undiscounted figure of the record. A comparison tool, not the optimiser's objective.
 */
export function discountedExpectedLossPct(notch: number, years: number, lgd: number, rate: number): number {
  const whole = Math.max(0, Math.ceil(years - 1e-9));
  let el = 0;
  for (let k = 1; k <= whole; k++) {
    const to = Math.min(k, years);
    const from = k - 1;
    const dp = (bondLossChance(notch, to) - (from > 0 ? bondLossChance(notch, from) : 0)) * lgd; // F(0) = 0 (the v1 table reads the one-year figure below one year)
    const t = (from + to) / 2;
    el += dp / Math.pow(1 + rate, t);
  }
  return el;
}

export const KNOWN_NOTCHES = DEFAULT_RATES.length;
