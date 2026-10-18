import type { KcSection, Potential } from "./knowledge";
import type { Locale } from "./locales";

// Starting target keywords per market, from Livio's briefs. Volumes are only set where Livio's research cited a
// third-party figure, always with its source and date; everything else (volume, difficulty, ranking) stays empty
// until imported from a keyword tool or read from Search Console.

type Seed = {
  market: Locale; keyword: string; intent: "informational" | "commercial"; landingPath: string | null;
  section?: KcSection; potential?: Potential; volume?: number; volumeSource?: string;
};

const it = (keyword: string, landingPath: string | null, intent: Seed["intent"] = "informational"): Seed => ({ market: "it", keyword, intent, landingPath });
const fr = (keyword: string, landingPath: string | null, intent: Seed["intent"] = "informational"): Seed => ({ market: "fr", keyword, intent, landingPath });
const de = (keyword: string, landingPath: string | null, intent: Seed["intent"] = "informational"): Seed => ({ market: "de", keyword, intent, landingPath });

const BRIEF = "2026-10-18";
/** Volumes cited in Livio's SEO market research brief (third-party estimates, not Google data). */
const vol = (volume: number, source: string) => ({ volume, volumeSource: `${source} — third-party estimate, cited in research brief ${BRIEF}` });

const BASE: Seed[] = [
  it("migliori obbligazioni 2026", "/it/obbligazioni/migliori-obbligazioni", "commercial"),
  it("obbligazioni alto rendimento", "/it/guide/obbligazioni-alto-rendimento", "commercial"),
  it("obbligazioni rendimento 5%", "/it/obbligazioni/rendimento-5-percento", "commercial"),
  it("migliori obbligazioni a 5 anni", "/it/obbligazioni/duration-5-anni", "commercial"),
  it("obbligazioni corporate euro", "/it/obbligazioni/corporate", "commercial"),
  it("come calcolare rendimento a scadenza", "/it/guide/rendimento-a-scadenza"),
  it("duration obbligazioni", "/it/guide/duration-obbligazioni"),
  it("obbligazioni investment grade", "/it/guide/obbligazioni-investment-grade"),
  it("obbligazioni scadenza 2031", "/it/obbligazioni/scadenza-2031", "commercial"),
  it("rischio credito obbligazioni", "/it/guide/rischio-di-credito-obbligazioni"),
  it("btp", "/it/guide/btp"),
  it("btp o obbligazioni corporate", "/it/guide/btp-o-obbligazioni-corporate"),
  fr("meilleures obligations 2026", "/fr/obligations/meilleures-obligations", "commercial"),
  fr("oat rendement", "/fr/guides/oat-obligations-etat-francaises"),
  fr("obligations d'état ou obligations d'entreprise", "/fr/guides/obligations-etat-ou-entreprise"),
  fr("rendement à l'échéance", "/fr/guides/rendement-a-l-echeance"),
  fr("risque de crédit obligation", "/fr/guides/risque-de-credit-obligataire"),
  fr("obligations échéance 5 ans", "/fr/obligations/duration-5-ans", "commercial"),
  fr("obligations haut rendement", "/fr/obligations/haut-rendement", "commercial"),
  fr("obligations d'entreprise", "/fr/obligations/obligations-entreprise", "commercial"),
  fr("oat 10 ans", "/fr/obligations/oat"),
  fr("comment comparer rendement et risque obligataire", "/fr/guides/obligations-etat-ou-entreprise"),
  de("beste anleihen 2026", "/de/anleihen/beste-anleihen", "commercial"),
  de("bundesanleihen", "/de/ratgeber/bundesanleihen"),
  de("bundesanleihen rendite", "/de/anleihen/bundesanleihen"),
  de("staatsanleihen oder unternehmensanleihen", "/de/ratgeber/staatsanleihen-oder-unternehmensanleihen"),
  de("anleihen 5 jahre laufzeit", "/de/anleihen/duration-5-jahre", "commercial"),
  de("rendite bis fälligkeit", "/de/ratgeber/rendite-bis-faelligkeit"),
  de("kreditrisiko anleihen", "/de/ratgeber/kreditrisiko-anleihen"),
  de("anleiherenditen und kreditrisiken vergleichen", "/de/ratgeber/kreditrisiko-anleihen"),
  de("unternehmensanleihen", "/de/anleihen/unternehmensanleihen", "commercial"),
  de("hochzinsanleihen", "/de/anleihen/hochzinsanleihen", "commercial"),
];

/** Research brief additions: first-wave pages and keywords with cited volumes. */
const RESEARCH: Seed[] = [
  { ...it("rendimenti btp", "/it/obbligazioni/btp"), section: "government", potential: "high", ...vol(27_100, "Semrush, Sep 2026") },
  { ...it("btp rendimento netto", "/it/calcolatori/rendimento-netto-btp"), section: "calculators", potential: "high", ...vol(22_200, "Semrush, Sep 2026") },
  { ...it("migliori broker obbligazioni", "/it/broker-obbligazioni", "commercial"), section: "brokers", potential: "medium" },
  { ...it("btp o etf obbligazionari", "/it/guide/btp-o-etf-obbligazionari"), section: "academy", potential: "medium" },
  { ...fr("rendement oat 10 ans", "/fr/obligations/oat"), section: "government", potential: "high" },
  { ...fr("calcul rendement actuariel", "/fr/calculateurs/rendement-actuariel"), section: "calculators", potential: "high" },
  { ...fr("meilleur courtier obligations", "/fr/courtiers-obligations", "commercial"), section: "brokers", potential: "medium" },
  { ...fr("obligations ou etf", "/fr/guides/obligations-ou-etf"), section: "academy", potential: "medium" },
  { ...fr("acheter des oat", "/fr/guides/acheter-des-oat", "commercial"), section: "government", potential: "high" },
  { ...de("anleihen", "/de/anleihen/beste-anleihen", "commercial"), section: "best", potential: "high", ...vol(22_200, "Performance Suite, 2026") },
  { ...de("anleihen kaufen", "/de/anleihen/beste-anleihen", "commercial"), section: "best", potential: "high", ...vol(1_900, "Performance Suite, 2026") },
  { ...de("bundesanleihen zinsen", "/de/anleihen/bundesanleihen"), section: "government", potential: "high", ...vol(1_900, "Research brief (approx., tool not named)") },
  { ...de("anleihen rendite berechnen", "/de/rechner/anleihen-rendite-berechnen"), section: "calculators", potential: "high" },
  { ...de("anleihen broker", "/de/anleihen-broker", "commercial"), section: "brokers", potential: "medium" },
  { ...de("anleihen oder festgeld", "/de/ratgeber/anleihen-oder-festgeld"), section: "academy", potential: "medium" },
  { ...de("anleihen etf oder einzelanleihen", "/de/ratgeber/anleihen-etf-oder-einzelanleihen"), section: "academy", potential: "medium" },
];

/** Section and potential for base keywords that the brief places in the Knowledge Center. */
const EXTRA: Record<string, Partial<Seed>> = {
  "it:migliori obbligazioni 2026": { section: "best", potential: "high" },
  "it:obbligazioni scadenza 2031": { section: "best", potential: "high" },
  "it:btp": { section: "government" },
  "it:duration obbligazioni": { section: "academy" },
  "it:rischio credito obbligazioni": { section: "risk" },
  "it:obbligazioni investment grade": { section: "risk" },
  "fr:meilleures obligations 2026": { section: "best", potential: "high" },
  "fr:oat rendement": { section: "government" },
  "fr:risque de crédit obligation": { section: "risk" },
  "de:beste anleihen 2026": { section: "best", potential: "high" },
  "de:bundesanleihen": { section: "government" },
  "de:bundesanleihen rendite": { section: "government", potential: "high", ...vol(1_600, "Research brief (approx., tool not named)") },
  "de:kreditrisiko anleihen": { section: "risk" },
};

export const SEED_KEYWORDS: Seed[] = [...BASE.map((k) => ({ ...k, ...EXTRA[`${k.market}:${k.keyword}`] })), ...RESEARCH];
