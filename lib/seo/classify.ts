import type { PublicBond } from "../types";
import { issuerKey } from "../ranking";

// Government or company? The bond copy has no sector column, so this reads the issuer's name.
// Only exact government names count as sovereign ("Air France-KLM" is a company, not France).
// Agencies, supranationals and regions are neither, so they never land in "corporate" pages.

const SOVEREIGN: Record<"IT" | "FR" | "DE", RegExp> = {
  IT: /^(the )?(republic of italy|italian republic|repubblica italiana|italy|italia)( republic( of)?)?( (government|govt|treasury|btp|oat|bund|finanzagentur|bonds?|international|notes?))*$|^buoni (poliennali|ordinari) del tesoro|^btp( |$)/,
  FR: /^(the )?(french republic|republique francaise|france|government of france)( republic( of)?)?( (government|govt|treasury|btp|oat|bund|finanzagentur|bonds?|international|notes?))*$|^(agence france tresor|obligations assimilables du tresor|oat( |$))/,
  DE: /^(the )?(federal republic of germany|bundesrepublik deutschland|germany|deutschland)( republic( of)?)?( (government|govt|treasury|btp|oat|bund|finanzagentur|bonds?|international|notes?))*$|^(bundesrepublik|bundesschatzanweisung|bundesobligation|bundesanleihe)/,
};

const OTHER_STATES = /^(the )?(republic of |kingdom of |federal republic of |grand duchy of )?(austria|belgium|bulgaria|croatia|cyprus|czech republic|denmark|estonia|finland|greece|hellenic republic|hungary|ireland|latvia|lithuania|luxembourg|malta|netherlands|poland|portugal|romania|slovakia|slovak republic|slovenia|spain|sweden|norway|switzerland|united kingdom|united states|iceland|israel|mexico|chile|indonesia|philippines|turkey|japan|canada|australia|new zealand)( republic( of)?)?( (government|govt|treasury|bonds?|international|notes?))*$/;
const AGENCIES = /\b(european union|european investment bank|eib|bei|european stability mechanism|esm|efsf|european financial stability|kfw|kreditanstalt|landwirtschaftliche rentenbank|rentenbank|nrw bank|l bank|council of europe|world bank|ibrd|international bank for reconstruction|eurofima|nordic investment bank|asian development bank|african development bank|inter american development bank|cassa depositi|cdp|bpifrance|cades|caisse d amortissement|unedic|sncf reseau|societe du grand paris|agence francaise de developpement|caisse des depots|land |freistaat|region |regione |comunidad|city of|ville de|stadt |municipality|province of|provincia)\b/;

export type IssuerClass = "sovereign" | "agency" | "corporate";

const NAMES: Record<string, string> = {
  italy: "IT", italia: "IT", france: "FR", germany: "DE", deutschland: "DE", spain: "ES", espana: "ES", austria: "AT", belgium: "BE",
  netherlands: "NL", "the netherlands": "NL", portugal: "PT", greece: "GR", ireland: "IE", finland: "FI", luxembourg: "LU", slovakia: "SK",
  slovenia: "SI", croatia: "HR", cyprus: "CY", malta: "MT", estonia: "EE", latvia: "LV", lithuania: "LT", romania: "RO", bulgaria: "BG",
  poland: "PL", hungary: "HU", "czech republic": "CZ", czechia: "CZ", denmark: "DK", sweden: "SE", norway: "NO", switzerland: "CH",
  "united kingdom": "GB", "united states": "US", usa: "US", mexico: "MX", chile: "CL", indonesia: "ID", turkey: "TR", turkiye: "TR",
};

/** ISO country code of a bond, whether the copy stores a code ("IT") or a name ("Italy"); null when unknown. */
export function countryCode(b: Pick<PublicBond, "country">): string | null {
  const c = (b.country ?? "").trim();
  if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase();
  return NAMES[c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()] ?? null;
}

/** Sovereign country code ("IT", "FR", "DE") when the issuer is one of our three governments. */
export function sovereignOf(b: Pick<PublicBond, "issuer" | "isin" | "country">): "IT" | "FR" | "DE" | null {
  const k = issuerKey(b);
  const cc = countryCode(b);
  for (const c of ["IT", "FR", "DE"] as const) if (SOVEREIGN[c].test(k) && (!cc || cc === c)) return c;
  return null;
}

export function issuerClass(b: Pick<PublicBond, "issuer" | "isin" | "country">): IssuerClass {
  const k = issuerKey(b);
  if (sovereignOf(b) || OTHER_STATES.test(k)) return "sovereign";
  if (AGENCIES.test(` ${k} `)) return "agency";
  return "corporate";
}
