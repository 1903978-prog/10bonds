import { groupInfo } from "./issuerGroups";
import { issuerCountryOf } from "./issuerCountries";
import { SECTORS, UNCLASSIFIED } from "./sectors";

// Country and industry of each bond (the owner, 27/10/2026), with the source of every value, never a guess.
//
// Country (first hit wins):
//   1. "feed"        public_bonds.issuer_country: the issuer's country of risk / domicile, filled by lm-op-model (ISO 3166 code or English name).
//   2. "feed-legacy" public_bonds.country as the copy always carried it (same cleaning).
//   3. "table"       the hand-made issuer table lib/issuerCountries.ts (owner-confirmed).
//   4. "isin-prefix" the first two letters of the ISIN, ONLY for government and agency bonds (sector "Government & agencies"
//                    by lib/issuerGroups.ts or issuer_type government/agency in the feed) and only when the prefix is a real country
//                    (not XS/EU/other international codes). Never for companies: a company's ISIN prefix is where it was
//                    registered for issuing, often not where it operates (a French group issuing under XS or LU).
// Industry (first hit wins):
//   1. "table"       the 10bonds issuer-group table (lib/issuerGroups.ts, sectors-v1).
//   2. "feed"        public_bonds.issuer_sector when it is one of the twelve sectors of lib/sectors.ts.
// Anything else stays unclassified and is listed in /admin/classification so it gets a source, not an invention.

export type ClassSource = "feed" | "feed-legacy" | "isin-prefix" | "table" | null;
export type Classification = { country: string | null; countrySource: ClassSource; sector: string | null; sectorSource: ClassSource };

const NAMES = new Intl.DisplayNames(["en"], { type: "region" });

// ISIN prefixes that are not a country (international, depository and temporary codes).
const NOT_A_COUNTRY = new Set(["XS", "EU", "XA", "XB", "XC", "XD", "XF", "XK", "QS", "QW", "QZ", "CS", "ZZ", "NA", "OO", "AA"]);
const GOV_TYPES = /^(gov|government|sovereign|agency|municipal|regional)/i;

/** English country name from an ISO code or a name; null when it is neither (never a guess). */
export function countryName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v || /^(n\/?a|none|null|unknown|-|–|nan|unclassified|not classified)$/i.test(v)) return null;
  if (/^[A-Za-z]{2}$/.test(v)) {
    const code = v.toUpperCase();
    if (NOT_A_COUNTRY.has(code)) return null;
    try { const n = NAMES.of(code); return n && n !== code ? n : null; } catch { return null; }
  }
  return v;
}

const sectorOfFeed = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return SECTORS.find((s) => s.toLowerCase() === v) ?? null;
};

/** Classification of one `public_bonds` row (raw database values) as the site uses it. */
export function classifyRow(r: Record<string, unknown>, issuer: string | null): Classification {
  const isin = String(r.isin ?? "").trim().toUpperCase();
  const table = groupInfo({ issuer, isin }).sector;
  const fedSector = sectorOfFeed(r.issuer_sector);
  const sector = table ?? fedSector;
  const sectorSource: ClassSource = table ? "table" : fedSector ? "feed" : null;

  let country = countryName(r.issuer_country);
  let countrySource: ClassSource = country ? "feed" : null;
  if (!country) { country = countryName(r.country); countrySource = country ? "feed-legacy" : null; }
  if (!country) { country = countryName(issuerCountryOf(issuer)); countrySource = country ? "table" : null; }
  const government = sector === "Government & agencies" || (typeof r.issuer_type === "string" && GOV_TYPES.test(r.issuer_type.trim()));
  if (!country && government) { country = countryName(isin.slice(0, 2)); countrySource = country ? "isin-prefix" : null; }
  return { country, countrySource, sector: sector ?? null, sectorSource };
}

export type Coverage = { total: number; country: number; sector: number; both: number; countryBySource: Record<string, number>; sectorBySource: Record<string, number> };

export function coverage(list: Classification[]): Coverage {
  const c: Coverage = { total: list.length, country: 0, sector: 0, both: 0, countryBySource: {}, sectorBySource: {} };
  for (const x of list) {
    if (x.country) { c.country++; c.countryBySource[x.countrySource!] = (c.countryBySource[x.countrySource!] ?? 0) + 1; }
    if (x.sector) { c.sector++; c.sectorBySource[x.sectorSource!] = (c.sectorBySource[x.sectorSource!] ?? 0) + 1; }
    if (x.country && x.sector) c.both++;
  }
  return c;
}

export { UNCLASSIFIED };
