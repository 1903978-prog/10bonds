# Find Optimal Portfolio (admin Multi-year chart)

Admin only (yellow tab). Code: `lib/optimalPortfolio.ts` (pure maths), `lib/optimalBuild.ts` (builder and cache), `app/api/bonds/optimal/route.ts`, `components/OptimalPanel.tsx`, markers in `components/AllCurvesChart.tsx`.

## What is reused
- The exact efficient frontier per maturity (`lib/exactFrontier.ts` via `lib/frontierCache.ts`, Methodology 1): one issuer once, rated only, dormant/subordinated exclusions unchanged. Every marker is one of these real 10-bond lists; nothing is interpolated into a portfolio.
- The Monte Carlo (`lib/monteCarlo.ts`, same seed, bond risk score and LGD by rank as the results box). Added: `es5` (average annual return of the worst 5% of paths) and an optional stress argument. Existing figures are unchanged.
- Bund curve (`lib/riskPremium/benchmark.ts`) as the EUR risk-free rate per maturity.

## Per maturity
1. **Knee** (`kneeOf`): normalise loss and return to 0-1, take the list with the largest gain over the end-to-end diagonal (Kneedle). Shown only if the bend is at least 0.05 (otherwise "near linear", no forced knee) and with at least 4 lists. Diagnostics: normalised curvature, stability (agreement of two thinned copies). Marginal efficiency = extra return (pp a year) per extra pp of expected loss between neighbouring lists.
2. **Economic optimum**: 10 evenly spread efficient lists plus the knee get the Monte Carlo (100,000 paths). Expected net return = Monte Carlo expected annual return after defaults (timing and recovery included, so no cumulative loss is subtracted from an annual yield). Tail risk T = expected net return minus ES95 (annual, pp). Choice = balanced compromise: among non-dominated candidates, scale return and T to 0-1 and take the largest (return - T), i.e. U = (mu - rf) - lambda T with lambda set by the candidates' own ranges. No risk-aversion number is invented.

## Best maturity
All candidates are pooled, dominated ones removed, the same balanced pick is made on (net return - Bund yield at that maturity) against T. All maturities are evaluated over their own horizon in annual terms, so they are comparable. Without a Bund for every maturity the result is marked provisional.

## Stress
Reruns the whole selection with default chances x1.5, x2, loss given default +15 pp, and both; the panel says "Best maturity unchanged in k of 4" from those real runs.

## Not available (shown to the admin as such)
Default correlation (defaults are independent, so ES95 is understated), rates/spread/liquidity stress, callable redemption, reinvestment and costs, duration/liquidity penalty (zero). Existing return and loss calculations are unchanged; no mathematical correction was needed.

## Caching and speed
Built in the background (one candidate per turn), kept in memory per data copy, filter and `OPT_VERSION`; the API answers `{ pending: true }` until ready (about 10 s). Bump `OPT_VERSION` when the model changes.
