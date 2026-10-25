/**
 * Risk assessment: companies in focus. One entry per bond, newest first; the entry marked `free` is the open example
 * for the free plan, every other one needs a paid plan. To add a company, copy an entry and fill it in.
 * Customer-facing: no agency names or letter grades (use the 10BONDS risk 1-10), no supplier names, no personal advice.
 */
export type Row = [string, string];
export type FocusCompany = {
  isin: string;
  name: string;
  issuer: string;
  /** Free-plan example, shown to everyone. */
  free?: boolean;
  updated: string;
  score: number;
  view: string;
  risk: number;
  ytm: string;
  outlook: string;
  outlookNote: string;
  seniority: string;
  maturity: string;
  risksShort: string;
  summary: string;
  terms: Row[];
  /** [source, date, price, gross yield] */
  quotes: [string, string, string, string][];
  quotesNote: string;
  /** Header row first: [metric, earlier, later, change] */
  financials: [string, string, string, string][];
  financialsNote: string;
  scorecard: [string, string, number][];
  scorecardNote: string;
  /** [layer, risk, this bond] */
  capital: [string, string, string][];
  tax: string;
  risks: Row[];
  recommendation: string;
};

export const COMPANIES_IN_FOCUS: FocusCompany[] = [
  {
    isin: "FR0013482841",
    name: "LVMH",
    issuer: "LVMH Moët Hennessy Louis Vuitton SE",
    free: true,
    updated: "24 Oct 2026",
    score: 86,
    view: "Watch / Conditional buy",
    risk: 2,
    ytm: "≈ 3.8–4.0%",
    outlook: "−2/10",
    outlookNote: "Mildly negative 24-month credit trend (provisional)",
    seniority: "Senior unsecured",
    maturity: "11 Feb 2031",
    risksShort: "China demand, luxury slowdown, tariffs, earnings valuation",
    summary:
      "Low risk score under our model, with repayment in EUR in just over four years. The coupon is very low at 0.375%, so most of the return comes from redemption at 100 when the bond is bought below par.",
    terms: [
      ["WKN", "A28TL4"],
      ["Issue date", "11 Feb 2020"],
      ["Issue size", "€1.5bn"],
      ["Coupon", "0.375% fixed, paid 11 Feb yearly"],
      ["Maturity", "11 Feb 2031, at par"],
      ["Minimum", "€100,000"],
      ["Seniority", "Senior unsecured (unsubordinated)"],
      ["Call", "Indicated; check prospectus"],
      ["French WHT", "To be verified"],
    ],
    quotes: [
      ["Exchange (ask)", "17 Sep 2026", "86.53", "3.83%"],
      ["Broker data", "30 Sep 2026", "–", "3.96%"],
      ["Data vendor", "–", "85.99", "3.79%"],
    ],
    quotesNote: "Past quotes, not executable prices today. Check the current ask and accrued interest first.",
    financials: [
      ["", "H1 2025", "H1 2026", "Change"],
      ["Revenue", "€39.81bn", "€38.64bn", "−3%"],
      ["Recurring op. profit", "€9.01bn", "€8.69bn", "−4%"],
      ["Op. free cash flow", "€4.03bn", "€4.10bn", "+2%"],
      ["Net debt", "€10.18bn", "€8.25bn", "−19%"],
      ["Equity", "€66.88bn", "€69.69bn", "+4%"],
    ],
    financialsNote:
      "Net debt is lower and free cash flow is steady. 9M 2026 revenue €57.15bn (+2% organic), but Fashion & Leather Goods fell 5% organically in Q3 on softer China.",
    scorecard: [
      ["Liquidity and refinancing", "High cash generation, low net debt", 93],
      ["Debt-service capacity", "High recurring profitability", 94],
      ["Balance-sheet solvency", "Large equity, modest leverage", 94],
      ["Earnings resilience", "Luxury cycle, China exposure", 78],
      ["Legal / regulatory", "Tariffs, trade-policy uncertainty", 83],
      ["Geopolitical / external", "China demand, trade disruption", 76],
    ],
    scorecardNote: "Provisional model scores, not calibrated default probabilities. Three-year review and prospectus check outstanding.",
    capital: [
      ["Covered / secured", "Very low", "–"],
      ["Senior unsecured", "Low", "This bond"],
      ["Senior non-preferred", "Moderate", "–"],
      ["Tier 2 subordinated", "High", "Different instrument"],
      ["AT1 / CoCo", "Very high", "Different instrument"],
      ["Equity", "Highest", "Not a bond"],
    ],
    tax:
      "France generally exempts interest paid to non-residents from withholding tax (domestic rule, no treaty needed; non-cooperative jurisdictions excluded). Expected 0%, subject to custodian and beneficial-owner papers, so net return before your own taxes is close to gross.",
    risks: [
      ["China and luxury demand", "Biggest operating risk, mainly Fashion & Leather Goods; a long slowdown would cut margins and cash."],
      ["Tariffs and geopolitics", "Trade barriers could lower sales or raise costs."],
      ["Terms and execution", "Early-redemption terms and a current executable price still to be confirmed."],
    ],
    recommendation:
      "Conditional buy for capital preservation if a current gross return of about 3.8–4.0% is available, the final terms confirm acceptable redemption rules and a top-quality supranational or covered bond does not pay a similar net return. Capacity to repay looks strong; the question is whether the small extra return pays enough for corporate credit risk.",
  },
];

export const findCompany = (isin: string) => COMPANIES_IN_FOCUS.find((c) => c.isin === isin.toUpperCase());
