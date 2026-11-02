import { RISK_KEYS, type Evidence, type ResearchFacts, type RiskColor, type RiskInput, type Seniority, type IssuerType } from "./creditScoring";

// Validation of what the worker sends back. The local model's JSON is untrusted input: anything outside the schema is dropped or rejected,
// and the server (not the worker) calculates IR / BR from the validated facts.

const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
export const isIsin = (v: unknown): v is string => typeof v === "string" && ISIN.test(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e6 ? v : null);
const SENIORITY: Seniority[] = ["senior_preferred", "senior_unsecured", "secured", "senior_non_preferred", "tier2", "at1", "unknown"];
const ISSUER: IssuerType[] = ["corporate", "bank", "sovereign", "other"];
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
  const u = (r.usage && typeof r.usage === "object" ? r.usage : {}) as Record<string, unknown>;
  const facts: ResearchFacts = {
    isin, issuerType, seniority, guaranteed: typeof r.guaranteed === "boolean" ? r.guaranteed : null, agencyRatings,
    metrics: { netDebtToEbitda: numOrNull(m.netDebtToEbitda), interestCover: numOrNull(m.interestCover), cet1Pct: numOrNull(m.cet1Pct), nplPct: numOrNull(m.nplPct), debtToGdpPct: numOrNull(m.debtToGdpPct) },
    risks, notes: (Array.isArray(r.notes) ? r.notes : []).map((c) => str(c, 300)).filter(Boolean).slice(0, 5), conflicts: (Array.isArray(r.conflicts) ? r.conflicts : []).map((c) => str(c, 300)).filter(Boolean).slice(0, 10), evidence,
  };
  return { ok: true, facts, usage: { model: str(u.model, 80), ms: Math.max(0, Math.floor(numOrNull(u.ms) ?? 0)), tokensIn: Math.max(0, Math.floor(numOrNull(u.tokensIn) ?? 0)), tokensOut: Math.max(0, Math.floor(numOrNull(u.tokensOut) ?? 0)) } };
}
