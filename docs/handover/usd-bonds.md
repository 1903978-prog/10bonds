# Adding USD bonds to the nightly copy

The site already reads USD bonds (Finder currency toggle EUR / USD). Nothing changes on the site side: lm-op-model
only adds USD rows to the same nightly copy.

## What to export

Same table, `public.public_bonds`, same nightly job, same columns. One row per ISIN (no duplicates across EUR and USD).

| Column | For USD rows |
|---|---|
| `isin`, `name`, `issuer`, `country` | as for EUR bonds |
| `currency` | exactly `USD` |
| `coupon` | percent, e.g. `4.25` |
| `maturity` | date |
| `rating_sp`, `rating_moodys`, `rating_fitch`, `rating_resolved` | agency letters as for EUR (`BBB+`, `Baa1`). Unrated bonds may be sent; the site hides them |
| `gross_ytm` | yield in USD (not hedged to EUR), percent, e.g. `5.12` |
| `modified_duration` | years |
| `ytm_as_of` | when the yield was computed |
| `structure_modelled` | `false` for floaters, inflation-linked, step-ups (the site leaves them out) |
| `min_denomination` | the issuer's minimum denomination in USD from the prospectus / terms (e.g. `1000`, `2000`, `200000`) |
| `min_lot` | optional; ignored for USD (a venue lot is not the issuer minimum) |

## Notes

- A USD bond without `min_denomination` still shows, but never under the small-order filter (1k to 10k).
- Size: about 16,000 rows in total is a few MB; well within Neon limits. Search speed was checked with 16,000 bonds.
- Keep the copy fully separate from lm-op-model as today (read-only login `tenbonds_reader`).
