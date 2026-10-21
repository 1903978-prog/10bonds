# Prices: what LM op model has to add

**Update 21 Oct 2026:** do NOT export `high_52w` / `low_52w`. The owner does not want the data supplier's 52-week
range used or shown (data supplier rights). The site ignores those columns and only uses its own recorded history.

The 10BONDS **Price drops** page (`/price-drops`, `/it/ribassi`, `/fr/baisses`, `/de/kursrueckgaenge`) lists rated
bonds whose price is furthest below its 52-week high. Today `public.public_bonds` holds yields only (checked
20 Oct 2026: no price, high or low column), so the site works out an indicative price from the yield and keeps its
own weekly lowest/highest yield in `app.bond_price_weeks`, starting 20 Oct 2026. A full 52-week view would take a year.

LM op model already refreshes prices daily, so it can fill this at once.

## Add to `public.public_bonds` (same nightly export, same row per ISIN)

| Column | Type | Meaning |
|---|---|---|
| `clean_price` | numeric | latest clean price, per 100 nominal, in the bond's currency |
| `price_as_of` | timestamptz | when that price was quoted |

- Leave a column empty (null) when it is not known; do not send 0.
- Use the same price source as `gross_ytm`, so price and yield agree.
- A bond with less than a year of prices: high/low over the days you have.

## Nothing else changes

The site reads these columns as soon as they appear (`lib/bonds.ts`); no deploy is needed on the 10BONDS side.
The page measures each drop from the highest price in its own history and shows no high column. The read-only login (`tenbonds_reader`) and the separation from LM op model stay as they are.
