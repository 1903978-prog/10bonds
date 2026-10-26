import type { KcSection, Potential } from "./knowledge";
import type { SeoMarket } from "./input";

// Starting target keywords per market, from the owner's briefs. Volumes are only set where the owner's research cited a
// third-party figure, always with its source and date; everything else (volume, difficulty, ranking) stays empty
// until imported from a keyword tool or read from Search Console.

type Seed = {
  market: SeoMarket; keyword: string; intent: "informational" | "commercial"; landingPath: string | null;
  section?: KcSection; potential?: Potential; volume?: number; volumeSource?: string;
};

const it = (keyword: string, landingPath: string | null, intent: Seed["intent"] = "informational"): Seed => ({ market: "it", keyword, intent, landingPath });
const fr = (keyword: string, landingPath: string | null, intent: Seed["intent"] = "informational"): Seed => ({ market: "fr", keyword, intent, landingPath });
const de = (keyword: string, landingPath: string | null, intent: Seed["intent"] = "informational"): Seed => ({ market: "de", keyword, intent, landingPath });

const us = (keyword: string, landingPath: string | null, intent: Seed["intent"] = "informational"): Seed => ({ market: "us", keyword, intent, landingPath });
const uk = (keyword: string, landingPath: string | null, intent: Seed["intent"] = "informational"): Seed => ({ market: "uk", keyword, intent, landingPath });

const BRIEF = "2026-10-18";
/** Volumes cited in the owner's SEO market research brief (third-party estimates, not Google data). */
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
  fr("oat rendement", "/fr/guides/oat-obligations-etat"),
  fr("obligations d'état ou obligations d'entreprise", "/fr/guides/obligations-etat-ou-entreprise"),
  fr("rendement à l'échéance", "/fr/guides/calcul-rendement-obligation"),
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
  { ...fr("obligations ou etf", "/fr/guides/obligations-ou-etf-obligataires"), section: "academy", potential: "medium" },
  { ...fr("acheter des oat", "/fr/guides/acheter-des-oat", "commercial"), section: "government", potential: "high" },
  { ...de("anleihen", "/de/anleihen/beste-anleihen", "commercial"), section: "best", potential: "high", ...vol(22_200, "Performance Suite, 2026") },
  { ...de("anleihen kaufen", "/de/anleihen/beste-anleihen", "commercial"), section: "best", potential: "high", ...vol(1_900, "Performance Suite, 2026") },
  { ...de("bundesanleihen zinsen", "/de/anleihen/bundesanleihen"), section: "government", potential: "high", ...vol(1_900, "Research brief (approx., tool not named)") },
  { ...de("anleihen rendite berechnen", "/de/rechner/anleihen-rendite-berechnen"), section: "calculators", potential: "high" },
  { ...de("anleihen broker", "/de/anleihen-broker", "commercial"), section: "brokers", potential: "medium" },
  { ...de("anleihen oder festgeld", "/de/ratgeber/anleihen-oder-festgeld"), section: "academy", potential: "medium" },
  { ...de("anleihen etf oder einzelanleihen", "/de/ratgeber/anleihen-etf-oder-einzelanleihen"), section: "academy", potential: "medium" },
];

/** Google suggestions for "migliori btp" the owner asked to track (19 Oct 2026). No volume until a tool gives one. */
const BTP_SUGGESTIONS: Seed[] = [
  it("migliori btp", "/it/obbligazioni/btp", "commercial"),
  it("migliori btp da comprare oggi sotto 100 e quali da acquistare", "/it/obbligazioni/btp", "commercial"),
  it("migliori btp da comprare", "/it/obbligazioni/btp", "commercial"),
  it("migliori btp a 5 anni da comprare oggi", "/it/obbligazioni/btp", "commercial"),
  it("migliori btp europei", "/it/calcolatori/curva-rendimenti-titoli-di-stato", "commercial"),
  it("migliori btp scadenza 2028", "/it/obbligazioni/scadenza-2028", "commercial"),
  it("migliori btp da acquistare", "/it/obbligazioni/btp", "commercial"),
  it("migliori btp scadenza 2027", "/it/obbligazioni/scadenza-2027", "commercial"),
  it("migliori btp a 1 anno", "/it/obbligazioni/btp", "commercial"),
  it("migliori btp scadenza 3 anni", "/it/obbligazioni/btp", "commercial"),
].map((k) => ({ ...k, section: "government" as const }));

/** US and UK searches (research 19 Oct 2026). Volumes only where a public Google Ads figure was found (US); UK volumes
 *  stay empty until a keyword tool or Search Console gives them. Pages are the English Knowledge guides, or none yet. */
const USUK: Seed[] = [
  { ...us("i bonds", "/knowledge/i-bonds"), volume: 22_200, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/i-bonds", potential: "high" },
  { ...us("series i bonds", "/knowledge/i-bonds"), volume: 5_400, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/i-bonds", potential: "high" },
  { ...us("bond yields", "/knowledge/yield-to-maturity"), volume: 22_200, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/government-bonds-rates", potential: "high" },
  { ...us("treasury bond rates", "/knowledge/treasury-bills-notes-bonds"), volume: 14_800, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/government-bonds-rates", potential: "high" },
  { ...us("treasury bills vs notes vs bonds", "/knowledge/treasury-bills-notes-bonds") },
  { ...us("are treasury bonds tax free", "/knowledge/treasury-bills-notes-bonds") },
  { ...us("10 year treasury yield", null) },
  { ...us("treasury yield curve", null) },
  { ...us("government bonds rates", "/knowledge/treasury-bills-notes-bonds"), volume: 3_600, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/government-bonds-rates" },
  { ...us("high yield bonds", "/knowledge/high-yield-bonds"), volume: 9_900, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/high-yield-corporate-bonds", potential: "high" },
  { ...us("investment grade vs high yield bonds", "/knowledge/investment-grade-bonds") },
  { ...us("bond ratings", "/knowledge/bond-credit-risk"), volume: 4_400, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/bond-ratings" },
  { ...us("bond default rates by rating", "/knowledge/bond-default-rates-by-rating") },
  { ...us("municipal bonds", "/knowledge/municipal-bonds-vs-treasuries") },
  { ...us("municipal bonds vs treasury bonds", "/knowledge/municipal-bonds-vs-treasuries") },
  { ...us("corporate bonds vs treasury bonds", "/knowledge/corporate-bonds-vs-treasuries") },
  { ...us("tips vs treasury bonds", "/knowledge/tips-vs-treasury-bonds") },
  { ...us("t-bills vs cds", "/knowledge/how-to-buy-treasury-bills") },
  { ...us("bond etfs vs individual bonds", "/knowledge/government-bonds-or-bond-etfs") },
  { ...us("how to buy treasury bonds", "/knowledge/how-to-buy-treasury-bills", "commercial"), volume: 4_400, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/how-to-buy-treasury-bonds" },
  { ...us("how to buy t-bills", "/knowledge/how-to-buy-treasury-bills", "commercial"), volume: 8_100, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/how-to-buy-treasury-bonds", potential: "high" },
  { ...us("how to buy bonds", "/knowledge/how-to-compare-bonds-2026", "commercial"), volume: 6_600, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/how-to-buy-bonds", potential: "high" },
  { ...us("how to buy corporate bonds", "/knowledge/how-to-compare-bonds-2026", "commercial") },
  { ...us("best bonds to buy", "/knowledge/how-to-compare-bonds-2026", "commercial"), volume: 3_600, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/best-bonds-to-buy" },
  { ...us("best bonds to invest in", "/knowledge/how-to-compare-bonds-2026", "commercial"), volume: 1_900, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/best-bonds-to-buy" },
  { ...us("highest yield corporate bonds", "/knowledge/high-yield-bonds", "commercial"), volume: 1_300, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/highest-corporate-bond-yields" },
  { ...us("best bond etfs", "/knowledge/government-bonds-or-bond-etfs", "commercial"), volume: 6_600, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/exchange-traded-funds-bonds", potential: "high" },
  { ...us("best brokers for bonds", null, "commercial") },
  { ...us("bond calculator", "/knowledge/bond-yield-calculator", "commercial"), section: "calculators", volume: 8_100, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/bond-calculator", potential: "high" },
  { ...us("yield to maturity calculator", "/knowledge/bond-yield-calculator", "commercial"), section: "calculators", volume: 2_400, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/bond-yield-calculator" },
  { ...us("bond yield calculator", "/knowledge/bond-yield-calculator", "commercial"), section: "calculators", volume: 1_600, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/bond-yield-calculator" },
  { ...us("i bond calculator", "/knowledge/i-bonds", "commercial"), section: "calculators", volume: 3_600, volumeSource: "seodata.dev (Google Ads API, US monthly average, Jun 2026), third-party estimate — https://www.seodata.dev/keyword/bond-calculator" },
  { ...uk("gilts", "/knowledge/uk-gilts") },
  { ...uk("what are gilts", "/knowledge/uk-gilts") },
  { ...uk("gilt yields", "/knowledge/uk-gilts") },
  { ...uk("10 year gilt yield", "/knowledge/uk-gilts") },
  { ...uk("uk yield curve", "/knowledge/uk-gilts") },
  { ...uk("gilt prices", "/knowledge/uk-gilts") },
  { ...uk("index-linked gilts", "/knowledge/uk-gilts") },
  { ...uk("gilts tax", "/knowledge/uk-gilts") },
  { ...uk("low coupon gilts", "/knowledge/uk-gilts") },
  { ...uk("premium bonds", "/knowledge/premium-bonds-vs-gilts") },
  { ...uk("premium bonds vs gilts or savings", "/knowledge/premium-bonds-vs-gilts") },
  { ...uk("uk government bonds", "/knowledge/uk-gilts") },
  { ...uk("how to buy gilts", "/knowledge/uk-gilts", "commercial") },
  { ...uk("buy gilts direct dmo", "/knowledge/uk-gilts", "commercial") },
  { ...uk("best gilts to buy", "/knowledge/uk-gilts", "commercial") },
  { ...uk("best bonds uk", "/knowledge/how-to-compare-bonds-2026", "commercial") },
  { ...uk("best bond etfs uk", "/knowledge/government-bonds-or-bond-etfs", "commercial") },
  { ...uk("corporate bonds uk", "/knowledge/government-vs-corporate-bonds", "commercial") },
  { ...uk("retail bonds uk", "/knowledge/uk-gilts", "commercial") },
  { ...uk("gilts isa", "/knowledge/uk-gilts", "commercial") },
  { ...uk("best platform to buy gilts", "/knowledge/uk-gilts", "commercial") },
  { ...uk("bond brokers uk", null, "commercial") },
  { ...uk("hargreaves lansdown gilts", null, "commercial") },
  { ...uk("gilt yield calculator", "/knowledge/bond-yield-calculator", "commercial"), section: "calculators" },
  { ...uk("gilt vs savings calculator", "/knowledge/premium-bonds-vs-gilts", "commercial"), section: "calculators" },
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

export const SEED_KEYWORDS: Seed[] = [...BASE.map((k) => ({ ...k, ...EXTRA[`${k.market}:${k.keyword}`] })), ...RESEARCH, ...BTP_SUGGESTIONS, ...USUK];
