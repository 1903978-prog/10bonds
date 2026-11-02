import { issuerTypeOf, reconcileSeniority } from "./creditFeedFacts";
import { RISK_KEYS, type Evidence, type ResearchFacts, type RiskColor, type RiskInput, type Seniority, type IssuerType } from "./creditScoring";

// Validation of what the worker sends back. The local model's JSON is untrusted input: anything outside the schema is dropped or rejected,
// and the server (not the worker) calculates IR / BR from the validated facts.

const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
export const isIsin = (v: unknown): v is string => typeof v === "string" && ISIN.test(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e6 ? v : null);
const SENIORITY: Seniority[] = ["senior_preferred", "senior_unsecured", "secured", "senior_non_preferred", "tier2", "at1", "unknown"];
const ISSUER: IssuerType[] = ["corporate", "bank", "insurer", "financial_holding", "sovereign", "supranational", "structured", "other"];
const COLORS: RiskColor[] = ["RED", "AMBER", "GREEN", "GREY"];

export type Parsed = { ok: true; facts: ResearchFacts; usage: { model: string; ms: number; tokensIn: number; tokensOut: number } } | { ok: false; error: string };

export function parseResult(isin: string, raw: unknown): Parsed {
  if (!raw || typeof raw !== "object") return { ok: false, error: "result missing" };
  const r = raw as Record<string, unknown>;
  const seniority = SENIORITY.includes(r.seniority as Seniority) ? (r.seniority as Seniority) : "unknown";
  const issuerType = ISSUER.includes(r.issuerType as IssuerType) ? (r.issuerType as IssuerType) : "corporate";
  const evidence: Evidence[] = (Array.isArray(r.evidence) ? r.evidence : []).slice(0, 60).flatMap((e: Record<string, unknown>) => {
    const url = str(e?.url, 500);
    if (!/^https:\/\//.test(url)) return [];
    const v = e.verification === "verified" || e.verification === "conflict" ? e.verification : "unverified";
    return [{ url, title: str(e.title, 200), publisher: str(e.publisher, 120), publishedAt: str(e.publishedAt, 20) || null, period: str(e.period, 40) || null, retrievedAt: str(e.retrievedAt, 40), location: str(e.location, 120) || null, method: str(e.method, 60) || "unknown", verification: v, primary: e.primary === true } as Evidence];
  });
  const urls = new Set(evidence.map((e) => e.url));
  const risks: RiskInput[] = (Array.isArray(r.risks) ? r.risks : []).flatMap((x: Record<string, unknown>) => {
    const key = RISK_KEYS.find((k) => k === x?.key);
    if (!key) return [];
    const color = COLORS.includes(x.color as RiskColor) ? (x.color as RiskColor) : "GREY";
    // evidence of a category must point at a source that was actually retrieved
    const ev = (Array.isArray(x.evidence) ? x.evidence : []).map((u) => str(u, 500)).filter((u) => urls.has(u)).slice(0, 8);
    return [{ key, color, explanation: str(x.explanation, 600), evidence: ev, verifiedOn: str(x.verifiedOn, 20) || null }];
  });
  const m = (r.metrics && typeof r.metrics === "object" ? r.metrics : {}) as Record<string, unknown>;
  const agencyRatings = (Array.isArray(r.agencyRatings) ? r.agencyRatings : []).slice(0, 12).flatMap((a: Record<string, unknown>) => {
    const rating = str(a?.rating, 12);
    return rating ? [{ agency: str(a.agency, 20), rating, scope: a.scope === "instrument" ? ("instrument" as const) : ("issuer" as const), date: str(a.date, 20) || null }] : [];
  });
  const iss = (r.issuer && typeof r.issuer === "object" ? r.issuer : {}) as Record<string, unknown>;
  const legalName = str(iss.legalName, 200) || null;
  // The server, not the model, decides whether the type fits the name; identity is checked against evidence in the publication gate.
  const issuer = legalName ? { canonicalId: str(iss.canonicalId, 80) || null, legalName, lei: str(iss.lei, 20).toUpperCase() || null, identityVerified: false, typeVerified: issuerTypeOf(legalName, issuerType) === issuerType || issuerType === "sovereign" || issuerType === "supranational" } : undefined;
  const mp = (r.metricPeriods && typeof r.metricPeriods === "object" ? r.metricPeriods : {}) as Record<string, unknown>;
  const metricPeriods: Record<string, string> = {};
  for (const k of ["netDebtToEbitda", "interestCover", "cet1Pct", "nplPct", "debtToGdpPct"]) { const v = str(mp[k], 10); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) metricPeriods[k] = v; }
  const bo = (r.bond && typeof r.bond === "object" ? r.bond : null) as Record<string, unknown> | null;
  const bond = bo ? {
    legalIssuerMatchesIsin: bo.legalIssuerMatchesIsin === true, seniorityVerified: bo.seniorityVerified === true,
    guaranteeStatus: bo.guaranteeStatus === "guaranteed" || bo.guaranteeStatus === "none_confirmed" ? (bo.guaranteeStatus as "guaranteed" | "none_confirmed") : ("unknown" as const),
    bondType: str(bo.bondType, 80) || null, resolutionTreatment: str(bo.resolutionTreatment, 80) || null,
    callable: typeof bo.callable === "boolean" ? bo.callable : null, embeddedRisksAssessed: bo.embeddedRisksAssessed === true,
    evidence: (Array.isArray(bo.evidence) ? bo.evidence : []).map((x) => str(x, 500)).filter((x) => urls.has(x)).slice(0, 8),
  } : undefined;
  // Evidence-backed figures: a number is accepted only if the quote the worker cites contains it and the quote's source URL was retrieved.
  const rejected: string[] = [];
  const inQuote = (quote: string, v: number) => [String(v), v.toFixed(1), v.toFixed(1).replace(".", ","), String(v).replace(".", ",")].some((t) => new RegExp(`(^|[^\\d.,])${t.replace(".", "\\.")}(?![\\d])`).test(quote));
  const figures = (Array.isArray(r.figures) ? r.figures : []).slice(0, 40).flatMap((x: Record<string, unknown>) => {
    const value = numOrNull(x?.value), quote = str(x?.quote, 400), url = str(x?.url, 500);
    if (value === null || !quote || !urls.has(url)) { rejected.push(`${str(x?.parameter, 40) || "figure"} without a retrievable source`); return []; }
    if (!inQuote(quote, value)) { rejected.push(`${str(x?.parameter, 40)} ${value}: quote does not contain the number`); return []; }
    return [{ parameter: str(x.parameter, 40), value, unit: str(x.unit, 30), quote, url, period: str(x.period, 40) || null, reportingDate: /^\d{4}-\d{2}-\d{2}$/.test(str(x.reportingDate, 10)) ? str(x.reportingDate, 10) : null }];
  });
  // A metric must be backed by an accepted figure with the same value; otherwise it is dropped (never kept unverified).
  const FIG_OF: Record<string, string> = { netDebtToEbitda: "netDebtToEbitda", interestCover: "interestCover", cet1Pct: "cet1Pct", nplPct: "nplPct", debtToGdpPct: "debtToGdpPct" };
  for (const k of Object.keys(FIG_OF)) {
    const v = numOrNull(m[k]);
    if (v === null) continue;
    const ok = figures.some((f) => f.parameter === FIG_OF[k] && f.value === v) || (k === "debtToGdpPct" && r.metricsOfficial === true);
    if (!ok) { m[k] = null; rejected.push(`${k} ${v} dropped: no accepted citation`); }
  }
  const se = (r.seniorityEvidence && typeof r.seniorityEvidence === "object" ? r.seniorityEvidence : null) as Record<string, unknown> | null;
  const verdict = se ? reconcileSeniority({ dataCopy: str(se.dataCopy, 200) || null, regulatory: str(se.regulatory, 200) || null, finalTerms: str(se.finalTerms, 200) || null }) : null;
  // Seniority is verified only by regulatory data plus final terms agreeing (server decision, never the worker's claim).
  if (bond) bond.seniorityVerified = !!verdict?.verified;
  // Without bond facts from the worker, the gate still sees what is known and what is not (everything else unconfirmed).
  const bondOut = bond ?? (verdict ? { legalIssuerMatchesIsin: false, seniorityVerified: verdict.verified, guaranteeStatus: "unknown" as const, bondType: null, resolutionTreatment: null, callable: null, embeddedRisksAssessed: false, evidence: [] as string[] } : undefined);
  const u = (r.usage && typeof r.usage === "object" ? r.usage : {}) as Record<string, unknown>;
  const facts: ResearchFacts = {
    isin, issuerType, seniority: verdict && verdict.seniority !== "unknown" ? verdict.seniority : seniority, guaranteed: typeof r.guaranteed === "boolean" ? r.guaranteed : null, agencyRatings,
    metrics: { netDebtToEbitda: numOrNull(m.netDebtToEbitda), interestCover: numOrNull(m.interestCover), cet1Pct: numOrNull(m.cet1Pct), nplPct: numOrNull(m.nplPct), debtToGdpPct: numOrNull(m.debtToGdpPct) },
    risks, notes: [...(Array.isArray(r.notes) ? r.notes : []).map((c) => str(c, 300)).filter(Boolean), ...rejected.map((x) => `rejected: ${x}`)].slice(0, 8), conflicts: [...(Array.isArray(r.conflicts) ? r.conflicts : []).map((c) => str(c, 300)).filter(Boolean), ...(verdict?.conflicts ?? [])].slice(0, 10), evidence,
    ...(figures.length ? { figures } : {}),
    ...(issuer ? { issuer } : {}), ...(Object.keys(metricPeriods).length ? { metricPeriods } : {}), ...(bondOut ? { bond: bondOut } : {}),
  };
  return { ok: true, facts, usage: { model: str(u.model, 80), ms: Math.max(0, Math.floor(numOrNull(u.ms) ?? 0)), tokensIn: Math.max(0, Math.floor(numOrNull(u.tokensIn) ?? 0)), tokensOut: Math.max(0, Math.floor(numOrNull(u.tokensOut) ?? 0)) } };
}
