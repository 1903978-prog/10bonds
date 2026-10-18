// Broker comparison data. One common profile per broker, and one tariff record per broker and residence
// country (Italy, France, Germany), because the same broker can price bonds differently in each market.

export const COUNTRIES = ["it", "fr", "de"] as const;
export type Country = (typeof COUNTRIES)[number];

/** Bond categories compared. "domestic_gov" is BTP for Italy, OAT for France, Bund for Germany. */
export const CATEGORIES = ["domestic_gov", "eu_gov", "eu_corp", "fx_bond"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Standard order sizes for the cost comparison, in euro. */
export const SCENARIOS = [5_000, 10_000, 50_000] as const;

/** How a commission is worked out. Percent values are in percent units: 0.19 means 0.19%. Amounts in euro. */
export type FeeRule =
  | { type: "percent"; pct: number; min: number | null; max: number | null }
  | { type: "fixed"; fee: number }
  | { type: "fixed_plus_percent"; fee: number; pct: number; min: number | null; max: number | null }
  /** Fee by order-value bracket. A bracket charges a flat `fee`, or `pct` of the whole order (at least `min`). */
  | { type: "tiered"; tiers: { upTo: number | null; fee?: number; pct?: number; min?: number | null; max?: number | null }[] }
  /** Each percentage applies only to the slice of the order inside its bracket (like income-tax bands). */
  | { type: "marginal"; tiers: { upTo: number | null; pct: number }[]; min: number | null; max: number | null };

export type Source = { evidence: string | null; sourceUrl: string | null };

export type CommissionSchedule = Source & {
  appliesTo: Category[];
  venue: string;
  rule: FeeRule;
  /** Mandatory exchange / venue charges at this venue that the tariff quantifies (added to the commission). */
  venueFee: FeeRule | null;
  /** Venue charges the tariff mentions but does not quantify per order (shown, not counted). */
  venueFeeUncounted: string | null;
  conditions: string | null;
  /** false when the broker publishes one order tariff for all exchange-traded securities without naming bonds. */
  bondSpecific: boolean;
  /** A promotional rate, with its end date when published. Shown, never used in the cost comparison. */
  promo: { description: string; expires: string | null } | null;
};

/** Charges that apply to every order of the listed categories, whatever the venue. */
export type ThirdPartyFee = Source & {
  description: string;
  amount: string;
  /** null when the charge is published but cannot be worked out per order (e.g. it depends on the venue). */
  rule: FeeRule | null;
  appliesTo: Category[];
};

export type Availability = Source & { available: boolean | null; markets: string | null };

export type TariffData = {
  eligible: boolean;
  accountType: string;
  govBonds: Availability;
  corpBonds: Availability;
  foreignCurrencyBonds: Availability;
  commissions: CommissionSchedule[];
  thirdPartyFees: ThirdPartyFee[];
  custodyFee: Source & { text: string | null; annualEur: number | null };
  accountFee: Source & { text: string | null; annualEur: number | null };
  fxFee: Source & { text: string | null; pct: number | null };
  otherFees: string | null;
  minInvestment: string | null;
  /** Does the broker withhold the country's tax on bond income for residents (Italy: "regime amministrato")? */
  taxAgent: Source & { value: boolean | null };
  /** Trading venues for bonds, short names (MOT, EuroTLX, Euronext Paris, Xetra, OTC, ...). */
  venues: string[];
  tariffDocUrl: string | null;
  /** Fields that could not be confirmed on an official source. */
  unverified: string[];
  notes: string | null;
};

/** One version of a broker's tariff in one country. Older versions are kept as history. */
export type Tariff = {
  brokerId: string;
  country: Country;
  data: TariffData;
  effectiveFrom: string; // YYYY-MM-DD
  verifiedAt: string; // YYYY-MM-DD, last time checked against the official source
  status: "draft" | "published" | "archived";
  version?: number;
  note?: string | null;
};

export type AffiliateStatus = "none" | "negotiating" | "active" | "ended";

export type BrokerProfile = {
  id: string;
  name: string;
  website: string;
  /** The broker's own site for each market, when it differs from the main one. */
  websites?: Partial<Record<Country, string>>;
  /** Regulator and home country, as stated on the broker's own site. */
  regulator: string | null;
  affiliate: {
    program: "available" | "unavailable" | "unverified";
    /** Only used when status is "active" (an agreement Livio confirmed). */
    status: AffiliateStatus;
    url: string | null;
    model: "cpc" | "cpa" | "revshare" | "flat" | null;
    trackingParams: string | null;
    contract: { start: string | null; end: string | null; notes: string | null };
    /** Paid placement shown in a separate "Sponsored" box, never inside the comparison. */
    sponsored: Country[];
  };
};

/** Weights of the published methodology, in percent; they add up to 100. */
export type Methodology = {
  weights: { cost: number; range: number; access: number; transparency: number; platform: number };
  /** Tariffs older than this many days are flagged for re-checking. */
  verifyEveryDays: number;
};

export const DEFAULT_METHODOLOGY: Methodology = {
  weights: { cost: 40, range: 20, access: 15, transparency: 15, platform: 10 },
  verifyEveryDays: 30,
};
