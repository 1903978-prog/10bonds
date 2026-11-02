import type { Evidence, IssuerType, ResearchFacts, Seniority } from "./creditScoring";
import { notchOf } from "./ratings";

// What the site already holds about a bond (its data copy: agency grades, seniority, issuer name) completes the facts the worker found.
// Only gaps are filled, never overwritten, and the source is listed as an unverified data-copy source. Nothing here calls the network.

export type FeedBond = { issuer: string | null; name: string; ratingSp: string | null; ratingMoodys: string | null; ratingFitch: string | null; seniority?: string | null };

export function seniorityOf(text: string | null | undefined): Seniority {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return "unknown";
  if (/additional tier 1|\bat1\b|perpetual/.test(t)) return "at1";
  if (/tier 2|tier2|subordinat|\blt2\b|\bt2\b/.test(t)) return "tier2";
  if (/non[- ]?preferred|\bsnp\b|senior non/.test(t)) return "senior_non_preferred";
  if (/covered|pfandbrief|secured|mortgage/.test(t) && !/unsecured/.test(t)) return "secured";
  if (/senior preferred|preferred senior|\bsp\b/.test(t)) return "senior_preferred";
  if (/senior|unsecured|guaranteed/.test(t)) return "senior_unsecured";
  return "unknown";
}

const BANK = /\b(bank|banca|banco|bancorp|sparkasse|landesbank|kreditanstalt|bpce|crédit|credit agricole|hypo|pfandbrief)\b/i;
const SOVEREIGN = /\b(republic of|kingdom of|bundesrepublik|government of|state of|treasury)\b/i;
export function issuerTypeOf(name: string | null | undefined, given: IssuerType): IssuerType {
  const n = name ?? "";
  if (SOVEREIGN.test(n)) return "sovereign";
  if (BANK.test(n)) return "bank";
  return given;
}

export function enrichFromFeed(f: ResearchFacts, bond: FeedBond | null): ResearchFacts {
  if (!bond) return f;
  const out: ResearchFacts = { ...f, agencyRatings: [...f.agencyRatings], evidence: [...f.evidence] };
  const seniority = f.seniority === "unknown" ? seniorityOf(bond.seniority) : f.seniority;
  out.seniority = seniority;
  out.issuerType = issuerTypeOf(bond.issuer ?? bond.name, f.issuerType);
  const have = f.agencyRatings.some((a) => notchOf(a.rating) !== null);
  let used = false;
  if (!have) {
    // A data-copy grade at bond level: for senior bonds it stands for the issuer, for subordinated ones it is the bond's own grade.
    const scope = seniority === "senior_non_preferred" || seniority === "tier2" || seniority === "at1" ? "instrument" : "issuer";
    for (const [agency, rating] of [["S&P (data copy)", bond.ratingSp], ["Moody's (data copy)", bond.ratingMoodys], ["Fitch (data copy)", bond.ratingFitch]] as const)
      if (rating && notchOf(rating) !== null) { out.agencyRatings.push({ agency, rating, scope, date: null }); used = true; }
  }
  if (used || seniority !== f.seniority) {
    const e: Evidence = { url: "https://10bonds.com/", title: "10BONDS bond data copy (grades, seniority)", publisher: "10BONDS", publishedAt: null, period: null, retrievedAt: new Date().toISOString(), location: null, method: "database", verification: "unverified", primary: false };
    out.evidence.push(e);
  }
  return out;
}


export type SeniorityEvidence = { dataCopy?: string | null; regulatory?: string | null; finalTerms?: string | null };
export type SeniorityVerdict = { seniority: Seniority; verified: boolean; conflicts: string[]; basis: string };

/**
 * Seniority from three kinds of source, never from the site's own data copy alone (LBBW DE000LB2CW16, 2/11/2026: the copy said senior non-preferred,
 * regulatory reference data said senior preferred). The data copy is a hint and is never a verification.
 * verified = regulatory reference data AND the final terms agree. Regulatory data alone gives the value but stays unverified; any disagreement is a
 * conflict (which blocks publication) and the regulatory value is used meanwhile.
 */
export function reconcileSeniority(e: SeniorityEvidence): SeniorityVerdict {
  const copy = e.dataCopy ? seniorityOf(e.dataCopy) : "unknown";
  const reg = e.regulatory ? seniorityOf(e.regulatory) : "unknown";
  const terms = e.finalTerms ? seniorityOf(e.finalTerms) : "unknown";
  const conflicts: string[] = [];
  const vals: [string, Seniority][] = [["site data copy", copy], ["regulatory reference data", reg], ["final terms", terms]];
  const distinct = new Set(vals.filter(([, v]) => v !== "unknown").map(([, v]) => v));
  if (distinct.size > 1) conflicts.push(`Seniority sources disagree: ${vals.filter(([, v]) => v !== "unknown").map(([n, v]) => `${n}: ${v}`).join("; ")}.`);
  if (terms !== "unknown") return { seniority: terms, verified: reg === terms, conflicts, basis: reg === terms ? "final terms and regulatory data agree" : "final terms (not corroborated by regulatory data)" };
  if (reg !== "unknown") return { seniority: reg, verified: false, conflicts, basis: "regulatory reference data; final terms not checked" };
  return { seniority: copy, verified: false, conflicts, basis: copy === "unknown" ? "no source" : "site data copy only (a hint, not a verification)" };
}
