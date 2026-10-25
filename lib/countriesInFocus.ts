/**
 * Risk assessment: countries in focus (sovereign snapshots, 12 October 2026). One entry per country; the entry marked
 * `free` is the open example for the free plan, every other one needs a paid plan. To add a country, copy an entry.
 * Customer-facing: the score is the 10bonds.com rating (0-100, higher = safer); no agency names or grades, no owner's name.
 * "–" means the input is not verified yet.
 */
export type CountryFocus = {
  slug: string;
  name: string;
  /** Free-plan example, shown to everyone. */
  free?: boolean;
  /** 10bonds.com rating, 0-100 (provisional estimate). */
  score: number;
  headline: string;
  /** Indicator rows [label, value], shown as given. */
  indicators: [string, string][];
  /** Score and Debt/GDP at 2027, 2031, 2037, 2047 (model path; only debt factors change). */
  path: { score: [number, number, number, number]; debt: [string, string, string, string] };
  pathNote: string;
  /** Review signals above their threshold on verified data. */
  warnings: string[];
  /** [label, text] rows for support, reserves and history. */
  buffers: [string, string][];
  /** Share of the weight that still uses a neutral 50 because an input is missing. */
  neutralShare: string;
  nato: boolean;
  currency: string;
  geo: string;
  fx: string;
};

export const YEARS = [2027, 2031, 2037, 2047] as const;

const EURO_FX = "No separate national-currency slump against EUR in the baseline. A weaker euro can raise non-euro import and debt costs. EUR bond payments have no direct FX conversion loss for a EUR investor; credit risk remains.";
const ESM = "ESM loans and ECB bond-buying tools are potential, conditional routes; the IMF is also possible. No automatic bailout.";
const IMF = "IMF support may be available on request, subject to eligibility and approval; no automatic rescue.";
const HISTORY = "Full post-1945 default ledger not verified yet.";
const RESERVES = "Usable reserves, gold and Treasury cash must be distinguished; missing inputs remain open.";

export const COUNTRIES_IN_FOCUS: CountryFocus[] = [
  {
    slug: "brazil", name: "Brazil", score: 48,
    headline: "High debt and interest costs leave fiscal credibility central to credit quality.",
    indicators: [["Debt/GDP (2025)", "93.3%"], ["Primary balance/GDP", "−0.4%"], ["Tax/GDP (2024)", "33.7%"], ["Interest/tax revenue (2024)", "17.8%"], ["Net external position/GDP", "−34.6%"], ["Growth 2026-28 avg", "2.1%"], ["Average maturity", "4.0 years"]],
    path: { score: [48, 47, 46, 44], debt: ["100.0%", "106.5%", "114.9%", "128.9%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: ["Fiscal deficit/GDP 8.1% (above 6%)"],
    buffers: [["Support", IMF], ["History", HISTORY], ["Reserves", "Usable reserves must be tested against external maturities; no reserve bonus is added."]],
    neutralShare: "31%", nato: false, currency: "BRL",
    geo: "Global trade restrictions and commodity-demand shocks can weaken export earnings. Conflict-driven energy volatility can have mixed effects across oil exports, fuel costs and inflation.",
    fx: "BRL depreciation can raise foreign-currency liabilities and imported inflation. Higher local rates can lift refinancing costs even on local-currency debt. Watch BRL and interest/revenue.",
  },
  {
    slug: "bulgaria", name: "Bulgaria", score: 66,
    headline: "Low debt is a buffer; euro adoption removes the separate lev FX exposure.",
    indicators: [["Debt/GDP (2025)", "27.1%"], ["Primary balance/GDP", "−2.6%"], ["Tax/GDP", "–"], ["Interest/tax revenue", "–"], ["Net external position/GDP", "−4.0%"], ["Growth 2026-28 avg", "2.7%"], ["Average maturity", "–"]],
    path: { score: [65, 65, 63, 61], debt: ["29.7%", "35.9%", "45.9%", "62.6%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: ["Current-account deficit/GDP 6.1% (above 6%)"],
    buffers: [["Support", ESM], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "36%", nato: true, currency: "EUR (adopted 1 Jan 2026)",
    geo: "Regional conflict can transmit through energy supply, trade and security spending. Monitor supply routes and fiscal responses.",
    fx: "Euro adopted 1 January 2026: no independent lev slump against EUR. Euro weakness against USD can still lift imported-energy costs. Non-euro liabilities need a separate exposure check.",
  },
  {
    slug: "chile", name: "Chile", score: 62,
    headline: "Moderate debt; copper exposure and a rising fiscal debt path need monitoring.",
    indicators: [["Debt/GDP (2025)", "41.8%"], ["Primary balance/GDP", "−2.0%"], ["Tax/GDP (2024)", "20.5%"], ["Interest/tax revenue", "–"], ["Net external position/GDP", "−19.2%"], ["Growth 2026-28 avg", "2.4%"], ["Average maturity", "10.4 years"]],
    path: { score: [61, 61, 60, 58], debt: ["44.4%", "49.2%", "56.6%", "68.9%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: [],
    buffers: [["Support", "IMF precautionary credit line renewed to Aug 2026-28 (SDR 8.72bn, undrawn); not assumed available for budget debt service."], ["History", HISTORY], ["Reserves", "Liquid external assets and FX lines are buffers; usable public reserves are not yet reconciled."]],
    neutralShare: "40%", nato: false, currency: "CLP",
    geo: "Trade fragmentation and weaker demand for copper can hit exports and fiscal receipts. Energy or shipping disruption can raise import costs. Watch copper prices, export volumes and energy costs.",
    fx: "A weaker peso can lift the CLP cost of unhedged foreign-currency debt and fuel imports. The floating rate absorbs shocks but does not remove refinancing risk. Watch CLP, reserves and hedges.",
  },
  {
    slug: "estonia", name: "Estonia", score: 70,
    headline: "Very low starting debt; fiscal expansion and security spending raise future debt.",
    indicators: [["Debt/GDP (2025)", "24.2%"], ["Primary balance/GDP", "−1.1%"], ["Tax/GDP (2024)", "35.2%"], ["Interest/tax revenue (2024)", "0.6%"], ["Net external position/GDP", "−3.3%"], ["Growth 2026-28 avg", "1.9%"], ["Average maturity", "–"]],
    path: { score: [70, 69, 67, 63], debt: ["31.3%", "41.2%", "55.2%", "78.5%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: [],
    buffers: [["Support", ESM], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "36%", nato: true, currency: "EUR",
    geo: "Heightened geopolitical tensions and Baltic cross-border vulnerabilities. Monitor infrastructure, confidence, defence spending and regional financial links.",
    fx: EURO_FX,
  },
  {
    slug: "france", name: "France", score: 56,
    headline: "A large tax base supports credit; elevated debt constrains fiscal room.",
    indicators: [["Debt/GDP (2025)", "116.0%"], ["Primary balance/GDP", "−3.1%"], ["Tax/GDP (2024)", "43.5%"], ["Interest/tax revenue (2024)", "4.1%"], ["Net external position/GDP", "−29.6%"], ["Growth 2026-28 avg", "1.0%"], ["Average maturity", "8.5 years"]],
    path: { score: [56, 56, 56, 57], debt: ["120.5%", "121.3%", "119.9%", "118.6%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: ["Debt/GDP 121.3% next 5 years (above 120%)"],
    buffers: [["Support", ESM], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "31%", nato: true, currency: "EUR",
    geo: "Conflict and trade fragmentation can disrupt energy supplies and exports while raising defence costs. Fiscal adjustment is difficult; watch budget delivery and bond spreads.",
    fx: EURO_FX,
  },
  {
    slug: "greece", name: "Greece", score: 60,
    headline: "Very high debt; long maturities and primary surpluses soften near-term pressure.",
    indicators: [["Debt/GDP (2025)", "145.7%"], ["Primary balance/GDP", "4.4%"], ["Tax/GDP (2024)", "39.8%"], ["Interest/tax revenue (2024)", "8.8%"], ["Net external position/GDP", "−139.2%"], ["Growth 2026-28 avg", "1.7%"], ["Average maturity", "18.3 years"]],
    path: { score: [60, 63, 67, 73], debt: ["130.3%", "145.7%", "82.3%", "34.6%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: ["Debt/GDP 145.7% (above 120%)"],
    buffers: [["Support", "ESM and EFSF support and long official maturities are material. Existing loans are already debt, not an undrawn rescue line."], ["History", "Documented distress includes the 2012 bond restructuring and 2015 IMF arrears (cleared in July). The full postwar ledger is incomplete."], ["Reserves", "Government cash of EUR 31.1bn (June 2026); only accessible cash can fund Treasury payments."]],
    neutralShare: "31%", nato: true, currency: "EUR",
    geo: "Energy and transport-route disruption are transmission risks for an open economy. Stress-test tourism, shipping receipts and import costs rather than assuming every regional conflict causes default.",
    fx: EURO_FX,
  },
  {
    slug: "hungary", name: "Hungary", score: 58,
    headline: "Fiscal and currency pressures offset EU and NATO membership benefits.",
    indicators: [["Debt/GDP (2025)", "74.6%"], ["Primary balance/GDP", "−1.2%"], ["Tax/GDP (2024)", "35.3%"], ["Interest/tax revenue (2024)", "13.9%"], ["Net external position/GDP", "−35.5%"], ["Growth 2026-28 avg", "2.0%"], ["Average maturity", "5.5 years"]],
    path: { score: [58, 57, 55, 52], debt: ["80.3%", "88.8%", "100.8%", "120.8%"] },
    pathNote: "Debt path keeps the earlier scenario; the latest IMF review expects a 2026 deficit of 7-7.5% of GDP.",
    warnings: [],
    buffers: [["Support", "EU balance-of-payments facility and IMF: conditional potential support; no automatic bailout."], ["History", "Legacy default episode in 1941-1967; no postwar start identified. History deduction 0.5 point."], ["Reserves", "Central-bank reserves of EUR 50.2bn at end-2025, including gold; Treasury access must be reconciled."]],
    neutralShare: "26%", nato: true, currency: "HUF",
    geo: "Regional conflict, energy supply and security spending can pressure growth and the budget. Monitor supply disruption, defence costs and EU funding conditions.",
    fx: "Forint depreciation can raise foreign-currency debt costs and imported inflation; almost one-third of public debt is in foreign currency. EUR bond payments avoid direct HUF conversion, not issuer risk.",
  },
  {
    slug: "italy", name: "Italy", free: true, score: 56,
    headline: "High debt makes sustained growth and refinancing costs decisive.",
    indicators: [["Debt/GDP (2025)", "137.1%"], ["Primary balance/GDP", "0.5%"], ["Tax/GDP (2024)", "42.8%"], ["Interest/tax revenue (2024)", "8.6%"], ["Net external position/GDP", "14.5%"], ["Growth 2026-28 avg", "0.6%"], ["Average maturity", "–"]],
    path: { score: [57, 56, 56, 57], debt: ["138.8%", "138.8%", "133.1%", "128.1%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: ["Debt/GDP 138.8% (above 120%)"],
    buffers: [["Support", ESM], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "36%", nato: true, currency: "EUR",
    geo: "Energy and supply-chain disruption can hurt industry and raise fiscal demands. With high debt, the important channel is a simultaneous growth shock and rise in borrowing costs.",
    fx: EURO_FX,
  },
  {
    slug: "latvia", name: "Latvia", score: 64,
    headline: "Moderate debt; security spending and external shocks weigh on the outlook.",
    indicators: [["Debt/GDP (2025)", "46.9%"], ["Primary balance/GDP", "−3.1%"], ["Tax/GDP (2024)", "34.9%"], ["Interest/tax revenue (2024)", "2.6%"], ["Net external position/GDP", "−18.2%"], ["Growth 2026-28 avg", "2.3%"], ["Average maturity", "–"]],
    path: { score: [64, 63, 62, 60], debt: ["48.5%", "53.5%", "61.3%", "74.3%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: [],
    buffers: [["Support", ESM], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "36%", nato: true, currency: "EUR",
    geo: "Regional security tensions and disrupted trade can discourage investment and raise defence and energy costs. Watch infrastructure disruption, export demand and fiscal spending commitments.",
    fx: EURO_FX,
  },
  {
    slug: "lithuania", name: "Lithuania", score: 67,
    headline: "Low starting debt; defence and other spending pressures raise the debt path.",
    indicators: [["Debt/GDP (2025)", "39.8%"], ["Primary balance/GDP", "−1.7%"], ["Tax/GDP (2024)", "33.1%"], ["Interest/tax revenue (2024)", "0.9%"], ["Net external position/GDP", "−3.1%"], ["Growth 2026-28 avg", "2.6%"], ["Average maturity", "–"]],
    path: { score: [67, 66, 64, 62], debt: ["48.9%", "56.3%", "67.3%", "85.6%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: [],
    buffers: [["Support", ESM], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "36%", nato: true, currency: "EUR",
    geo: "Heightened regional security tensions can raise defence spending and disrupt infrastructure and confidence. Watch financing costs and the growth impact of sustained security expenditure.",
    fx: EURO_FX,
  },
  {
    slug: "poland", name: "Poland", score: 60,
    headline: "Growth and institutions are buffers; deficits push debt and refinancing pressure up.",
    indicators: [["Debt/GDP (2025)", "58.8%"], ["Primary balance/GDP", "−4.5%"], ["Tax/GDP (2024)", "36.6%"], ["Interest/tax revenue (2024)", "6.0%"], ["Net external position/GDP", "−29.8%"], ["Growth 2026-28 avg", "2.8%"], ["Average maturity", "–"]],
    path: { score: [60, 59, 57, 54], debt: ["69.6%", "77.6%", "89.6%", "109.6%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: ["Fiscal deficit/GDP 7.0% (above 6%)"],
    buffers: [["Support", "EU balance-of-payments facility and IMF: conditional potential support; no automatic bailout."], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "36%", nato: true, currency: "PLN",
    geo: "Regional conflict and greater defence needs can pressure spending. Exposure to European supply chains, particularly Germany. Watch export demand and budget execution.",
    fx: "The floating zloty absorbs external shocks, but sharp depreciation can raise FX debt service and imported inflation. For EUR bonds, issuer stress remains even without direct PLN coupon exposure.",
  },
  {
    slug: "portugal", name: "Portugal", score: 66,
    headline: "Falling debt supports credit, but external shocks can erode the fiscal margin.",
    indicators: [["Debt/GDP (2025)", "89.9%"], ["Primary balance/GDP", "2.1%"], ["Tax/GDP (2024)", "35.1%"], ["Interest/tax revenue (2024)", "5.1%"], ["Net external position/GDP", "−49.6%"], ["Growth 2026-28 avg", "1.8%"], ["Average maturity", "–"]],
    path: { score: [67, 67, 69, 71], debt: ["82.2%", "89.9%", "64.6%", "48.3%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: [],
    buffers: [["Support", ESM], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "36%", nato: true, currency: "EUR",
    geo: "Weaker European demand, travel disruption and energy shocks can reduce receipts and growth. Monitor exports, tourism and funding spreads; a transmission assessment, not an event forecast.",
    fx: EURO_FX,
  },
  {
    slug: "saudi-arabia", name: "Saudi Arabia", score: 68,
    headline: "Rating declines gradually as debt accumulates; risk worsens gradually, not suddenly in 2031.",
    indicators: [["Debt/GDP (end-2025)", "31.8%"], ["Primary balance/GDP", "−4.67%"], ["Revenue/GDP", "23.3%"], ["Interest/revenue", "4.86%"], ["Due in 2026-2028", "15.14%"], ["Average maturity", "9 years"], ["Principal repayment peak", "2032 (SAR 180bn)"]],
    path: { score: [67, 65, 63, 59], debt: ["34.4%", "43.9%", "59.4%", "85.4%"] },
    pathNote: "Debt path from IMF projections to 2035, then an assumed extension (+2.6 points a year); a sensitivity, not a debt forecast.",
    warnings: [],
    buffers: [["Calculation", "Starts from the 68 estimate and updates debt/GDP, its three-year change and next-year financing needs; other factors fixed."], ["History", "Default-history penalty assumed zero, not verified."], ["Limits", "Five incomplete factors use a neutral 50. Central-government proxy; no new oil, geopolitical or policy scenarios."]],
    neutralShare: "five factors", nato: false, currency: "SAR",
    geo: "Existing principal repayments peak in 2032, adding refinancing scrutiny, but no arbitrary penalty is imposed for that year.",
    fx: "Not assessed in this snapshot.",
  },
  {
    slug: "serbia", name: "Serbia", score: 62,
    headline: "Moderate debt; energy and public-entity risks warrant closer funding scrutiny.",
    indicators: [["Debt/GDP (2025)", "44.8%"], ["Primary balance/GDP", "–"], ["Tax/GDP", "–"], ["Interest/tax revenue", "–"], ["Net external position/GDP", "−61.5%"], ["Growth 2026-28 avg", "3.3%"], ["Average maturity", "–"]],
    path: { score: [62, 62, 62, 62], debt: ["43.0%", "44.8%", "40.9%", "38.9%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: [],
    buffers: [["Support", "The IMF Policy Coordination Instrument supports policy credibility but does not itself lend money. No automatic euro-area backstop."], ["History", HISTORY], ["Reserves", "International reserves described as adequate; import cover and gross reserves do not establish usable FX or debt-service coverage."]],
    neutralShare: "48%", nato: false, currency: "RSD",
    geo: "IMF identifies energy-security risks, external conflict and fiscal pressures from public entities. Watch supply continuity, state-company support and the investment budget.",
    fx: "A stabilised dinar is not a guarantee against depreciation. Foreign-currency debt can rise in RSD terms if the exchange rate adjusts. Monitor usable reserves and near-term FX maturities.",
  },
  {
    slug: "slovenia", name: "Slovenia", score: 67,
    headline: "Euro-area access is a buffer; growth and expenditure control remain important.",
    indicators: [["Debt/GDP (2025)", "65.9%"], ["Primary balance/GDP", "−1.4%"], ["Tax/GDP (2024)", "38.3%"], ["Interest/tax revenue (2024)", "1.6%"], ["Net external position/GDP", "14.4%"], ["Growth 2026-28 avg", "2.1%"], ["Average maturity", "–"]],
    path: { score: [67, 66, 66, 65], debt: ["65.4%", "67.1%", "70.5%", "76.2%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: [],
    buffers: [["Support", ESM], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "36%", nato: true, currency: "EUR",
    geo: "European trade weakness and energy or supply-chain disruption can hit an open economy. Watch export orders, input costs and the budget response to external shocks.",
    fx: EURO_FX,
  },
  {
    slug: "spain", name: "Spain", score: 62,
    headline: "Declining debt path; continued fiscal discipline is needed to preserve progress.",
    indicators: [["Debt/GDP (2025)", "100.4%"], ["Primary balance/GDP", "−0.4%"], ["Tax/GDP (2024)", "36.7%"], ["Interest/tax revenue (2024)", "4.9%"], ["Net external position/GDP", "−42.7%"], ["Growth 2026-28 avg", "1.9%"], ["Average maturity", "–"]],
    path: { score: [62, 63, 64, 66], debt: ["96.2%", "100.4%", "82.8%", "70.1%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: [],
    buffers: [["Support", ESM], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "36%", nato: true, currency: "EUR",
    geo: "Trade and transport disruption can weaken external demand and raise energy costs. Stress-test tourism and services for a regional travel shock; watch receipts and import prices.",
    fx: EURO_FX,
  },
  {
    slug: "turkey", name: "Turkey", score: 65,
    headline: "Low reported debt does not remove inflation, currency and external-funding risks.",
    indicators: [["Debt/GDP (2025)", "23.5%"], ["Primary balance/GDP", "−0.1%"], ["Tax/GDP (2024)", "24.0%"], ["Interest/tax revenue (2024)", "8.3%"], ["Net external position/GDP", "–"], ["Growth 2026-28 avg", "3.6%"], ["Average maturity", "–"]],
    path: { score: [66, 66, 66, 66], debt: ["26.9%", "28.0%", "27.9%", "28.6%"] },
    pathNote: "Debt path from IMF projections, then mechanically extended.",
    warnings: [],
    buffers: [[ "Support", IMF], ["History", HISTORY], ["Reserves", RESERVES]],
    neutralShare: "39%", nato: true, currency: "TRY",
    geo: "Regional conflict can raise energy-import costs and disrupt trade and tourism. The fiscal effect depends on duration and policy response; watch energy prices and capital flows.",
    fx: "Sharp TRY depreciation can lift FX debt costs and inflation, forcing tighter rates. The IMF urges rebuilding reserve buffers. Track usable net reserves, FX liabilities and inflation expectations.",
  },
];

export const findCountry = (slug: string) => COUNTRIES_IN_FOCUS.find((c) => c.slug === slug.toLowerCase());
