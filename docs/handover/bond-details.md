# Bond details: extra columns for `public_bonds`

The bond details (one-bond card and `/bonds/{ISIN}` pages) now show every bond term the copy holds. Until lm-op-model
exports the columns below, those fields show "–". Coupon type is already filled where possible: zero coupon when
`coupon = 0`, fixed when `structure_modelled = true`.

Add to `public.public_bonds` (same nightly export, one row per ISIN). All optional; the site reads them when present.

| Column | Type | Content |
|---|---|---|
| `coupon_type` | text | `fixed`, `zero`, `floating`, `step`, `inflation` (other words are shown as written) |
| `seniority` | text | e.g. `Senior unsecured`, `Senior preferred`, `Senior non-preferred`, `Senior secured`, `Subordinated` |
| `issue_date` | date | first issue date |
| `callable` | boolean | `true` if the issuer can repay early |

`high_52w` / `low_52w` (52-week price range) are shown to the admin only, never to customers (data supplier rights).
