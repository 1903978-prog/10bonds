/**
 * Full text of the two 10BONDS methodologies, as the owner wrote them, in a tiny markdown dialect parsed by
 * parseMethodDoc(): "## " section, "### " subsection, "| a | b |" table rows (first row = header), "1. " / "- " lists,
 * "@formula" a formula line, "@flow" / "@pillar" / "@step" / "@stress" special rows, anything else a paragraph.
 * Sovereign: "10bonds.com rating for sovereign credit", v1.0, 12 October 2026 (converted from the Word file).
 * Corporate: "10bonds.com rating Corporate Credit Risk Methodology", v2.0, 19 October 2026.
 */
export const SOVEREIGN_TITLE = "10bonds.com rating for sovereign credit";
export const SOVEREIGN_SUBTITLE = "Complete calculation and research manual · Version 1.0 · 12 October 2026 · General government model · Annual horizon 2027 to 2047";
export const CORPORATE_TITLE = "10bonds.com rating — Corporate Credit Risk Methodology";
export const CORPORATE_SUBTITLE = "Proposed institutional-grade framework · Version 2.0 · 19 October 2026";

export const SOVEREIGN_MD = `
## Overview
### Purpose and result
This manual defines how to calculate a comparable internal sovereign credit score from 0 to 100, where higher means safer. It combines fiscal strength, refinancing protection, usable natural resources, accessible official financial support and the sovereign’s postwar default record. It specifies the inputs, linear scoring endpoints, weights, evidence requirements, annual projections and publication checks.

The result is an analytical screening score, not a probability of default, an agency rating or a recommendation to buy a bond. All rating weights, endpoints, stress sizes and default-history penalties below are internal design choices. They are fully specified for reproducibility but have not been statistically calibrated or validated against subsequent sovereign defaults.

### The complete formula
@formula Core score = (14S1 + 10S2 + 7S3 + 9S4 + 6S5 + 5S6 + 5S7 + 8S8 + 6S9 + 5S10 + 5S11 + 5S12 + 4S13 + 4S14 + 4S15 + 3S16) / 100

@formula Final score = max(0, the core score - H)

Each S is a score between 0 and 100. H is the postwar default-history deduction, between 0 and 10 points, defined on page 7. Retaining the original 16 weights preserves the 70% solvency and 30% repayment split. History is a separately disclosed overlay rather than a hidden change to those weights. Publish both the core score and the final score; use the final score when a single rating is required.

### How to apply this manual
Collect official evidence, reconcile the debt schedule, calculate each input, apply the continuous score formulas, calculate the weighted core, then deduct the history adjustment. Run the annual base and stress paths separately. If an essential input is missing, publish a bounded result or N/A, not a fabricated point score. The method is complete even when the available country evidence is not.

### Reading guide
Page 2 gives the scoring table. Pages 3 to 5 define the inputs. Page 6 specifies the repayment schedule. Page 7 covers defaults since 1946. Pages 8 and 9 cover projections and stress. Page 10 provides a numerical example. Pages 11 and 12 specify sources, evidence and checks. Page 13 adapts useful corporate credit ideas without duplicating the core weights.

## 1. Linear scoring and weights
Use percentage-point inputs: enter 60 for debt of 60% of GDP, not 0.60. Ratios such as reserve coverage use multiples: enter 1.5 for 1.5 times. All operations retain full precision; round published scores to one decimal only at the end.

@formula clip(z) = min(1, max(0, z))

@formula L(x; a,b) = 100 × clip((b - x) / (b - a))

@formula U(x; a,b) = 100 × clip((x - a) / (b - a))

L is used when lower is safer: a earns 100 and b earns 0. U is used when higher is safer: a earns 0 and b earns 100. Both are linear between their endpoints and flat outside them. Composite factors use the same linear components. Discrete counts and formula caps do not create rating buckets.

| No | Parameter | Weight | Score rule |
| 1 | Gross debt / GDP | 14% | L(x; 30, 130) |
| 2 | Three year change in debt / GDP | 10% | L(x; −10, 20) |
| 3 | Primary fiscal balance / GDP | 7% | U(x; −5, 5) |
| 4 | Interest / government revenue | 9% | L(x; 5, 30) |
| 5 | Next three years real growth | 6% | U(x; −2, 6) |
| 6 | Government revenue / GDP | 5% | U(x; 10, 45) |
| 7 | Net international investment position / GDP | 5% | U(x; −100, 50) |
| 8 | Institutions and political stability | 8% | 0.4GE + 0.4RL + 0.2PS |
| 9 | Diversification and usable resources | 6% | 0.7D + 0.3R |
| 10 | Weighted average debt maturity | 5% | U(years; 2, 12) |
| 11 | Debt due within next three years | 5% | L(share %; 10, 60) |
| 12 | Next year gross financing needs / GDP | 5% | L(x; 5, 30) |
| 13 | Foreign currency debt share | 4% | L(share %; 0, 80) |
| 14 | Liquidity protection | 4% | Regime rule on page 5 |
| 15 | Market access and funding flexibility | 4% | 0.5A + 0.5M |
| 16 | Accessible official financial support | 3% | U(coverage ratio; 0, 1) |

Example: debt/GDP of 30 gives S1 = 100; 31 gives 99; 60 gives 70; 130 or more gives 0. A one-point change in S1 changes the core score by 0.14, not by one point. The raw overall fiscal balance is still collected, but factor 2 uses debt trajectory to reduce overlap with primary balance and interest burden.

## 2. Fiscal and external strength
For a score dated at the end of year t, debt stocks and annual fiscal flows refer to t. Forward factors use the periods explicitly stated below. For a current snapshot, select the latest completed actual fiscal year as t; forecasts must remain visibly marked as forecasts, not relabelled actuals.

### Factors 1 and 2 Debt stock and direction
S1 uses consolidated general government gross debt at nominal value divided by nominal GDP. Do not net sovereign wealth funds or private assets against gross debt. Record public guarantees, public corporations and central bank exposures separately as contingent liabilities. If only central government debt is available, label the scope limitation; do not combine its repayment schedule with general government debt and imply full coverage.

S2 uses debt/GDP in t+3 minus debt/GDP in t, measured in percentage points, not percentage growth. For example, a move from 60% to 66% gives x = 6, S2 = 46.67. Use a consistent official projection; where it ends, use the explicitly labelled scenario engine on page 8. Preserve the official series and any scenario extension separately.

### Factors 3 and 4 Fiscal balance and interest
Primary balance is revenue minus non-interest expenditure, positive for surplus and negative for deficit. Use the same government perimeter, accounting basis and year for primary balance, overall balance and revenue. Interest burden is 100 times gross interest expenditure divided by total government revenue, excluding borrowing.

@formula Interest burden proxy = 100 × (primary balance - overall balance) / revenue

The proxy may use all three inputs expressed as percentages of GDP. It is permitted only if the accounting definitions reconcile. It can represent net rather than gross interest: explicitly label a net-interest proxy and do not silently mix it with gross-interest observations. Prefer reported gross interest; if the definitions cannot be reconciled, factor 4 is N/A. Revenue of zero or less makes the ratio invalid.

### Factors 5 and 6 Growth and fiscal capacity
Growth is the arithmetic average of the real GDP growth forecasts for t+1, t+2 and t+3 from one IMF WEO vintage, or an explicitly labelled scenario extension. Do not replace three forecasts with the last three actual observations. Revenue is total general government revenue including grants divided by GDP. Record grants separately because they may expire. The revenue score is a capacity proxy, not a claim that higher taxation is always better.

### Factor 7 External balance sheet
NIIP equals the economy’s external financial assets minus external financial liabilities, divided by GDP, using the IMF IIP or national central bank series. It covers the whole economy, not just the government; it is not cash available to repay sovereign bonds. Never count a private foreign asset as a treasury buffer. If stock dates and GDP periods differ, disclose the mismatch and apply the data-age rules on page 11.

Primary sources: IMF WEO and Fiscal Monitor, Eurostat for consistent European government accounts, national finance ministries and central banks, and IMF IIP. The source register on page 12 provides entry links. Every country observation must additionally point to its exact series, table or report page.

## 3. Institutions resources and diversification
### Factor 8 Institutional quality
@formula S8 = 0.40 × GE + 0.40 × RL + 0.20 × PS

GE is Government Effectiveness, RL is Rule of Law and PS is Political Stability and Absence of Violence/Terrorism. Use the World Bank WGI absolute 0–100 scores from a single release and observation year. Do not mix absolute scores, percentile ranks and standardized estimates. This replaces the earlier political-stability-only percentile specification; the 40/40/20 blend is an internal choice.

WGI measures perceptions and has uncertainty. The World Bank warns against treating it as a definitive credit-rating or investment-risk criterion. Use this modest-weight component as contextual evidence and retain its uncertainty and vintage, not as independent proof of sovereign safety. Missing any component makes S8 N/A; no weight redistribution is allowed.

### Factor 9 Economic diversity and usable resources
@formula S9 = 0.70 × D + 0.30 × R

@formula D = L(c; 0.10, 0.60)

@formula R = U(r; 0, 10)

c is the UNCTAD normalized merchandise-export product concentration index, on its 0–1 scale. Lower concentration means more diversification. Use the arithmetic mean of the latest three consecutive actual annual observations. This is explicitly an export-goods proxy: it does not capture the full service economy or all sources of resilience. Do not substitute a country-level unnormalized HHI without a documented methodology change.

r is the arithmetic mean of the latest three actual annual ratios of government extractive-resource receipts to GDP, in percent. Include oil, gas and mining taxes, royalties, production-sharing receipts and dividends paid to government from extractive activities. Avoid double-counting tax and dividend transfers already consolidated. Exclude borrowing, proceeds from asset sales, private-sector export receipts and the estimated underground value of reserves.

A country with resource receipts equal to 2% of GDP receives R = 20; one at 10% or more receives R = 100. Natural resources can add at most 1.8 points to the core score because 6% × 30% = 1.8%. A country without extractive receipts has R = 0 only when zero is verified; missing evidence is N/A. The absent bonus is not itself evidence of distress.

### Required resource disclosures
Alongside the score, record oil, gas and major mineral types; the official reserve measure and year; recent production; government share of receipts; and any documented extraction, infrastructure or legal constraints. These disclosures do not create additional points. Proven reserves must not be converted into spendable fiscal wealth by multiplying them by today’s commodity price.

Resources already influence revenue, growth and debt. The small resource component intentionally adds structural context but is not independent of those factors. Commodity concentration reduces D, partially offsetting resource strength. Run the commodity stress on page 9 and disclose the overlap; do not describe the score as statistically independent or free of double-counting.

## 4. Repayment liquidity and support
### Factors 10 to 13 Debt structure
S10 uses principal-weighted remaining years to each contractual principal payment, not the original tenor and not bond duration. Amortizing debt is split into each instalment. S11 is 100 times principal contractually due in the next 36 months divided by total outstanding principal at the scoring date. Do not include future replacement debt in the starting-date denominator. S12 is next calendar year’s gross financing needs divided by that year’s nominal GDP. S13 is debt denominated in currencies other than the sovereign’s domestic or shared monetary-union currency, as a percentage of total debt. EUR is domestic currency for euro-area members, but foreign currency for non-euro countries.

### Factor 14 Currency regime specific liquidity
For a peg or managed exchange-rate regime, or whenever foreign-currency debt exceeds 5% of total, use Q = usable official FX reserves / next 12 months economy-wide external financing needs; S14 = U(Q; 0.5, 2). The denominator is external debt principal due on remaining maturity plus the positive current-account deficit over the same period. It includes private external debt. Exclude encumbered reserves, gold and illiquid assets; do not assume all reported reserves are usable. Reserves and needs must use the same currency and date.

For a floating domestic currency or monetary-union member with foreign-currency debt at or below 5%, use Q = unrestricted central-government liquid cash and deposits / next 12 months GFN; S14 = U(Q; 0, 1). Do not treat ECB assets as a national treasury’s cash. Exclude assets committed to other uses and amounts already allocated to reduce the funding gap. Publish which branch is used; these are different liquidity proxies and cross-regime comparisons require caution. If the applicable numerator is not evidenced, S14 is N/A. A verified zero denominator with no scheduled need gives S14 = 100; an unknown denominator does not.

### Factor 15 Market access
@formula S15 = 0.50 × A + 0.50 × M

A = U(q; 0.5, 1), where q is voluntary gross market debt issuance actually settled during the latest completed calendar year divided by the official issuance plan published at the start of that year. Include domestic and international bills, bonds and market loans; exclude forced placements, central bank monetary financing and official rescue loans. Do not revise the original plan retrospectively. A cancelled need or materially changed plan requires a note, not an invented ratio. If both plan and issuance are zero, A is N/A.

M = U(m; 0, 1), where m is voluntary market debt funding divided by all positive gross debt financing raised over that same year. Official loans and direct central-bank financing enter the denominator, not the numerator. If the denominator is zero, M is N/A. This funding-access proxy is deliberately not based on yields or spreads, which would make portfolio selection circular. It does not measure investor concentration; disclose that concentration separately.

### Factor 16 Accessible official support
S16 = U(F / GFN; 0, 1). F is approved, undrawn official financing legally available for sovereign general financing within the next 12 months, with required conditions satisfied at the observation date. Include evidenced IMF, EU, ESM and bilateral facilities. Exclude mere membership, hoped-for rescues, already-disbursed loans, unavailable tranches, central-bank purchase programmes and ringfenced project grants. No facility means F = 0 only after verification. If GFN = 0, score 100 when F > 0 and otherwise 0. Conditions or amounts that cannot be verified mean N/A, not automatic support.

## 5. The debt repayment schedule
An average maturity cannot reveal a refinancing wall. Build a principal and interest ledger covering every outstanding security and loan, including short bills, domestic debt and official loans. An international-bond list alone is insufficient for a sovereign repayment score.

| Field | Required definition |
| Identity and perimeter | Instrument or loan ID, issuer, currency, guarantee status and government subsector. |
| Principal | Outstanding amount, each amortization date and amount, final maturity and any indexation. |
| Interest | Coupon or contractual loan rate, reset formula, payment dates and reference-rate assumptions. |
| Optionality | Borrower and creditor options, contractual first put date, and treatment of calls. |
| Evidence | Official source URL, table/page, publication date, retrieval date and reported coverage. |

Use contractual maturities unless the holder can require earlier repayment, in which case use the earliest exercisable put date. Do not assume a borrower will call its own debt. For floating rates use the official forecast if available; otherwise hold the latest observed contractual reference rate constant and label the assumption. For indexed principal apply the specified official inflation path. A perpetual debt stock with no finite repayment date prevents a finite whole-stock average maturity: publish the finite-maturity subportfolio statistic and mark S10 N/A unless the official whole-stock convention is explicitly available.

@formula Average maturity = sum(principal payment × years to payment) / outstanding principal

@formula Three year share = 100 × principal due within 36 months / outstanding principal

@formula Net funding need = principal due + cash interest - cash primary balance + K

@formula GFN = max(0, net funding need)

K is net other cash requirements: financial-asset purchases, recognized guarantee payments and other cash outlays minus non-debt financing receipts. Keep debt issuance and cash-buffer withdrawals outside K. A positive primary balance reduces funding need. If using accrual fiscal balances, include a sourced accrual-to-cash bridge; without it, label GFN an approximation, not an exact cash forecast.

### Reconciliation and no double counting
Principal in the ledger must reconcile to the matching reported debt stock. Report the uncovered residual explicitly. Require at least 95% value coverage and an official maturity allocation for the remaining amount before publishing a point score for S10, S11 or schedule-derived S12. Never spread unknown redemptions evenly to make the schedule balance. If only official aggregate maturity and GFN series are available, score those as reported but label detailed wall analysis incomplete.

Calculate GFN before cash withdrawals, market borrowing or official loan disbursements. Calculate the residual funding gap after allocating each source exactly once. An official loan disbursed today becomes debt and possibly treasury cash; it is no longer undrawn support. Do not count the same amount as cash and undrawn support. Publish annual maturities through 2050, all later maturities in their actual years, and monthly cash needs for the next 24 months where official data permit. Annual adequacy alone cannot prove that an intrayear payment can be met.

## 6. Sovereign defaults since the Second World War
Record the number of distinct default episodes beginning from 1 January 1946 through the information cutoff. Also report episodes already ongoing at that date separately. A default record is evidence about repayment behaviour, but the number alone is not a calibrated future default probability.

### What constitutes one episode
Include failure to pay sovereign debt principal or interest after any contractual grace period; repudiation; or a distressed restructuring that imposes creditor loss or less favourable terms to avoid nonpayment. Include domestic and foreign-currency debt and official-creditor debt, with separate labels. Exclude ordinary voluntary market exchanges and general supplier arrears from the scored count; disclose the latter separately. A debt-service suspension agreed without distress is not automatically a default.

Count an episode once from its initial qualifying event until obligations in that episode have been cured or restructured and performance has resumed. Multiple creditor groups, Paris Club rounds and exchanges resolving the same unresolved crisis are not additional country episodes. Concurrent qualifying events form one episode. Count a new event after cure as another episode. If exact dates are unavailable, a run of positive annual default observations separated by at least one full zero-default year can be used only as a labelled annual-data proxy; do not present it as an exact event count.

### Required country history record
Publish total post-1945 episode count, start and cure dates, domestic/external and private/official creditor classification, affected debt, reason for classification, and direct official evidence. Report the last cure date, years since cure, current unresolved default status and historical coverage start. A state formed after 1945 starts at sovereignty; identify inherited liabilities and predecessor defaults separately, adding an episode only where the new state legally assumed the defaulted obligation. Do not assign all predecessor defaults automatically.

### History deduction with linear ageing
@formula E = sum over episodes of max(0.25, 1 - a / 40)

@formula H = min(10, 2 × E)

a is years since the documented cure date, using days / 365.25 and floored at zero. An ongoing episode has a = 0. A cured episode retains weight 1 at cure, 0.75 after 10 years, 0.50 after 20 years and 0.25 from 30 years onward. Thus one episode deducts 2, 1.5, 1 or 0.5 rating points respectively. Repetition accumulates up to a maximum deduction of 10 points. Include a pre-1946 episode still ongoing in 1946 once in E and disclose it separately from the count of new postwar defaults.

These penalty sizes are internal, uncalibrated choices. They preserve a lasting but modest historical penalty and a larger recent penalty. If history coverage is incomplete, report a verified minimum count and a range for the final score; do not turn “not found” into zero defaults. Unknown cure dates imply an episode weight range of 0.25 to 1, not an invented date.

### Sources and current distress
Use the Bank of Canada–Bank of England database for coverage from 1960, cross-checked with IMF reports, national debt-office records and official creditor notices. IMF restructuring research helps for the 1950s but counts restructurings, not necessarily distinct defaults. Investigate 1946–1959 separately; neither dataset alone establishes a complete postwar count. Any unresolved default, debt-service moratorium or material debt arrears must carry a prominent CURRENT DEFAULT flag. A high numerical rating must not override that status or qualify the sovereign as performing debt.

## 7. Annual rating from 2027 to 2047
Produce a separate end-year score for every year 2027–2047, using only information available at the stated research cutoff. A score for 2047 needs macro inputs through 2050 because debt trajectory and growth look three years ahead. These are conditional scenario scores, not verified future ratings.

### Official forecasts first and explicit extensions second
Use the latest released IMF WEO vintage and the latest official debt-management strategy available by the cutoff. Respect each source’s actual, estimate and forecast labels. Where the official forecast ends, hold its final real growth rate, GDP-deflator inflation, revenue/GDP and primary-balance/GDP ratios constant. Use GDP-deflator inflation, not CPI, for nominal GDP. Hold NIIP/GDP, institutional scores, export concentration and resource receipts/GDP constant after their last available values. Label all such carried values as scenario assumptions; never attribute the 2047 extension to the IMF.

@formula GDP(t+1) = GDP(t) × (1 + real growth / 100) × (1 + deflator inflation / 100)

@formula Debt close = debt open + new borrowing - principal repaid + valuation and other adjustments

Take existing-debt payments from the ledger. New borrowing fills positive net funding need after approved official disbursements and planned cash withdrawals. Default base cash policy: no discretionary asset sales or buffer withdrawals; apply a negative funding need to cash accumulation. Recognize every approved official disbursement as a loan with its own interest and repayment schedule. No approved drawdown schedule means no assumed future disbursement. Support availability ends at contractual expiry, without assumed renewal.

### New borrowing rules
Use the official financing strategy for currency, instrument mix and tenor. After its forecast ends, freeze the latest official planned mix; if there is no plan, use the latest completed year’s actual issuance mix and contractual terms. Use the latest actual weighted issuance yield per currency and tenor as the base refinancing rate unless an official projected funding-cost series exists. Do not use an agency rating to invent a rate. If neither issuance records nor a usable official plan exists, future debt-structure scores are N/A.

Annual simplification: new borrowing settles on 31 December, with its first coupon in the following year and principal repaid at its specified tenor; a one-year bill repays the following December. This removes circular within-year interest calculations but understates intrayear funding complexity. Where a dated official issuance plan exists, use it instead and calculate actual within-year interest. Retain all newly issued debt and its eventual maturities beyond 2050 when computing remaining maturity. Do not delete long debt at the modelling boundary.

After the official projection ends, hold base exchange rates constant. Preserve source-backed stock-flow adjustments within official forecasts; set later unannounced adjustments to zero and mark this assumption. If the ledger projection differs from official total debt, disclose a reconciliation residual instead of forcing unknown issuance or maturities. Carry S15 forward at its last measured value in the base path, explicitly as an access assumption, not a forecast. Age history penalties only conditional on no further defaults; never infer zero future defaults as an empirical prediction.

For the FX branch of factor 14, extend the last official reserve/GDP and external-financing-needs/GDP ratios unchanged after their forecast horizon, clearly labelling this as a liquidity-ratio scenario rather than an external-sector model. In stresses hold their base foreign-currency amounts, revaluing them at the stressed exchange rate; this omits current-account feedback. For the treasury-cash branch, update cash with modelled surpluses, documented withdrawals and disbursements. Keep unresolved defaults unresolved until an evidenced cure; do not invent a future cure date.

## 8. Stress testing and score interpretation
Calculate a base path and the following separate stresses, all starting in the first model year after the latest actual year. Recompute fiscal flows, debt, refinancing needs and score components consistently. Do not assign probabilities to these scenarios.

| Stress | Deterministic assumption |
| Growth | Real growth 2 percentage points below base for two years; then base rates resume from the lower GDP level. |
| Refinancing cost | New borrowing rates and floating-rate resets 3 percentage points above base from the stress start onward; fixed existing coupons unchanged. |
| Currency | One-time 20% rise in the local-currency price of every foreign currency, then hold the new level. Revalue foreign debt, service and usable FX assets consistently. |
| Resources | Government extractive receipts 30% below base for two years. Deduct lost receipts from revenue and primary balance once; update the rolling resource ratio. |
| Contingent liabilities | One-time cash payment of 5% of starting-year GDP, funded as a new requirement; do not also add the same amount directly to debt. |
| Combined | Apply all five together without adding the same fiscal loss twice. No exchange-rate shock to debt denominated in the domestic or shared currency. |

For the growth stress, maintain base revenue/GDP but keep nominal primary expenditure at its base amount; recalculate the primary balance. The resource stress is additional and subtracts only the specified lost receipts. Apply currency conversion to original-currency cash flows before aggregation. Hold domestic inflation at base in these mechanical stresses; this is a limitation, not a macroeconomic forecast. Keep NIIP/GDP and governance at base unless a separately evidenced alternative is specified.

For base and stress paths, calculate financing need before financing. Show how much funding is assumed to be available and the residual gap. A debt path that mechanically assumes all borrowing succeeds is a financing requirement, not proof of market access. Do not change S15 purely because issuance was assumed; disclose that its carried value is conditional. In a separate access-loss test, set new voluntary market funding to zero for one year and show unmet payments, without treating the resulting borrowing shortfall as debt reduction or an improvement in solvency.

### How to interpret the output
Publish the core score, history deduction H, the final score, solvency subscore and repayment subscore, plus all raw inputs and scenario labels. Solvency subscore equals the weighted sum of factors 1–9 divided by 0.70; repayment subscore equals the weighted sum of factors 10–16 divided by 0.30. Each block therefore remains on a 0–100 scale.

Do not translate a score of 75 into a specific agency rating or probability of default. That requires an independent historical calibration with observation dates, out-of-sample tests and a defined default horizon. Do not use 100 minus the rating as default probability. Similarly, higher rating is not a guarantee of repayment, lower volatility or a higher expected investment return.

For a EUR bond, show currency, legal issuer, guarantee, seniority, contractual maturity and current agency rating separately. A country rating does not automatically rate a state-owned company or every security issued by the country. Portfolio loss probabilities require issuer-level default probabilities, dependence and recovery assumptions; this manual supplies none of those probabilities.

## 9. Worked example and arithmetic tests
This is an illustrative country, not an estimate for any real sovereign. All raw inputs below are hypothetical. It uses the FX-reserve branch for factor 14 and complete historical coverage.

| No | Raw input | Score | Rating contribution |
| 1 | 60% debt/GDP | 70.0000 | 9.8000 |
| 2 | 0 pp three year debt change | 66.6667 | 6.6667 |
| 3 | 1% primary surplus | 60.0000 | 4.2000 |
| 4 | 10% interest/revenue | 80.0000 | 7.2000 |
| 5 | 3% growth | 62.5000 | 3.7500 |
| 6 | 30% revenue/GDP | 57.1429 | 2.8571 |
| 7 | −25% NIIP/GDP | 50.0000 | 2.5000 |
| 8 | GE 80 RL 75 PS 60 | 74.0000 | 5.9200 |
| 9 | c 0.30 and r 2% | 48.0000 | 2.8800 |
| 10 | 8 years remaining maturity | 60.0000 | 3.0000 |
| 11 | 25% due within three years | 70.0000 | 3.5000 |
| 12 | 12% next year GFN/GDP | 72.0000 | 3.6000 |
| 13 | 20% foreign currency share | 75.0000 | 3.0000 |
| 14 | Reserves cover needs 1.5 times | 66.6667 | 2.6667 |
| 15 | Issuance plan 90% met and market share 80% | 80.0000 | 3.2000 |
| 16 | Official undrawn support covers 25% GFN | 25.0000 | 0.7500 |

Using unrounded values, the core score = 65.490476, displayed as 65.5. Factor 2: 100 × (20 − 0) / 30 = 66.6667. Factor 9: D = 60, R = 20, so S9 = 48.

Assume two cured default episodes, one 10 years ago and one 40 years ago. E = 0.75 + 0.25 = 1; H = 2. The final score = 63.490476, displayed as 63.5. The postwar count is 2 and the last cure was 10 years ago. There is no current-default flag.

### Minimum automated checks
Weights must sum to 100%; block weights must sum to 70% and 30%. Every score must lie in [0,100]. Test both endpoints, their midpoint and out-of-range values. Confirm debt 31% scores 99, a 0 pp debt change scores 66.6667, and a 20-year-old episode deducts one rating point. Recalculate totals from unrounded values, and verify a worsening raw input cannot improve its own score with all other inputs held fixed.

## 10. Evidence missing data and output records
### Required evidence for every input
Store country ISO code; parameter number; raw value and unit; observation date or fiscal year; actual/estimate/official forecast/scenario status; government perimeter; source institution; document title and publication vintage; exact table, page or series identifier; direct URL; access date; and all transformations. Save the original download and its SHA-256 hash. For derived figures, preserve numerator and denominator with their separate evidence.

Use the latest actual year available by the cutoff for each observed non-forward input. If fiscal inputs refer to different years or perimeters, do not combine them in a ratio. Financial stocks and schedules older than 18 months, or annual governance, NIIP, export and resource data older than 36 months, are stale for a current snapshot: publish their age and withhold an unqualified point rating. In a forward scenario, carrying a value is permitted only with an explicit assumption label; it does not make the data current.

### Missing information is not zero
@formula Core lower bound = sum of known weight × score

@formula Core upper bound = core lower bound + 100 × sum of missing weights

Weights in these equations are fractions of one. Do not renormalize the known weights. A composite with missing components is missing in full. Publish data coverage as the percentage of total weight with valid inputs. Only publish a fully supported point rating when all 16 components and the history adjustment are supported, and the debt-schedule coverage condition is met where schedule-derived measures are used.

For uncertain history use Hmin from documented episodes and their minimum supported penalties; Hmax is 10 if additional episodes cannot be ruled out. Then the final score lies between max(0, core lower − Hmax) and max(0, core upper − Hmin). Clearly label bounds as missing-information limits, not statistical confidence intervals. With complete core but incomplete history, core can be published independently.

### Required annual output table
One record per country, year and scenario:  the core score; H; the final score or bounds; solvency and repayment subscores; all 16 raw inputs, scores and weighted contributions; postwar episode count or verified minimum; last cure date; current-default flag; debt due by year; GFN; planned financing; funding gap; currency-regime branch; data coverage; and actual/forecast/scenario labels. Retain every year from 2027 to 2047, without implying precision beyond the assumptions.

### Operational workflow
1. Freeze cutoff and source vintages. 2. Collect and reconcile debt, macro, institutions, resources, facilities and history. 3. Calculate the current snapshot. 4. Build the debt and macro path through at least 2050. 5. Calculate every annual component and history adjustment. 6. Run the stresses. 7. Apply all validation tests. 8. Export the evidence table, debt ledger, history ledger, assumption register and score table alongside the rating summary.

Update after a new major macro release, debt-management plan, official programme decision, default event or material revision. Never replace old results silently: preserve version, date and a bridge explaining each change. A reproducible implementation must use these formulas directly.

## 11. Official source register and application limits
The links below identify official source families and methodology. They are starting points, not substitutes for the exact country observation link. Archive the table actually used. Source institutions do not endorse the rating weights, thresholds or deductions.

**IMF WEO and Fiscal Monitor.** Factors 1–6 and macro forecasts. Use the full database and vintage appendix; verify the actual-versus-estimate boundary. https://data.imf.org/Datasets/WEO

**Eurostat government finance statistics.** European debt, balances, revenue and consistent government perimeter. https://ec.europa.eu/eurostat/web/government-finance-statistics/database

**IMF IIP.** Factor 7 external assets and liabilities; cross-check the national central bank. https://data.imf.org/Datasets/IIP

**World Bank WGI.** Factor 8 absolute scores and usage advisory; the rating blend is internal. https://www.worldbank.org/en/publication/worldwide-governance-indicators

**UNCTAD Data Centre.** Factor 9 merchandise export concentration; finance ministries supply extractive receipts. https://unctadstat.unctad.org/datacentre/reportInfo/US.ConcentStructIndices

**IMF sovereign risk framework.** Debt sustainability, financing needs and contingent-liability context; not rating thresholds. https://www.imf.org/en/publications/dsa/sovereign-risk-and-debt-sustainability-analysis-for-market-access-countries

**World Bank debt statistics.** QPSD government debt structure and QEDS external debt remaining-maturity data. https://www.worldbank.org/en/programs/debt-statistics

**National official institutions.** Factors 10–16: DMO redemption schedules and issuance plans; treasury cash; central-bank reserves; signed programme and facility decisions. Use each country’s official site and exact document, not an aggregator. Country-specific official document URL required in every data record.

**Bank of Canada and Bank of England.** Default database and definitions from 1960; use the latest release available at cutoff. Reconcile creditor observations into country episodes. https://www.bankofcanada.ca/2023/07/technical-report-124/

**IMF historical restructuring research.** Evidence for 1950–2010; restructurings are not automatically distinct defaults. Verify 1946–1949 and all uncovered periods from national archives and official creditor records. https://www.imf.org/en/publications/wp/issues/2016/12/31/sovereign-debt-restructurings-1950-2010-literature-survey-data-and-stylized-facts-26190

### Final publication gate
Release a score only with its information cutoff, model version, source coverage and status flags. A default history is complete only when the full applicable postwar period has been checked. Do not claim zero defaults from a database that starts in 1960. Do not claim a 2047 forecast is official when it is a constant-assumption extension. Country ratings, probabilities of default and investment decisions remain separate outputs requiring their own evidence and validation.

## 12. Ideas adapted from corporate credit analysis
Corporate credit ratios offer useful questions about cash, repayment and financial discipline. Governments have no directly comparable EBITDA, and taxing powers, monetary arrangements and official financing change the interpretation. The adaptations below are mandatory supporting diagnostics, not additional weighted factors in version 1.0. Publish them beside the rating; do not add their scores to the core score or deduct them again from the final score.

### Twenty four month liquidity coverage
@formula Q24 = (C + F24) / (GFN year 1 + GFN year 2)

@formula Liquidity diagnostic = U(Q24; 0, 2)

C is unrestricted treasury cash available at the scoring date. F24 is approved undrawn financing usable for general funding within 24 months, meeting the same eligibility rules as factor 16. Include each amount once, only when available before the payment it is intended to cover. Exclude assumed future market issuance, central-bank reserves not available to the treasury, and loan proceeds already in C. The denominator uses GFN before these funding sources. Coverage of 0, 0.5, 1, 1.5 and 2 times scores 0, 25, 50, 75 and 100. A verified zero funding need scores 100. Missing either yearly GFN means N/A. The cumulative 24-month ratio must be accompanied by the earlier monthly-gap check: later cash cannot repay an earlier bill.

### Five year fiscal cash generation record
@formula Consistency diagnostic = 100 × positive primary balance years / 5

Use five consecutive completed actual years of primary balance on one government perimeter. A strictly positive balance counts as one; zero or a deficit counts as zero. Scores are 0, 20, 40, 60, 80 or 100 because the count is discrete, not because thresholds are imposed. Missing any year makes the diagnostic N/A. Show the five balances and their mean beside the score so a tiny surplus does not conceal weak fiscal capacity. This imports the cash-generation consistency idea without calling public investment an avoidable corporate capex item.

### Fiscal policy credibility
@formula e = mean absolute error of five original overall balance forecasts

@formula Credibility diagnostic = L(e; 0, 5)

For each of the same five completed years, compare the original approved government budget’s overall balance/GDP forecast with the latest official actual outcome, in percentage points. Take each absolute difference, then their arithmetic mean. Error of 0, 1, 2.5 and 5 points scores 100, 80, 50 and 0. Use the original budget, not a revised in-year forecast. Missing an original forecast or actual means N/A. Disclose perimeter changes and exceptional shocks; the mechanical measure assesses predictability, not intent or blame.

### Ideas already covered and ideas not transferred
Corporate leverage maps broadly to debt/GDP and its trajectory; interest coverage to interest/revenue; earnings trend to growth and primary balance; business and industry quality to governance, export concentration and resource exposure. These are conceptual parallels, not numerical equivalences. Importing their corporate weights would duplicate existing factors. Do not derive sovereign business quality from an agency rating and then claim the 10bonds.com rating is an independent rating.

The corporate macro block is better used as named scenarios than six unsupported judgements. Growth, energy, interest-rate and currency shocks are specified on page 9. Document country-specific war, trade, China-competition and pandemic exposures qualitatively; add a numerical scenario only with explicit transmission assumptions. Do not award arbitrary 0–100 scores to those narratives. The threshold ladders in the corporate table are not imported: all continuous rating inputs retain the linear rules in this manual.
`;

export const CORPORATE_MD = `
## Overview
The methodology should go substantially beyond conventional financial ratio analysis. The objective is to assess not only whether a company can repay its debt under current conditions, but whether it can continue to service and repay that debt when its business model, management, supply chain, financing or operating environment is disrupted.

I would build the methodology around three fundamental questions:

1. Financial resilience: Can the company service and repay its obligations based on its current financial position and expected cash generation?
2. Structural resilience: Will the company remain competitive and economically viable over the life of the bond?
3. Shock resilience: Can the company survive plausible adverse events, including geopolitical conflict, financial crises, commodity shocks, technological disruption and management failures?

The important distinction is between risk exposure, vulnerability and actual financial impact. For example, an increase in oil prices can be harmful to an airline, beneficial to an oil producer and relatively neutral to a software company. The methodology must capture these differences quantitatively wherever possible.

A credible rating framework should therefore combine financial metrics, forward-looking business analysis, event-risk assessment and explicit stress testing, with a transparent separation between observable facts and analytical judgments.

## 1. Overall methodology architecture
The published framework should distinguish between the base credit score, the financial consequences of adverse scenarios, and exceptional credit events.

@flow A. Base credit assessment | Financial strength + business resilience + management + structural exposures | Base score · 0–100
@flow B. Scenario engine | Recalculate cash flows, liquidity and leverage under defined shocks |
@flow C. Event-risk overlay | Governance failures, litigation, extraordinary transactions and other discrete events |
@flow D. Final corporate credit assessment | With separate scenario results, confidence indicators and critical-risk flags | Final score · 0–100

This is directionally consistent with established rating-agency practice, which distinguishes business and financial risk, modifiers and group support, evaluates financial policy and event risk, and separates foreseeable vulnerabilities from unforeseen event risks.

The rating's proposed differentiation: a standardized, transparent, issuer-specific shock-transmission model that makes the consequences of external risks visible to bond investors rather than relying only on a broad qualitative risk judgment.

## 2. Base credit assessment: 100 points
I recommend the following starting allocation for nonfinancial corporates.

@pillar A. Financial strength | 35 | Leverage 9%; interest coverage 6%; FFO/debt 6%; FCF generation 6%; profitability and volatility 4%; leverage trajectory 4%
@pillar B. Liquidity and repayment | 20 | 24-month liquidity 7%; maturity profile 5%; refinancing flexibility 4%; covenants and contingent obligations 4%
@pillar C. Business model resilience | 20 | Competitive position 5%; industry outlook 4%; customer/product concentration 3%; technological and China-related disruption 4%; geographic and supplier diversification 4%
@pillar D. Management and governance | 10 | Governance 3%; financial policy 3%; key-person dependency and succession 2%; execution and risk management 2%
@pillar E. Structural and external exposure | 15 | Geopolitical 4%; commodities and energy 3%; financial-system sensitivity 3%; physical and climate exposure 2%; legal/regulatory 3%

These weights are proposed research hypotheses, not empirically established optimal weights. Before publication as a validated rating methodology, they must be tested against historical defaults, rating migrations and observed financial deterioration.

A crucial rule: factors in Pillar E measure persistent exposure and vulnerability. The scenario engine measures the incremental consequences of shocks. We must not deduct the same risk twice.

## 3. Comprehensive corporate risk universe
The following taxonomy is designed as the master risk register. Each risk receives a materiality assessment, evidence record and defined transmission path into financial performance.

### A. Geopolitical, conflict and international trade
| Risk | What the rating must investigate | Financial transmission |
| Interstate war | Operations, assets, employees or customers in conflict zones | Production losses, asset impairment |
| Regional military escalation | Exposure to Taiwan Strait, Middle East, Eastern Europe and other flashpoints | Supply interruption, logistics and demand |
| Trade wars | Tariff exposure by product and destination | Margin compression, lost volumes |
| China-driven disintermediation | Ability of Chinese manufacturers to replace the issuer's products or customer relationships | Market-share loss, lower prices |
| Chinese technology competition | Relative cost, quality, scale and innovation | Structural EBITDA decline |
| Sanctions | Counterparties, countries, technologies and currencies | Inability to trade, stranded assets |
| Export controls | Dependence on restricted chips, software or equipment | Production and revenue disruption |
| Nationalization/expropriation | Physical assets in higher-risk jurisdictions | Asset loss |
| Political instability | Civil unrest, regime change, institutional deterioration | Operational shutdown, higher costs |
| Strategic shipping chokepoints | Taiwan Strait, Strait of Hormuz, Suez, Panama | Freight, fuel and inventory costs |
| Capital and currency controls | Ability to repatriate cash or service foreign debt | Debt-payment constraints |
| Protectionism/localization | Requirements for local manufacturing or procurement | Additional capex, reduced profitability |

China risk must be measured at the product and market level, not assigned mechanically based on the issuer's nationality. For example, a European industrial company could have limited sales in China but substantial exposure to Chinese competitors in Europe. Its competitive risk could therefore be high despite low direct Chinese revenue.

### B. Economic, financial and monetary risks
| Risk | What the rating must investigate | Financial transmission |
| Global recession | GDP sensitivity of demand | Revenue and EBITDA decline |
| Financial crisis | Funding availability and credit spreads | Refinancing failure |
| Banking-system crisis | Deposit concentration and reliance on bank facilities | Liquidity constraints |
| Interest-rate increases | Floating-rate debt, refinancing calendar | Higher interest expense |
| Inflation | Ability to pass through labor and input costs | Margin deterioration |
| Deflation | Pricing power and fixed debt obligations | Falling cash generation |
| Currency depreciation | Currency mismatch between cash flows and debt | Higher debt-service burden |
| Sovereign default | Exposure to sovereign counterparties, banking and capital controls | Receivables losses, financing disruption |
| Commercial real-estate crisis | Tenant, collateral and customer exposures | Impairment, demand decline |
| Credit-market closure | Debt maturities during inaccessible markets | Funding gap |
| Counterparty default | Concentrated receivables and hedging counterparties | Cash losses |
| Pension funding crisis | Defined-benefit deficits and mandatory contributions | Increased cash obligations |

### C. Commodities, energy and natural resources
| Risk | What the rating must investigate | Financial transmission |
| Oil price spike | Fuel intensity, hedging, price pass-through | Higher costs or revenue |
| Oil price collapse | Upstream production and energy-linked demand | Lower revenue |
| Natural gas disruption | Gas dependence, contracted supply | Higher costs, shutdown |
| Electricity price surge | Power intensity and electricity contracts | EBITDA reduction |
| Critical mineral shortages | Copper, lithium, rare earths and other essential inputs | Production constraints |
| Agricultural commodity shocks | Food-processing and agricultural exposure | Input inflation |
| Water scarcity | Water-intensive facilities and geographic exposure | Lower capacity, capex |
| Carbon pricing | Emissions intensity and regulatory exposure | Higher compliance costs |
| Energy transition | Stranded assets and changes in end-market demand | Long-term earnings erosion |

Every commodity shock must be assessed for its direction, magnitude, hedging protection, pass-through capacity and time lag.

### D. Technology and business-model disruption
| Risk | What the rating must investigate | Financial transmission |
| AI substitution | Proportion of products/services that AI could replace | Structural revenue loss |
| Automation | Competitors' ability to reduce costs faster | Margin pressure |
| Platform disintermediation | Dependence on distributors, marketplaces and aggregators | Loss of customer ownership |
| Technological obsolescence | Product life cycle, R&D effectiveness | Market-share loss |
| Cyberattack/ransomware | Cybersecurity controls and recovery capabilities | Shutdown, recovery cost |
| Cloud concentration | Dependency on one cloud or software provider | Business interruption |
| Data breach | Sensitive data, compliance and liability | Fines, litigation, customer losses |
| Patent expiry | Revenue protected by intellectual property | Pricing collapse |
| Product substitution | Alternative technologies or materials | Declining addressable market |
| Digital infrastructure failure | Dependency on payments, connectivity and digital systems | Revenue interruption |

### E. Supply chain and operational continuity
| Risk | What the rating must investigate | Financial transmission |
| Single-source suppliers | Availability of qualified substitutes | Production stoppage |
| Geographic concentration | Production clustered in one country or region | Correlated disruption |
| Semiconductor shortages | Critical electronic components | Production reduction |
| Logistics disruption | Dependence on shipping lanes and transport modes | Delays, increased costs |
| Supplier bankruptcy | Financial strength of critical suppliers | Replacement costs |
| Manufacturing accidents | Safety and redundancy of major facilities | Shutdown, liabilities |
| Quality failure/product recall | Product safety, traceability and recall exposure | Cash outflow, brand damage |
| Labor strikes | Union concentration, labor relations | Lost production |
| Skilled labor shortages | Availability of essential technical capabilities | Capacity and cost pressures |
| Infrastructure failures | Grid, water, telecom and transport dependencies | Operating interruption |
| Inventory disruption | Just-in-time exposure, safety stock | Working-capital shock |

### F. Health, environmental and natural-catastrophe risks
| Risk | What the rating must investigate | Financial transmission |
| Global pandemic | Business shutdown sensitivity and demand shifts | Revenue, labor and liquidity |
| Regional epidemic | Geographic concentration and workforce exposure | Local interruption |
| Earthquakes | Facilities in seismic zones | Physical losses |
| Flooding | Asset locations and business continuity | Damage and downtime |
| Hurricanes/typhoons | Production, distribution and supplier exposure | Disruption and repair costs |
| Extreme heat | Labor productivity, cooling and water requirements | Higher operating costs |
| Wildfires | Facilities and logistics corridors | Shutdown and asset damage |
| Drought | Agricultural, energy and industrial dependencies | Supply constraints |
| Environmental accidents | Pollution and remediation exposure | Fines, cleanup, litigation |
| Insurance withdrawal | Availability and affordability of catastrophe coverage | Higher retained losses |

### G. Management, governance and human-capital risks
This category deserves particular attention because conventional financial statements often fail to capture management concentration and operational fragility.

| Risk | What the rating must investigate | Financial transmission |
| CEO death/incapacity | Succession plan and delegation of authority | Strategic and operating disruption |
| Founder dependency | Critical relationships, knowledge and decisions held by one person | Business continuity risk |
| CFO departure | Financial controls and funding relationships | Reporting and financing disruption |
| Key technical expert loss | Proprietary knowledge concentrated in individuals | Product/production interruption |
| Management-team turnover | Stability of senior leadership | Execution deterioration |
| Poor succession planning | Identified and prepared replacements | Extended leadership vacancy |
| Fraud/accounting manipulation | Audit findings, restatements and controls | Liquidity crisis, covenant breach |
| Aggressive acquisitions | Management's leverage appetite | Debt increase |
| Shareholder extraction | Dividends and buybacks funded by debt | Reduced creditor protection |
| Ownership disputes | Shareholder litigation and control conflicts | Strategic paralysis |
| Poor board oversight | Independence, risk oversight and incentives | Excessive risk-taking |
| Executive compensation | Incentives favoring short-term equity returns over creditor interests | Higher financial risk |
| Succession disputes | Competing heirs or controlling shareholders | Governance instability |

A key-person event should not automatically cause a major score deduction. A company with a strong succession plan, delegated authority and institutionalized customer relationships may be highly resilient to the loss of an executive. Conversely, a founder-controlled company in which one individual controls technology, funding relationships and customer contracts may have substantial key-person risk.

### H. Legal, regulatory and strategic event risks
| Risk | What the rating must investigate | Financial transmission |
| Antitrust enforcement | Market dominance and competition investigations | Fines, divestitures |
| Major litigation | Probability and magnitude of adverse judgments | Cash outflow |
| Product liability | Potential claims and insurance protection | Liabilities |
| Regulatory prohibition | Potential restrictions on core products | Revenue loss |
| Tax-law changes | Tax jurisdiction and structure | Higher cash taxes |
| License revocation | Dependence on licenses and concessions | Operating interruption |
| Debt-funded acquisition | Acquisition size and financing policy | Leverage increase |
| Leveraged buyout | Change-of-control provisions and owner incentives | Capital structure deterioration |
| Corporate restructuring | Execution and financing requirements | Costs, covenant pressure |
| Parent-company distress | Group funding dependence and cash extraction | Liquidity loss |
| Guarantee withdrawal | Contractual support and guarantee enforceability | Reduced credit protection |
| Unexpected capital expenditure | Compliance, environmental or operational requirements | FCF deterioration |

## 4. How to convert these risks into a quantitative assessment
A risk checklist is useful, but insufficient. A credible model needs to show how an identified risk can impair the company's capacity to repay debt. I propose a five-stage calculation.

@step Exposure | Determine which portion of revenue, EBITDA, assets, procurement, production or debt is exposed to the event.
@step Vulnerability | Evaluate the company's ability to mitigate the shock through pricing, hedging, insurance, diversification, substitution or contingency plans.
@step Financial impact | Translate the shock into changes in revenue, EBITDA, working capital, capital expenditure, free cash flow, interest expense and debt.
@step Timing and recovery | Model the event's duration, timing relative to debt maturities, recovery path and any permanent deterioration.
@step Repayment consequences | Recalculate leverage, interest coverage, liquidity and the issuer's ability to meet contractual payments under the stressed scenario.

### Illustrative example: oil price shock
| Parameter (hypothetical European industrial company) | Base case | Oil shock |
| Revenue | €5,000m | €5,000m |
| EBITDA | €800m | €680m |
| Net debt | €2,000m | €2,000m |
| Annual cash interest | €100m | €100m |
| Net debt / EBITDA | 2.50× | 2.94× |
| EBITDA / interest | 8.00× | 6.80× |

Assume oil rises by 50%, the company experiences €200m in incremental gross operating costs, and it recovers €80m through hedging and customer price increases. EBITDA consequently falls by €120m. The credit assessment must then examine whether the company still generates sufficient free cash flow, whether its debt covenants remain satisfied and whether it can refinance or repay upcoming maturities. The model should also test whether the shock persists for one, two or three years.

## 5. Scenario engine: the distinctive rating component
I recommend a common set of scenarios applied consistently across issuers, with company-specific transmission assumptions.

| Scenario | Standardized shock specification | Primary output |
| Global recession | Revenue volume decline calibrated to industry sensitivity | EBITDA and FCF |
| Severe financial crisis | Credit spread increase and temporary market-access closure | Refinancing gap |
| Oil crisis | +50% oil price, with a second more severe sensitivity | Net EBITDA impact |
| Energy crisis | Material gas/electricity price increase and supply interruption | Operating costs |
| China competitive shock | Accelerated price and market-share pressure in exposed products | Structural earnings loss |
| Taiwan conflict | Semiconductor and trade disruption, plus regional demand effects | Production and cash flow |
| Middle East conflict | Energy and shipping disruption | Costs and logistics |
| Trade war | Higher tariffs and market-access restrictions | Margins and volumes |
| Pandemic | Demand interruption, absenteeism and operating restrictions | Liquidity runway |
| Supply chain failure | Loss of a critical supplier for a defined period | Lost production |
| Cyberattack | Temporary system outage and recovery expenditure | Cash losses |
| Interest-rate shock | +300 basis points on relevant debt exposure | Interest coverage |
| Currency crisis | Material depreciation in exposed currencies | FX losses and debt service |
| Climate catastrophe | Loss of a major facility and associated insurance recovery | Liquidity and asset losses |
| Key-person event | Sudden loss of a critical executive or technical leader | Execution and revenue effects |
| Combined systemic crisis | Recession + financing closure + commodity shock | Maximum credible stress |

These shock magnitudes are illustrative scenario design choices, not estimated forecasts or calibrated tail-event quantiles. They should be refined using historical observations, sector characteristics and empirical testing.

### Scenario impact should not be an arbitrary score
For each scenario s, calculate score(s) = f(stressed financial and business inputs), then measure Δscore(s) = score(base) − score(s). The model should report both the score change and the underlying financial deterioration.

@stress Manufacturer | 78 | 43
@stress Utility | 74 | 66

This allows an investor to understand that two companies with identical base credit scores may have substantially different vulnerabilities. A manufacturer with a score of 78 that falls to 43 under a plausible combined stress may be less resilient than a utility with a score of 74 that remains at 66. However, the combined scenario must explicitly model correlated shocks. It cannot be constructed by simply adding the separate losses from every scenario.

## 6. Incorporating event likelihood without false precision
Not every possible event should receive an invented annual probability. I recommend three classes:

| Risk class | Methodology | Example |
| Structural risk | Incorporate into base forecast and competitive assessment | Persistent Chinese price competition |
| Measurable stochastic risk | Use historical distributions and calibrated scenarios | Interest rates, commodity prices |
| Discrete event risk | Apply conditional scenarios and materiality flags; assign probability only with credible evidence | War, CEO death, nationalization |

The important distinction is between a risk that is already present and an event that might occur. For example, reliance on one critical executive is an observable structural vulnerability. The executive's sudden death is a discrete event. The first belongs in the base resilience assessment; the second can be tested as a scenario without inventing a mortality-based credit adjustment.

## 7. Critical-risk overrides
A weighted-average score has an important weakness: a company could score well on most factors while facing one existential risk. The methodology therefore needs override rules. I propose that the following conditions trigger mandatory review rather than simply reducing the score by a few points:

- Insufficient liquidity to meet contractual obligations within the next 12 months under the base case.
- Material debt covenant breach without a documented waiver or credible remedy.
- A near-term refinancing requirement without demonstrated funding access.
- A credible event threatening the company's ability to continue operating.
- Material financial reporting uncertainty or evidence of serious accounting manipulation.
- A material legal, sanctions or regulatory restriction preventing debt service.

These should trigger a documented credit committee review, possible score cap or distressed-credit classification. The precise caps must be specified and empirically tested before production use. This approach prevents an otherwise strong average score from concealing a critical repayment problem.

## 8. Model validation and institutional credibility
A comprehensive taxonomy alone will not make the 10bonds.com rating credible to an experienced rating-agency analyst. The credibility will come from how the model handles evidence, uncertainty, financial causality and historical performance. I recommend six mandatory methodological controls.

| Control | Required standard |
| Data traceability | Every material input must have a source, observation date, definition and calculation record |
| Sector comparability | Financial thresholds and risk transmission calibrated by industry |
| No double counting | Each risk's impact allocated to the appropriate base factor or incremental scenario |
| Reproducibility | Same verified inputs and methodology version produce the same score |
| Historical validation | Back-test against defaults, distress events and credit deterioration using information available at each historical date |
| Uncertainty disclosure | Publish data coverage, confidence, assumptions and unquantifiable risks |

### Validation tests
Before describing the 10bonds.com rating as a predictive rating model, I would require:

1. Discrimination: Do lower rating scores precede defaults more frequently than higher scores? Test with ROC-AUC and related ranking metrics.
2. Calibration: If the model eventually estimates default probabilities, do predicted probabilities match observed frequencies?
3. Early-warning performance: Does the rating identify deterioration 12–36 months before default or restructuring?
4. Stability: Does the score change for economically meaningful reasons rather than minor reporting differences?
5. Incremental value: Do geopolitical, technology and management-risk factors improve predictive performance beyond conventional financial metrics?
6. Benchmark comparison: How does the 10bonds.com rating perform relative to published agency ratings, accounting-based models and simpler financial-ratio benchmarks?

The fifth test is especially important. It would demonstrate whether the additional complexity of the 10bonds.com rating produces genuine analytical value.

## 9. How we publish this on 10bonds.com
I would position the 10bonds.com rating as a forward-looking corporate credit resilience methodology, rather than claiming it is more accurate than agency ratings before validation. The public methodology should contain four parts:

| Publication | Content |
| 1. Corporate rating Methodology | Objectives, 100-point framework, all factors, definitions, formulas and scoring rules |
| 2. Global Risk and Scenario Manual | Full taxonomy, shock assumptions, transmission formulas, scenario selection and correlation treatment |
| 3. Data and Model Governance | Sources, missing data, confidence, updates, version control, overrides and validation |
| 4. Worked Corporate Credit Assessment | One complete issuer example with historical inputs, base score, stress scenarios, repayment analysis and audit trail |

All published scores should also distinguish the issuer's creditworthiness from the specific bond's seniority, guarantees, collateral, contractual maturity and recovery prospects.

For methodological reference, the following published frameworks are particularly relevant:

- Published corporate rating methodologies of the major credit rating agencies
- Their published management and governance criteria

These are methodological references, not endorsements of the 10bonds.com rating or evidence that the proposed rating weights have been validated.

## 10. The key design decision
I would not publish a final corporate rating formula yet. We now have a substantially more complete risk universe, but three technical questions must be resolved before freezing the methodology:

- Weights: Which risks belong in the 100-point base score, and which should affect only stressed outcomes?
- Quantification: How do we convert structural disruption, geopolitical exposure and key-person dependency into repeatable, evidence-based assessments?
- Aggregation: Should the final rating score reflect expected outcomes, downside resilience or a combination, and how do we avoid double-counting correlated risks?

My proposed solution is to preserve Base score as a transparent 0–100 credit-strength score, publish Stress score as a separate resilience profile, and develop a final composite only after historical calibration establishes defensible aggregation rules.

That separation would make the methodology more credible than attaching arbitrary numerical penalties to every conceivable event. It would also give 10bonds a useful investor-facing distinction: a company's current financial strength versus its ability to survive future disruptions.

The ambition should be an auditable, forward-looking framework whose added risk factors demonstrably improve credit assessment—not simply a longer checklist than the rating agencies use.
`;
