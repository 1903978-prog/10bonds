import { issuerKey } from "./ranking";

// Country of risk by issuer, entered by hand (the owner confirmed the list, 27/10/2026). Used only when the feed has no country.
// Supranationals (EIB, EU, EFSF, IBRD, IDB, ADB) have no country and are left out on purpose.
const TABLE: Record<string, string[]> = {
  US: ["United States", "AT&T", "Verizon", "FedEx", "Union Pacific", "PepsiCo", "Unitedhealth", "Mcdonald's", "Con Ed of NY", "T-Mobile USA", "Energy Transfer", "Florida P & L", "ONEOK", "FEDERAL FARM CREDIT", "Goldman Sachs", "Lowe's", "Pacific Gas & Electric Company", "Public SVC E&G", "Boeing", "Philip Morris", "Southern Ca", "IBM", "Apple", "GM Finance", "Home Depot", "Eli Lilly", "Norfolk Southern", "Rtx Corp", "American Tower", "Burlington Nrth", "Ford Motor Cred", "Intel", "TWDC EntpS", "Amgen", "Comcast", "Bristol-Myers", "Enterprise Prod", "Merck & Co", "Elevance Health", "ConocoPhillips", "HCA", "John Deere Cap", "Lockheed", "Virginia E&P Co", "Johnson&Johnson", "Oncor Elec Dlvry"],
  DE: ["DZ BANK AG Deutsche Zentral-Genossenschaftsbank", "DZ Bank", "Landesbank Hessen-Thüringen Girozentrale", "Helaba", "KfW", "Landesbank Baden Wuert"],
  FR: ["Credit Agricole", "Societe Generale", "Engie", "Orange S.A."],
  IT: ["Intesa Sanpaolo"],
  JP: ["Toyota Credit", "MUFG", "SMFG", "Mizuho"],
  KR: ["Hyundai CAP"],
  GB: ["Shell International Finance"],
  IE: ["Medtronic Inc"],
  FI: ["Finland"],
  RO: ["Romania"], ID: ["Indonesia"], SA: ["Saudi Arabia"], MX: ["Mexico"], HU: ["Hungary"], PH: ["Philippines"], PL: ["Poland"], QA: ["Qatar"], AE: ["Abu Dhabi"],
};

const BY_KEY = new Map<string, string>();
for (const [code, names] of Object.entries(TABLE)) for (const n of names) BY_KEY.set(issuerKey({ issuer: n, isin: "" }), code);

/** ISO country code of an issuer from the hand-made table, or null. */
export const issuerCountryOf = (issuer: string | null): string | null => (issuer ? BY_KEY.get(issuerKey({ issuer, isin: "" })) ?? null : null);
