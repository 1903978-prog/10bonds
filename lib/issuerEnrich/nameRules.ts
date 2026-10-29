import type { SECTORS } from "../sectors";
import { SUPRANATIONAL, isSupranational } from "../classify";

type Sector = (typeof SECTORS)[number];

// Issuer-name rules for the groups a company register does not cover (27-28/10/2026, owner: banks, insurers, utilities,
// sovereigns, supranationals). Matched on the lower-case issuer name. A rule returns a sector or null; it never guesses past its words.
// Captive finance arms count with their parent's sector (lib/issuerGroups.ts), so the captive list comes first.
const CAPTIVE: [RegExp, Sector][] = [
  [/\b(toyota|hyundai|nissan|honda|ford|gm financial|general motors|volkswagen|vw|bmw|daimler|mercedes|harley|american honda|stellantis|ally auto)\b.*\b(credit|cap|capital|financ|motor)/, "Consumer discretionary"],
  [/\b(john deere|deere|caterpillar|paccar|cnh)\b.*\b(financ|capital|credit|cap)/, "Industrials"],
];
const SOVEREIGN_OR_AGENCY = /^(united states|u\.?s\.? treasury|federal (farm credit|home loan|national mortgage|home loan mortgage)|fannie mae|freddie mac|ginnie mae|tennessee valley|private export funding|international development finance|us dept)/;
const COUNTRIES = /^(abu dhabi|albania|angola|argentina|armenia|australia|austria|azerbaijan|bahamas|bahrain|belgium|bermuda|brazil|bulgaria|canada|chile|china|colombia|costa rica|croatia|cyprus|czech|denmark|dominican|ecuador|egypt|el salvador|estonia|finland|france|georgia|germany|ghana|greece|guatemala|honduras|hong kong|hungary|iceland|india|indonesia|ireland|israel|italy|ivory coast|jamaica|japan|jordan|kazakhstan|kenya|korea|kuwait|latvia|lebanon|lithuania|luxembourg|malaysia|mexico|mongolia|morocco|netherlands|new zealand|nigeria|north macedonia|norway|oman|pakistan|panama|paraguay|peru|philippines|poland|portugal|qatar|romania|saudi arabia|senegal|serbia|singapore|slovak|slovenia|south africa|spain|sri lanka|sweden|switzerland|thailand|trinidad|tunisia|turkey|turkiye|uae|ukraine|united kingdom|uruguay|uzbekistan|vietnam|zambia)( |$)/;
const BANK = /\b(bank|bancorp|banc|banco|banca|bancshares|trust|savings|building soc|sparkasse|landesbank|hypo|bk\b|financial group|financial corp|financial services|credit union|mortgage|pfandbrief|kreditanstalt|kfw)\b/;
const INSURER = /\b(insurance|assurance|reinsurance|insur|mutual|annuity|casualty|indemnity|assicur|versicher|allianz|axa|zurich|generali|aviva|metlife|prudential|aflac|chubb|travelers|hartford|lincoln national|principal financial|unum|cigna life)\b/;
const UTILITY = /\b(electric|power|energy supply|utility|utilities|gas (&|and) electric|water|edison|e&g|p ?& ?l|con ed|ed of|duke|dominion|exelon|entergy|pacificorp|public svc|southern ca|consumers energy|ameren|xcel|eversource|nisource|sempra|enel|iberdrola|edf|engie|rwe|e\.on|eon\b|naturgy|terna|snam|red electrica|vattenfall|fortum|ørsted|orsted|national grid|centrica|sse\b|severn trent|united utilities)\b/;

/** Sector from the issuer's name, or null. Order: captive arms, sovereigns/agencies, supranationals, banks, insurers, utilities. */
export function sectorOfName(issuer: string | null | undefined): Sector | null {
  const n = (issuer ?? "").trim().toLowerCase();
  if (!n) return null;
  for (const [re, s] of CAPTIVE) if (re.test(n)) return s;
  if (isSupranational(issuer ?? null)) return "Government & agencies";
  if (SOVEREIGN_OR_AGENCY.test(n) || COUNTRIES.test(n)) return "Government & agencies";
  if (INSURER.test(n) && !/\b(bank|trust)\b/.test(n)) return "Financials";
  if (BANK.test(n)) return "Financials";
  if (UTILITY.test(n)) return "Utilities";
  return null;
}
export { SUPRANATIONAL };
