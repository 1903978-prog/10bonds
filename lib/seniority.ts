// Debt rank of a bond, from the seniority field of the bond data (the owner, 25/10/2026). The rank decides three things:
// 1. Subordinated, junior, hybrid, AT1, CoCo, Tier 1/2 and perpetual debt is left out everywhere (lib/outliers.ts).
// 2. A senior non-preferred (SNP) bond is rated one notch below the issuer's senior rating (lib/ratings.ts bondNotch);
//    a subordinated bond would be two, but those never get in.
// 3. Loss given default by rank: senior preferred 60%, SNP 75%, subordinated 90% (replaces the flat 60%).
// A bond with no seniority in the data counts as senior preferred, unless its name says otherwise (lib/outliers.ts).

export type Rank = "senior" | "snp" | "sub";

export const LGD_BY_RANK: Record<Rank, number> = { senior: 0.6, snp: 0.75, sub: 0.9 };
export const NOTCH_DOWN_BY_RANK: Record<Rank, number> = { senior: 0, snp: 1, sub: 2 };
export const RANK_LABEL: Record<Rank, string> = { senior: "Senior preferred", snp: "Senior non-preferred", sub: "Subordinated" };

const SNP = /non[- ]?preferred|\bsnp\b/i;
const JUNIOR = /subord|\bsub\b|junior|\bjr\b|hybrid|\bat1\b|additional tier|\bcoco\b|contingent|tier ?[12]\b|\bt[12]\b|\blt2\b|\bperp|mezz|deeply|lower tier|upper tier|capital note|preferred (stock|share)/i;

/** The rank the seniority text stands for, or null when the data has none. */
export function rankOfText(seniority: string | null | undefined): Rank | null {
  const s = seniority?.trim();
  if (!s) return null;
  // "Subordinated Non-Preferred" stays subordinated; plain "Senior Non-Preferred" is SNP.
  if (JUNIOR.test(s)) return "sub";
  if (SNP.test(s)) return "snp";
  return "senior";
}

/** Rank of a bond; no seniority in the data means senior preferred. */
export function rankOf(b: { seniority?: string | null }): Rank {
  return rankOfText(b.seniority) ?? "senior";
}

/** True for the ranks the site never uses (subordinated and below). */
export function isExcludedRank(b: { seniority?: string | null }): boolean {
  return rankOf(b) === "sub";
}

export const lgdOf = (b: { seniority?: string | null }): number => LGD_BY_RANK[rankOf(b)];
