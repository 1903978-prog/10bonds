# One slider, 20-30 portfolios: method (proposal)

Status 24/10/2026: the slider now has 30 steps, as the owner asked (lib/mixSteps.ts): 10 major steps set the highest
risk accepted, each with 3 sub-steps for the desired return (low, medium, high). High = the slider maximum at that risk;
low and medium sit at 1/3 and 2/3 of the way from the maximum at the risk below (1% under risk 1), so the return never
goes down from one step to the next. Steps 3 and 4 below (Pareto filter) are an optional later refinement.

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
