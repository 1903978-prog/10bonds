import { notchOf, spGradeOf } from "./ratings";
import { type CapitalStructureTier, type FactorMap, type StructuralFlags } from "./livioIssuerModel";
import { ENGINE_VERSION, RISK_KEYS as ENGINE_RISK_KEYS, calculate } from "./bondsEngine";

// Deterministic IR / BR calculation for the credit research engine (owner, 1/11/2026). The local model (Ollama) only EXTRACTS facts
// from documents; every number below is plain arithmetic on those facts, so a score can be reproduced from its stored inputs.
// IR and BR are independent provisional assessments on a 0-100 scale. They are not agency ratings and not the site's 1-10 risk class.
// This is a transparent first model (not calibrated against defaults yet): it never reports "validated" by itself.

// SCORING_VERSION is the LEGACY agency-anchored model (ir-br-v0.1): it has no approval from the owner, is used only for issuer types without an approved
// $bonds method, and its result can never be published (the gate blocks it). The approved engine is lib/bondsEngine.ts (ENGINE_VERSION).
export const SCORING_VERSION = "ir-br-v0.1-2026-11-01";
export const SCORING_VERSION_LIVIO = ENGINE_VERSION;

export type Seniority = "senior_preferred" | "senior_unsecured" | "secured" | "senior_non_preferred" | "tier2" | "at1" | "unknown";
export type IssuerType = "corporate" | "bank" | "insurer" | "financial_holding" | "sovereign" | "supranational" | "structured" | "other";
export type RiskColor = "RED" | "AMBER" | "GREEN" | "GREY";
export const RISK_KEYS = ENGINE_RISK_KEYS;
export type RiskKey = (typeof RISK_KEYS)[number];

export type Evidence = { url: string; title: string; publisher: string; publishedAt: string | null; period: string | null; retrievedAt: string; location: string | null; method: string; verification: "verified" | "unverified" | "conflict"; primary: boolean };
export type AgencyInput = { agency: string; rating: string; scope: "issuer" | "instrument"; date: string | null };
export type Metrics = Partial<Record<"netDebtToEbitda" | "interestCover" | "cet1Pct" | "nplPct" | "debtToGdpPct", number | null>>;
export type RiskInput = { key: RiskKey; color: RiskColor; explanation: string; evidence: string[]; verifiedOn: string | null };

/** Who the issuer is and how sure we are (publication gate, 2/11/2026). Absent = not verified. */
export type IssuerIdentity = { canonicalId: string | null; legalName: string | null; lei: string | null; identityVerified: boolean; typeVerified: boolean };
/** What is known about the bond itself. Absent or null = not verified, which blocks BR publication. */
export type BondFacts = {
  legalIssuerMatchesIsin: boolean;
  seniorityVerified: boolean;
  guaranteeStatus: "guaranteed" | "none_confirmed" | "unknown";
  bondType: string | null;
  resolutionTreatment: string | null;
  callable: boolean | null;
  embeddedRisksAssessed: boolean;
  /** Evidence URLs behind these bond facts. */
  evidence: string[];
};

export type ResearchFacts = {
  isin: string;
  issuerType: IssuerType;
  seniority: Seniority;
  guaranteed: boolean | null;
  agencyRatings: AgencyInput[];
  metrics: Metrics;
  risks: RiskInput[];
  conflicts: string[];
  evidence: Evidence[];
  /** Gaps the research itself reports (e.g. extraction failed); any note makes the assessment "review required". */
  notes?: string[];
  issuer?: IssuerIdentity;
  /** Period end (YYYY-MM-DD) of each reported metric; a metric without one counts as stale. */
  metricPeriods?: Partial<Record<keyof Metrics, string>>;
  bond?: BondFacts;
  /** Every extracted figure with its citation (evidence record). Figures whose quote does not contain the number are rejected on arrival. */
  figures?: { parameter: string; value: number; unit: string; quote: string; url: string; period: string | null; reportingDate: string | null }[];
  /** The owner's 14 issuer factors (corporates). Only "accounts" and "typed" values count; see lib/livioIssuerModel.ts. */
  factors?: FactorMap;
  /** Capital structure tier and structural flags of the bond, for the owner's BR adjustments. */
  structural?: { tier: CapitalStructureTier; flags: StructuralFlags };
};

export type Scored = {
  irMin: number; irMax: number; brMin: number; brMax: number;
  status: "provisional" | "review_required";
  coverage: number;
  anchorGrade: string | null;
  steps: { label: string; delta: number }[];
  missing: string[];
  riskAdjustments: { key: RiskKey; color: RiskColor; delta: number }[];
  version: string;
  /** True only when IR is built from the issuer's own financial and risk factors; false while the agency grade is the starting point. */
  independent: boolean;
  /** True when BR came from a bond-level agency grade with a generic seniority adjustment. */
  usesInstrumentGrade: boolean;
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const r0 = (v: number) => Math.round(v);

/** S&P-equivalent notch score: AAA 100, 4 points per notch (A 80, BBB 72, BBB- 64, BB 48). */
export const anchorScore = (notch: number) => 100 - notch * 4;

const STRUCTURE: Record<Seniority, number> = { secured: 3, senior_preferred: 0, senior_unsecured: 0, senior_non_preferred: -7, tier2: -14, at1: -24, unknown: 0 };
const RISK_DELTA: Record<RiskColor, number> = { RED: -6, AMBER: -2.5, GREEN: 0, GREY: 0 };

function metricSteps(f: ResearchFacts): { steps: { label: string; delta: number }[]; used: number } {
  const m = f.metrics;
  const steps: { label: string; delta: number }[] = [];
  const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  if (f.issuerType === "corporate" || f.issuerType === "other") {
    if (num(m.netDebtToEbitda)) steps.push({ label: `Net debt / EBITDA ${m.netDebtToEbitda}x`, delta: m.netDebtToEbitda < 1.5 ? 4 : m.netDebtToEbitda < 3 ? 0 : m.netDebtToEbitda < 4.5 ? -4 : -9 });
    if (num(m.interestCover)) steps.push({ label: `Interest cover ${m.interestCover}x`, delta: m.interestCover < 3 ? -5 : m.interestCover > 8 ? 3 : 0 });
  } else if (f.issuerType === "bank") {
    if (num(m.cet1Pct)) steps.push({ label: `CET1 ${m.cet1Pct}%`, delta: m.cet1Pct < 12 ? -4 : m.cet1Pct > 15 ? 3 : 0 });
    if (num(m.nplPct)) steps.push({ label: `NPL ratio ${m.nplPct}%`, delta: m.nplPct > 5 ? -5 : m.nplPct < 2 ? 2 : 0 });
  } else if (f.issuerType === "sovereign") {
    if (num(m.debtToGdpPct)) steps.push({ label: `Public debt / GDP ${m.debtToGdpPct}%`, delta: m.debtToGdpPct > 100 ? -5 : m.debtToGdpPct < 60 ? 3 : 0 });
  }
  return { steps, used: steps.length };
}

/** IR and BR from extracted facts. Missing information widens the range and is listed; nothing is filled in with a guess. */
export function scoreResearch(f: ResearchFacts): Scored {
  if (f.issuerType === "corporate" || f.issuerType === "sovereign") { const a = scoreApproved(f); if (a) return a; }
  const steps: { label: string; delta: number }[] = [];
  const missing: string[] = [];
  // Anchor: the best issuer-scope agency grade, expressed on the S&P scale. Instrument-scope grades are not used for the issuer.
  const notches = f.agencyRatings.filter((a) => a.scope === "issuer").map((a) => notchOf(a.rating)).filter((n): n is number => n !== null && n < 21);
  const notch = notches.length ? Math.min(...notches) === Math.max(...notches) ? notches[0] : Math.round(notches.reduce((s, n) => s + n, 0) / notches.length) : null;
  let centre: number;
  let half: number;
  let usesInstrumentGrade = false;
  if (notch !== null) {
    centre = anchorScore(notch);
    half = 3;
    steps.push({ label: `Agency anchor ${spGradeOf(notch)} (issuer scope)`, delta: centre });
  } else {
    // Only a bond-level grade is known: undo the bond's own structure to get back to the issuer (e.g. a subordinated bond is rated below its issuer).
    const inst = f.agencyRatings.filter((a) => a.scope === "instrument").map((a) => notchOf(a.rating)).filter((n): n is number => n !== null && n < 21);
    if (inst.length && f.seniority !== "unknown") {
      const n = Math.round(inst.reduce((s, x) => s + x, 0) / inst.length);
      centre = anchorScore(n) - STRUCTURE[f.seniority];
      half = 5;
      usesInstrumentGrade = true;
      missing.push("issuer agency rating (derived from the bond's grade)");
      steps.push({ label: `Bond-level grade ${spGradeOf(n)} less structure ${f.seniority}`, delta: centre });
    } else {
      centre = 55;
      half = 14;
      missing.push("issuer agency rating");
      steps.push({ label: "No agency anchor: neutral start", delta: centre });
    }
  }
  const ms = metricSteps(f);
  for (const s of ms.steps) { centre += s.delta; steps.push(s); }
  if (!ms.used) missing.push("financial metrics");

  const riskAdjustments: Scored["riskAdjustments"] = [];
  let grey = 0;
  for (const key of RISK_KEYS) {
    const r = f.risks.find((x) => x.key === key);
    const color: RiskColor = r?.color ?? "GREY";
    // GREEN counts only when the category names evidence; otherwise it is treated as not researched.
    const eff: RiskColor = color === "GREEN" && !(r?.evidence.length) ? "GREY" : color;
    if (eff === "GREY") { grey++; missing.push(`risk category ${key}`); }
    const delta = RISK_DELTA[eff];
    riskAdjustments.push({ key, color: eff, delta });
    if (delta) { centre += delta; steps.push({ label: `Risk ${key} ${eff}`, delta }); }
  }
  half += grey * 1.5;
  if (f.conflicts.length) half += 4;
  for (const n of f.notes ?? []) missing.push(n);

  const irC = clamp(centre);
  const irMin = r0(clamp(irC - half)), irMax = r0(clamp(irC + half));

  // BR: the same issuer view, then the instrument's own ranking, guarantee and seniority uncertainty.
  const struct = STRUCTURE[f.seniority];
  const guar = f.guaranteed === true ? 3 : 0;
  steps.push({ label: `Bond structure ${f.seniority}`, delta: struct });
  if (guar) steps.push({ label: "Enforceable guarantee", delta: guar });
  let brHalf = half;
  if (f.seniority === "unknown") { brHalf += 6; missing.push("bond seniority"); }
  const brC = clamp(irC + struct + guar);
  const brMin = r0(clamp(brC - brHalf)), brMax = r0(clamp(brC + brHalf));

  const primary = new Set(f.evidence.filter((e) => e.primary).map((e) => e.url)).size;
  const slots = [notch !== null, ms.used > 0, f.seniority !== "unknown", primary >= 2, grey <= 2];
  const coverage = Math.round(((slots.filter(Boolean).length + (6 - grey) / 6) / (slots.length + 1)) * 100) / 100;
  const status: Scored["status"] = coverage < 0.5 || f.seniority === "unknown" || f.conflicts.length || (f.notes ?? []).length ? "review_required" : "provisional";
  return { irMin, irMax, brMin, brMax, status, coverage, anchorGrade: notch !== null ? spGradeOf(notch) : null, steps, missing, riskAdjustments, version: SCORING_VERSION, independent: false, usesInstrumentGrade };
}


/** The approved engine (lib/bondsEngine.ts) for corporates and covered sovereigns. Unknown factors keep their 0..100 bounds. The agency grade is not an input.
 *  Returns null for a type with no approved method (the caller then keeps the legacy numbers for internal display only; they are never published). */
function scoreApproved(f: ResearchFacts): Scored | null {
  const r = calculate(f);
  if (!r.issuer.approved || r.issuer.irMin === null || r.issuer.irMax === null) return null;
  const steps: { label: string; delta: number }[] = r.issuer.terms.map((t) => ({ label: `${t.key} weight ${(t.weight * 100).toFixed(2)}% (${t.origin}) range ${t.min}-${t.max}`, delta: Math.round((t.weight * (t.min + t.max)) / 2 * 100) / 100 }));
  const missing = r.issuer.unknown.map((k) => `factor ${k}`);
  let brMin = r.issuer.irMin, brMax = r.issuer.irMax;
  if (r.bond.approved && r.bond.brMin !== null && r.bond.brMax !== null && r.bond.csa) {
    brMin = r.bond.brMin; brMax = r.bond.brMax;
    steps.push({ label: `Bond structure ${r.bond.tier}: CSA ${r.bond.csa[0]}..${r.bond.csa[1]}, structural flags ${r.bond.sfa}`, delta: (r.bond.csa[0] + r.bond.csa[1]) / 2 + r.bond.sfa });
  } else missing.push("bond capital structure tier");
  for (const n of f.notes ?? []) missing.push(n);
  const agency = f.agencyRatings.filter((a) => a.scope === "issuer").map((a) => notchOf(a.rating)).filter((n): n is number => n !== null && n < 21);
  const riskAdjustments = r.risks.items.map((i) => ({ key: i.key, color: i.color, delta: 0 }));
  const total = r.issuer.terms.length || 1;
  const coverage = Math.round(((total - r.issuer.unknown.length) / total) * 100) / 100;
  const status: Scored["status"] = r.issuer.unknown.length || !r.bond.approved || f.conflicts.length || (f.notes ?? []).length ? "review_required" : "provisional";
  return { irMin: r0(r.issuer.irMin), irMax: r0(r.issuer.irMax), brMin: r0(brMin), brMax: r0(brMax), status, coverage, anchorGrade: agency.length ? spGradeOf(Math.min(...agency)) : null, steps, missing, riskAdjustments, version: ENGINE_VERSION, independent: true, usesInstrumentGrade: false };
}
