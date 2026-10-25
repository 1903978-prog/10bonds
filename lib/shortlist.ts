import type { PublicBond } from "./types";
import { averageRisk, bondRisk, hasRealRating } from "./ratings";
import { listLifeLoss } from "./expectedLoss";
import { pdOf } from "./tiers";
import { isExcludedRank, lgdOf, rankOf, RANK_LABEL } from "./seniority";
import { lifeYears } from "./lifeYears";
import { bondNote } from "./bondNotes";

// Admin only: the figures of a shortlist, worked out exactly like the portfolio figures of the finder (lib/tiers.ts):
// equal weight, average return and duration, average risk, and the expected loss on your money = the average of each
// bond's chance of defaulting before it matures times its loss given default (60% / 75% / 90% by debt rank).

export type ShortlistSummary = { count: number; avgYtm: number | null; avgDuration: number | null; avgRisk: number | null; lifeLoss: number | null };

export type ShortlistRow = {
  isin: string;
  /** Null = the ISIN is not in the bond copy. */
  inCopy: boolean;
  issuer: string | null;
  name: string | null;
  currency: string | null;
  country: string | null;
  coupon: number | null;
  maturity: string | null;
  seniority: string | null;
  rank: string;
  lgd: number;
  ytm: number | null;
  duration: number | null;
  life: number | null;
  minInvestment: number | null;
  risk: number | null;
  sp: string | null;
  moodys: string | null;
  fitch: string | null;
  /** Chance in % of defaulting before it matures, and the expected loss on the money = chance x LGD. */
  pd: number | null;
  el: number | null;
  /** Used in the averages (needs a return and a duration). */
  counted: boolean;
  /** Why the site would normally leave this bond out, or other things worth knowing; empty = a normal site bond. */
  flags: string[];
  note: string | null;
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export function summarize(bonds: PublicBond[]): ShortlistSummary {
  const used = bonds.filter((b) => b.grossYtm != null && b.modifiedDuration != null);
  return {
    count: used.length,
    avgYtm: avg(used.map((b) => b.grossYtm!)),
    avgDuration: avg(used.map((b) => b.modifiedDuration!)),
    avgRisk: averageRisk(used.map(bondRisk)),
    lifeLoss: used.length ? listLifeLoss(used.map(pdOf), used.map(lgdOf)) : null,
  };
}

export function rowOf(isin: string, found: { bond: PublicBond; why: string | null } | undefined): ShortlistRow {
  if (!found) {
    return { isin, inCopy: false, issuer: null, name: null, currency: null, country: null, coupon: null, maturity: null, seniority: null, rank: "–", lgd: 0, ytm: null, duration: null, life: null, minInvestment: null, risk: null, sp: null, moodys: null, fitch: null, pd: null, el: null, counted: false, flags: ["not in the bond copy"], note: bondNote(isin) ?? null };
  }
  const { bond: b, why } = found;
  const counted = b.grossYtm != null && b.modifiedDuration != null;
  const flags: string[] = [];
  if (why) flags.push(`normally hidden on the site: ${why}`);
  if (isExcludedRank(b)) flags.push("normally excluded: subordinated or junior debt");
  else if (!hasRealRating(b) && !why) flags.push("normally hidden on the site: no rating from S&P, Moody's or Fitch");
  if (bondNote(b.isin)) flags.push("normally excluded: equity-linked structured note");
  if (!counted) flags.push("left out of the averages: no return or duration in the copy");
  const pd = counted ? pdOf(b) : null;
  return {
    isin,
    inCopy: true,
    issuer: b.issuer,
    name: b.name,
    currency: b.currency,
    country: b.country,
    coupon: b.coupon,
    maturity: b.maturity,
    seniority: b.seniority ?? null,
    rank: RANK_LABEL[rankOf(b)],
    lgd: lgdOf(b),
    ytm: b.grossYtm,
    duration: b.modifiedDuration,
    life: counted ? Math.round(lifeYears(b) * 100) / 100 : null,
    minInvestment: b.minInvestment ?? null,
    risk: bondRisk(b),
    sp: b.ratingSp?.trim() || null,
    moodys: b.ratingMoodys?.trim() || null,
    fitch: b.ratingFitch?.trim() || null,
    pd,
    el: pd == null ? null : pd * lgdOf(b),
    counted,
    flags: [...new Set(flags)],
    note: bondNote(b.isin) ?? null,
  };
}

/** Rows in the shortlist's own order, and the summary of the bonds found. */
export function detailOf(isins: string[], found: { bond: PublicBond; why: string | null }[]): { rows: ShortlistRow[]; summary: ShortlistSummary } {
  const by = new Map(found.map((f) => [f.bond.isin.trim().toUpperCase(), f]));
  return { rows: isins.map((i) => rowOf(i, by.get(i))), summary: summarize(isins.flatMap((i) => (by.get(i) ? [by.get(i)!.bond] : []))) };
}
