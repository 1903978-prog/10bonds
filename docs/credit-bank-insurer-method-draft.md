# DRAFT — Bank and insurer IR/BR method (3/11/2026)

Status: **proposal only. Not approved by the owner. Not in the code. Nothing is published from it.**
The gate (`lib/creditGate.ts`) keeps refusing to publish a bank or insurer IR until the owner approves a method and it is added to `lib/livioIssuerModel.ts`.
Today only the owner's corporate model exists (14 factors, weights, unknown factor keeps bounds 0..100).

## Design rules (same as the corporate model)
1. IR is built from the issuer's own figures. An agency grade is never an input, only a cross-check.
2. A missing factor keeps bounds 0..100, so the range widens. Range above 15 points = not publishable.
3. Only figures with a cited sentence from a retrieved document count. Estimated or rating-implied values count as unknown.
4. BR = IR + capital-structure tier range + structural flags (same tiers as the corporate model; bank tiers already exist: senior preferred 0, senior non-preferred −5..−3, Tier 2 −10..−6, AT1 −25..−15).

## Bank factors (proposed weights, sum 100)
| Factor | Figure (period must be the latest reported) | Weight |
|---|---|---|
| Capital | CET1 ratio; total capital ratio; distance to requirement | 25 |
| Asset quality | NPE (or NPL) ratio; cost of risk | 20 |
| Profitability | ROE; cost/income; pre-tax profit trend | 15 |
| Liquidity and funding | LCR; NSFR; deposit share | 15 |
| Business model | size, diversification, ownership/support (judgment, typed and sourced) | 10 |
| Resolution and support | bail-in buffer (MREL), public-sector owners/guarantee | 5 |
| Macro and country | same macro block as the corporate model (15% in total, scaled) | 10 |

Scales (to be agreed): each figure maps to 0..100 with a fixed table, e.g. CET1 ≤ 10% → 20, 14% → 60, ≥ 18% → 90; NPE ≥ 6% → 20, 2% → 70, ≤ 1% → 90; LCR < 110% → 30, ≥ 150% → 80. Exact tables need the owner's numbers.

LBBW (DE000LB2CW16) inputs found in the reference case: CET1 16.1%, NPE 0.9%, ROE 8.3%, pre-tax profit EUR 708m, total capital 19.9%, cost/income 60.4%. LCR/NSFR from 2024 are stale and do not count.

## Insurer factors (proposed)
Solvency II ratio (30), combined ratio / profitability (20), investment quality and duration gap (15), reserve adequacy (10), business mix and diversification (10), capital quality (own funds tier mix) (5), macro block (10). Subordinated insurance debt uses the existing "tier2-insurance-subordinated" tier.

## Mandatory for publication
Bank: CET1, NPE/NPL, total capital, ROE, cost/income, pre-tax profit, LCR, NSFR — all dated within 18 months. Insurer: Solvency II ratio, combined ratio, investment result, equity — within 18 months.

## What the owner has to decide (one reply is enough)
1. Weights above: accept or change.
2. The figure-to-score tables.
3. Whether judgment factors (business model, support) may be typed by a person, or must be left unknown (wide range).

Until then banks and insurers stay "Rating not published: no approved method".
