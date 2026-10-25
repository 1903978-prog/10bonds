# Portfolio methodology: status and backlog (24/10/2026)

## Live
- **Methodology 1** (customers): exact frontier (lib/exactFrontier.ts). For each target return it finds the 10 bonds
  (one per issuer, at most 2 rated B+ or below, duration window) with the lowest summed default chance to maturity,
  then keeps up to 30 positions that rise strictly in both return and expected loss.
- **Methodology with spread rules** (admin only, yellow "Method 1 / Spread rules" switch on the search page): the same
  optimiser plus a minimum extra return per rating step and maturity (lib/stepGap.ts). The matrix (1/3/5/7/10Y,
  straight line between, flat outside) is edited at /admin/risk-premium, "Spread rules" tab, which also has the worked
  AA 4.00% / A 4.05% / A 4.20% check. Hard rule: a bond paying no more than the step over a safer, lower-default bond
  not in the list is swapped for it. "Information only" = Method 1, with the number of bonds under the rule shown per
  list ("< hurdle" in the admin tag and the position table).
- Live before/after: workflow "Step gap live check" (scripts/step-gap-live-check.ts).

## Backlog (from the methodology review pasted 24/10/2026, not built yet)
1. Spread steps below BB (B, CCC) and beyond 10 years from default data (hazard curves), not extrapolated.
2. Recovery by seniority and issuer type instead of a flat 60% loss given default (needs seniority data per bond).
3. Correlated defaults in the Monte Carlo (sector/country factors) and a tail-loss (CVaR 95%) ceiling on each list.
4. Issuer groups (parent/guarantor) instead of issuer name only for the one-per-issuer rule (needs group data).
5. Hold-to-maturity versus early-sale risk (spread and rate shocks on price, liquidity) shown separately.
6. Callable bonds: yield-to-worst and effective duration (needs call schedules).
7. Separate EUR and USD reference curves for spread floors (USD not measured against the Bund).
8. Validation: point-in-time backtests, stress replays (2008-09, 2020), sensitivity of results to PD/LGD/hurdles.

## Risk Pay metric (Livio 25/10/2026, admin only, live)
- Spread_bp = 10,000 x (YTW_ask - Y_Bund at the bond's duration); ExpectedLoss_bp = 10,000 x PD_annual x LGD (LGD 60%);
  Risk Pay = Spread_bp / ExpectedLoss_bp; Net Risk Pay = Spread_bp - ExpectedLoss_bp.
- Livio's example: Renault 77 bp / 8.4 bp = 9.2x, net +69 bp (0.14% yearly default, 60% LGD). Labels such as STRONG / FAIR
  are not defined yet (no thresholds given). Code: lib/riskPay.ts, components/Spread.tsx (RiskPayCell). Net shows on hover.
- PD_annual = our combined default table (cumulative to maturity / years left), not a single agency's number; uses the
  quoted yield (gross YTM), not yield-to-worst, until call schedules exist.
