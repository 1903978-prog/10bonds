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
  grossYtm: number | null; // percent, e.g. 4.12
  modifiedDuration: number | null; // years
  ytmAsOf: string | null;
};

export type Tier = "free" | "plus" | "premium";

export type RankedBond = PublicBond & {
  rank: number;
  ratingNotch: number | null;
  score: number;
};
