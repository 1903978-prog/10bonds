// REFERENCE COPY of the owner's original numerical methodology, taken verbatim from the LM op model (repo 1903978-prog/lm-op-model @ bdc5985, 2/11/2026).
// Part 1 = server/lib/livioBondRating.ts (sha256 fbaa705623dee9ed8504793a855875c5c6a50ef0032fbe6a32ca3ddfd40cab5d), the whole file, unchanged.
// Part 2 = excerpts of server/lib/livioRating.ts (sha256 1304ead0264d17bfa07c6786db726b7c7e19a9cf26d14d2d784664e67ecc4e85): the sovereign table, the rounding formula, factorFromAccounts.
// It exists ONLY so the tests can run identical data through the original and through lib/bondsEngine.ts. Production code must never import it.
// ===== PART 1: livioBondRating.ts (verbatim) =====
/**
 * Livio Bond Rating (LBR) — corporate bond solvency & risk framework,
 * spec'd by Livio 26/09/2026 (two messages: the base Issuer LR framework,
 * then the follow-up splitting it into Issuer LR + a per-bond Capital
 * Structure/Structural Features adjustment). Ported verbatim from that
 * spec — every weight and band below is his number, not derived or
 * rounded by this file.
 *
 *   Bond LR (= Livio Bond Rating) = Issuer LR + CSA + SFA, clamped [0,100]
 *
 * Issuer LR is a property of the ISSUER (solvency/resilience) — computed
 * once and reused for every bond from that issuer, never per-bond. CSA
 * (Capital Structure Adjustment) and SFA (Structural Features Adjustment)
 * are properties of the BOND (seniority/recovery, callability, loss
 * absorption, etc.) — computed per-ISIN. This file only does the
 * arithmetic; storage/skip-if-already-rated logic lives in routes.ts
 * (bondExplorerIssuerRatings is keyed by normalized issuer name, exactly
 * so a second bond from an already-rated issuer never re-triggers this
 * computation — same skip shape as the existing manual-rating
 * propagation, just for LR instead of the agency letter grade).
 *
 * NOT YET IMPLEMENTED, deliberately: section 6's "dynamic macro
 * adjustment" (AdjustedRisk_i = Vulnerability_i × MacroIntensity_i). The
 * spec states this as a risk-side multiplier, but every other factor in
 * this framework is scored 0-100 where HIGHER = more resilient (100 =
 * exceptional) — multiplying a resilience-style score by an intensity
 * >1 would push it out of range and doesn't obviously match either
 * convention without picking a sign the spec doesn't state explicitly.
 * Guessing that direction would let a wrong sign silently swing YTM
 * premiums (rule: never guess a value that feeds financial math) — the
 * six macro factors are computed from the RAW 0-100 scores only, no
 * environment multiplier applied yet. `macroIntensity` inputs are
 * accepted and stored for forward-compat but not yet used.
 */

export interface IssuerLRCoreInputs {
  /** Net debt/EBITDA, debt/capital, pension & lease liabilities, maturity profile. */
  leverage: number;
  /** EBITDA/interest, EBIT/interest, fixed-charge coverage. */
  interestCoverage: number;
  /** FCF after capex, consistency, FCF/debt, cash conversion. */
  freeCashFlow: number;
  /** Cash, undrawn facilities, near-term maturities, market access. */
  liquidity: number;
  /** Revenue/EBITDA/margin trend, volatility, guidance. */
  earningsTrend: number;
  /** Market position, brand, recurring revenue, pricing power, concentration. */
  businessQuality: number;
  /** Structural (not cyclical) industry risk: disruption, regulation, obsolescence. */
  industryRisk: number;
  /** Deleveraging willingness, dividend/buyback policy, M&A discipline. */
  financialPolicy: number;
}

export interface MacroFactorInputs {
  /** Cyclicality of demand, operating leverage, recession performance. */
  recessionSensitivity: number;
  /** Fuel/energy cost intensity, hedging, pass-through capability. */
  oilEnergyShock: number;
  /** Conflict-zone exposure, sanctions, supply-chain/logistics dependence. */
  warGeopolitical: number;
  /** Pricing power, wage sensitivity, refinancing/floating-rate exposure. */
  inflationRateShock: number;
  /** China revenue/manufacturing exposure, direct Chinese competition. */
  chinaCompetition: number;
  /** Physical-mobility dependence, shutdown sensitivity, remote-work resilience. */
  pandemicDisruption: number;
}

export type MacroEnvironment = "low" | "moderate" | "elevated" | "high" | "crisis";

/** Section 6's suggested multipliers — accepted/stored, not yet applied (see module header). */
export const MACRO_INTENSITY_MULTIPLIER: Record<MacroEnvironment, number> = {
  low: 0.5, moderate: 0.75, elevated: 1.0, high: 1.25, crisis: 1.5,
};

export interface IssuerLRInputs extends IssuerLRCoreInputs {
  macro: MacroFactorInputs;
}

// Section 2's core-factor weights (sum to 85%) + section 4's macro block
// weight (15%) = 100%.
export const ISSUER_LR_WEIGHTS = {
  leverage: 0.2125,
  interestCoverage: 0.1275,
  freeCashFlow: 0.1275,
  liquidity: 0.0850,
  earningsTrend: 0.0850,
  businessQuality: 0.0850,
  industryRisk: 0.0850,
  financialPolicy: 0.0425,
  macro: 0.15,
} as const;

// Section 4's macro sub-factor weights (sum to 100% of the macro block).
export const MACRO_FACTOR_WEIGHTS = {
  recessionSensitivity: 0.25,
  oilEnergyShock: 0.20,
  warGeopolitical: 0.15,
  inflationRateShock: 0.15,
  chinaCompetition: 0.15,
  pandemicDisruption: 0.10,
} as const;

function clamp0to100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Section 4's MacroScore = weighted sum of the six 0-100 macro factors. */
export function computeMacroScore(macro: MacroFactorInputs): number {
  return (
    MACRO_FACTOR_WEIGHTS.recessionSensitivity * macro.recessionSensitivity +
    MACRO_FACTOR_WEIGHTS.oilEnergyShock * macro.oilEnergyShock +
    MACRO_FACTOR_WEIGHTS.warGeopolitical * macro.warGeopolitical +
    MACRO_FACTOR_WEIGHTS.inflationRateShock * macro.inflationRateShock +
    MACRO_FACTOR_WEIGHTS.chinaCompetition * macro.chinaCompetition +
    MACRO_FACTOR_WEIGHTS.pandemicDisruption * macro.pandemicDisruption
  );
}

/** Section 7's final Issuer LR formula. Every input must already be a 0-100 score. */
export function computeIssuerLR(inputs: IssuerLRInputs): number {
  const macroScore = computeMacroScore(inputs.macro);
  const raw =
    ISSUER_LR_WEIGHTS.leverage * inputs.leverage +
    ISSUER_LR_WEIGHTS.interestCoverage * inputs.interestCoverage +
    ISSUER_LR_WEIGHTS.freeCashFlow * inputs.freeCashFlow +
    ISSUER_LR_WEIGHTS.liquidity * inputs.liquidity +
    ISSUER_LR_WEIGHTS.earningsTrend * inputs.earningsTrend +
    ISSUER_LR_WEIGHTS.businessQuality * inputs.businessQuality +
    ISSUER_LR_WEIGHTS.industryRisk * inputs.industryRisk +
    ISSUER_LR_WEIGHTS.financialPolicy * inputs.financialPolicy +
    ISSUER_LR_WEIGHTS.macro * macroScore;
  return clamp0to100(raw);
}

// Section 8's rating bands. Bands are checked high-to-low; `min` is inclusive.
export const LR_BANDS: { min: number; label: string; equivalent: string }[] = [
  { min: 90, label: "Exceptional", equivalent: "AAA / AA+" },
  { min: 85, label: "Very strong", equivalent: "AA" },
  { min: 80, label: "Strong", equivalent: "A+" },
  { min: 75, label: "Good", equivalent: "A" },
  { min: 70, label: "Acceptable", equivalent: "BBB+" },
  { min: 65, label: "Higher spread required", equivalent: "BBB" },
  { min: 60, label: "Minimum acceptable", equivalent: "BBB−" },
  { min: -Infinity, label: "Do not buy", equivalent: "BB+ or worse" },
];

export function lrBand(score: number): { label: string; equivalent: string } {
  const band = LR_BANDS.find((b) => score >= b.min)!;
  return { label: band.label, equivalent: band.equivalent };
}

/** Section 9's hard purchase rule. */
export function passesLRPurchaseRule(bondLR: number): boolean {
  return bondLR >= 60;
}

/** Section 9's concentration guidance — a position-size ceiling, not a hard block. */
export function lrConcentrationGuidance(bondLR: number): string {
  if (bondLR >= 80) return "Normal issuer limits";
  if (bondLR >= 70) return "Moderate limits";
  if (bondLR >= 65) return "Smaller positions";
  if (bondLR >= 60) return "Max 5-10% of the corporate-bond sleeve";
  return "Zero allocation";
}

/**
 * Section 11's preferred convex YTM-premium rule (over section 10's linear
 * quick-screen rule — the spec names this one "the preferred decision
 * rule"). Returns the required yield premium (percentage points) versus
 * an LR-80 bond at the same maturity. LR above 80 gives a small negative
 * premium (an LR-85 bond needs LESS extra yield than an LR-80 one),
 * matching the spec's own worked example (85 → −0.30% under the LINEAR
 * rule in section 10; the convex rule in section 11 only tabulates 80 and
 * below, so above 80 this falls back to the same linear slope section 10
 * uses there: 0.04% per point, continuous with the convex rule's own
 * 0.04%×(80−LR) branch at LR=80).
 */
export function requiredYtmPremiumConvex(lr: number): number {
  if (lr >= 75) return 0.04 * (80 - lr);
  if (lr >= 65) return 0.20 + 0.07 * (75 - lr);
  if (lr >= 60) return 0.90 + 0.10 * (65 - lr);
  // Below the LR60 hard floor (section 9: reject). Extrapolated on the
  // same 0.10%/point slope as the 60-65 band rather than left undefined —
  // a caller screening a sub-60 bond still gets a number, the reject
  // decision itself comes from passesLRPurchaseRule, not from this
  // premium being absent.
  return 1.40 + 0.10 * (60 - lr);
}

/** Section 10's quick linear screening rule — kept for comparison/display, not the decision rule. */
export function requiredYtmPremiumLinear(lr: number): number {
  return (80 - lr) * 0.06;
}

export type CapitalStructureTier =
  | "senior-secured" | "senior-unsecured-opco" | "senior-unsecured-holdco"
  | "senior-non-preferred-bank" | "tier2-bank" | "tier2-insurance-subordinated"
  | "corporate-hybrid-subordinated" | "at1-deeply-subordinated"
  | "structurally-subordinated-subsidiary";

// Section 2 of the follow-up spec — midpoint of each stated range, since a
// range (not a single number) is what was given; callers needing the full
// range for a picker UI should read CAPITAL_STRUCTURE_RANGES instead.
export const CAPITAL_STRUCTURE_RANGES: Record<CapitalStructureTier, [number, number]> = {
  "senior-secured": [4, 6],
  "senior-unsecured-opco": [0, 0],
  "senior-unsecured-holdco": [-4, -2],
  "senior-non-preferred-bank": [-5, -3],
  "tier2-bank": [-10, -6],
  "tier2-insurance-subordinated": [-10, -6],
  "corporate-hybrid-subordinated": [-12, -8],
  "at1-deeply-subordinated": [-25, -15],
  "structurally-subordinated-subsidiary": [-5, -2],
};

export interface StructuralFeatureFlags {
  perpetualHybrid?: boolean;
  callableAtIssuerDiscretion?: boolean;
  extensionRisk?: boolean;
  couponDeferralAllowed?: boolean;
  couponCancellationPermitted?: boolean;
  lossAbsorptionOrWriteDown?: boolean;
  convertibleToEquity?: boolean;
  smallIlliquidIssue?: boolean;
  largeLiquidBenchmarkIssue?: boolean;
  strongCollateralPackage?: boolean;
  weakCovenantPackage?: boolean;
  strongerParentGuarantee?: boolean;
  weakOrNoExpectedGuarantee?: boolean;
}

// Midpoints of each stated range in sections 2-3 of the follow-up spec.
const SFA_POINTS: Record<keyof StructuralFeatureFlags, number> = {
  perpetualHybrid: -4.5,
  callableAtIssuerDiscretion: -2,
  extensionRisk: -3.5,
  couponDeferralAllowed: -4.5,
  couponCancellationPermitted: -6.5,
  lossAbsorptionOrWriteDown: -11.5,
  convertibleToEquity: -11.5,
  smallIlliquidIssue: -2.5,
  largeLiquidBenchmarkIssue: 1.5,
  strongCollateralPackage: 3.5,
  weakCovenantPackage: -2,
  strongerParentGuarantee: 3.5,
  weakOrNoExpectedGuarantee: -3,
};

/** Sums the midpoint adjustment for every flag set true. */
export function computeStructuralFeaturesAdjustment(flags: StructuralFeatureFlags): number {
  return (Object.keys(SFA_POINTS) as (keyof StructuralFeatureFlags)[])
    .filter((k) => flags[k])
    .reduce((sum, k) => sum + SFA_POINTS[k], 0);
}

/** Bond LR (Livio Bond Rating) = Issuer LR + CSA + SFA, clamped to [0,100] (follow-up spec, section 4). */
export function computeBondLR(issuerLR: number, capitalStructureAdjustment: number, structuralFeaturesAdjustment: number): number {
  return clamp0to100(issuerLR + capitalStructureAdjustment + structuralFeaturesAdjustment);
}

// ===== PART 2: livioRating.ts excerpts (verbatim) =====
export const ORIG_SOVEREIGN_SCORES: Record<string, [number, number]> = {
  Germany: [93, 97], Netherlands: [90, 95], Finland: [89, 95], Estonia: [87, 94],
  Ireland: [84, 94], Austria: [82, 93], Lithuania: [82, 90], Latvia: [79, 91],
  France: [78, 88], Belgium: [76, 89], Slovenia: [77, 88], Spain: [73, 88],
  Portugal: [74, 87], Croatia: [72, 86], Cyprus: [70, 86], Greece: [68, 86],
  Italy: [67, 83], Poland: [73, 84], Bulgaria: [71, 84], Hungary: [62, 78],
  Romania: [58, 75], Chile: [70, 83], "Saudi Arabia": [76, 91], Mexico: [59, 75],
  Brazil: [55, 72], "Dominican Republic": [48, 68], Turkiye: [40, 62],
  Argentina: [26, 48],
};

export function origSovereignRating(country: string): number | null { const scores = ORIG_SOVEREIGN_SCORES[country]; if (!scores) return null; return Math.round(scores[0] * 0.7 + scores[1] * 0.3); }

/** Verbatim from dist/index.html's corporateBand: first band whose limit the value clears, else the last (lowest) band. */
function origCorporateBand(v: number, bands: [number, number][]): number {
  for (const [limit, score] of bands) if (v >= limit) return score;
  return bands[bands.length - 1][1];
}

/** For factors where a SMALLER number is better (leverage, volatility, payout): the first band whose limit the value does not exceed, else the last band. Codex's file used the
 *  higher-is-better ladder for these too, so 3x leverage scored 100 and net cash scored 5; corrected 09/10/2026. */
function origCorporateBandLow(v: number, bands: [number, number][]): number {
  for (const [limit, score] of bands) if (v <= limit) return score;
  return bands[bands.length - 1][1];
}

/** The five accounts-based factor mappers, one per Issuer LR financial factor, exported so the automatic fill (issuerLrAuto.ts) and calculateLivioCorporateScore use ONE set of bands. */
export const origFactorFromAccounts = {
  /** net debt / EBITDA -> 0-100 (smaller is better); EBITDA <= 0 scores 0 with net debt, 45 with net cash */
  leverage(netDebt: number, ebitda: number): number {
    return ebitda <= 0 ? (netDebt > 0 ? 0 : 45) : origCorporateBandLow(netDebt / ebitda, [[0, 100], [1, 90], [2, 75], [3, 60], [4, 40], [5, 20], [Infinity, 5]]);
  },
  /** EBITDA / net interest -> 0-100; null when interest and net debt are both unusable */
  coverage(ebitda: number, interest: number, netDebt: number): number | null {
    return interest <= 0 && netDebt <= 0 ? 100 : interest > 0 ? origCorporateBand(ebitda / interest, [[10, 100], [6, 90], [4, 75], [2.5, 60], [1.5, 40], [1, 20], [-Infinity, 5]]) : null;
  },
  /** (CFO - capex) / debt blended 70/30 with the count of positive-FCF years of 5 */
  fcf(cfo: number, capex: number, debt: number, positiveYears: number): number | null {
    const fcf = cfo - Math.abs(capex);
    const fcfDebt = debt > 0 ? origCorporateBand(fcf / debt, [[0.25, 100], [0.15, 85], [0.08, 70], [0.03, 50], [0, 30], [-Infinity, 10]]) : null;
    const consistency = origCorporateBand(positiveYears, [[5, 100], [4, 80], [3, 60], [2, 40], [-Infinity, 10]]);
    return fcfDebt === null ? null : 0.7 * fcfDebt + 0.3 * consistency;
  },
  /** (cash + undrawn lines) / debt due in 24 months */
  liquidity(cashPlusUndrawn: number, due: number): number | null {
    return due > 0 ? origCorporateBand(cashPlusUndrawn / due, [[2, 100], [1.5, 85], [1, 70], [0.75, 50], [0.5, 30], [-Infinity, 10]]) : null;
  },
  /** average of the multi-year and last-year EBITDA growth scores (percent) */
  earnings(cagrPct: number, yoyPct: number): number {
    const growth = (v: number) => origCorporateBand(v, [[10, 100], [5, 85], [0, 70], [-5, 55], [-10, 35], [-Infinity, 15]]);
    return (growth(cagrPct) + growth(yoyPct)) / 2;
  },
};

/** Verbatim from dist/index.html's corporateEquivalent. */
