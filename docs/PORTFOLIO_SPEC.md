# Portfolio spec `ps1-2026-10-28` (Methodology 4, the production engine)

One specification for every portfolio the site shows. The numbers live in **one versioned config**, `lib/portfolioSpec.ts` (`PORTFOLIO_SPEC`),
read by the optimiser (`lib/netSpread/solve.ts`), the validator (`lib/netSpread/check.ts`, used again by `lib/sliderSnapshotBuild.ts`), the nightly job
(`scripts/portfolio-efficiency.ts`, `scripts/precompute-bands.ts`) and the admin rebuild. Change a number there, bump `SPEC_VERSION`, and every stored
list is rebuilt (the version is part of the stored-list key, so an old list is never served as new).

## 1. What a portfolio is

- Ten bonds, 10% each (equal weight), one bond per consolidated issuer group, at most three per major sector. No position relaxes any of these.
- Position 1 to 30 per horizon; the bond risk classes a position may hold come from the absolute matrix below, and `max(class) - min(class) <= 2` in every portfolio.
- Horizons: Short 2 y, Medium 4 y, Long 10 y, and the exact years 1 to 15 for Plus and above. All use the same spec.

### Risk matrix (`lib/riskMatrix.ts`, `rm1-2026-10-28`)

| Position | Classes | Position | Classes | Position | Classes |
|---:|---|---:|---|---:|---|
| 1 | 1 | 11 | 4-6 | 21 | 7-8 |
| 2 | 1-2 | 12 | 4-6 | 22 | 7-9 |
| 3 | 1-3 | 13 | 5-6 | 23 | 7-9 |
| 4 | 2-3 | 14 | 5-7 | 24 | 7-9 |
| 5 | 2-4 | 15 | 5-7 | 25 | 8-9 |
| 6 | 3-4 | 16 | 5-7 | 26 | 8-10 |
| 7 | 3-5 | 17 | 6-7 | 27 | 8-10 |
| 8 | 3-5 | 18 | 6-8 | 28 | 8-10 |
| 9 | 4-5 | 19 | 6-8 | 29 | 9-10 |
| 10 | 4-6 | 20 | 6-8 | 30 | 10 |

Risk scale: 1 AAA, 2 AA, 3 A, 4 BBB+, 5 BBB, 6 BBB-, 7 BB, 8 B, 9 CCC, 10 CC/C/D.

## 2. Objective

Maximise the **equal-weight portfolio credit-adjusted net spread** (bp per year): the plain average of the ten bonds' net spreads, where a bond's net spread
is `gross spread - max(0, bond annual expected loss - benchmark annual expected loss)` exactly as defined for the Bond Efficiency Score (`docs/BES.md`, `lib/bes`).
Never the sum or average of BES values (a percentile inside a peer group is not an amount of money), and never the raw yield. Among lists with the same
net spread the one with the lowest annual expected credit loss wins (second solve). Solved exactly with HiGHS (mixed-integer, worker thread).

## 3. Rules per horizon

| Rule | Value |
|---|---|
| Average duration of the ten bonds | within 5% of the horizon (Short 2 y, Medium 4 y, Long 10 y) |
| Each bond's duration | within 20% of the horizon; **Long within 30%** (decision 1b). The pool widens in half-years only when fewer than ten issuer groups fit (existing pool rule). |
| Stale price | a bond whose quote is more than **5 trading days** (Mon-Fri) behind the newest quote of the copy is excluded. A bond with no quote date cannot be judged and is kept, as on the rest of the site. |
| Seniority | subordinated, junior, AT1, CoCo, Tier 1/2, hybrid, perpetual are excluded by the **seniority field** (`lib/seniority.ts` `isExcludedRank`). |
| Net spread available | a bond without a valid Bond Efficiency net spread is not eligible. |

## 4. Positions that share the same classes (repeated windows)

Positions 7-8, 10-12, 14-16, 18-20, 22-24, 26-28 hold the same allowed classes. They are not allowed to be the same portfolio by accident:

1. Solve the window's unconstrained optimum (highest net spread); its annual expected loss is the **top** of the window's feasible range.
2. Solve the lowest annual expected loss any valid list reaches; that is the **bottom** of the range.
3. Place `i` of `m` maximises net spread subject to its own **expected-loss ceiling** `bottom + (i+1)/m * (top - bottom)`: terciles for three places, halves for two. The last place is the unconstrained optimum.
4. Net spread and expected loss therefore never fall from one place to the next. If two places still return the same ten bonds (a flat range) the later one is flagged **repeat** (`repeat_of`); it is not hidden in admin. The public slider leaves repeats out (see 6).

Positions with different classes can also coincide (position 4 = position 3 when the best class 2-3 list is all class 3). That is flagged the same way.

## 5. Infeasible positions

If no list of ten meets every rule the position is **INFEASIBLE** with the reason ("No list of 10 bonds meets every rule of this position (n eligible bonds in classes ...)"). It is never filled with a neighbour's portfolio, and no rule is relaxed to find one (no sector lifting, no wider class window, no looser spread). A solver time-out is reported as `uncertified` or `error`, never as a result.

## 6. What visitors, plans and the admin see

- **Public slider and Plus+ exact-year lists:** only VALID, non-repeated positions of the horizon, **renumbered 1..n**, each with its risk classes (`Risk classes 4-6`). The stored position the list is read from is kept (`slot`).
- **Admin** (`/admin/portfolio-efficiency`, `/admin/efficient-database`): all 90 positions with status, reason, repeat flag, allowed classes and the rule checks (including the expected-loss ceiling).
- **Portfolio BES:** "Unavailable - insufficient calibration data" until about 20 days of history exist. Net spread is optimised and shown from day one.
- **Interim inputs, labelled in admin:** risk classes are agency-equivalent until the LM op model delivers `lr_score`; the EUR benchmark curve is the supplied table until the official Bundesbank import lands (see `docs/BES.md`).

## 7. Pipeline and performance

1. `Bond Efficiency` run (nightly 23:30 UTC, or on demand) writes bond-level net spreads for the whole copy.
2. `Portfolio Efficiency` job (`scripts/portfolio-efficiency.ts`; nightly 23:00 UTC = 06:00 Asia/Bangkok, every 3 h to catch an admin "Recalculate"): solves all 90 term positions, checks each list independently, stores the run (`app.pe_*`) and the 30 stored lists per term (`app.frontier_cache`, key carries the spec version).
3. `Efficient Database` snapshot (`scripts/build-slider-snapshot.ts`): reads the stored lists, re-validates every row against the bond rows with the same validator, publishes when all 90 rows are VALID or INFEASIBLE.
4. Exact years 1 to 15 (`scripts/precompute-bands.ts`, own runner): same builder, same spec, EUR 100k.
5. The website only **reads** stored results (target under 300 ms). A live solve runs only for a customer's blacklist, an advanced filter or a cold start (`lib/netSpread/live.ts`: the same solver and rules, one window, 20 s limit), never for a standard list.

## 8. What was removed or demoted (28/10/2026)

- The **average-risk-band slider definition** (1.0-1.2 ... 9.7-10.0, Methodology 3) is no longer built nightly or served; it stays as admin-only Methodology 3 (`scripts/precompute-bands.ts --m3`, `?m=3`).
- **Methodologies 1-3** are admin-only on demand (`?m=1..3` for an admin, never for the public). The admin switch is gone; the public site is always Methodology 4. The former **Methodology 5** is Methodology 4's objective.
- The "**max 2 bonds rated B+ or below**" rule and the coherence policy (loss share, core, worst class) are not in the production engine (guard test `lib/noRemovedRules.test.ts`). They remain only inside the admin-only Methodologies 1-3 (`lib/coherence.ts`, `lib/exactFrontier.ts`, `lib/frontierGuard.ts`).
- **Sector-cap lifting** for any position: not in the spec (the snapshot validator rejects it).
- **Monte Carlo / CVaR scenario code** (`lib/correlatedLoss.ts`, the CVaR constraint in `lib/coherentFrontier.ts`, `scripts/quant-cvar-budgets.ts`, `scripts/quant-correlation-impact.ts`, their workflows) deleted.
- The older yield-objective Methodology 4 lists (matrix + highest return) are replaced by the net-spread objective under the same matrix.

## 9. Tests

`lib/portfolioSpec.test.ts` (the matrix table, spread, terciles, trading days), `lib/netSpread/netSpread.test.ts` (solver, ceilings, windows), `lib/netSpread/engine.test.ts` (a full horizon on the real candidate pipeline: every rule, traps excluded, repeated windows rise, infeasible stays empty, stored = snapshot = served, public renumbering), `lib/noRemovedRules.test.ts` (no removed rule or simulation code in the engine files).
