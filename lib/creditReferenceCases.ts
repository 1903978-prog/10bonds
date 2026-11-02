// Labelled REFERENCE CASES: worked examples that teach the research pipeline what a good result looks like. They are internal teaching data:
// never public, never validated, never read by the rating or ranking code. (Owner, 2/11/2026.)

export type ReferenceInput = { parameter: string; value: string; unit: string; period: string; source: string; checkedByEngine: boolean };
export type ReferenceCase = {
  isin: string; issuer: string; lei: string; status: "internal_provisional"; sourceLabel: string; providedOn: string;
  seniority: { value: string; basis: string; finalTermsChecked: boolean };
  agency: { agency: string; rating: string; scope: string }[];
  inputs: ReferenceInput[];
  example: { ir: { point: number; min: number; max: number }; br: { point: number; min: number; max: number }; note: string };
  sources: { priority: number; label: string; url: string; extract: string }[];
  pipeline: string[];
  caveats: string[];
};

const H1 = "LBBW half-year results, published 28 August 2026";
const input = (parameter: string, value: string, unit: string): ReferenceInput => ({ parameter, value, unit, period: "H1 2026", source: H1, checkedByEngine: false });

export const LBBW_CASE: ReferenceCase = {
  isin: "DE000LB2CW16", issuer: "Landesbank Baden-Württemberg (LBBW)", lei: "B81CK4ESI35472RHJ606", status: "internal_provisional",
  sourceLabel: "External analysis provided by Livio, 2 November 2026", providedOn: "2026-11-02",
  seniority: { value: "senior_preferred", basis: "Regulatory-derived reference data (FIRDS) via bankingresolution.com; the engine had wrongly used senior_non_preferred", finalTermsChecked: false },
  agency: [
    { agency: "Moody's", rating: "Aa2", scope: "senior preferred debt" },
    { agency: "Fitch", rating: "AA-", scope: "senior preferred debt" },
  ],
  inputs: [
    input("CET1 ratio", "16.1", "%"), input("Non-performing exposures (NPE)", "0.9", "% (published metric; not to be relabelled NPL without checking definitions)"),
    input("Return on equity", "8.3", "%"), input("Cost/income ratio", "60.4", "%"), input("Total capital ratio", "19.9", "%"),
    input("Pre-tax profit", "708", "EUR m"), input("Credit-loss provisions", "121", "EUR m (H1 2025: 107)"), input("Risk costs", "15", "bp of loan book"), input("Risk-weighted assets", "91.7", "EUR bn"),
    { parameter: "LCR", value: "149.0", unit: "%", period: "year-end 2024", source: "Morningstar DBRS funding analysis", checkedByEngine: false },
    { parameter: "NSFR", value: "113.9", unit: "%", period: "year-end 2024", source: "Morningstar DBRS funding analysis", checkedByEngine: false },
  ],
  example: { ir: { point: 82, min: 78, max: 86 }, br: { point: 87, min: 83, max: 91 }, note: "Judgmental example, not produced by the approved scoring formula. The +6 (senior-preferred structure) and -1 (unsecured, liquidity) adjustments are NOT approved coefficients and must not be used by the scorer." },
  sources: [
    { priority: 1, label: "LBBW H1 2026 results", url: "https://www.lbbw.de/article/press-release/lbbw-firmly-on-track_ancu4bx2g2_e.html", extract: "CET1, NPE, RoE, capital and earnings" },
    { priority: 1, label: "LBBW agency ratings", url: "https://www.lbbw.de/group/news-and-service/investor-relations/ratings/ratings_7u12dygox_e.html", extract: "Issuer ratings, preferred-debt ratings, standalone assessments" },
    { priority: 1, label: "Börse Stuttgart bond profile", url: "https://www.boerse-stuttgart.de/en/products/bonds/stuttgart/lb2cw1-landesbank-baden-w-rttemberg-mtn-serie-822-v-21-31/", extract: "ISIN, maturity, coupon, callable status, issue size" },
    { priority: 1, label: "Regulatory-derived bond seniority", url: "https://bankingresolution.com/instruments/DE000LB2CW16", extract: "Senior preferred, unsecured, legal issuer, resolution authority" },
    { priority: 2, label: "LBBW outstanding issues list (issuer bond list, scanned for the ISIN)", url: "https://www.lbbw.de/konzern/investor-relations/refinanzierung/anleihen/outstanding-issues_ahtf9x1ikk_m.pdf", extract: "Seniority wording next to the ISIN, if the list states it" },
    { priority: 2, label: "LBBW 2025 annual report", url: "https://www.lbbw.de/konzern/investor-relations/finanzberichte/geschaeftsberichte/2025/lbbw-annual-report-2025_ampzkh6sv2_m.pdf", extract: "Risk exposure, liquidity, funding, segment credit quality" },
  ],
  pipeline: [
    "ISIN resolution: legal issuer, LEI, maturity, security type, coupon, issue size",
    "Issuer source discovery by issuer name: latest financial report, regulatory disclosures, agency ratings, IR site; cache by issuer ID",
    "Document extraction: relevant passages, named metrics with date, unit, document citation and quoted evidence",
    "Validation: numbers against sources, reporting periods, contradictions, issuer vs bond-specific ratings",
    "Deterministic IR with the approved model; save factor weights and trace",
    "Bond-specific BR from final terms: seniority, guarantee, resolution treatment, approved coefficients",
    "Publication decision: publish only if IR and BR evidence requirements are independently met; otherwise store internally and list what is missing",
  ],
  caveats: [
    "LCR and NSFR are from year-end 2024 and are stale; H1 2026 liquidity figures are not verified.",
    "Final terms have NOT been checked: seniority is corroborated by regulatory reference data only.",
    "All figures come from an external analysis supplied by Livio; the engine has not yet reproduced them from the live sources.",
    "The example IR 82 / BR 87 is not an output of the approved formula and is not public.",
  ],
};
