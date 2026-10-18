import type { PublicBond } from "../types";
import { issuerKey } from "../ranking";

// Government or company? The bond copy has no sector column, so this reads the issuer's name.
// Only exact government names count as sovereign ("Air France-KLM" is a company, not France).
// Agencies, supranationals and regions are neither, so they never land in "corporate" pages.

const SOVEREIGN: Record<"IT" | "FR" | "DE", RegExp> = {
  IT: /^(the )?(republic of italy|italian republic|repubblica italiana|italy|italia)( (government|treasury|btp))?$|^buoni (poliennali|ordinari) del tesoro|^btp( |$)/,
  FR: /^(the )?(french republic|republique francaise|france|government of france)( (government|treasury|oat))?$|^(agence france tresor|obligations assimilables du tresor|oat( |$))/,
  DE: /^(the )?(federal republic of germany|bundesrepublik deutschland|germany|deutschland)( (government|treasury|bund|finanzagentur))?$|^(bundesrepublik|bundesschatzanweisung|bundesobligation|bundesanleihe)/,
};

const OTHER_STATES = /^(the )?(republic of |kingdom of |federal republic of |grand duchy of )?(austria|belgium|bulgaria|croatia|cyprus|czech republic|denmark|estonia|finland|greece|hellenic republic|hungary|ireland|latvia|lithuania|luxembourg|malta|netherlands|poland|portugal|romania|slovakia|slovak republic|slovenia|spain|sweden|norway|switzerland|united kingdom|united states|iceland|israel|mexico|chile|indonesia|philippines|turkey|japan|canada|australia|new zealand)( (government|treasury))?$/;
const AGENCIES = /\b(european union|european investment bank|eib|bei|european stability mechanism|esm|efsf|european financial stability|kfw|kreditanstalt|landwirtschaftliche rentenbank|rentenbank|nrw bank|l bank|council of europe|world bank|ibrd|international bank for reconstruction|eurofima|nordic investment bank|asian development bank|african development bank|inter american development bank|cassa depositi|cdp|bpifrance|cades|caisse d amortissement|unedic|sncf reseau|societe du grand paris|agence francaise de developpement|caisse des depots|land |freistaat|region |regione |comunidad|city of|ville de|stadt |municipality|province of|provincia)\b/;

export type IssuerClass = "sovereign" | "agency" | "corporate";

/** Sovereign country code ("IT", "FR", "DE") when the issuer is one of our three governments. */
export function sovereignOf(b: Pick<PublicBond, "issuer" | "isin" | "country">): "IT" | "FR" | "DE" | null {
  const k = issuerKey(b);
  for (const c of ["IT", "FR", "DE"] as const) if (SOVEREIGN[c].test(k) && (!b.country || b.country === c)) return c;
  return null;
}

export function issuerClass(b: Pick<PublicBond, "issuer" | "isin" | "country">): IssuerClass {
  const k = issuerKey(b);
  if (sovereignOf(b) || OTHER_STATES.test(k)) return "sovereign";
  if (AGENCIES.test(` ${k} `)) return "agency";
  return "corporate";
}
