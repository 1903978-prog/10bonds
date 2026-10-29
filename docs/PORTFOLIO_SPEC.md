# Portfolio spec `ps4-2026-10-28` (Methodology 4, the production engine)

One specification for every portfolio the site shows. The numbers live in **one versioned config**, `lib/portfolioSpec.ts` (`PORTFOLIO_SPEC`),
read by the optimiser (`lib/netSpread/solve.ts`), the validator (`lib/netSpread/check.ts`, used again by `lib/sliderSnapshotBuild.ts`), the nightly job
(`scripts/portfolio-efficiency.ts`, `scripts/precompute-bands.ts`) and the admin rebuild. Change a number there, bump `SPEC_VERSION`, and every stored
list is rebuilt (the version is part of the stored-list key, so an old list is never served as new).

## 1. What a portfolio is

- Ten bonds, 10% each (equal weight), one bond per consolidated issuer group, at most three per major sector, no bond above 25% of the list's annual expected loss. The **issuer rule, the exclusions and the class spread of 2 are never relaxed**; the other numbers only move on the ladder (section 5).
- Per **key** (currency x minimum order x horizon: Short 2 y, Medium 4 y, Long 10 y, and the exact years 1 to 15 for Plus and above) there are 30 positions, anchored on the riskiest and the safest list that exist for that key (section 3). `max(class) - min(class) <= 2` in every portfolio, because the classes of a position are always a window of three.
- Risk scale: 1 AAA, 2 AA, 3 A, 4 BBB+, 5 BBB, 6 BBB-, 7 BB, 8 B, 9 CCC, 10 CC/C/D. The risk of a list is the average of the ten bond classes, always a multiple of 0.1 (the engine counts in tenths: the sum of the ten classes).

## 2. Objective

Inside its band every position maximises the **equal-weight portfolio credit-adjusted net spread** (bp per year): the plain average of the ten bonds' net spreads, where a bond's net spread is `gross spread - max(0, bond annual expected loss - benchmark annual expected loss)` exactly as defined for the Bond Efficiency Score (`docs/BES.md`, `lib/bes`). Never the sum or average of BES values, and never the raw yield. Among lists with the same net spread the one with the lowest annual expected credit loss wins (second solve). Solved exactly with HiGHS (mixed-integer, worker thread).

## 3. The 30 positions (anchored bands, `lib/riskAnchors.ts`, `ab3-2026-10-29`)

1. **Portfolio 30**: the list with the **highest average risk** that obeys every rule (R30), over every window of three classes. Among lists with that average risk, the highest net spread (then the lowest loss).
2. **Portfolio 1**: the list with the **lowest average risk** under the same rules (R1); among those, the highest net spread.
3. **Portfolios 2 to 29**: target `T(n) = R1 + (R30 - R1) x (n - 1) / 29`. Band `n` runs from the midpoint of `T(n-1)` and `T(n)` up to, but not including, the midpoint of `T(n)` and `T(n+1)`, on the 0.1 grid (midpoints rounded half up). Band 1 starts at R1, band 30 ends at R30; bands are contiguous, no gap, no overlap. Allowed classes = the window of three classes around the target: `lo = max(1, round(T) - 1)`, `hi = lo + 2`, shifted down so `hi <= 10`.
4. If `R30 - R1` is too narrow for 30 distinct 0.1-step bands, all 30 positions are kept; a band that collapses becomes the single tenth nearest its target and positions with identical lists are marked **"same as position X"** (`repeat_of`).
5. R1, R30, the 30 bands, each position's ladder step and the monotonic-order breaks are stored with the key (`StoredBands.anchors`, `.bands[].min/max/allowed/ladder/target`, `.breaks`).
6. **Return must rise with risk** (owner, 28/10/2026, supersedes "reported, never forced"). Going from position 1 to 30, each list's average return (ytm) is at least that of the list below it, so no riskier position is beaten (same or lower return with the same or higher expected loss). The build enforces it while solving: every position maximises net spread with a floor on the average return equal to the list below. The floor only changes a list that would otherwise be beaten. If no list reaches the floor, the position tries ladder steps 1 to 3, then the other 3-class windows (spread of 2 is never relaxed), and last reuses the list below (the closest non-beaten list; its stored band is the band that list was solved for); any of these is marked **"adjusted"**. **Expected loss never falls with position either** (owner, 29/10/2026): the same solve also has a floor on the average annual expected loss equal to the list below, with the same fallbacks. A newer valid build of the same price batch replaces the published Efficient Database snapshot (the snapshot fingerprint includes the build time of the stored lists). Average risk order is still reported (`.breaks`), beaten positions are listed there too.
7. **Every position gets a list** (owner, 28/10/2026): a position with no list in its own 3-class window is solved in the other windows and at ladder steps 1 to 3 (marked "adjusted"), and as a last resort reuses the list below. The never-relaxed rules (10 real bonds at 10%, one per consolidated issuer, exclusions, class spread <= 2) apply in every case.

## 4. Rules per horizon

| Rule | Strict value |
|---|---|
| Average duration of the ten bonds | within 5% of the horizon (Short 2 y, Medium 4 y, Long 10 y) |
| Each bond's duration | within 20% of the horizon; **Long within 30%**. The pool widens in half-years only when fewer than ten issuer groups fit (existing pool rule). |
| Sector cap | at most 3 bonds per major sector (banks, insurance and financial services count as one sector; unknown sector counts as one sector) |
| Loss share | no bond above 25% of the list's annual expected loss |
| Stale price | a bond whose quote is more than **10 trading days** (Mon-Fri) behind the newest quote of the copy is excluded; a bond with no quote date cannot be judged and is kept. Public holiday calendars (TARGET2 for EUR, SIFMA for USD) are not modelled yet. |
| Seniority | subordinated, junior, AT1, CoCo, Tier 1/2, hybrid, perpetual are excluded by the **seniority field** (`lib/seniority.ts` `isExcludedRank`). |
| Net spread available | a bond without a valid Bond Efficiency net spread is not eligible. |

## 5. The relaxation ladder (`LADDER_STEPS` in `lib/portfolioSpec.ts`)

A position with no list under the strict rules is retried with step 1, then 2, then 3 (each step keeps the earlier ones). A list found at step 1 or later is **adjusted**: stored with its step, shown with an "adjusted" badge on the site and in admin.

| Step | Change |
|---|---|
| 1 | Sovereigns, supranationals and agencies are exempt from the sector cap (the one-bond-per-issuer rule still applies to them); every other sector may hold 4 instead of 3. |
| 2 | Each bond within **35%** of the horizon (**Long 50%**), the average duration within **10%**. |
| 3 | No bond above **35%** of the list's annual expected loss. |

If no step gives a list the position is **INFEASIBLE** with its reason and is never filled with a neighbour's portfolio. If even the anchors cannot be found at any step, the whole key is INFEASIBLE. A solver time-out is reported as `uncertified` or `error`, never as a result.

## 6. What visitors, plans and the admin see

- **Public slider and Plus+ exact-year lists:** only VALID, non-repeated positions of the horizon, **renumbered 1..n**, each labelled with the **actual risk range** of its ten bonds (`Risk classes 4-6`, plus the list's average) and an "adjusted" badge where a ladder step was used. The stored position the list is read from is kept (`slot`).
- **Admin** (`/admin/portfolio-efficiency`, `/admin/efficient-database`): all 90 positions with status, reason, repeat flag, band, allowed classes, actual average risk, ladder step, R1 and R30 per horizon, and the rule checks.
- **Portfolio BES:** "Unavailable - insufficient calibration data" until about 20 days of history exist. Net spread is optimised and shown from day one. All spreads, losses and BES figures are labelled **indicative**.
- **Interim inputs, labelled in admin:** risk classes are agency-equivalent until the LM op model delivers `lr_score`; the EUR benchmark curve is the official Bundesbank table where imported (see `docs/BES.md`).

## 7. Pipeline and performance

1. `Bond Efficiency` run (nightly 23:30 UTC, or on demand) writes bond-level net spreads for the whole copy.
2. `Portfolio Efficiency` job (`scripts/portfolio-efficiency.ts`; nightly 23:00 UTC = 06:00 Asia/Bangkok, every 3 h to catch an admin "Recalculate"): solves all 90 term positions (anchors first, then the 28 bands), checks each list independently, stores the run (`app.pe_*`) and the 30 stored lists per term (`app.frontier_cache`, key carries the spec version).
3. `Efficient Database` snapshot (`scripts/build-slider-snapshot.ts`): reads the stored lists, re-validates every row against the bond rows with the same validator, publishes when all 90 rows are VALID or INFEASIBLE.
4. Exact years 1 to 15 (`scripts/precompute-bands.ts`, own runner): same builder, same spec, every currency x minimum order (the nightly build, `scripts/portfolio-build.ts`, one key at a time).
5. The website only **reads** stored results (target under 300 ms). A live solve runs only for a customer's blacklist, an advanced filter or a cold start (`lib/netSpread/live.ts`: the same solver and rules, the two anchors and one position, 20 s limit), never for a standard list.

## 8. What was removed or demoted (28/10/2026)

- The **average-risk-band slider definition** (1.0-1.2 ... 9.7-10.0, Methodology 3) is no longer built nightly or served; it stays as admin-only Methodology 3 (`scripts/precompute-bands.ts --m3`, `?m=3`).
- **Methodologies 1-3** are admin-only on demand (`?m=1..3` for an admin, never for the public). The admin switch is gone; the public site is always Methodology 4. The former **Methodology 5** is Methodology 4's objective.
- The "**max 2 bonds rated B+ or below**" rule and the coherence policy (loss share, core, worst class) are not in the production engine (guard test `lib/noRemovedRules.test.ts`). They remain only inside the admin-only Methodologies 1-3 (`lib/coherence.ts`, `lib/exactFrontier.ts`, `lib/frontierGuard.ts`).
- **Sector-cap lifting** for any position: not in the spec (the snapshot validator rejects it).
- **Monte Carlo / CVaR scenario code** (`lib/correlatedLoss.ts`, the CVaR constraint in `lib/coherentFrontier.ts`, `scripts/quant-cvar-budgets.ts`, `scripts/quant-correlation-impact.ts`, their workflows) deleted.
- The older yield-objective Methodology 4 lists (matrix + highest return) are replaced by the net-spread objective.
- The **fixed 30-class matrix** (`lib/riskMatrix.ts`), the **expected-loss terciles** for repeated windows and the **ps2 "re-spread above Rmax"** idea were replaced by the anchored bands on 28/10/2026 (guard test `lib/noRemovedRules.test.ts`).

## 9. Tests

`lib/riskAnchors.test.ts` (bands contiguous, targets, windows, narrow range), `lib/portfolioSpec.test.ts` (ladder, constants, trading days), `lib/netSpread/netSpread.test.ts` (solver, anchors, band sums, loss share, ladder steps), `lib/netSpread/engine.test.ts` (a full horizon on the real candidate pipeline: every rule, traps excluded, average risk rises, infeasible stays empty, stored = snapshot = served, public renumbering and adjusted badge), `lib/noRemovedRules.test.ts` (no removed rule or simulation code in the engine files).
