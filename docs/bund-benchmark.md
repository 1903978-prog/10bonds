# German Bund benchmark (Deutsche Bundesbank)

- Dataset BBSIS, API `https://api.statistiken.bundesbank.de/rest/data/BBSIS/`. Series `BBSIS.D.I.<ZAR|ZST>.ZI.EUR.S1311.B.A604.R<01..30>XX.R.A.A._Z._Z.A`.
  - ZAR: yields derived from the term structure for Bunds with annual coupons (the coupon-bond benchmark). ZST: Svensson zero-coupon rates (discounting). Never mixed.
- Format used: SDMX CSV (`Accept: application/vnd.sdmx.data+csv;version=1.0.0`), one wildcard request per family, `lastNObservations=10`. `.` = no value (weekend/holiday), never filled.
- Tables: `app.bund_curve` (curve_type, observation_date, maturity_years unique; history kept), `app.bund_imports` (log). Code: `lib/bundCurve/`.
- Read: `getBundCurve("ZAR")` (latest complete 30 points + change vs the curve a week earlier), `getBundBenchmarkPoints()` ({asOf, points[{years, ytm}]}).
- Schedule: `.github/workflows/bund-curve.yml`, Monday 07:00 and 08:00 UTC; the script acts only when Berlin local time is Monday 09:xx (DST-correct). Runs on a runner, not in the web process. Admin: /admin/bund-benchmark (Refresh now, CSV import, same validation).
- A failed or invalid download never touches saved rows. A move above 100 bp at one maturity versus the previous saved curve is refused.
- Reuse terms (Bundesbank "Conditions for the general use of the website", checked 28/10/2026): content may be saved, forwarded and reproduced for personal or professional use if it cites "Source: Deutsche Bundesbank". Public display is therefore allowed with that attribution; do not present fitted yields as the observed yield of one Bund.
- Beyond 30 years: "N/A — outside official curve coverage". Maturity matching only; duration is not matched.
