# Price integrity: what LM op model must fix (25 Oct 2026)

## The case
Bond XS1309526405 (Linde Finance 1.9% Oct 2030): the LM op model app shows price 91.36, source "Deutsche Börse file, live,
19 Oct 2026", and a yield of 4.30% computed from it. The Deutsche Börse page for that ISIN says "Content not available",
so that price does not exist there. A wrong price gives a wrong yield, and the yield is what 10bonds ranks on.

## What 10bonds sees
`public.public_bonds` carries `clean_price`, `gross_ytm`, `ytm_as_of` (and optional `high_52w`, `low_52w`).
It has **no price source, no price timestamp, no stale or confirmed flag**. So the site cannot tell a real quote from an
invented one. The price feed itself can only be fixed in LM op model; 10bonds cannot change it.

## Hypotheses (not yet proven, no access to the main app's data from the 10bonds side)
1. A fallback fills a missing quote with an old or estimated value but still labels it "Deutsche Börse file, live".
2. The file has no row for this ISIN, and the price comes from a stale cache or a different ISIN match (e.g. a similar bond of the same issuer).
3. The "live" label and the "19 Oct" date describe the file, not the bond's own quote.
4. Yield is then computed from that price and stored as if it were a market yield.

Check first: for XS1309526405, does the 19 Oct file contain a row? If not, where did 91.36 come from? Then count how many
bonds have a price whose ISIN is absent from the file of the date shown.

## What the export must do
- Add to `public_bonds`, one value per ISIN: `price_source` (text), `price_as_of` (timestamptz, the quote's own time, not the file's),
  `price_stale` (boolean), `price_confirmed` (boolean: true only if the price was read from that ISIN's own row in the feed).
- Send `clean_price` **null** (never 0, never an estimate) when the feed has no row for the ISIN. Drop prices not confirmed by the file or feed.
- Recompute `gross_ytm` from the confirmed price, coupon and maturity; when there is no confirmed price, send the yield only if it comes from another named source, and say which in `price_source`.
- Label honestly: "live" only for a quote of the same day; otherwise the quote's real date.
- Write a nightly report to the owner: count of bonds with no confirmed price, per currency.

## What 10bonds now does (already live)
- `lib/priceIntegrity.ts`: a stored price is not trusted when it is 0 or below, outside 30-150 (fixed and zero-coupon bonds),
  differs from the yield worked out from it by more than 1 pp, is older than 7 days, is marked stale or unconfirmed,
  or the same non-par price sits on 10 or more bonds.
- Such bonds are left out of every ranking and list (`lib/bonds.ts`), and shown only to the admin at `/admin/data-quality`
  (yellow), with counts per currency and per problem, and a lookup `?isin=`.
- The new columns above are read as soon as they exist; no deploy is needed.
- Limit: a wrong price that still looks plausible (like 91.36 with a matching yield) passes these checks. Only the source
  and confirmed flag from LM op model can catch that.
