import { accountsSql } from "./accounts";
import { CREDIT_POLICY_VERSION, CREDIT_SEEDS, type CreditOverlay } from "./creditOverlay";
import { ensureLinks } from "./dbLinks";

// One row per ISIN of stored credit analysis (any bond can have one). IR / BR are independent 0-100 scores (range or single value),
// never agency ratings and never the site's 1-10 risk class. Market history is not touched: this table holds no prices.

export type CreditRow = {
  isin: string;
  issuerRatingMin: number | null; issuerRatingMax: number | null; issuerRating: number | null;
  bondRatingMin: number | null; bondRatingMax: number | null; bondRating: number | null;
  ratingAssessmentDate: string | null; ratingVerificationStatus: string | null;
  recommendation: number | null; recommendationLabel: string | null;
  effectiveGrade: string | null; excludedBelowGrade: string | null; exclusionReason: string | null;
  riskPayWebsite: number | null; riskPayAdjusted: number | null;
  detail: CreditOverlay | Record<string, unknown> | null;
  version: string | null; updatedAt: string;
};

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`
      create table if not exists app.bond_credit_analysis (
        isin text primary key,
        issuer_rating_min numeric, issuer_rating_max numeric, issuer_rating numeric,
        bond_rating_min numeric, bond_rating_max numeric, bond_rating numeric,
        rating_assessment_date date, rating_verification_status text,
        recommendation numeric, recommendation_label text,
        effective_grade text, excluded_below_grade text, exclusion_reason text,
        risk_pay_website numeric, risk_pay_adjusted numeric,
        detail jsonb, version text,
        updated_at timestamptz not null default now()
      )`;
    for (const seed of Object.values(CREDIT_SEEDS)) await seedRow(s, seed);
    await ensureLinks(s); // links that need this module's tables (lib/dbLinks.ts)
  })().catch((e) => { ready = null; throw e; });
  await ready;
  return s;
}

/** Writes the first analysis of an ISIN once; an existing row (a newer assessment, an admin edit) is never overwritten. */
async function seedRow(s: Awaited<ReturnType<typeof accountsSql>>, o: CreditOverlay) {
  await s`
    insert into app.bond_credit_analysis (isin, issuer_rating_min, issuer_rating_max, bond_rating_min, bond_rating_max, rating_assessment_date, rating_verification_status,
      recommendation, recommendation_label, effective_grade, excluded_below_grade, exclusion_reason, risk_pay_website, risk_pay_adjusted, detail, version)
    values (${o.isin}, ${o.independent.irMin}, ${o.independent.irMax}, ${o.independent.brMin}, ${o.independent.brMax}, ${o.assessedOn}, ${o.status},
      ${o.independent.recommendation}, ${o.independent.label}, ${o.effectiveGrade}, ${o.eligibility.excludedBelowMinGrade}, ${o.eligibility.reason}, ${o.market.riskPayWebsite}, ${o.riskPayAdjusted},
      ${JSON.stringify(o)}::jsonb, ${CREDIT_POLICY_VERSION})
    on conflict (isin) do nothing`;
}

const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null);
type Raw = Record<string, unknown>;
const toRow = (r: Raw): CreditRow => ({
  isin: String(r.isin),
  issuerRatingMin: n(r.issuer_rating_min), issuerRatingMax: n(r.issuer_rating_max), issuerRating: n(r.issuer_rating),
  bondRatingMin: n(r.bond_rating_min), bondRatingMax: n(r.bond_rating_max), bondRating: n(r.bond_rating),
  ratingAssessmentDate: r.rating_assessment_date ? new Date(String(r.rating_assessment_date)).toISOString().slice(0, 10) : null,
  ratingVerificationStatus: (r.rating_verification_status as string) ?? null,
  recommendation: n(r.recommendation), recommendationLabel: (r.recommendation_label as string) ?? null,
  effectiveGrade: (r.effective_grade as string) ?? null, excludedBelowGrade: (r.excluded_below_grade as string) ?? null, exclusionReason: (r.exclusion_reason as string) ?? null,
  riskPayWebsite: n(r.risk_pay_website), riskPayAdjusted: n(r.risk_pay_adjusted),
  detail: (r.detail as CreditRow["detail"]) ?? null, version: (r.version as string) ?? null, updatedAt: new Date(String(r.updated_at)).toISOString(),
});

export { irText, brText } from "./creditRow";

export async function loadCreditAnalyses(): Promise<Record<string, CreditRow>> {
  const s = await sql();
  const rows = await s<Raw[]>`select * from app.bond_credit_analysis`;
  return Object.fromEntries(rows.map((r) => [String(r.isin), toRow(r)]));
}

export async function loadCreditAnalysis(isin: string): Promise<CreditRow | null> {
  const s = await sql();
  const [r] = await s<Raw[]>`select * from app.bond_credit_analysis where isin = ${isin}`;
  return r ? toRow(r) : null;
}

/** Fails open (no exclusions, no IR/BR) if the accounts database cannot be reached, so the site keeps working. */
export const creditAnalysesOrNone = () => loadCreditAnalyses().catch((e) => { console.error("[credit]", (e as Error).message); return {} as Record<string, CreditRow>; });
