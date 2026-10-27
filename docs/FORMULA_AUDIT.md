# Formula audit, 27/10/2026

Tests live in `lib/audit*.test.ts` (fixture data, no database needed).

| # | Check | Result | Fix |
|---|---|---|---|
| 1 | Yield and duration, 20 seeded EUR/USD bonds (clean/dirty, ACT/ACT and 30/360, annual/semi/quarterly, zero coupon, 2-week bond) vs an independent solver | All within 0.01 bp (ACT/ACT) and under 5 bp (USD 30/360); duration within 0.01 y | none needed. The site's YTM and duration come from the nightly feed; compare them with `scripts/quant-yield-check.ts` on live data (needs the database, not run here) |
| 2 | Default table: source, interpolation, yearly p(t) >= 0, beyond 15 years, sovereign table | Both tables rise with time and rating; p(t) >= 0 for every notch 0-30 y. Found: above 100% beyond 15 y (CCC at 30 y: 116%) and a full one-year figure for bonds under one year | Capped at 100%, straight line from zero below one year (`lib/linearCumulative.ts`) |
| 3 | Seniority from the field | Found: "Unsubordinated" / "Non-subordinated" read as subordinated (senior bonds wrongly hidden); "Tier 3" and "Nachrangig" not caught | Fixed in `lib/seniority.ts`. SNP one notch lower, loss 60/75/90% by rank: correct |
| 4 | Expected loss and chance of at least one default | Both match the methodology formulas; units: return is per year, expected loss is % of money over the bonds' life, labelled so. Found: Monte Carlo used a different (risk-score average) table, no government table | Monte Carlo now takes each bond's chance from the same function (`mcBondOf`). Methodology text updated (4 languages): loss by rank, government table, Monte Carlo only reports |
| 5 | Frontier | 10 bonds, 10 issuers, at most 2 at risk 8+, strictly rising return and loss, no duplicates or dominated points, ends kept; spacing even except where the curve itself jumps | none needed |
| 6 | Risk score 1-10 | One table; slider table, 10bonds.com rating bands and default-rate rows agree. Found: SD / RD / DDD / DD grades, typographic minus and lower case not read (a bond with Fitch RD could still show) | Fixed in `lib/ratings.ts`. NR, WR, D, blank: never shown |
| 7 | Outlier rule and duration window | Match the methodology: mean + 2 sd of at least 8 peers (same currency and risk, duration +-20%, at least +-1 y), window +-20% widened to +2 y, average within 5% | none needed |
| 8 | Every number from one function | Monte Carlo was the one separate table (fixed). Only the education table (`KnowledgeTools`) reads the table directly, for display | n/a |

## Not changed, for Livio's information
- Bonds with no maturity in the data pass the database filter and are treated as perpetual only if the seniority field or the name says so. Not changed because it may hide many normal bonds; needs a live count first.
- Monte Carlo runs 1,000,000 paths (about 0.1 s). 100,000 gives the same figures within about 0.2 points on the default share; not switched, the stability thread decides.
