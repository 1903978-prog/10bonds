/**
 * Diversification score of a list of bonds (the owner, 26/10/2026): how evenly the equal-weighted list is spread across
 * industries (the major sector of the issuer's group, lib/sectors.ts) and across countries.
 *
 * Per dimension: shares w_i of the list, Herfindahl index H = Σ w_i², effective number of groups N = 1 / H,
 * score = (N − 1) ÷ (n − 1) × 100 for n bonds: 100 when every bond sits in its own group, 0 when all sit in one.
 * Overall score = average of the industry score and the country score, rounded. A bond with no industry or country on
 * record goes into one shared "Not classified" group, so missing data never counts as diversification.
 */
export type DivSlice = { label: string; share: number };
export type Diversification = { score: number; industryScore: number; countryScore: number; industry: DivSlice[]; country: DivSlice[] };
export type DivInput = { sector?: string | null; country?: string | null };

export const NOT_CLASSIFIED = "Not classified";

const groups = (labels: string[]): DivSlice[] => {
  const m = new Map<string, number>();
  for (const l of labels) m.set(l, (m.get(l) ?? 0) + 1);
  return [...m.entries()].map(([label, c]) => ({ label, share: c / labels.length })).sort((a, b) => b.share - a.share || a.label.localeCompare(b.label));
};

/** 0..100 from the shares of one dimension (n = number of bonds). */
export function dimensionScore(slices: DivSlice[], n: number): number {
  if (n < 2) return 0;
  const h = slices.reduce((s, x) => s + x.share * x.share, 0);
  return Math.max(0, Math.min(100, ((1 / h - 1) / (n - 1)) * 100));
}

export function diversification(rows: DivInput[]): Diversification | null {
  if (rows.length < 2) return null;
  const industry = groups(rows.map((r) => r.sector && r.sector !== "Unclassified" ? r.sector.trim() : NOT_CLASSIFIED));
  const country = groups(rows.map((r) => r.country?.trim() || NOT_CLASSIFIED));
  const industryScore = dimensionScore(industry, rows.length);
  const countryScore = dimensionScore(country, rows.length);
  return { score: Math.round((industryScore + countryScore) / 2), industryScore: Math.round(industryScore), countryScore: Math.round(countryScore), industry, country };
}

/** At most `max` bars: the largest groups, the rest summed into "Other" (a label per language). */
export function topSlices(slices: DivSlice[], max: number, other: string): DivSlice[] {
  if (slices.length <= max) return slices;
  const head = slices.slice(0, max - 1);
  return [...head, { label: other, share: slices.slice(max - 1).reduce((s, x) => s + x.share, 0) }];
}
