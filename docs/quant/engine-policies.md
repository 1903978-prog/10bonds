# Engine policy switches (quant correction, from 27/10/2026)

Nothing here changes production until Livio approves. Every switch defaults to today's behaviour; moving one changes the cache key
(`lib/enginePolicy.ts engineSignature`) and is written into every stored certificate (`cert.policy`), so an old result is never read as a new one.

**27/10/2026 (owner decision "1B 2B"):** the default is now `spread = diagnostic_only` and `composition = ceiling_only`. The legacy pair (`hard_constraint`, `house_window`) stays selectable as `LEGACY_ENGINE`. Kept in every case: one bond per issuer group, at most 3 per sector, loss-share cap 25%, at most 2 weak (B+ or lower) bonds, duration window and average duration, the risk ceiling and the slider-end rules. The "In force today" wording below describes the legacy column.

| Switch | Today (default) | Alternative | Source of alternative | Measured effect (frozen 27/10 data) |
|---|---|---|---|---|
| `spread` | `hard_constraint`: rating-by-maturity table enforced inside the optimiser (PR #243, 26/10) | `diagnostic_only`: table only labels bonds (`lib/spreadDiagnostic.ts`) | paper 5.1, 7.4 | slider positions 6/9/17 become 18/30/30; same-loss return up to +0.09 pt; see `/mnt/project-files/quant-engine/compare-2026-10-27.md` |
| `composition` | `house_window`: classes within 2, >= 7 in the two weakest present, >= 2 in the worst (PR #198, 25/10) | `ceiling_only`: only the risk ceiling | paper 8 ("class = maximum grade, not a required holding") | none on Short, up to +0.08 pt on Medium |
| `loss` | `v1_linear`: straight line between the table's years, straight stretch past 15 years | `v2_hazard`: interpolation in cumulative-hazard space, tail past 15 years flagged uncertain with a band (`lib/lossModel.ts`) | paper 3.1 | see the loss comparison (PR #327 run) |
| fallback (`setFallback`) | `legacy_ranking`: plain ranker fills in when no optimised list exists, marked `status: FALLBACK_RANKING` | `none`: `status: INFEASIBLE`, no list | paper 7.1, brief 11 | not wired in the Finder page yet; switching on needs a "no list" state in the UI |

Other parameters (already in the policy signature): `maxWeak` (bonds rated B+ or below, 2 in the middle of the slider; the slider ends use their own rules, PR #320),
`maxDispersion`, `minCore`, `minWorst`, `maxLossShare` 25%, `maxPerSector` 3, `maxPerIssuer` 1.

## Not built because the data or decision is missing (do not infer)
- Separate sovereign default table: no sovereign dataset in the repository; needs sources and licence decision. Government bonds are priced from the corporate table.
- CVaR budget C: no value exists anywhere in the project.
- Correlation / factor calibration: no calibration data.
- Bond-specific recovery: only debt rank (60 / 75 / 90%) is in the data feed.
- Observed-versus-predicted default tests and Brier scores: no issuer-level default observations in the repository.

## Status of status
API `status` field on `/api/bonds` (additive): `READY`, `UPDATING` (list saved for slightly older prices), `NEAREST_POINT`, `FALLBACK_RANKING`, `PENDING` (HTTP 202), `INFEASIBLE` (only if the fallback is off).
