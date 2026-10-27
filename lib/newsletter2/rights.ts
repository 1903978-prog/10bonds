// Publication-rights register for the redesigned weekly e-mail (27 Oct 2026).
// One row per field that could appear in the e-mail. GREEN = publication right verified for this use, with evidence.
// AMBER = may be possible, needs a licence, contract or legal check. RED = prohibited by an identified restriction or
// unsuitable under our own conservative policy. Unknown is never GREEN. This is not legal advice.
// The gate (gate.ts) reads this table: a field that is not GREEN never reaches the e-mail.

export type Cls = "GREEN" | "AMBER" | "RED";
export type Basis = "contract" | "regulation" | "policy"; // what the classification rests on (kept apart on purpose)

export type FieldId =
  | "ecb_spot_rates" | "ecb_policy_rates" | "ecb_event_link" | "derived_changes" | "hicp"
  | "bond_isin" | "bond_issuer" | "bond_currency" | "bond_coupon" | "bond_maturity" | "bond_type" | "bond_issue_date"
  | "bond_price" | "bond_ytm" | "bond_spread" | "bond_52w" | "agency_rating" | "own_risk_score" | "own_ranking"
  | "db_aggregate_stats" | "issuer_announcement" | "ust_curve";

export type FieldRight = {
  id: FieldId;
  label: string;
  origin: string;
  cls: Cls;
  basis: Basis;
  restriction: string;
  evidence: string;
  approval: string; // what would move it to GREEN ("" when already GREEN)
  versions: ("A" | "B" | "C")[]; // versions that would use the field
};

const ECB_REUSE = "https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html";

export const FIELD_RIGHTS: FieldRight[] = [
  { id: "ecb_spot_rates", label: "Euro-area AAA government yield curve, spot rates 2/5/10/30y", origin: "ECB Data Portal, dataflow YC (public API)", cls: "GREEN", basis: "contract",
    restriction: "Free reuse if the source is quoted; use as published, with the ECB disclaimers; not for third-party data.",
    evidence: `ECB policy on reuse of ESCB statistics: "free access and free reuse ... on the condition that the source is quoted" (${ECB_REUSE}). Terms: https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html`, approval: "", versions: ["A", "B", "C"] },
  { id: "ecb_policy_rates", label: "ECB key interest rates (deposit facility)", origin: "ECB Data Portal, dataflow FM", cls: "GREEN", basis: "contract",
    restriction: "Same ECB reuse conditions.", evidence: `Same ECB reuse policy (${ECB_REUSE}).`, approval: "", versions: ["A", "B", "C"] },
  { id: "ecb_event_link", label: "Link to the ECB monetary-policy press release (no text copied)", origin: "ecb.europa.eu press releases", cls: "GREEN", basis: "regulation",
    restriction: "Link and one factual sentence only; the rate itself is covered by the statistics reuse policy.", evidence: `The decision is a public fact; the rate is published as statistics (${ECB_REUSE}). We do not copy press-release text.`, approval: "", versions: ["C"] },
  { id: "derived_changes", label: "Changes and spreads calculated by 10BONDS from the ECB figures", origin: "Own arithmetic on the GREEN ECB inputs", cls: "GREEN", basis: "contract",
    restriction: "Must be labelled as calculated by 10BONDS from ECB data, never presented as an ECB figure. Derived only from GREEN inputs.",
    evidence: `Simple differences of published statistics; the ECB reuse policy permits reuse with source quoted (${ECB_REUSE}). Counsel may still confirm the labelling wording.`, approval: "", versions: ["A", "B", "C"] },
  { id: "hicp", label: "Euro-area HICP inflation", origin: "ECB Data Portal flow ICP (originator Eurostat)", cls: "AMBER", basis: "contract",
    restriction: "ECB reuse policy excludes third-party data without the originator's permission; Eurostat itself publishes under its own reuse terms.",
    evidence: `${ECB_REUSE}: "does not apply to third-party data without a prior permission from the originator". Also failed the freshness gate in the 27 Oct fetch (latest value Dec 2025).`, approval: "Take it from Eurostat directly and confirm Eurostat's reuse terms; then fix the freshness rule.", versions: ["C"] },
  { id: "ust_curve", label: "US Treasury par yield curve", origin: "home.treasury.gov", cls: "AMBER", basis: "contract",
    restriction: "Not integrated and its reuse terms were not read in this review.", evidence: "No evidence collected (the site could not be fetched from the build environment).", approval: "Read and record the Treasury data terms, then add a feed.", versions: ["C"] },
  { id: "bond_isin", label: "ISIN", origin: "Nightly copy public_bonds (vendor of the operating model, not documented)", cls: "AMBER", basis: "contract",
    restriction: "Identifier is public, but the vendor licence for the copy is undocumented; US ISINs embed a CUSIP (CUSIP Global Services licence).",
    evidence: "lib/legalRisk/facts.ts: bond-copy and us-isin licence 'unconfirmed'; docs/legal/licensing-cross-border-checklist.md.", approval: "Written vendor confirmation, or take ISIN, issuer, coupon and maturity per bond from the issuer's prospectus or an official register and store the link.", versions: ["B", "A"] },
  { id: "bond_issuer", label: "Issuer name", origin: "public_bonds", cls: "AMBER", basis: "contract", restriction: "As ISIN.", evidence: "facts.ts bond-copy 'unconfirmed'.", approval: "As ISIN.", versions: ["B", "A"] },
  { id: "bond_currency", label: "Currency", origin: "public_bonds", cls: "AMBER", basis: "contract", restriction: "As ISIN.", evidence: "facts.ts bond-copy 'unconfirmed'.", approval: "As ISIN.", versions: ["B", "A"] },
  { id: "bond_coupon", label: "Coupon", origin: "public_bonds", cls: "AMBER", basis: "contract", restriction: "A contractual term of the bond (a fact in the prospectus) but our copy comes from a vendor under unknown terms (database rights).", evidence: "docs/legal/licensing-cross-border-checklist.md, row 'Bond terms'.", approval: "As ISIN.", versions: ["B", "A"] },
  { id: "bond_maturity", label: "Maturity date", origin: "public_bonds", cls: "AMBER", basis: "contract", restriction: "As coupon.", evidence: "As coupon.", approval: "As ISIN.", versions: ["B", "A"] },
  { id: "bond_type", label: "Seniority and coupon type", origin: "public_bonds (optional columns)", cls: "AMBER", basis: "contract", restriction: "As coupon; columns may be empty.", evidence: "docs/handover/bond-details.md.", approval: "As ISIN.", versions: ["B", "A"] },
  { id: "bond_issue_date", label: "Issue date (used to find newly issued bonds)", origin: "public_bonds (optional column)", cls: "AMBER", basis: "contract", restriction: "As coupon; often empty.", evidence: "docs/handover/bond-details.md.", approval: "As ISIN.", versions: ["B", "A"] },
  { id: "bond_price", label: "Bond price (clean or indicative)", origin: "public_bonds, vendor price", cls: "RED", basis: "contract",
    restriction: "Exchange and vendor prices are licensed; redistribution to third parties needs a licence (Euronext: 'Such redistribution of our real-time market data is subject to a licence and fees'). Our own policy: never publish prices.",
    evidence: "https://www.euronext.com/en/data/real-time-data/pricing-specs-agreements/market-data-pricing-policies ; docs/handover/price-history.md ; facts.ts.", approval: "Vendor display-and-redistribution licence covering e-mail, in writing.", versions: ["A"] },
  { id: "bond_ytm", label: "Yield to maturity (shown to customers as 'Return (per year)')", origin: "public_bonds gross_ytm, computed from the vendor price", cls: "AMBER", basis: "contract",
    restriction: "Derived from a licensed price; derived-data rights are not documented. Not free just because the price is hidden.", evidence: "facts.ts yield-history 'derived-data rights unknown'; LSEG lists 'Derived Data' as a licensed category: https://www.londonstockexchange.com/en/markets-products/market-data/market-data-licensing", approval: "Vendor confirmation that derived yields may be displayed in e-mail to subscribers (clause on derived data / redistribution).", versions: ["A"] },
  { id: "bond_spread", label: "Yield spread, expected return, expected loss, fair value", origin: "Own models on vendor price", cls: "AMBER", basis: "contract", restriction: "Depends on the vendor price, like the yield.", evidence: "As yield.", approval: "As yield, plus counsel on wording.", versions: ["A"] },
  { id: "bond_52w", label: "52-week high and low", origin: "public_bonds high_52w / low_52w", cls: "RED", basis: "contract", restriction: "Documented: shown to the admin only because of data-supplier rights.", evidence: "lib/types.ts comment on high52w; docs/handover/price-history.md ('admin only, never to customers').", approval: "Vendor licence.", versions: [] },
  { id: "agency_rating", label: "Agency grades (S&P, Moody's, Fitch)", origin: "public_bonds rating columns", cls: "RED", basis: "policy", restriction: "Agency grades are never shown to customers (own policy, agency licensing, CRA Regulation questions).", evidence: "docs/legal/licensing-cross-border-checklist.md ('No agency names or letters shown to customers').", approval: "Agency licence and counsel.", versions: [] },
  { id: "own_risk_score", label: "10BONDS risk score 1-10", origin: "own score when filled, else mapped from agency grades", cls: "RED", basis: "policy", restriction: "Falls back to agency grades while the own score is empty, so it is not yet independent of them.", evidence: "docs/legal/licensing-cross-border-checklist.md row 'risk 1-10'; docs/handover/lr-ratings.md.", approval: "Fill the own score for the listed bonds and drop the fallback, then re-classify AMBER.", versions: [] },
  { id: "own_ranking", label: "Ranked or 'top N' list of named securities", origin: "10BONDS selection model", cls: "RED", basis: "regulation",
    restriction: "Picking and ordering named securities can be read as an implicit investment recommendation (MAR Art. 3(1)(35)); then Delegated Reg. 2016/958 Arts 2-6 (identity, objectivity, conflicts) apply. Facts about our positions and payments are unknown, so we cannot disclose them.",
    evidence: "ESMA Q&A 1741 (factual information is not a recommendation if it does not explicitly or implicitly recommend or suggest an investment strategy): https://www.esma.europa.eu/publications-data/questions-answers/1741 ; https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0958 ; memory: conflict facts open (PR 214).", approval: "Counsel opinion plus confirmed conflict-of-interest facts.", versions: [] },
  { id: "db_aggregate_stats", label: "Market statistics from our own database (counts, maturity buckets)", origin: "public_bonds aggregated", cls: "AMBER", basis: "contract", restriction: "Aggregates of vendor data; vendor terms on derived data unknown (low risk, still unconfirmed).", evidence: "facts.ts bond-copy 'unconfirmed'.", approval: "Vendor confirmation.", versions: ["B", "A"] },
  { id: "issuer_announcement", label: "Issuer announcements and new-issue notices", origin: "issuer sites, ESMA registers (no pipeline yet)", cls: "AMBER", basis: "contract", restriction: "Public, but reuse terms differ per source and nothing is collected today.", evidence: "No ingestion exists in the repository.", approval: "Choose sources, record each source's reuse terms (for example ESMA FIRDS legal notice), build ingestion.", versions: ["B", "C"] },
];

export const RIGHTS = new Map(FIELD_RIGHTS.map((f) => [f.id, f] as const));

export function isGreen(id: FieldId): boolean {
  return RIGHTS.get(id)?.cls === "GREEN";
}

/** Open facts the e-mail needs before any named security may appear (they stay false until the owner or counsel confirms them). */
export const NEWSLETTER_FACTS = {
  /** Conflicts of interest of 10BONDS (positions, issuer or broker payments) are known and the disclosure text is approved. */
  conflictsDisclosureApproved: false,
  /** Counsel has confirmed that a list of named securities in this format is not an investment recommendation, or the MAR disclosures are in place. */
  counselClearedNamedSecurities: false,
  /** The vendor behind the nightly copy has confirmed in writing that bond terms may be e-mailed. */
  vendorConfirmedTerms: false,
  /** The vendor has confirmed in writing that prices and derived yields may be e-mailed. */
  vendorConfirmedPriceDerived: false,
};
