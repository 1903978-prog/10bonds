import { parameterReport } from "./creditParameters";
import { issuerTypeOf } from "./creditFeedFacts";
import { evaluatePublicationEligibility, finKindOf } from "./bondsEngine";
import { MANDATORY_FIGURES } from "./financialIssuerModel";
import { RISK_KEYS, scoreResearch, SCORING_VERSION, type Evidence, type IssuerType, type Metrics, type ResearchFacts, type Scored } from "./creditScoring";

// PUBLICATION GATE (owner, 2/11/2026). A job being "done" is not a publication. IR and BR reach the public only when the gate below
// passes, it is calculated on the server, and its result is stored next to the rating (and enforced again by a database trigger).
// Nothing here weakens a requirement to publish more ratings. Pure functions: no network, no database.

export const GATE_VERSION = "gate-v1-2026-11-02";
export const MAX_RANGE_WIDTH = 15;
export const MIN_PRIMARY_SOURCES = 2;
export const MIN_RELIABLE_SOURCES = 3;

/** Issuer types that have an approved scoring method. Everything else is blocked "pending model approval". */
export const APPROVED_METHODS: Partial<Record<IssuerType, { minParams: number; mandatory: (keyof Metrics)[]; maxMetricAgeMonths: number }>> = {
  // Banks, bank holdings and insurers: approved 3/11/2026 (lib/financialIssuerModel.ts). Their mandatory inputs are CITED FIGURES (MANDATORY_FIGURES), not the metrics list.
  bank: { minParams: 10, mandatory: ["cet1Pct", "nplPct"], maxMetricAgeMonths: 18 },
  financial_holding: { minParams: 10, mandatory: ["cet1Pct", "nplPct"], maxMetricAgeMonths: 18 },
  insurer: { minParams: 10, mandatory: [], maxMetricAgeMonths: 18 },
  corporate: { minParams: 10, mandatory: ["netDebtToEbitda", "interestCover"], maxMetricAgeMonths: 18 },
  sovereign: { minParams: 9, mandatory: ["debtToGdpPct"], maxMetricAgeMonths: 24 },
};

export type SourceQuality = { primary: number; reliable: number; independent: number; keys: string[]; staleMetrics: string[] };
export type GateResult = {
  kind: "IR" | "BR";
  allowed: boolean;
  coverage: { found: number; max: number };
  missingCritical: string[];
  conflicts: string[];
  rangeWidth: number | null;
  sourceQuality: SourceQuality;
  reasons: string[];
  methodologyVersion: string;
  gateVersion: string;
};

/** Registrable-domain key of a source: two pages of one annual report, or a cached copy of the same site, are ONE source. */
export function sourceKey(url: string): string {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const parts = h.split(".");
    const two = parts.slice(-2).join(".");
    return /^(co|com|org|gov|ac)\.[a-z]{2}$/.test(two) ? parts.slice(-3).join(".") : two;
  } catch { return url; }
}

/** The site's own database copy is lineage, not an independent source. */
const OWN = new Set(["10bonds.com", "10bonds.fly.dev"]);

export function sourceQuality(f: ResearchFacts, now: Date = new Date()): SourceQuality {
  const usable = (e: Evidence) => e.verification === "verified" && !OWN.has(sourceKey(e.url));
  const ev = f.evidence.filter(usable);
  const primary = new Set(ev.filter((e) => e.primary).map((e) => sourceKey(e.url)));
  const all = new Set(ev.map((e) => sourceKey(e.url)));
  const m = APPROVED_METHODS[f.issuerType];
  const staleMetrics: string[] = [];
  if (m && !(f.issuerType === "corporate" && f.factors) && !finKindOf(f.issuerType)) {
    for (const k of m.mandatory) {
      const p = f.metricPeriods?.[k];
      const t = p ? Date.parse(p) : NaN;
      if (!Number.isFinite(t)) { if (typeof f.metrics[k] === "number") staleMetrics.push(`${k} (no reporting period recorded)`); continue; }
      const months = (now.getTime() - t) / (30.44 * 86_400_000);
      if (months > m.maxMetricAgeMonths) staleMetrics.push(`${k} (period ${p}, older than ${m.maxMetricAgeMonths} months)`);
    }
  }
  return { primary: primary.size, reliable: all.size, independent: all.size, keys: [...all], staleMetrics };
}

const GLEIF_LEI = /^[A-Z0-9]{18}[0-9]{2}$/;

function issuerChecks(f: ResearchFacts, reasons: string[]) {
  const id = f.issuer;
  const hasGleif = f.evidence.some((e) => e.verification === "verified" && sourceKey(e.url) === "gleif.org");
  if (!id || !id.legalName || !id.lei || !GLEIF_LEI.test(id.lei) || !hasGleif) reasons.push("Issuer identity not verified (legal name and LEI confirmed by an official register are required).");
  else if (f.issuerType !== "sovereign" && f.issuerType !== "supranational" && issuerTypeOf(id.legalName, f.issuerType === "bank" ? "corporate" : f.issuerType) !== f.issuerType) reasons.push(`Issuer type "${f.issuerType}" contradicts the legal name "${id.legalName}".`);
  // The financial inputs must fit the type: a "bank" reporting debt/EBITDA but no capital ratio is probably a company (and the reverse).
  const m = f.metrics, has = (k: keyof Metrics) => typeof m[k] === "number";
  if (f.issuerType === "bank" && (has("netDebtToEbitda") || has("interestCover")) && !has("cet1Pct")) reasons.push("Issuer classified as a bank but the inputs found are corporate ratios: classification contradicts the model.");
  if (f.issuerType === "corporate" && (has("cet1Pct") || has("nplPct"))) reasons.push("Issuer classified as a corporate but bank capital ratios were found: classification contradicts the model.");
  if (!id?.typeVerified) reasons.push("Issuer type not verified.");
}

/** IR gate. Every condition must hold; `reasons` lists each one that does not. */
export function canPublishIR(f: ResearchFacts, scored: Scored = scoreResearch(f), now: Date = new Date()): GateResult {
  const reasons: string[] = [];
  const missingCritical: string[] = [];
  const conflicts = [...f.conflicts, ...f.evidence.filter((e) => e.verification === "conflict").map((e) => `Source conflict: ${e.publisher || e.url}`)];
  const method = APPROVED_METHODS[f.issuerType];
  const rep = parameterReport(f);
  const q = sourceQuality(f, now);
  const width = scored.irMax - scored.irMin;

  issuerChecks(f, reasons);
  if (!method) reasons.push(`No approved scoring method for issuer type "${f.issuerType}": publication is blocked pending model approval.`);
  if (method) {
    if (rep.found < method.minParams) reasons.push(`Only ${rep.found} of ${rep.max} parameters verified; ${method.minParams} are required.`);
    if (f.issuerType === "corporate" && f.factors) {
      // the owner's corporate model: the five account-based factors are mandatory and must come from published accounts, dated within the allowed age
      for (const k of ["leverage", "interestCoverage", "freeCashFlow", "liquidity", "earningsTrend"] as const) {
        const v = f.factors[k];
        if (!v || v.origin !== "accounts") { missingCritical.push(k); continue; }
        const t = v.period ? Date.parse(v.period) : NaN;
        if (!Number.isFinite(t)) q.staleMetrics.push(`${k} (no reporting period recorded)`);
        else if ((now.getTime() - t) / (30.44 * 86_400_000) > method.maxMetricAgeMonths) q.staleMetrics.push(`${k} (period ${v.period}, older than ${method.maxMetricAgeMonths} months)`);
      }
      // judgment factors must be typed by a person or sourced; estimated sector defaults are unknown and widen the range (checked by the width rule)
    } else if (finKindOf(f.issuerType)) {
      // bank / insurer: every mandatory figure must be cited (with a quote and source, enforced on arrival) and dated within the allowed age
      const kind = finKindOf(f.issuerType)!;
      for (const group of MANDATORY_FIGURES[kind]) {
        const fig = (f.figures ?? []).find((x) => group.includes(x.parameter));
        if (!fig) { missingCritical.push(group.join("/")); continue; }
        const when = fig.reportingDate ?? fig.period; const t = when ? Date.parse(when) : NaN;
        if (!Number.isFinite(t)) q.staleMetrics.push(`${fig.parameter} (no reporting period recorded)`);
        else if ((now.getTime() - t) / (30.44 * 86_400_000) > method.maxMetricAgeMonths) q.staleMetrics.push(`${fig.parameter} (period ${when}, older than ${method.maxMetricAgeMonths} months)`);
      }
    } else for (const k of method.mandatory) if (typeof f.metrics[k] !== "number") { missingCritical.push(k); }
    if (missingCritical.length) reasons.push(`Missing mandatory financial inputs: ${missingCritical.join(", ")}.`);
    if (q.staleMetrics.length) reasons.push(`Financial information too old or undated: ${q.staleMetrics.join("; ")}.`);
  }
  if (q.primary < MIN_PRIMARY_SOURCES) reasons.push(`${q.primary} independent primary source(s); ${MIN_PRIMARY_SOURCES} are required.`);
  if (q.reliable < MIN_RELIABLE_SOURCES) reasons.push(`${q.reliable} independent reliable source(s); ${MIN_RELIABLE_SOURCES} are required.`);
  const unresolved = RISK_KEYS.filter((k) => {
    const r = f.risks.find((x) => x.key === k);
    return !r || r.color === "GREY" || (r.color === "GREEN" && !r.evidence.length);
  });
  if (unresolved.length) { reasons.push(`Risk categories not assessed with evidence: ${unresolved.join(", ")}.`); missingCritical.push(...unresolved.map((k) => `risk:${k}`)); }
  if (conflicts.length) reasons.push(`Unresolved source contradictions (${conflicts.length}).`);
  if (width > MAX_RANGE_WIDTH) reasons.push(`IR range ${scored.irMin}–${scored.irMax} is ${width} points wide; the maximum is ${MAX_RANGE_WIDTH}.`);
  // Provenance: the stored numbers must be exactly what the current model gives for these facts, and must not start from an agency grade.
  const again = scoreResearch(f);
  if (again.version !== scored.version || again.irMin !== scored.irMin || again.irMax !== scored.irMax || !scored.steps.length) reasons.push("Calculation provenance invalid: the stored result cannot be reproduced from the stored facts.");
  // The methodology half (approved $bonds engine, version, reproducibility) is decided by the one engine, not re-implemented here.
  const el = evaluatePublicationEligibility({ f, storedIr: [scored.irMin, scored.irMax], storedBr: [scored.brMin, scored.brMax], storedEngineVersion: scored.version, conflicts, evidenceCoverageOk: q.primary >= MIN_PRIMARY_SOURCES, mandatoryOk: missingCritical.length === 0, bondFactsOk: true });
  for (const r of el.reasons) if (/^IR: |not the approved|cannot be reproduced/.test(r) && !reasons.includes(r)) reasons.push(r);
  if (!scored.independent) reasons.push("IR is not yet computed from the issuer's own financial and risk factors (the agency grade is still its starting point).");
  if (f.notes?.length) reasons.push(`Research reported gaps: ${f.notes.join("; ")}.`);

  return { kind: "IR", allowed: reasons.length === 0, coverage: { found: rep.found, max: rep.max }, missingCritical, conflicts, rangeWidth: width, sourceQuality: q, reasons, methodologyVersion: scored.version || SCORING_VERSION, gateVersion: GATE_VERSION };
}

/** BR gate: everything the IR gate needs, plus the bond itself. Never BR = agency bond grade minus a generic seniority penalty. */
export function canPublishBR(f: ResearchFacts, issuer: GateResult, scored: Scored = scoreResearch(f), _now: Date = new Date()): GateResult {
  const reasons: string[] = [];
  const b = f.bond;
  const width = scored.brMax - scored.brMin;
  if (!issuer.allowed) reasons.push("IR is not eligible for publication.");
  if (!b) reasons.push("Insufficient verified bond data: no bond-level facts.");
  else {
    if (!b.legalIssuerMatchesIsin) reasons.push("ISIN and legal issuer not confirmed as matching.");
    if (!b.seniorityVerified || f.seniority === "unknown") reasons.push("Contractual seniority not verified.");
    if (b.guaranteeStatus === "unknown") reasons.push("Guarantee status not confirmed (an explicit \"no guarantee\" confirmation is also required).");
    if (!b.bondType || !b.resolutionTreatment) reasons.push("Bond type and resolution treatment not identified.");
    if (b.callable === null) reasons.push("Callable status not assessed.");
    if (!b.embeddedRisksAssessed) reasons.push("Embedded risks (subordination, hybrid, structured features) not assessed.");
    if (!b.evidence.length) reasons.push("No evidence recorded for the bond facts.");
  }
  if (scored.usesInstrumentGrade) reasons.push("BR would rest on a bond-level agency grade with a generic seniority adjustment, which is not allowed.");
  if (!scored.steps.some((s) => s.label.startsWith("Bond structure"))) reasons.push("Issuer-to-bond adjustments not recorded.");
  if (width > MAX_RANGE_WIDTH) reasons.push(`BR range ${scored.brMin}–${scored.brMax} is ${width} points wide; the maximum is ${MAX_RANGE_WIDTH}.`);
  return { kind: "BR", allowed: reasons.length === 0, coverage: issuer.coverage, missingCritical: issuer.missingCritical, conflicts: issuer.conflicts, rangeWidth: width, sourceQuality: issuer.sourceQuality, reasons, methodologyVersion: scored.version || SCORING_VERSION, gateVersion: GATE_VERSION };
}

export type PublicationState = "researching" | "insufficient_evidence" | "review_required" | "publishable" | "validated";

/** The four states plus human validation. `validated` is never assigned here: it comes only from a person (see `humanValidated`). */
export function publicationState(ir: GateResult, br: GateResult | null, humanValidated = false): PublicationState {
  if (humanValidated) return "validated";
  if (ir.allowed) return "publishable";
  const enoughForCalculation = ir.missingCritical.length === 0 && ir.sourceQuality.primary >= MIN_PRIMARY_SOURCES && ir.coverage.found >= 7;
  return enoughForCalculation ? "review_required" : "insufficient_evidence";
}

export type GateOutcome = { ir: GateResult; br: GateResult; state: PublicationState; publishIr: boolean; publishBr: boolean };

/** One call that gives the decision stored with every rating. BR is published only if IR is. */
export function evaluate(f: ResearchFacts, scored: Scored = scoreResearch(f), now: Date = new Date(), humanValidated = false): GateOutcome {
  const ir = canPublishIR(f, scored, now);
  const br = canPublishBR(f, ir, scored, now);
  return { ir, br, state: publicationState(ir, br, humanValidated), publishIr: ir.allowed, publishBr: ir.allowed && br.allowed };
}
