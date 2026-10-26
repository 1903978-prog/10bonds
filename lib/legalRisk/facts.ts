// Facts the audit could not confirm from code. Change a value here only when the owner or counsel has confirmed it
// (the dashboard and the checks read these flags, so an open question stays visible until someone closes it).

export const FACTS = {
  /** The owner expects a Wyoming LLC; every legal page names SQUARE ONE OÜ (Estonia). Not confirmed either way. */
  operatingEntityConfirmed: false,
  /** Written confirmation that the licence behind the nightly bond copy allows public, paid display and derived scores. */
  dataLicenceConfirmed: false,
  /** Counsel has read the risk-score and report wording (criteria 1, 3, 5, 11). */
  counselReviewedScoreWording: false,
};

export type DataSource = { id: string; what: string; where: string; licence: "documented" | "public-facts" | "unconfirmed"; note: string };

/** Every external data source visible from the repository (25 Oct 2026). "unconfirmed" = no documented commercial redistribution right. */
export const DATA_SOURCES: DataSource[] = [
  { id: "bond-copy", what: "Bond terms, ratings letters, yields, durations, prices (nightly copy)", where: "Neon project public_bonds, filled by the separate LM op model project (docs/OPERATIONS.md:21)", licence: "unconfirmed", note: "Upstream vendor and licence are not documented in this repository. Biggest open item." },
  { id: "agency-grades", what: "S&P, Moody's, Fitch grades inside the copy", where: "public_bonds rating_sp / rating_moodys / rating_fitch (lib/ratings.ts)", licence: "unconfirmed", note: "Copied into the database; only the 1-10 score is sent to customers." },
  { id: "yield-history", what: "Daily and weekly yield history built from the copy", where: "lib/ytmHistory.ts, app.bond_price_weeks, app.bond_daily_prices", licence: "unconfirmed", note: "Derived from the copy; derived-data rights unknown." },
  { id: "default-studies", what: "Historical default rates (averaged from three published studies)", where: "lib/seo/defaultRates.ts, docs/handover/default-rates.md", licence: "public-facts", note: "Numbers only, labelled 'based on public historical default studies'. Check each study's reuse terms." },
  { id: "curated-research", what: "Issuer research, financials and dated quotes for companies in focus", where: "lib/companiesInFocus.ts", licence: "unconfirmed", note: "Curated by hand from public sources; per-item sources are not recorded in a licence register." },
  { id: "etf-benchmark", what: "Illustrative ETF yield for the landing comparison", where: "lib/etfBenchmark.ts (admin-entered)", licence: "unconfirmed", note: "Provisional figure supplied by the owner; no provider named publicly." },
  { id: "broker-tariffs", what: "Broker fee tariffs", where: "lib/brokers/content.ts, docs/BROKERS.md", licence: "public-facts", note: "Built from official public tariffs, with sources." },
  { id: "us-isin", what: "ISIN codes of US issues (contain a CUSIP)", where: "bond pages, Excel export (paid)", licence: "unconfirmed", note: "CUSIP Global Services licenses commercial CUSIP use." },
];
