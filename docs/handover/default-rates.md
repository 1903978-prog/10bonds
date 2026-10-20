# Default-rate table (internal note, not shown on the site)

Since 20 Oct 2026 (the owner's request) 10BONDS uses its own combined table of average cumulative corporate default
rates per rating notch, in `lib/seo/defaultRates.ts`. It drives the "yield after expected losses" ranking
(`lib/expectedLoss.ts`), the Knowledge Center table and the default-rate guides (IT/EN/FR/DE). On the site it is
described only as "based on public historical default studies"; no agency table is reproduced.

How it is built: for each notch (AAA ... CCC/C) and horizon (1, 3, 5, 7, 10, 15 years), the simple average of
- S&P Global Ratings, annual global corporate default and rating transition study, long-run averages 1981-2023
  (the figures the owner sent for the Italian guide);
- Moody's, annual default study, average cumulative issuer-weighted global default rates by alphanumeric rating,
  1983-2023 (Aaa=AAA, Aa1=AA+ ... Caa1=CCC+, Caa2-C = CCC/C);
- Fitch Ratings, global corporate finance transition and default study, average cumulative default rates 1990-2023.

Rounding: 2 decimals below 1%, 1 decimal from 1%. The table rises steadily with lower rating and longer horizon
(checked when built).

Caveat: the Moody's and Fitch inputs are approximate long-run averages (not copied line by line from the latest PDFs,
which are behind their sites). Before any legal or marketing use of exact figures, re-check them against the latest
editions and update `lib/seo/defaultRates.ts` plus the guide tables (`lib/seo/defaultRatesTextFixes.ts` pattern).
