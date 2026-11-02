// LIVIO'S APPROVED CORPORATE ISSUER / BOND RATING MODEL, ported from the LM op model (lm-op-model: server/lib/livioBondRating.ts and
// server/lib/livioRating.ts). Every weight, band and adjustment below is the owner's number, copied as is; this file only does arithmetic.
//   Issuer LR (= IR) = weighted sum of 8 core factors + the macro block (6 factors), each 0-100, higher = safer.
//   Bond LR (= BR)   = IR + Capital Structure Adjustment (CSA, by seniority tier) + Structural Features Adjustment (SFA, by flags).
// Missing factors are NOT filled in: an unknown factor keeps its permitted bounds 0..100 and the bounds are carried through the same weights
// (the owner's $bonds skill, section 5.3), so missing information widens the range and nothing is invented.

export const CORE_KEYS = ["leverage", "interestCoverage", "freeCashFlow", "liquidity", "earningsTrend", "businessQuality", "industryRisk", "financialPolicy"] as const;
export const MACRO_KEYS = ["recessionSensitivity", "oilEnergyShock", "warGeopolitical", "inflationRateShock", "chinaCompetition", "pandemicDisruption"] as const;
export type CoreKey = (typeof CORE_KEYS)[number];
export type MacroKey = (typeof MACRO_KEYS)[number];
export type FactorKey = CoreKey | MacroKey;

export const ISSUER_LR_WEIGHTS = { leverage: 0.2125, interestCoverage: 0.1275, freeCashFlow: 0.1275, liquidity: 0.085, earningsTrend: 0.085, businessQuality: 0.085, industryRisk: 0.085, financialPolicy: 0.0425, macro: 0.15 } as const;
export const MACRO_FACTOR_WEIGHTS = { recessionSensitivity: 0.25, oilEnergyShock: 0.2, warGeopolitical: 0.15, inflationRateShock: 0.15, chinaCompetition: 0.15, pandemicDisruption: 0.1 } as const;

/** Where a factor value came from. Only "accounts" (a published figure through the bands below) and "typed" (a person's judgment) count as known. */
export type FactorOrigin = "accounts" | "typed" | "estimated" | "rating-implied";
export type FactorValue = { value: number; origin: FactorOrigin; metric?: string; period?: string; sourceUrl?: string };
export type FactorMap = Partial<Record<FactorKey, FactorValue | null>>;
export const KNOWN_ORIGINS: FactorOrigin[] = ["accounts", "typed"];

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const known = (f: FactorValue | null | undefined): f is FactorValue => !!f && Number.isFinite(f.value) && f.value >= 0 && f.value <= 100 && KNOWN_ORIGINS.includes(f.origin);

// ---- bands from accounts (verbatim from livioRating.ts factorFromAccounts) ----
const band = (v: number, bands: [number, number][]) => { for (const [limit, score] of bands) if (v >= limit) return score; return bands[bands.length - 1][1]; };
const bandLow = (v: number, bands: [number, number][]) => { for (const [limit, score] of bands) if (v <= limit) return score; return bands[bands.length - 1][1]; };
export const factorFromAccounts = {
  leverage(netDebt: number, ebitda: number): number { return ebitda <= 0 ? (netDebt > 0 ? 0 : 45) : bandLow(netDebt / ebitda, [[0, 100], [1, 90], [2, 75], [3, 60], [4, 40], [5, 20], [Infinity, 5]]); },
  coverage(ebitda: number, interest: number, netDebt: number): number | null { return interest <= 0 && netDebt <= 0 ? 100 : interest > 0 ? band(ebitda / interest, [[10, 100], [6, 90], [4, 75], [2.5, 60], [1.5, 40], [1, 20], [-Infinity, 5]]) : null; },
  fcf(cfo: number, capex: number, debt: number, positiveYears: number): number | null {
    const fcf = cfo - Math.abs(capex);
    const fcfDebt = debt > 0 ? band(fcf / debt, [[0.25, 100], [0.15, 85], [0.08, 70], [0.03, 50], [0, 30], [-Infinity, 10]]) : null;
    const consistency = band(positiveYears, [[5, 100], [4, 80], [3, 60], [2, 40], [-Infinity, 10]]);
    return fcfDebt === null ? null : 0.7 * fcfDebt + 0.3 * consistency;
  },
  liquidity(cashPlusUndrawn: number, due: number): number | null { return due > 0 ? band(cashPlusUndrawn / due, [[2, 100], [1.5, 85], [1, 70], [0.75, 50], [0.5, 30], [-Infinity, 10]]) : null; },
  earnings(cagrPct: number, yoyPct: number): number { const g = (v: number) => band(v, [[10, 100], [5, 85], [0, 70], [-5, 55], [-10, 35], [-Infinity, 15]]); return (g(cagrPct) + g(yoyPct)) / 2; },
};

export type Bounded = { min: number; max: number; unknown: FactorKey[]; terms: { key: FactorKey; weight: number; min: number; max: number; origin: FactorOrigin | "unknown" }[] };

/** IR as a range. Known factors contribute their value; unknown ones their bounds 0..100. Exactly the owner's weighted sum when everything is known. */
export function issuerLrBounds(f: FactorMap): Bounded {
  const terms: Bounded["terms"] = [];
  const unknown: FactorKey[] = [];
  let lo = 0, hi = 0;
  for (const k of CORE_KEYS) {
    const w = ISSUER_LR_WEIGHTS[k], v = f[k];
    const a = known(v) ? v.value : 0, b = known(v) ? v.value : 100;
    if (!known(v)) unknown.push(k);
    lo += w * a; hi += w * b; terms.push({ key: k, weight: w, min: a, max: b, origin: known(v) ? v.origin : "unknown" });
  }
  for (const k of MACRO_KEYS) {
    const w = ISSUER_LR_WEIGHTS.macro * MACRO_FACTOR_WEIGHTS[k], v = f[k];
    const a = known(v) ? v.value : 0, b = known(v) ? v.value : 100;
    if (!known(v)) unknown.push(k);
    lo += w * a; hi += w * b; terms.push({ key: k, weight: w, min: a, max: b, origin: known(v) ? v.origin : "unknown" });
  }
  return { min: clamp(lo), max: clamp(hi), unknown, terms };
}

// ---- BR: capital structure tier and structural features (verbatim ranges / midpoints) ----
export type CapitalStructureTier = "senior-secured" | "senior-unsecured-opco" | "senior-unsecured-holdco" | "senior-non-preferred-bank" | "tier2-bank" | "tier2-insurance-subordinated" | "corporate-hybrid-subordinated" | "at1-deeply-subordinated" | "structurally-subordinated-subsidiary";
export const CAPITAL_STRUCTURE_RANGES: Record<CapitalStructureTier, [number, number]> = {
  "senior-secured": [4, 6], "senior-unsecured-opco": [0, 0], "senior-unsecured-holdco": [-4, -2], "senior-non-preferred-bank": [-5, -3], "tier2-bank": [-10, -6],
  "tier2-insurance-subordinated": [-10, -6], "corporate-hybrid-subordinated": [-12, -8], "at1-deeply-subordinated": [-25, -15], "structurally-subordinated-subsidiary": [-5, -2],
};
export type StructuralFlags = Partial<Record<"perpetualHybrid" | "callableAtIssuerDiscretion" | "extensionRisk" | "couponDeferralAllowed" | "couponCancellationPermitted" | "lossAbsorptionOrWriteDown" | "convertibleToEquity" | "smallIlliquidIssue" | "largeLiquidBenchmarkIssue" | "strongCollateralPackage" | "weakCovenantPackage" | "strongerParentGuarantee" | "weakOrNoExpectedGuarantee", boolean>>;
export const SFA_POINTS: Record<keyof StructuralFlags, number> = {
  perpetualHybrid: -4.5, callableAtIssuerDiscretion: -2, extensionRisk: -3.5, couponDeferralAllowed: -4.5, couponCancellationPermitted: -6.5, lossAbsorptionOrWriteDown: -11.5,
  convertibleToEquity: -11.5, smallIlliquidIssue: -2.5, largeLiquidBenchmarkIssue: 1.5, strongCollateralPackage: 3.5, weakCovenantPackage: -2, strongerParentGuarantee: 3.5, weakOrNoExpectedGuarantee: -3,
};
export const sfaOf = (flags: StructuralFlags) => (Object.keys(SFA_POINTS) as (keyof StructuralFlags)[]).filter((k) => flags[k]).reduce((s, k) => s + SFA_POINTS[k], 0);

/** BR range = IR range + the tier's CSA range + the flags' SFA. */
export function bondLrBounds(ir: { min: number; max: number }, tier: CapitalStructureTier, flags: StructuralFlags) {
  const [c0, c1] = CAPITAL_STRUCTURE_RANGES[tier];
  const sfa = sfaOf(flags);
  return { min: clamp(ir.min + c0 + sfa), max: clamp(ir.max + c1 + sfa), csa: [c0, c1] as [number, number], sfa };
}
