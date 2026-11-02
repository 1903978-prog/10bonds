import { createHash } from "node:crypto";
import { BONDS_SKILL } from "./bondsSkill";
import {
  CAPITAL_STRUCTURE_RANGES, ISSUER_LR_WEIGHTS, MACRO_FACTOR_WEIGHTS, SFA_POINTS, bondLrBounds, factorFromAccounts, issuerLrBounds,
  type CapitalStructureTier, type FactorMap, type StructuralFlags,
} from "./livioIssuerModel";

// THE ONE IR / BR METHODOLOGY (owner, 2/11/2026). Every number that becomes an Issuer Rating (IR) or Bond Rating (BR) is calculated here and nowhere else:
// the Lenovo worker, the backend, the admin page and the tests all call these functions. The local model (Ollama) only finds and extracts facts.
//
// What the owner's "$bonds" skill defines (lib/bondsSkill.ts, word for word): WHAT to assess (seven IR blocks, BR contents, six risk categories, structure
// flags, ranges when data is missing) and it says: "Apply the existing independently defined IR scoring algorithm, its actual weights and numerical
// deduction rules. If those formulas are unavailable, DO NOT invent substitutes." The skill text contains NO numbers. The numbers are the owner's
// approved models, ported from the LM op model (server/lib/livioBondRating.ts, server/lib/livioRating.ts) and copied as they are:
//   corporate  IR = weighted sum of 8 core + 6 macro factors (lib/livioIssuerModel.ts); BR = IR + capital-structure adjustment + structural-feature points
//   sovereign  IR = round(0.70 x solvency + 0.30 x repayment protection) from the owner's 28-country table (below)
//   banks, insurers, other issuers: NO approved numerical method exists  ->  IR and BR are "Unverified - insufficient data", never a substitute number.
// Risk categories: the skill asks for a numerical adjustment "when possible"; the owner has approved no numbers, so every category adjusts by 0
// and the colour is recorded (and gates publication). Nothing in this file is a weight or adjustment invented by the 10bonds code.

export const ENGINE_VERSION = "bonds-engine-1.0.0";
export const METHODOLOGY_VERSION = "bonds-skill + livio-lr-v1 (2026-11-02)";
export const RISK_KEYS = ["news_mgmt_legal", "politics_regulation", "market_competition_tech", "rates_refinancing_liquidity", "macro_fx_energy", "health_climate_cyber"] as const;
export type RiskKey = (typeof RISK_KEYS)[number];
export type RiskColorE = "RED" | "AMBER" | "GREEN" | "GREY";

/** Verbatim from the LM op model (livioRating.ts): [solvency, repayment protection] per country. */
export const SOVEREIGN_SCORES: Record<string, [number, number]> = {
  Germany: [93, 97], Netherlands: [90, 95], Finland: [89, 95], Estonia: [87, 94], Ireland: [84, 94], Austria: [82, 93], Lithuania: [82, 90], Latvia: [79, 91],
  France: [78, 88], Belgium: [76, 89], Slovenia: [77, 88], Spain: [73, 88], Portugal: [74, 87], Croatia: [72, 86], Cyprus: [70, 86], Greece: [68, 86],
  Italy: [67, 83], Poland: [73, 84], Bulgaria: [71, 84], Hungary: [62, 78], Romania: [58, 75], Chile: [70, 83], "Saudi Arabia": [76, 91], Mexico: [59, 75],
  Brazil: [55, 72], "Dominican Republic": [48, 68], Turkiye: [40, 62], Argentina: [26, 48],
};
export const SOVEREIGN_WEIGHTS = { solvency: 0.7, repayment: 0.3 } as const;

const normSkill = (s: string) => s.replace(/\r\n/g, "\n").trim();
/** Fingerprint of a skill text (line endings and outer whitespace ignored). */
export const hashSkill = (text: string) => createHash("sha256").update(normSkill(text)).digest("hex");
/** Hash of the skill text this application carries (the copy the owner saved on /admin/skills). */
export const SKILL_HASH = hashSkill(BONDS_SKILL);

export type FactsLike = {
  isin: string; issuerType: string;
  issuer?: { canonicalId: string | null; legalName: string | null; lei: string | null } | null;
  factors?: FactorMap;
  structural?: { tier: CapitalStructureTier; flags: StructuralFlags };
  figures?: { parameter: string; value: number; unit: string; quote: string; url: string; period: string | null; reportingDate: string | null }[];
  risks: { key: string; color: string; explanation?: string; evidence: string[] }[];
};

export type Term = { key: string; weight: number; min: number; max: number; origin: string };
export type IssuerCalc = {
  method: "livio-corporate-14-factor" | "livio-sovereign-table" | "none";
  approved: boolean;
  irMin: number | null; irMax: number | null;
  terms: Term[]; unknown: string[];
  /** Sovereign inputs, when that method was used. */
  sovereign?: { country: string; solvency: number; repayment: number; weights: typeof SOVEREIGN_WEIGHTS };
  reason: string | null;
};

/** Country of a sovereign from its legal name ("Republic of Chile" -> Chile). Longest key wins ("Dominican Republic" before nothing shorter). */
export function sovereignCountry(name: string | null | undefined): string | null {
  const n = (name ?? "").toLowerCase();
  const hit = Object.keys(SOVEREIGN_SCORES).filter((k) => n.includes(k.toLowerCase())).sort((a, b) => b.length - a.length)[0];
  return hit ?? null;
}

/** The five accounts-based factors from cited figures. Only complete groups count; nothing is estimated. Judgment factors are NOT derived here. */
export function factorsFromFigures(figures: FactsLike["figures"]): FactorMap {
  const get = (p: string) => figures?.find((x) => x.parameter === p);
  const v = (p: string) => get(p)?.value;
  const out: FactorMap = {};
  const mk = (value: number | null, metric: string, ps: string[]) => {
    if (value === null || !Number.isFinite(value)) return null;
    const first = get(ps[0]);
    const periods = ps.map((p) => get(p)?.period).filter(Boolean) as string[];
    return { value, origin: "accounts" as const, metric, period: periods.sort().slice(-1)[0] ?? undefined, sourceUrl: first?.url };
  };
  if (v("netDebt") !== undefined && v("ebitda") !== undefined) out.leverage = mk(factorFromAccounts.leverage(v("netDebt")!, v("ebitda")!), "net debt / EBITDA", ["netDebt", "ebitda"]);
  if (v("ebitda") !== undefined && v("netInterestExpense") !== undefined && v("netDebt") !== undefined) out.interestCoverage = mk(factorFromAccounts.coverage(v("ebitda")!, v("netInterestExpense")!, v("netDebt")!), "EBITDA / net interest", ["ebitda", "netInterestExpense", "netDebt"]);
  if (v("cfo") !== undefined && v("capex") !== undefined && v("totalDebt") !== undefined && v("positiveFcfYears") !== undefined) out.freeCashFlow = mk(factorFromAccounts.fcf(v("cfo")!, v("capex")!, v("totalDebt")!, v("positiveFcfYears")!), "free cash flow / debt", ["cfo", "capex", "totalDebt", "positiveFcfYears"]);
  if (v("cashPlusUndrawn") !== undefined && v("debtDue24m") !== undefined) out.liquidity = mk(factorFromAccounts.liquidity(v("cashPlusUndrawn")!, v("debtDue24m")!), "liquidity / debt due in 24 months", ["cashPlusUndrawn", "debtDue24m"]);
  if (v("ebitdaCagrPct") !== undefined && v("ebitdaYoyPct") !== undefined) out.earningsTrend = mk(factorFromAccounts.earnings(v("ebitdaCagrPct")!, v("ebitdaYoyPct")!), "EBITDA growth", ["ebitdaCagrPct", "ebitdaYoyPct"]);
  for (const k of Object.keys(out) as (keyof FactorMap)[]) if (out[k] === null) delete out[k];
  return out;
}

/** calculateIssuerRating(verifiedFacts): the only place an IR is calculated. */
export function calculateIssuerRating(f: FactsLike): IssuerCalc {
  if (f.issuerType === "corporate") {
    const factors: FactorMap = { ...factorsFromFigures(f.figures), ...(f.factors ?? {}) };
    const b = issuerLrBounds(factors);
    return { method: "livio-corporate-14-factor", approved: true, irMin: b.min, irMax: b.max, terms: b.terms, unknown: b.unknown, reason: null };
  }
  if (f.issuerType === "sovereign") {
    const country = sovereignCountry(f.issuer?.legalName);
    if (country) {
      const [solvency, repayment] = SOVEREIGN_SCORES[country];
      const ir = Math.round(solvency * SOVEREIGN_WEIGHTS.solvency + repayment * SOVEREIGN_WEIGHTS.repayment);
      return { method: "livio-sovereign-table", approved: true, irMin: ir, irMax: ir, terms: [{ key: "solvency", weight: SOVEREIGN_WEIGHTS.solvency, min: solvency, max: solvency, origin: "owner table" }, { key: "repaymentProtection", weight: SOVEREIGN_WEIGHTS.repayment, min: repayment, max: repayment, origin: "owner table" }], unknown: [], sovereign: { country, solvency, repayment, weights: SOVEREIGN_WEIGHTS }, reason: null };
    }
    return { method: "none", approved: false, irMin: null, irMax: null, terms: [], unknown: [], reason: "IR: Unverified - the sovereign is not in the approved 28-country table." };
  }
  return { method: "none", approved: false, irMin: null, irMax: null, terms: [], unknown: [], reason: `IR: Unverified - insufficient data: no approved numerical IR method exists for issuer type "${f.issuerType}" (the $bonds skill says not to invent substitutes).` };
}

export type BondCalc = { approved: boolean; brMin: number | null; brMax: number | null; tier: CapitalStructureTier | null; csa: [number, number] | null; sfa: number; flags: string[]; reason: string | null };
/** calculateBondRating(issuerRating, verifiedBondFacts): BR = IR + capital-structure adjustment + structural-feature points, clamped 0..100. */
export function calculateBondRating(ir: IssuerCalc, f: FactsLike): BondCalc {
  if (!ir.approved || ir.irMin === null || ir.irMax === null) return { approved: false, brMin: null, brMax: null, tier: null, csa: null, sfa: 0, flags: [], reason: "BR: Unverified - the issuer rating is not calculable." };
  // A sovereign's own senior bond is the "senior unsecured, operating entity" tier (adjustment 0); anything else needs a stated tier.
  const structural = f.structural ?? (f.issuerType === "sovereign" ? { tier: "senior-unsecured-opco" as CapitalStructureTier, flags: {} } : undefined);
  if (!structural) return { approved: false, brMin: null, brMax: null, tier: null, csa: null, sfa: 0, flags: [], reason: "BR: Unverified - the bond's capital-structure tier is not established." };
  const b = bondLrBounds({ min: ir.irMin, max: ir.irMax }, structural.tier, structural.flags);
  return { approved: true, brMin: b.min, brMax: b.max, tier: structural.tier, csa: b.csa, sfa: b.sfa, flags: Object.keys(structural.flags).filter((k) => (structural.flags as Record<string, boolean>)[k]), reason: null };
}

/** calculateRiskAdjustments(verifiedRisks): colours are recorded; no numerical adjustment is approved, so each is 0. GREEN without evidence is GREY. */
export function calculateRiskAdjustments(risks: FactsLike["risks"]) {
  const items = RISK_KEYS.map((key) => {
    const r = risks.find((x) => x.key === key);
    const color: RiskColorE = !r ? "GREY" : r.color === "GREEN" && !r.evidence.length ? "GREY" : (r.color as RiskColorE);
    return { key, color, delta: 0, assessed: color !== "GREY" };
  });
  return { items, unassessed: items.filter((i) => !i.assessed).map((i) => i.key), note: "No numerical risk adjustment is approved by the owner: each category adjusts by 0; the colour gates publication." };
}

export type EngineResult = { issuer: IssuerCalc; bond: BondCalc; risks: ReturnType<typeof calculateRiskAdjustments> };
export function calculate(f: FactsLike): EngineResult {
  const issuer = calculateIssuerRating(f);
  return { issuer, bond: calculateBondRating(issuer, f), risks: calculateRiskAdjustments(f.risks) };
}

export type EligibilityInput = { f: FactsLike; storedIr: [number | null, number | null]; storedBr: [number | null, number | null]; storedEngineVersion: string | null; conflicts: string[]; evidenceCoverageOk: boolean; mandatoryOk: boolean; bondFactsOk: boolean };
/** evaluatePublicationEligibility(evidence): the methodology half of the gate. The evidence half (sources, identity, ages) lives in lib/creditGate.ts and calls this. */
export function evaluatePublicationEligibility(i: EligibilityInput): { allowed: boolean; reasons: string[]; checks: Record<string, boolean> } {
  const again = calculate(i.f);
  const r0 = (v: number | null) => (v === null ? null : Math.round(v));
  const sameIr = r0(again.issuer.irMin) === i.storedIr[0] && r0(again.issuer.irMax) === i.storedIr[1];
  const sameBr = r0(again.bond.brMin) === i.storedBr[0] && r0(again.bond.brMax) === i.storedBr[1];
  const checks = {
    approvedMethod: again.issuer.approved,
    engineVersion: i.storedEngineVersion === ENGINE_VERSION,
    reproducible: sameIr && sameBr,
    sixRisksAssessed: again.risks.unassessed.length === 0,
    noConflicts: i.conflicts.length === 0,
    evidenceCoverage: i.evidenceCoverageOk,
    mandatoryInputs: i.mandatoryOk,
    bondFacts: i.bondFactsOk,
  };
  const reasons: string[] = [];
  if (!checks.approvedMethod) reasons.push(again.issuer.reason ?? "No approved methodology for this issuer.");
  if (!checks.engineVersion) reasons.push(`Calculated with ${i.storedEngineVersion ?? "an unrecorded engine"}, not the approved ${ENGINE_VERSION}: recalculation required.`);
  if (!checks.reproducible) reasons.push("The stored IR/BR cannot be reproduced from the stored facts with the approved engine.");
  if (!checks.sixRisksAssessed) reasons.push(`Risk categories not assessed with evidence: ${again.risks.unassessed.join(", ")}.`);
  if (!checks.noConflicts) reasons.push(`Unresolved material conflicts (${i.conflicts.length}).`);
  if (!checks.evidenceCoverage) reasons.push("Evidence coverage is insufficient.");
  if (!checks.mandatoryInputs) reasons.push("Mandatory financial inputs are missing.");
  if (!checks.bondFacts) reasons.push("Bond seniority, guarantee or structure not verified.");
  return { allowed: reasons.length === 0, reasons, checks };
}

/** Everything stored with a result so it can be reproduced and audited (owner's traceability list). */
export function buildTrace(f: FactsLike, extra: { gate?: unknown; evidenceUrls?: string[]; skillFileHashFromPc?: string | null } = {}) {
  const r = calculate(f);
  return {
    isin: f.isin,
    canonicalIssuerId: f.issuer?.canonicalId ?? f.issuer?.lei ?? null,
    methodologyVersion: METHODOLOGY_VERSION,
    skillHash: SKILL_HASH,
    skillSource: "copy saved in the app (lib/bondsSkill.ts)",
    skillFileHashFromPc: extra.skillFileHashFromPc ?? null,
    engineVersion: ENGINE_VERSION,
    verifiedInputs: { factors: { ...factorsFromFigures(f.figures), ...(f.factors ?? {}) }, figures: f.figures ?? [], structural: f.structural ?? null },
    reportingDates: [...new Set((f.figures ?? []).map((x) => x.reportingDate ?? x.period).filter(Boolean))],
    factorScores: r.issuer.terms,
    weights: { issuerLr: ISSUER_LR_WEIGHTS, macro: MACRO_FACTOR_WEIGHTS, sovereign: SOVEREIGN_WEIGHTS },
    sovereign: r.issuer.sovereign ?? null,
    riskAdjustments: r.risks,
    bondAdjustments: { tier: r.bond.tier, csaRange: r.bond.csa, sfaPoints: r.bond.sfa, flags: r.bond.flags, sfaTable: SFA_POINTS, csaTable: CAPITAL_STRUCTURE_RANGES },
    ir: [r.issuer.irMin, r.issuer.irMax],
    br: [r.bond.brMin, r.bond.brMax],
    unverified: [r.issuer.reason, r.bond.reason].filter(Boolean),
    publicationEligibility: extra.gate ?? null,
    evidence: extra.evidenceUrls ?? [],
  };
}
