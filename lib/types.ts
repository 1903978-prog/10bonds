/** One row of `public_bonds`, the table the main app copies over once a day. */
export type PublicBond = {
  isin: string;
  name: string;
  issuer: string | null;
  country: string | null;
  currency: string;
  coupon: number | null;
  maturity: string | null; // YYYY-MM-DD
  ratingSp: string | null;
  ratingMoodys: string | null;
  ratingFitch: string | null;
  ratingResolved: string | null;
  lrScore?: number | null; // 10bonds.com rating (LRfinal) 0..100, higher = safer; null until the copy carries it
  grossYtm: number | null; // percent, e.g. 4.12
  modifiedDuration: number | null; // years
  ytmAsOf: string | null;
  minInvestment?: number | null; // smallest amount that can be bought, in the bond's currency; null = unknown
};

// visitor = not signed in; free = signed-in free account.
export type Tier = "visitor" | "free" | "plus" | "premium";

export type RankedBond = PublicBond & {
  rank: number;
  ratingNotch: number | null;
  score: number;
};
