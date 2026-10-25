# Licensing and cross-border checklist (for counsel)

Status 25 Oct 2026. Not legal advice. Goal: no unauthorised redistribution of rating-agency reports, exchange prices or proprietary financial data, in every market we actively target (Italy, France, Germany; English guides aimed at US and UK).

## What customers still see that comes from outside sources
| Item | Where | Origin | Question for counsel |
|---|---|---|---|
| Bond terms (coupon, maturity, seniority, minimum, issuer) | Finder, bond pages `/bonds/{ISIN}`, reports | Nightly copy from the data supplier of the operating model | Does the supplier licence allow public display and redistribution of static terms? |
| Yield, price, duration | Finder, bond pages | Same supplier, previous-day figures | Delayed vs real-time rules; are prices "exchange data" needing a redistribution licence? |
| 10bonds risk 1-10 | Everywhere | Own score when filled; **fallback from agency grades (S&P, Moody's, Fitch) today because own score is empty** | Showing a risk number derived from agency grades may count as redistributing them. Fill the own score and remove the fallback (docs/handover/lr-ratings.md). |
| Default and loss tables | Ranking, methodology | Our own combination of public historical studies, no names shown | Confirm no copyright or database right issue in the underlying studies. |
| Company results and share-price signals | Report pages | Company reports and market data | Is the share-price series a licensed vendor feed? Do we show vendor data beyond the licence? |
| Issuer names and ISINs | All lists | Supplier and public prospectuses | ISIN licensing (ANNA / national agencies) for commercial display. |
| ETF comparison | Landing | One provisional benchmark, no fund, provider or ISIN named | Needs methodology and data-use rights before "Verified". |
| Guides | Knowledge menu | Own text; some mention rating agencies in an educational way | Fair use of agency names; no logos, no agency reports copied. |

## Admin only (not shown to customers)
Agency grades (S&P tag), 52-week min/max, dated price quotes by source, tax data, data-source names. Keep it so.

## Already done
Customers no longer see tax, data sources, observation dates or quote tables (PR 210, 211). No agency names or letters shown to customers. Terms section 6 covers ratings (PR 212).

## Cross-border questions
1. **EU:** MiFID II (investment advice / recommendations), MAR (investment recommendations), CRA Regulation (is a score a "credit rating"?), Benchmarks Regulation (ETF comparison), GDPR (done separately), Estonian FSA position for a service run from Estonia.
2. **UK:** FCA financial promotion rules for UK users of English pages; any "restricted" status.
3. **US:** Advisers Act "publisher's exclusion", NRSRO definition, SEC/FINRA rules on promotion; whether to geo-block or restrict US-facing pages.
4. **Other markets:** list any country we promote in on social media; counsel to confirm for each.
5. **Data vendors:** get written confirmation of display and redistribution rights, per country, for each field in the table above.
6. **Social media promotion:** local financial promotion rules apply to posts as well as the site.

## Suggested order
(1) licence check of the data supplier, (2) fill own score and drop agency fallback, (3) counsel on the BUY / WATCH / AVOID question, (4) US and UK access decision.
