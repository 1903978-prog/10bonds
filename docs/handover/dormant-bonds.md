# Dormant bonds (minimum investment above 200,000): what LM op model has to do

Rule (the owner, 21/10/2026): a bond whose minimum investment is **above 200,000 EUR or
200,000 USD** is kept in the database but is **dormant**: never shown, never ranked, and its
price is not refreshed. Reason code: `min_investment_over_200k`.

## Already done in 10BONDS

`lib/dormant.ts` applies the rule when the site loads `public_bonds` (`lib/bonds.ts`), so every
page (search, top 10, slider limits, charts, ISIN pages, sitemap, SEO pages) leaves these bonds
out automatically, including new ones in tomorrow's copy. Minimum = issuer denomination (else the
venue lot for non-USD bonds), after the corrections in `lib/minOverrides.ts`. Exactly 200,000 is
still shown. Other currencies are not judged (left for review).

The site also honours an optional `dormant` boolean column in `public_bonds`: when it is `true`
the bond is hidden even if its minimum is unknown.

## Change in LM op model

1. In the main bond table, add `dormant boolean not null default false` and
   `dormant_reason text`. Set them in the nightly job:
   ```sql
   update bonds set dormant = true, dormant_reason = 'min_investment_over_200k'
   where currency in ('EUR','USD') and min_denomination > 200000;
   ```
   Never delete these rows.
2. Skip dormant bonds in every price / yield refresh (the 03:00 run and the
   "Refresh prices" requests in `app.refresh_requests`, see refresh-requests.md).
3. In the public export, copy the `dormant` column into `public_bonds` (or leave dormant bonds
   out of the copy entirely; both work for the site).
4. Bonds in other currencies with a minimum above 200,000 units: list them for review, do not
   flag them automatically.
