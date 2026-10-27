# Phase A: verification of the 57% conformity review (27/10/2026)

Checked against main `069f19d` (before PR #320), the methodology paper v2.0 (24/10/2026) and Livio's brief "Engine correction V3".
No financial result is changed by this phase. Live data cannot be read from the review environment, so every live
number comes from the manual workflow "Quant baseline" (scripts/quant-baseline.ts), which also saves the exact bond data used.

## Verdict on the review
The review is broadly right. It is not exact. Corrections after reading the code:

| Review line | Review said | Verified | Evidence |
|---|---|---|---|
| Solver checked against brute force | Partly | **Implemented** for the spread-rules optimiser | lib/coherentFrontier.test.ts compares the solver with a full enumeration of every legal list on 5 random small universes (rules, spread rule, tie-break) |
| Exact optimiser and its objective | Implemented, "caveat: sums default chance, not loss" | **Implemented; the caveat is wrong.** Coefficient per bond is `lossPdOf = PD(to maturity) x LGD(rank) / 0.6` | lib/tiers.ts:73; objective built in lib/coherentFrontier.ts `solve()`; reported loss `listLifeLoss` = mean(PD x LGD). Same ranking as PD x LGD, so it already optimises a security-level loss (undiscounted, cumulative to maturity). PD is rounded to 0.001 percentage points (`pdOf`) |
| Spread table "only a hard rule" | Different | **Confirmed, and harsher than described.** For every pair (safer bond d, riskier bond b) where d pays at least b's yield minus the step, the model says: if b is chosen, EVERY group that holds such a d must also be chosen | lib/coherentFrontier.ts `spreadRows` (`x_b <= sum of group members`). A bond beaten by more than 9 other groups can never be chosen. This is a near-elimination filter, not a "swap" |
| Class window / core / worst | Implemented as a house rule | **Confirmed as a house rule, not in the paper.** One solve per "worst class present" m; needs >= 7 bonds in classes m-1..m and >= 2 in class m. The risk ceiling is always 10, so no ceiling exists as a separate concept | lib/coherence.ts rules A-C; paper section 8 says the ceiling "is not a requirement to own the riskiest grade" |
| Loss-share cap 25%, sector cap 3 | Allowed policy limits | **Confirmed** (paper 7.1 allows concentration limits as policy, they must be stored) | lib/coherence.ts rules E, G; policy signature stored in the cache key |
| Monte Carlo independent, 1M paths | Implemented / missing | **Confirmed, plus a definition gap not in the review.** The optimiser uses notch-level PD to each bond's own maturity; the Monte Carlo uses risk-class averages over the user's horizon, flat after 15 years, 40% recovery for non-ranked | lib/monteCarlo.ts vs lib/expectedLoss.ts. Two different loss definitions on one page |
| Fallback | not scored | **Real.** If no optimised list exists the route falls back to the plain ranker (`pickRanking`) with engine "current", and `nearest=true` swaps a nearby point silently | app/api/bonds/route.ts lines ~96-140 |
| Slider | 30 evenly spaced points | **Confirmed**; a later approved decision (24/10, replaced "10 ceilings x 3"), refined by Livio's 27/10 "30-band rules" | lib/sliderPortfolios.ts, lib/frontierPoints.ts |
| Default table | one combined, partly | **Confirmed.** Linear in cumulative PD, straight-line stretch beyond 15 years (not 10) | lib/expectedLoss.ts `cumulativeDefault` |
| CVaR, correlation, per-bond recovery, migration, backtests, run manifest | missing | **Confirmed missing** | no CVaR or factor code; seniority gives only 60/75/90% |

Net effect on the score: the weighted score moves from about 57% to about 58-59% (one weight-1 line Partly to Implemented; objective caveat removed). Not material. The score is not the goal.

## Policy conflicts found (authority order: latest approved decision, then paper, then other policy)
1. **Spread rule**: paper 5.1/7.4 says diagnostic only. Approved newer decision: PR #243 / 26/10 "spread rules for everyone". Effective now: `hard_constraint`.
2. **Lower-grade cap**: paper max 2 at B+ or below. Newer decision (27/10): high-return end = 10 highest yields at any risk, no cap. Effective now: cap 2 in the middle of the slider, none at the high end once PR #320 merges. This is reading B ("only the exploratory end"), pending Livio's confirmation.
3. **Rating window**: no source in the paper; added by Livio 25/10 (PR #198) as house policy.
4. **Slider**: paper 10x3; approved newer: 30 points on the frontier; 27/10 rules say 30 average-rating bands are search targets only, never forced.

## Open items for later phases
Objective coefficients: no change needed. Fallbacks: to be replaced by READY/UPDATING/PENDING/INFEASIBLE/ERROR. Loss definitions: align Monte Carlo with the optimiser (Phase C).
