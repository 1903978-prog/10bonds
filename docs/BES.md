# Bond Efficiency Score (BES), methodology bes-1.0

Diagnostic only. It does not change the optimizer, the 30-band matrix or any portfolio selection.

- Code: `lib/bes/` (math, calc, store, S&P reference), job `scripts/bes-run.ts`, workflow `.github/workflows/bes.yml` (nightly 23:30 UTC after the Efficient Database job, plus every 3 h to pick up an admin request), admin `/admin/bond-efficiency`, read API `GET /api/bonds/efficiency?code=EUR00001` (score + label + status + peers only).
- Universe: bonds the site shows (rated, current price, no outliers/subordinated).
- PD used: the site's own combined table (lib/seo/defaultRates.ts; governments lib/sovereign.ts), interpolated linearly on survival, from survival 1 at t = 0, null beyond 15 years (no extrapolation). Annual equivalent PD = 1 - (1 - PD)^(1/T).
- S&P Table 24 (2024 corporate study) is stored as a versioned INTERNAL reference (app.historical_default_probabilities, `lib/bes/spReference.ts`), shown on the admin page and as a comparison column. Not used for scoring and never shown to customers (usage rights unresolved).
- Risk classes: the app's own scale is 1 AAA, 2 AA, 3 A, 4 BBB+, 5 BBB, 6 BBB-, 7 BB, 8 B, 9 CCC, 10 CC/C (not the brief's proposed 4 BBB / 5 BB / 6 B / 7 CCC). Default rates are looked up by NOTCH, so nothing is re-mapped. Classes 9-10 use the aggregate CCC/C row and are marked "limited".
- Benchmark: government YTM curve of the bond's currency from the same daily copy (EUR Bund, USD Treasuries, GBP Gilts); needs 6+ points, no extrapolation; "benchmark YTM spread approximation", not a Z-spread.
- Net spread = gross spread - max(0, bond annual loss - benchmark annual loss). Annual loss bp = annual equivalent PD x LGD (by debt rank) x 10,000. Liquidity: no bid/ask data, so not estimated (null, never zero).
- BES = percentile rank of net spread among peers (currency, risk class, maturity band, issuer type, debt rank). Minimum 20 peers; fallback L1 merges maturity bands (status limited); otherwise "unavailable".
- Excluded (unavailable): floating/step/inflation coupons, yield outside -1..30%, quotes over 7 days older than the newest, gross spread beyond 1,500 bp (possible price error), maturity beyond the curve or 15 years.

## Extensions (owner, 28/10/2026: every bond must be scored where a price exists)
- Stale limit = the site's own 10 days (lib/bonds.ts STALE_DAYS), no stricter.
- Beyond 15 years: the yearly default hazard of the last table segment is held flat (up to 50 years). Status Limited, never a measured number.
- Benchmark curve edges: nearest end yield held flat, up to 1 year before the shortest and 10 years beyond the longest government point. Status Limited.
- Peer fallback: L0 full group, L1 maturity bands merged, L2 neighbouring risk classes (same currency, issuer type, rank). Limited.
- The run also prints price coverage of the whole bond copy so missing prices can be traced to the data feed.
- EUR benchmark = fixed table supplied by the owner (lib/bes/benchmarkTables.ts, version eur-bench-2026-10-27, reference date 27/10/2026, Verified at 1,2,3,5,7,10,15,20,30 years, others interpolated by the owner). 31-50 years: no verified benchmark, so no score. Refresh: replace the rows, bump the version; the daily-copy Bund curve stays as a comparison row in the admin table. USD = owner's US Treasury par-yield table (usd-bench-2026-10-27-interim, 27/10/2026, Published at 1,2,3,5,7,10,20,30y, others interpolated; INTERIM, to be replaced by the Federal Reserve fitted par curve SVENPY01-30). GBP still uses the curve of the daily copy.
