# Handover: 10bonds.com rating for every bond

For the lm-op-model team. The owner (20/10/2026): the site's 1-10 risk score must come from LR, his own methodology,
not from S&P, Moody's or Fitch (legal audit: the score must not copy agency ratings). The site is ready; it only
needs the number in the nightly copy.

## What to add to `public_bonds`

| Column | Type | Meaning |
|---|---|---|
| `lr_score` | `numeric(5,2)` | LRfinal of the bond's issuer, 0 to 100, higher = safer. Null only when it truly cannot be computed. |
| `lr_version` | `text` | Methodology version used, e.g. `sov-1.0`, `corp-base-2.0`. |
| `lr_as_of` | `date` | Date of the inputs the score was computed from. |

- Sovereign bonds (and agencies or regions the methodology treats as the state): the country's LRfinal from the
  sovereign manual (16 factors, 70/30 solvency/repayment, minus the default-history deduction).
- Corporate bonds: LR Base (0-100) from the corporate manual (financial strength 35, liquidity 20, business 20,
  management 10, structural 15). Same score for every bond of the same issuer.
- Never derive LR from an agency grade (the manuals forbid it, and it would undo the legal fix).
- A bond with a CURRENT DEFAULT flag: leave `lr_score` null so the site never shows it.

## What the site does with it (lib/ratings.ts)

- `lr_score` present: risk = 10 - floor(LR / 10), limited to 1..10 (LR 90-100 is risk 1, LR below 10 is risk 10).
  This wins over any agency grade, and a bond with no agency grade appears once it has an LR.
- `lr_score` missing: the old agency mapping is used for that bond until every bond has an LR.
- No change is needed on the site when the column appears. Check coverage with the "Bond data coverage" workflow.
