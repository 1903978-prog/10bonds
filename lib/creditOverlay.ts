// Stored credit analysis for single bonds, one row per ISIN in app.bond_credit_analysis (lib/creditAnalysisDb.ts), any bond can have one.
// It sits NEXT TO the bond's data copy: it never overwrites a price, yield, duration, history or the site's own risk class.
// Agency ratings, the provisional independent assessment, the website Risk Pay and the six risk indicators are separate fields.
// CREDIT_SEEDS below is only the first record (owner, 1/11/2026: Aareal Bank DE000AAR0504), written to the table once if the ISIN has no row.
// Lists, the card and the solver read the TABLE, never this file.

import { notchOf } from "./ratings";

export type Verification = "verified" | "unverified" | "conflict";
export type SourceRef = { label: string; url: string | null; status: Verification; note: string };
export type AgencyRating = { agency: "Fitch" | "Moody's"; scope: "issuer" | "senior non-preferred class" | "SNP programme"; rating: string; spEquivalent: string; individuallyRated: false; note: string };
export type RiskColor = "RED" | "AMBER" | "GREEN" | "GREY";
export type RiskIndicator = { key: string; label: string; color: RiskColor; driver: string };

export type CreditOverlay = {
  isin: string;
  /** Version of the analysis: bumping it rebuilds the stored lists through the portfolio spec version. */
  version: string;
  assessedOn: string; // YYYY-MM-DD
  status: "provisional";
  structure: { instrument: string; seniority: "Senior non-preferred (SNP)"; snp: true; at1: false; tier2: false; cln: false; coveredPfandbrief: false; seniorPreferred: false; green: boolean; rankingStatus: Verification; rankingNote: string };
  agencyRatings: AgencyRating[];
  independent: { irMin: number; irMax: number; brMin: number; brMax: number; recommendation: number; label: "EXCLUDE"; reason: string; source: string; methodology: string };
  market: { grossYtmPct: number; modifiedDuration: number; spreadBundBp: number; riskPayWebsite: number; expectedLossBpPerYear: number; netSpreadBp: number; observedAt: string; indicative: true; riskPayNote: string };
  /** Independent security-adjusted Risk Pay: kept apart from the website's; not yet computed, never filled from the website value. */
  riskPayAdjusted: number | null;
  financials: { period: string; cet1Pct: number; lcrPct: number; nsfrPct: number; propertyFinancingEurBn: number; nplEurBn: number; h1ImpairmentsEurM: number; h1AdjOperatingProfitEurM: number; status: Verification; note: string };
  drivers: { positive: string[]; negative: string[] };
  indicators: RiskIndicator[];
  /** The effective credit class that decides portfolio eligibility (S&P scale, after the SNP ranking is taken into account). */
  effectiveGrade: string;
  eligibility: { excludedBelowMinGrade: string; reason: string };
  sources: SourceRef[];
};

export const CREDIT_POLICY_VERSION = "credit-2026-11-01";
/** Portfolio floor of the site's standard lists: BBB+ (risk class 4). A less restrictive request may pass a lower floor. */
export const DEFAULT_MIN_GRADE = "BBB+";

const AAR = "DE000AAR0504";
const SNP_NOTE = "Not a covered Pfandbrief and not an ordinary senior preferred bond. Statutory bail-in ranking: loses before senior preferred creditors.";

export const CREDIT_SEEDS: Readonly<Record<string, CreditOverlay>> = {
  [AAR]: {
    isin: AAR,
    version: CREDIT_POLICY_VERSION,
    assessedOn: "2026-11-01",
    status: "provisional",
    structure: {
      instrument: "Green senior non-preferred bank bond, 4.25% fixed, EUR, maturing 3 September 2031",
      seniority: "Senior non-preferred (SNP)", snp: true, at1: false, tier2: false, cln: false, coveredPfandbrief: false, seniorPreferred: false, green: true,
      rankingStatus: "unverified",
      rankingNote: `${SNP_NOTE} Ranking is as supplied by the owner; the ISIN-specific final terms were NOT checked (no access from the build environment). Treat as provisional until they are.`,
    },
    agencyRatings: [
      { agency: "Fitch", scope: "issuer", rating: "A-", spEquivalent: "A-", individuallyRated: false, note: "Issuer rating of Aareal Bank AG." },
      { agency: "Fitch", scope: "senior non-preferred class", rating: "BBB", spEquivalent: "BBB", individuallyRated: false, note: "Rating class for SNP debt, not an ISIN-specific rating." },
      { agency: "Moody's", scope: "issuer", rating: "Baa1", spEquivalent: "BBB+", individuallyRated: false, note: "Issuer rating of Aareal Bank AG." },
      { agency: "Moody's", scope: "SNP programme", rating: "(P)Baa3", spEquivalent: "BBB-", individuallyRated: false, note: "Provisional programme rating, not an ISIN-specific rating." },
    ],
    independent: {
      irMin: 66, irMax: 79, brMin: 59, brMax: 73, recommendation: 3.8, label: "EXCLUDE",
      reason: "Senior non-preferred security with an applicable BBB credit class, below the required BBB+ portfolio minimum.",
      source: "10bonds.com independent analysis, provisional", methodology: "Independent issuer (IR) and bond (BR) scores 0-100, higher is safer; ranges, not agency ratings. Provisional until sources are verified.",
    },
    market: {
      grossYtmPct: 4.82, modifiedDuration: 4.2, spreadBundBp: 169, riskPayWebsite: 15.3, expectedLossBpPerYear: 11.0, netSpreadBp: 158.0, observedAt: "2026-11-01", indicative: true,
      riskPayNote: "Website Risk Pay uses the site's expected-default-loss model. It does not prove that the model captures the higher loss severity of senior non-preferred debt in resolution (bail-in).",
    },
    riskPayAdjusted: null,
    financials: {
      period: "H1 2026", cet1Pct: 15.6, lcrPct: 201, nsfrPct: 115, propertyFinancingEurBn: 34.4, nplEurBn: 1.17, h1ImpairmentsEurM: 127, h1AdjOperatingProfitEurM: 208,
      status: "unverified", note: "Previously researched figures as supplied; not yet checked against Aareal's H1 2026 report.",
    },
    drivers: {
      positive: ["Strong regulatory capital", "Substantial liquidity", "Established property-finance franchise"],
      negative: ["Commercial real-estate concentration", "Non-performing exposures", "Potential further loan impairments", "Refinancing risk", "Statutory bail-in exposure"],
    },
    indicators: [
      { key: "news", label: "News / management / legal", color: "AMBER", driver: "Elevated or moderate risk as classified in the 1 Nov 2026 assessment; no further detail supplied." },
      { key: "politics", label: "Politics / geopolitics / sovereign / regulation", color: "AMBER", driver: "Elevated or moderate risk as classified in the 1 Nov 2026 assessment; no further detail supplied. Statutory bail-in exposure is listed as a credit driver." },
      { key: "market", label: "Market / competition / technology", color: "RED", driver: "Commercial real-estate concentration." },
      { key: "rates", label: "Rates / refinancing / liquidity / leverage", color: "AMBER", driver: "Elevated or moderate risk as classified in the 1 Nov 2026 assessment; no further detail supplied. Refinancing risk is listed as a credit driver." },
      { key: "macro", label: "Macro / FX / energy / supply chain", color: "AMBER", driver: "Elevated or moderate risk as classified in the 1 Nov 2026 assessment; no further detail supplied." },
      { key: "health", label: "Health / climate / cyber", color: "GREY", driver: "Insufficient verification." },
    ],
    effectiveGrade: "BBB",
    eligibility: { excludedBelowMinGrade: "BBB+", reason: "Senior non-preferred with an applicable BBB credit class, below the BBB+ portfolio minimum." },
    sources: [
      { label: "ISIN-specific final terms (ranking)", url: null, status: "unverified", note: "Not checked: needs the issuer's final terms for DE000AAR0504." },
      { label: "Agency rating scope and dates (Fitch, Moody's)", url: null, status: "unverified", note: "Not checked against agency publications; none of the four ratings is confirmed as ISIN-specific." },
      { label: "Aareal Bank H1 2026 report (financials)", url: null, status: "unverified", note: "Figures not checked against issuer reporting." },
      { label: "10bonds.com screen (yield, duration, spread, Risk Pay)", url: "https://10bonds.com", status: "unverified", note: "Indicative values as supplied, observed 1 November 2026." },
    ],
  },
};

/** "66\u201379" for a range, the single value otherwise, null when nothing is stored. Never calculated. */
export function ratingText(min: number | null, max: number | null, single: number | null): string | null {
  if (min !== null && max !== null) return min === max ? String(min) : `${min}\u2013${max}`;
  return single !== null ? String(single) : null;
}

/**
 * Backend portfolio eligibility. A bond whose stored analysis gives it an effective grade (SNP ranking included, loaded onto
 * PublicBond.creditGrade) is eligible only when that grade is at or above the portfolio's minimum grade.
 * Bonds without a stored grade are untouched, and other Aareal bonds are never affected: the rule is per ISIN.
 */
export function creditEligible(b: { creditGrade?: string | null }, minGrade: string | null = DEFAULT_MIN_GRADE): boolean {
  if (!b.creditGrade || !minGrade) return true;
  const floor = notchOf(minGrade), eff = notchOf(b.creditGrade);
  if (floor === null || eff === null) return true;
  return eff <= floor;
}

export const withoutCreditExcluded = <T extends { creditGrade?: string | null }>(bonds: T[], minGrade: string | null = DEFAULT_MIN_GRADE): T[] =>
  bonds.some((b) => !creditEligible(b, minGrade)) ? bonds.filter((b) => creditEligible(b, minGrade)) : bonds;
