# Country and industry of each bond: what LM op model has to do

Why (the owner, 27/10/2026): in the diversification bars about 80% of the bonds show "Not classified". The copy carries one
loose `country` column and no industry. 10BONDS has a hand-made issuer table (`lib/issuerGroups.ts`, 12 sectors) that covers
only the issuers someone listed. The best fix is one governed source in the master data, copied to `public_bonds` every night.

## The rule (same for every bond)

Classify the **issuer**, not the bond: one row per issuer (or issuer group), copied to each of its bonds.

- **Country = country of risk of the issuer** (where the group is headquartered / earns most, as ISO 3166-1 alpha-2, e.g. `DE`).
  For a captive finance arm or special-purpose vehicle use the parent's country. For governments and agencies: the state itself.
  Supranationals (EIB, EU, World Bank...) have **no country**: leave it empty and set `issuer_type = 'supranational'`.
- **Industry = one of exactly these 12 sectors** (the 10BONDS list, sectors-v1): Financials, Government & agencies, Industrials,
  Consumer discretionary, Consumer staples, Health care, Technology, Communication services, Utilities, Energy, Materials,
  Real estate. Banks and insurers are both "Financials". (GICS-style, so it can be mapped from a GICS or ICB code if you hold one.)
- **Never guess.** If there is no source, leave the fields empty. The ISIN prefix is **not** a country of risk for companies and
  must not be used for them. (The site itself uses the prefix only for government bonds, and labels it so.)

## Columns to add to the master table and to the nightly `public_bonds` copy

| Column | Type | Meaning |
|---|---|---|
| `issuer_country` | text | ISO alpha-2 country of risk of the issuer, empty if unknown |
| `issuer_sector` | text | one of the 12 sector names above, spelled exactly, empty if unknown |
| `issuer_type` | text | `corporate`, `financial`, `government`, `agency`, `supranational`, `municipal` (government/agency/municipal lets the site use the ISIN prefix when the country is empty) |
| `classification_source` | text | where it came from, e.g. `LEI/GLEIF`, `Bloomberg`, `issuer prospectus`, `manual` |
| `classification_as_of` | date | when it was set or last checked |

Nothing else changes; keep the old `country` column as it is. The site reads the new columns when they exist (missing
columns are fine) and shows "Not classified" only for bonds still empty.

## Where the values can come from (best first)

1. The issuer's **LEI** record (GLEIF is free): legal address country, and parent (ultimate parent country via Level 2 data).
2. A data supplier field you already hold (country of risk, industry code mapped to the 12 sectors).
3. The issuer's prospectus / annual report, entered once per issuer by hand.
Fill the issuers with most bonds first. The site lists the missing ones: admin page **/admin/classification**, with a CSV
download (`unclassified-issuers.csv`: issuer, bonds, example ISIN, what is missing) to work from.

## Nightly job

1. Keep an `issuer_classification` table (issuer key, country, sector, type, source, as_of) in the master; join it to every
   bond by issuer; copy the five columns into `public_bonds`.
2. New issuers appearing in the bond list get empty rows (so the gap is visible), never a default.
3. Re-check an issuer at least once a year (`classification_as_of`).

## Check

After the next copy: the admin page shows the share of bonds with a country and an industry, and where each came from.
The "Classification coverage" GitHub workflow prints the same numbers straight from the table.
