> **Superseded 28/10/2026** by `docs/PORTFOLIO_SPEC.md` (the production engine). Kept for reference only.

# The 30-position "Return & risk" slider

Built 24/10/2026 from the owner's spec. Code: lib/sliderPortfolios.ts (positions, pure and tested), lib/sliderCache.ts
(background build and cache per horizon, currency, minimum order, data copy and ranking setup), /api/bonds/slider.

- Position s = 1..30: risk ceiling R = ceil(s/3) (hard limit, 1 = AAA only), return level k = 1 + (s-1) mod 3.
- C_R = average yield of the top-return 10-bond list under R (forced non-decreasing in R).
- R = 1 (or the first feasible ceiling): targets F, F + (C - F)/2, C, with F = yield of the lowest-expected-loss list.
- R >= 2: targets C_(R-1) + Δ/3, C_(R-1) + 2Δ/3, C_R with Δ = C_R - C_(R-1).
- Low/medium: existing engine (lowest expected loss reaching the target, PR #98). High: top-return list.
- Along the slider a list that pays less, or the same with no lower expected loss, or has the same bonds, is not new:
  the position reuses the previous list (identical figures). Fewer than 10 issuers = unavailable, rules never relaxed.
- Expected loss = avg default chance to maturity x 60% loss given default (40% recovered), lib/expectedLoss.ts.
- Customers: term + one slider + "Build my portfolio"; currency/minimum under "More filters". Admin: Simple/Advanced
  switch (Advanced = the original sliders, yellow) and a 30-position check table.

Not built (no data yet): yield-to-worst for callable bonds, parent/guarantor issuer groups, a default-correlation
model, an admin editor for the risk mapping (the mapping is fixed in lib/ratings.ts).

## Earlier proposal (kept for reference)

## The two parameters

- **R, highest risk accepted** (1 to 10): no bond in the list is riskier than R.
- **T, target average return**: between the lowest useful target `floor(R)` (the list with the lowest chance of a loss,
  no return asked) and the slider maximum `cap(R)` (the top-return list). Below `cap(R)` the engine picks the 10 bonds
  with the lowest chance of a loss that still reach T (PR #98).

## Step 1: the grid (up to 30 candidates)

For each horizon (short, mid, long), currency and minimum order, and for each R from 1 to 10, build three lists:

| point | target T |
|---|---|
| top | `cap(R)` |
| middle | `floor(R) + 2/3 × (cap(R) − floor(R))` |
| careful | `floor(R) + 1/3 × (cap(R) − floor(R))` |

10 risk levels × 3 targets = up to 30 portfolios. Risk levels with no bonds at that horizon are skipped.

## Step 2: score each portfolio

For each list: expected return per year = average return after expected losses (lib/expectedLoss.ts) and expected
loss on the money = average default chance to maturity × 60% (the KPI box). Identical lists are merged.

## Step 3: keep the efficient ones (Pareto)

Drop any portfolio for which another one has a higher (or equal) expected return AND a lower (or equal) expected
loss. What is left is the efficient frontier: usually 15-25 points, each one strictly "more return for more risk"
than the one before.

## Step 4: the slider

Sort the efficient points by expected return. The slider walks them from "Low return" (left) to "High return" (right),
one step per point; the right end is always the top-return list at the highest risk with bonds. The step count can
differ by horizon, while the slider keeps the same width (no layout shift).

## Performance and documentation

- The grid is 30 rankings per filter: compute it in the background with the slider maximums (lib/bestTable.ts
  `capsFor`), never on a customer request.
- Publish the method as a short section of /selection-methodology ("How the slider builds its portfolios").
