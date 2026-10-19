# Brokers & Trading Fees

Country pages comparing what it costs to buy bonds at each broker, from official tariffs only.

| Market | Comparison | Broker profile | Methodology |
|---|---|---|---|
| Italy | `/it/broker-obbligazioni` | `/it/broker-obbligazioni/<id>` | `/it/broker-obbligazioni/metodologia` |
| France | `/fr/courtiers-obligations` | `/fr/courtiers-obligations/<id>` | `/fr/courtiers-obligations/methodologie` |
| Germany | `/de/anleihen-broker` | `/de/anleihen-broker/<id>` | `/de/anleihen-broker/methodik` |

All three markets are public (and in `sitemap.xml`) by default since 2026-10-19. The admin can hide one with **Unpublish** at `/admin/brokers`.
Until then only the admin sees it, with a preview banner.

## Data
- `lib/brokers/seed.json`: tariffs researched on 18 Oct 2026 from official price lists (source URL and quote on every fee).
  It fills the database once (`app.broker_profiles`, `app.broker_tariffs`, `app.broker_settings`); afterwards the admin edits.
- One profile per broker; one tariff per broker **and country** (the same broker can price differently in each market).
- Every edit is a **draft**. It goes live only after **Approve**. Older versions stay, with their effective dates; the
  page uses the latest published version already in force.
- Tariffs not re-checked for 30 days (configurable) are flagged in the admin and on the page. "Re-checked today" records
  a check without changing fees.

## Cost calculation (`lib/brokers/fees.ts`)
For €5,000 / €10,000 / €50,000 and four bond types (domestic government, other EU government, EUR corporate, foreign currency):
1. broker commission, 2. mandatory venue/third-party charges the tariff quantifies, 3. currency conversion (foreign-currency bonds).
- Where a broker offers several standard plans or venues, the cheapest for that order size is used; promotions and
  activity discounts are never used (promotions are shown with their end date).
- Charges a tariff mentions but does not quantify are listed, not estimated (marked `*`). Spreads are never estimated.
- A commission taken from a general exchange tariff that does not name bonds is marked `†`.
- Anything not published shows "Not publicly disclosed".

## Ranking (`lib/brokers/score.ts`)
Cost 40, bond range 20, access for residents 15, tariff transparency 15, venues 10 (weights editable in the admin).
Affiliate deals and sponsored placements are not inputs to the score (tested).

## Affiliates
Each profile has `affiliate.status`. Only `active` (a signed agreement) switches the broker link to the tracking URL,
labelled as advertising with `rel="sponsored"`. `sponsored` countries show a separate "Sponsored" box outside the comparison.
All brokers start at `none`.

## Not included (no verifiable official bond tariff on 18 Oct 2026)
Bourse Direct (tariff PDF unreadable), Crédit Agricole (regional tariffs), BNP Paribas (bonds not named, main PDF blocked),
Banca Sella (undated PDF contradicts the web page), Saxo France (two official pages conflict), Saxo Germany (no new clients),
Scalable Capital (no direct bonds in Italy/France; only two notes in Germany), onvista bank (closed), Widiba (site unreachable).
Add them in the admin once their tariffs are checked.

## Local runs without a database
`npm run dev` shows the seed pages.
