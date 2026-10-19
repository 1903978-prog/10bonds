import type { Locale } from "./locales";

// Content quality of each keyword's landing page against the top 3 Google results, 0-10 (5 = on par with their
// average, 10 = clearly better than all three), with depth, relevance and richness sub-scores. Checked by hand
// with web searches and reading the competing pages; the date of each check is kept. Search results came from
// a non-local search, so they approximate google.it / .fr / .de. Re-check when a page changes.

export type ContentScore = {
  market: Locale; keyword: string; landingPath: string; checkedAt: string;
  status: "scored" | "gap" | "draft" | "missing";
  score: number | null; depth: number | null; relevance: number | null; richness: number | null; note: string;
  competitors: { url: string; title: string }[];
};

export const CONTENT_SCORES: ContentScore[] = [
 {
  "market": "de",
  "keyword": "beste anleihen 2026",
  "landingPath": "/de/anleihen/beste-anleihen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 4,
  "relevance": 8,
  "richness": 8,
  "note": "Only result naming concrete bonds with live yields and risk; rivals are market outlooks and fund rankings. Explanatory text is thin.",
  "competitors": [
   {
    "url": "https://www.dasinvestment.com/anleihen-2026-zinswende-realzins/",
    "title": "Anleihen"
   },
   {
    "url": "https://e-fundresearch.com/funds/artikel/28913-ranking-die-besten-anleihefonds-etfs-2026",
    "title": "Ranking: Die besten Anleihefonds & ETFs 2026"
   },
   {
    "url": "https://www.dasinvestment.com/anleihen-risiken-chancen-2026/",
    "title": "Anleihen: Wo aktuell Chancen und Risiken liegen"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "bundesanleihen",
  "landingPath": "/de/ratgeber/bundesanleihen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 5,
  "depth": 5,
  "relevance": 8,
  "richness": 3,
  "note": "Clear Bund/Bobl/Schatz explainer, but no current yields or tables (Deltavalue has both) and the linked Bund yield page is not live.",
  "competitors": [
   {
    "url": "https://www.verivox.de/geldanlage/themen/bundesanleihen/",
    "title": "Bundesanleihen: Wertpapiere für sicherheitsbewusste Anleger"
   },
   {
    "url": "https://www.deltavalue.de/bundesanleihen/",
    "title": "Bundesanleihen - Definition & Erklärung"
   },
   {
    "url": "https://www.finanzen.net/anleihen/wissen/bundesanleihen",
    "title": "Bundesanleihen"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "bundesanleihen rendite",
  "landingPath": "/de/anleihen/bundesanleihen",
  "checkedAt": "2026-10-19",
  "status": "missing",
  "score": null,
  "depth": null,
  "relevance": null,
  "richness": null,
  "note": "Page not live in production (fetch fails). Rivals show yields by maturity and history charts (Hypochart).",
  "competitors": [
   {
    "url": "https://www.finanztip.de/anleihen/bundesanleihen/",
    "title": "Was sind Bundesanleihen? Zinsen & Rendite"
   },
   {
    "url": "https://www.hypochart.de/zinsentwicklung/bundesanleihen",
    "title": "Bundesanleihen Rendite Entwicklung inkl. Charts & Analyse"
   },
   {
    "url": "https://www.raisin.com/de-de/geldanlage/anleihen/bundesanleihen/",
    "title": "Bundesanleihen als Geldanlage"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "staatsanleihen oder unternehmensanleihen",
  "landingPath": "/de/ratgeber/staatsanleihen-oder-unternehmensanleihen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 5,
  "depth": 4,
  "relevance": 8,
  "richness": 5,
  "note": "Answers the either/or directly, but 420 words vs 1,500-3,000-word rivals; duplicated 'Aktuelle Daten' heading.",
  "competitors": [
   {
    "url": "https://www.mintos.com/blog/unternehmensanleihen-rendite-risiko-und-ruckzahlung/",
    "title": "Unternehmensanleihen: Rendite, Risiko und Rückzahlung erklärt"
   },
   {
    "url": "https://www.finanzfluss.de/geldanlage/anleihen/",
    "title": "Anleihen: Lohnen sie sich? - Finanzfluss"
   },
   {
    "url": "https://www.raisin.com/de-de/geldanlage/anleihen/unternehmensanleihen/",
    "title": "Unternehmensanleihen"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "anleihen 5 jahre laufzeit",
  "landingPath": "/de/anleihen/duration-5-jahre",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 3,
  "relevance": 6,
  "richness": 7,
  "note": "Live list of ~5-year bonds beats dated 2022-2023 articles, but page is about duration not maturity and has little text.",
  "competitors": [
   {
    "url": "https://www.raisin.com/de-de/geldanlage/anleihen/bundesanleihen/",
    "title": "Bundesanleihen als Geldanlage"
   },
   {
    "url": "https://www.handelsblatt.com/finanzen/maerkte/anleihen/zinspapiere-wie-funktionieren-anleihen-wichtige-fragen-und-antworten/28759710.html",
    "title": "Anleihen: Die wichtigsten Antworten zu Zinspapieren"
   },
   {
    "url": "https://blog.de.erste-am.com/investieren-in-anleihen-der-charme-von-kurzen-laufzeiten/",
    "title": "Investieren in Anleihen"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "rendite bis fälligkeit",
  "landingPath": "/de/ratgeber/rendite-bis-faelligkeit",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 7,
  "relevance": 8,
  "richness": 6,
  "note": "Formula, worked example and gross/net beat a video, a broker FAQ and a generic Wikipedia page. Could embed the calculator.",
  "competitors": [
   {
    "url": "https://www.jove.com/de/business-education/v/18525/calculating-the-yield-to-maturity",
    "title": "Serie: Berechnung der Rendite bis zur Fälligkeit - Konzept"
   },
   {
    "url": "https://support.traderepublic.com/de-lu/1612-Was-sind-Anleihen",
    "title": "Was sind Anleihen?"
   },
   {
    "url": "https://de.wikipedia.org/wiki/Rendite",
    "title": "Rendite"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "kreditrisiko anleihen",
  "landingPath": "/de/ratgeber/kreditrisiko-anleihen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 6,
  "relevance": 8,
  "richness": 6,
  "note": "Covers rating, spread, recovery and diversification; rivals are ~500-word lexicon entries without spreads. No rating table or real examples.",
  "competitors": [
   {
    "url": "https://www.wienerborse.at/wissen/finanzinstrumente/anleihen/ertrag-und-risiko/",
    "title": "Anleihen: Ertrag und Risiko • Wiener Börse"
   },
   {
    "url": "https://www.finanzen.net/lexikon/boersenlexikon/emittentenrisiko_bei_anleihen",
    "title": "Emittentenrisiko Anleihen"
   },
   {
    "url": "https://de.wikipedia.org/wiki/Kreditrisiko",
    "title": "Kreditrisiko"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "anleiherenditen und kreditrisiken vergleichen",
  "landingPath": "/de/ratgeber/kreditrisiko-anleihen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 5,
  "relevance": 7,
  "richness": 6,
  "note": "Has a dedicated yield-vs-risk section and live data links; Swissquote and Raisin are longer with more examples.",
  "competitors": [
   {
    "url": "https://www.swissquote.com/de-ch/private/inspire/blog/markets-instruments/understanding-bonds-and-yields-part-i",
    "title": "Obligationen und Renditen verstehen (Teil I)"
   },
   {
    "url": "https://www.wienerborse.at/wissen/finanzinstrumente/anleihen/ertrag-und-risiko/",
    "title": "Anleihen: Ertrag und Risiko • Wiener Börse"
   },
   {
    "url": "https://www.raisin.com/de-de/geldanlage/anleihen/",
    "title": "Anleihen erklärt: Arten, Rendite, Chancen & Risiko"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "unternehmensanleihen",
  "landingPath": "/de/anleihen/unternehmensanleihen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 4,
  "depth": 2,
  "relevance": 6,
  "richness": 7,
  "note": "Live corporate bond table, but ~240 words vs 1,500-3,000-word explainers covering how they work, risks and buying.",
  "competitors": [
   {
    "url": "https://www.raisin.com/de-de/geldanlage/anleihen/unternehmensanleihen/",
    "title": "Unternehmensanleihen"
   },
   {
    "url": "https://www.verivox.de/geldanlage/themen/unternehmensanleihen/",
    "title": "Unternehmensanleihen: Definition, Rendite, Sicherheit"
   },
   {
    "url": "https://www.deltavalue.de/unternehmensanleihen/",
    "title": "Unternehmensanleihen - Definition & Erklärung"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "hochzinsanleihen",
  "landingPath": "/de/anleihen/hochzinsanleihen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 4,
  "relevance": 7,
  "richness": 8,
  "note": "Rivals are short glossary entries (100-800 words, no data); our live high-yield list with risk scores stands out. More risk explanation would help.",
  "competitors": [
   {
    "url": "https://www.steuertipps.de/lexikon/h/hochzinsanleihen",
    "title": "Hochzinsanleihen - Was bedeutet das? Einfach erklärt!"
   },
   {
    "url": "https://www.sparkasse.de/pk/ratgeber/finanzglossar/hochzinsanleihen.html",
    "title": "Hochzinsanleihen: Chancen und Risiken"
   },
   {
    "url": "https://exporo.de/wiki/hochzinsanleihen",
    "title": "Hochzinsanleihen"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "anleihen",
  "landingPath": "/de/anleihen/beste-anleihen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 3,
  "depth": 2,
  "relevance": 3,
  "richness": 6,
  "note": "Broad informational query answered by explainers (Finanztip, Deutsche Börse); a ranking page is an intent mismatch with no basics.",
  "competitors": [
   {
    "url": "https://www.finanztip.de/anleihen/",
    "title": "Anleihen (Bonds) - Was sind festverzinsliche Wertpapiere?"
   },
   {
    "url": "https://live.deutsche-boerse.com/wissen/wertpapiere/anleihen/anleihen",
    "title": "Anleihen"
   },
   {
    "url": "https://www.buchhaltung-einfach-sicher.de/finanzen/anleihen",
    "title": "Anleihen einfach erklärt"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "anleihen kaufen",
  "landingPath": "/de/anleihen/beste-anleihen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 3,
  "depth": 2,
  "relevance": 4,
  "richness": 6,
  "note": "Intent is how/where to buy (brokers, steps, fees); ranking page has neither. /de/anleihen-broker would fit better.",
  "competitors": [
   {
    "url": "https://www.smartbrokerplus.de/de-de/anleihen-kaufen/",
    "title": "Anleihen kaufen"
   },
   {
    "url": "https://global.morningstar.com/de/anleihen/wie-kann-ich-bundesanleihen-kaufen-staatsanleihen-als-geldanlage",
    "title": "Wie kann ich Bundesanleihen kaufen? Staatsanleihen als Geldanlage"
   },
   {
    "url": "https://www.handelsblatt.com/vergleich/anleihen-kaufen-einsteiger/",
    "title": "Anleihen kaufen für Einsteiger 2025 ᐅ Leitfaden 2025"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "bundesanleihen zinsen",
  "landingPath": "/de/anleihen/bundesanleihen",
  "checkedAt": "2026-10-19",
  "status": "missing",
  "score": null,
  "depth": null,
  "relevance": null,
  "richness": null,
  "note": "Page not live in production. Finanzagentur lists current coupons for all outstanding Bunds; Statista has the monthly series.",
  "competitors": [
   {
    "url": "https://www.sparkasse.de/pk/ratgeber/finanzplanung/investieren/in-wertpapiere-investieren/bundeswertpapiere.html",
    "title": "Bundeswertpapiere: Das sollten Sie darüber wissen"
   },
   {
    "url": "https://www.deutsche-finanzagentur.de/bundeswertpapiere/bundeswertpapierarten/bundesanleihen",
    "title": "Bundesanleihen - Deutsche Finanzagentur"
   },
   {
    "url": "https://de.statista.com/statistik/daten/studie/238018/umfrage/rendite-zehnjaehriger-staatsanleihen-in-deutschland-nach-monaten/",
    "title": "Bundesanleihe 10 Jahre: Aktueller Zinssatz"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "anleihen rendite berechnen",
  "landingPath": "/de/rechner/anleihen-rendite-berechnen",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 6,
  "relevance": 9,
  "richness": 8,
  "note": "Calculator with net yield and cash flows beats Excel docs and a stock-focused guide; zinsen-berechnen.de also has a solid calculator.",
  "competitors": [
   {
    "url": "https://www.zinsen-berechnen.de/geldanlage-anleihen/rendite-anleihe.php",
    "title": "Rendite einer Anleihe bei vorzeitigem Verkauf berechnen"
   },
   {
    "url": "https://www.finanzen.net/ratgeber/rendite-berechnen/",
    "title": "Rendite berechnen: Errechnen Sie mit der Rendite-Formel Ihre Aktienperformance"
   },
   {
    "url": "https://support.microsoft.com/de-de/office/rendite-funktion-f5f5ca43-c4bd-434f-8bd2-ed3c9727a4fe",
    "title": "RENDITE"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "anleihen broker",
  "landingPath": "/de/anleihen-broker",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 6,
  "relevance": 9,
  "richness": 8,
  "note": "Official-tariff costs for 5k/10k/50k orders beat single-broker pages; Handelsblatt's 9-broker guide is longer with how-to steps.",
  "competitors": [
   {
    "url": "https://www.sbroker.de/handel/wertpapiere/anleihen",
    "title": "Anleihen handeln beim S Broker"
   },
   {
    "url": "https://www.handelsblatt.com/vergleich/anleihen-kaufen-einsteiger/",
    "title": "Anleihen kaufen für Einsteiger 2025 ᐅ Leitfaden 2025"
   },
   {
    "url": "https://financer.de/geldanlage/anleihen-kaufen/",
    "title": "Anleihen kaufen 2026: Broker, Tipps & Anleitung"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "anleihen oder festgeld",
  "landingPath": "/de/ratgeber/anleihen-oder-festgeld",
  "checkedAt": "2026-10-19",
  "status": "draft",
  "score": null,
  "depth": null,
  "relevance": null,
  "richness": null,
  "note": "Unpublished draft (404).",
  "competitors": [
   {
    "url": "https://www.dasinvestment.com/festgeld-oder-anleihe-wo-sind-die-unterschiede-und-was-ist-zu-beachten/",
    "title": "Festgeld oder Anleihen: Was bringt derzeit mehr Rendite?"
   },
   {
    "url": "https://www.finanztip.de/blog/serie-geldanlage-anleihen-sind-sie-besser-als-festgeld/",
    "title": "Anleihen (Bonds) - Was sind festverzinsliche Wertpapiere?"
   },
   {
    "url": "https://www.finanztip.de/community/forum/thema/41647-festgeld-oder-staatsanleihe-was-lohnt-sich-mehr/",
    "title": "Festgeld oder Staatsanleihe - Was lohnt sich mehr? - Geldanlage - Finanztip Forum"
   }
  ]
 },
 {
  "market": "de",
  "keyword": "anleihen etf oder einzelanleihen",
  "landingPath": "/de/ratgeber/anleihen-etf-oder-einzelanleihen",
  "checkedAt": "2026-10-19",
  "status": "draft",
  "score": null,
  "depth": null,
  "relevance": null,
  "richness": null,
  "note": "Unpublished draft (404).",
  "competitors": [
   {
    "url": "https://www.lynxbroker.de/boerse/boerse-kurse/etf/etfs-im-fokus/anleihen-vergleich-anleihen-und-anleihen-etfs-im-fokus/",
    "title": "Anleihen Vergleich: Anleihen und Anleihen ETFs 2026"
   },
   {
    "url": "https://www.dkb.de/finanzwissen/anleihen-etf",
    "title": "Anleihen-ETF: Definition, Chancen und Risiken"
   },
   {
    "url": "https://zendepot.de/etf/anleihen-etf",
    "title": "Anleihen-ETFs: Ein smarter Weg zu mehr Stabilität im Depot?"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "meilleures obligations 2026",
  "landingPath": "/fr/obligations/meilleures-obligations",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 4,
  "relevance": 8,
  "richness": 8,
  "note": "Only result listing actual bonds with live yields; rivals are long ETF lists and outlooks. Thin explanatory text, no ISINs or selection rationale.",
  "competitors": [
   {
    "url": "https://sinvestir.fr/meilleurs-etf-obligations/",
    "title": "Les meilleurs ETF Obligations en 2026 : comparatif et avis"
   },
   {
    "url": "https://www.goodvest.fr/blog/strategie-investissement/meilleur-placement-2026",
    "title": "Quel est le meilleur placement de 2026 ?"
   },
   {
    "url": "https://am.jpmorgan.com/fr/fr/asset-management/adv/insights/portfolio-insights/fixed-income-views/",
    "title": "Perspectives sur les obligations mondiales - T4 2026"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "oat rendement",
  "landingPath": "/fr/guides/oat-obligations-etat-francaises",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 4,
  "depth": 6,
  "relevance": 4,
  "richness": 3,
  "note": "Solid OAT explainer but no current OAT yield figure; SERP is news on today's yield, and our OAT table page is not live.",
  "competitors": [
   {
    "url": "https://www.abcbourse.com/marches/le-rendement-de-l-oat-francaise-a-10-ans-a-franchi-le-seuil-des-4-au-plus-haut_700197",
    "title": "Le rendement de l'OAT française à 10 ans a franchi le seuil des 4%, au plus haut depuis octobre 2008"
   },
   {
    "url": "https://contrepoints.org/le-rendement-de-loat-francaise-a-30-ans-atteint-son-plus-haut-niveau-depuis-2008/",
    "title": "Le rendement de l'OAT française à 30 ans atteint son plus haut niveau depuis 2008 - Contrepoints"
   },
   {
    "url": "https://www.boursorama.com/bourse/actualites/taux-les-rendements-des-oat-repartent-en-fleche-apres-un-repit-de-courte-duree-3c0a19394c8091521618125fce52b713",
    "title": "TAUX-Les rendements des OAT repartent en flèche après un répit de courte durée - Boursorama"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "obligations d'état ou obligations d'entreprise",
  "landingPath": "/fr/guides/obligations-etat-ou-entreprise",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 5,
  "relevance": 8,
  "richness": 6,
  "note": "Directly answers the either/or with a 5-step method and live data links; rivals are longer generic definitions. Shorter (520 words), no worked spread example.",
  "competitors": [
   {
    "url": "https://fr.wikipedia.org/wiki/Obligation_d'entreprise",
    "title": "Obligation d'entreprise"
   },
   {
    "url": "https://www.justetf.com/fr/academy/introduction-aux-onligations-dentreprises.html",
    "title": "Introduction aux obligations d'entreprises"
   },
   {
    "url": "https://www.monpetitplacement.fr/investir/acheter-des-obligations",
    "title": "Le guide pour acheter des obligations en 2026 !"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "rendement à l'échéance",
  "landingPath": "/fr/guides/rendement-a-l-echeance",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 7,
  "relevance": 8,
  "richness": 6,
  "note": "Formula, worked example and gross vs net beat rivals (Disnat current-yield only, JoVE video, Nalo glossary). Could embed the calculator.",
  "competitors": [
   {
    "url": "https://www.disnat.com/centre-apprentissage/notions-bourse/principes-fondamentaux-des-obligations/rendement-cours-et-autres-elements-obscurs",
    "title": "Rendement, cours et autres éléments obscurs"
   },
   {
    "url": "https://www.jove.com/fr/business-education/v/18525/calculating-the-yield-to-maturity",
    "title": "Vidéo: Calcul du rendement à l'échéance - Concept"
   },
   {
    "url": "https://blog.nalo.fr/lexique/rendement/",
    "title": "Rendement d'un investissement : définition"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "risque de crédit obligation",
  "landingPath": "/fr/guides/risque-de-credit-obligataire",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 6,
  "relevance": 8,
  "richness": 5,
  "note": "Focused on ratings, spread, loss given default; rivals cover all bond risks at more length. No rating-scale table or real default examples.",
  "competitors": [
   {
    "url": "https://blog.nalo.fr/quels-sont-les-risques-des-obligations/",
    "title": "Comprendre les Risques des Obligations : Crédit, Taux, et Change"
   },
   {
    "url": "https://www.goodvest.fr/lexique/obligation",
    "title": "Obligation : définition, fonctionnement et risques"
   },
   {
    "url": "https://www.cashbee.fr/blog/investir-dans-des-obligations-le-guide-complet",
    "title": "Acheter des obligations en 2024 : comment et pourquoi?"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "obligations échéance 5 ans",
  "landingPath": "/fr/obligations/duration-5-ans",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 3,
  "relevance": 6,
  "richness": 7,
  "note": "Live table of real 5-year bonds beats benchmark quote and generic PDFs, but page is about duration, not maturity; little text.",
  "competitors": [
   {
    "url": "https://www.zonebourse.com/cours/taux-interet/FRANCE-5Y-CASH-146043539/",
    "title": "Obligations France 5 ans - Taux d'intérêts"
   },
   {
    "url": "https://www.rbcgam.com/documents/fr/articles/bond-basics-a-primer-f.pdf",
    "title": "Notions de base des obligations : introduction"
   },
   {
    "url": "https://placement.meilleurtaux.com/fonds/fonds-obligataire-date/",
    "title": "Le fonds obligataire daté : explication et guide 2026 - Meilleurtaux Placement"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "obligations haut rendement",
  "landingPath": "/fr/obligations/haut-rendement",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 5,
  "depth": 3,
  "relevance": 6,
  "richness": 7,
  "note": "Unique live high-yield bond list, but SERP intent is explanatory (SG, TD podcast); our text on risks and defaults is minimal.",
  "competitors": [
   {
    "url": "https://www.culture.fr/franceterme/terme/ECON1213",
    "title": "Obligation à haut rendement"
   },
   {
    "url": "https://www.td.com/ca/fr/gestion-de-placements-td/renseignements/balado/obligations-a-haut-rendement",
    "title": "Obligations à haut rendement : ce qui fait d'elles les actions des titres à revenu fixe"
   },
   {
    "url": "https://particuliers.sg.fr/epargner-placer-son-argent/les-cles-de-l-epargne/obligations-haut-rendement",
    "title": "Pourquoi investir dans les obligations à haut rendement"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "obligations d'entreprise",
  "landingPath": "/fr/obligations/obligations-entreprise",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 5,
  "depth": 3,
  "relevance": 6,
  "richness": 7,
  "note": "Live corporate bond table is a plus, but ~320 words versus 1,500-word explainers; no how-it-works, risks or ETF section.",
  "competitors": [
   {
    "url": "https://fr.wikipedia.org/wiki/Obligation_d'entreprise",
    "title": "Obligation d'entreprise"
   },
   {
    "url": "https://extraetf.com/fr/ressources/les-obligations-d-entreprises",
    "title": "Les obligations d'entreprises (Corporate Bonds)"
   },
   {
    "url": "https://www.swissquote.com/fr-ch/private/inspire/blog/finance-basics/corporate-bonds-when-do-they-become-attractive",
    "title": "Obligations d'entreprises"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "oat 10 ans",
  "landingPath": "/fr/obligations/oat",
  "checkedAt": "2026-10-19",
  "status": "missing",
  "score": null,
  "depth": null,
  "relevance": null,
  "richness": null,
  "note": "Page not live in production (fetch fails, not linked from /fr/obligations hub). Rivals offer news, yield history and explainers.",
  "competitors": [
   {
    "url": "https://www.xtb.com/fr/analyses-marches/taux-oat-10-ans-l-emprunt-francais-depasse-les-4-5",
    "title": "Taux OAT 10 ans : la dette française au sommet depuis 2008"
   },
   {
    "url": "https://www.pretto.fr/actualites/actualites-2026/hausse-oat-10-ans-impact-taux-credit/",
    "title": "OAT 10 ans à plus de 4% : faut-il s'attendre à une remontée des taux de crédit ?"
   },
   {
    "url": "https://cbonds.fr/10-year-french-bonds/",
    "title": "OAT 10 ans : Taux, Cours de l'Obligation France et Courbe des Taux"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "comment comparer rendement et risque obligataire",
  "landingPath": "/fr/guides/obligations-etat-ou-entreprise",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 5,
  "relevance": 7,
  "richness": 6,
  "note": "Practical method (same horizon, risk premium, rating, liquidity) fits intent better than generic risk pages; lacks a worked comparison of two bonds.",
  "competitors": [
   {
    "url": "https://www.boursorama.com/patrimoine/fiches-pratiques/comment-aborder-les-obligations-a-haut-rendement-4acaec87831694365a5ff3fc0f264d6b",
    "title": "Comment aborder les obligations à «haut rendement» - Boursorama"
   },
   {
    "url": "https://www.lafinancepourtous.com/decryptages/finance-perso/epargne-et-placement/le-couple-rendement-risque/",
    "title": "Le couple rendement-risque - La finance pour tous"
   },
   {
    "url": "https://www.lafinancepourtous.com/decryptages/marches-financiers/produits-financiers/obligations/les-risques-obligataires/",
    "title": "Les risques obligataires - La finance pour tous"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "rendement oat 10 ans",
  "landingPath": "/fr/obligations/oat",
  "checkedAt": "2026-10-19",
  "status": "missing",
  "score": null,
  "depth": null,
  "relevance": null,
  "richness": null,
  "note": "Page not live in production. Rivals show the current 10-year yield (TradingView chart, news).",
  "competitors": [
   {
    "url": "https://fr.tradingview.com/symbols/TVC-FR10Y/",
    "title": "Rendement et graphique des prix FR10Y — TradingView"
   },
   {
    "url": "https://www.abcbourse.com/marches/le-rendement-de-l-oat-francaise-a-10-ans-a-franchi-le-seuil-des-4-au-plus-haut_700197",
    "title": "Le rendement de l'OAT française à 10 ans a franchi le seuil des 4%, au plus haut depuis octobre 2008"
   },
   {
    "url": "https://fr.tradingeconomics.com/france/government-bond-yield/news/508171",
    "title": "Rendement des OAT françaises à un plus haut de plus de deux mois"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "calcul rendement actuariel",
  "landingPath": "/fr/calculateurs/rendement-actuariel",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 8,
  "depth": 7,
  "relevance": 9,
  "richness": 9,
  "note": "Only working calculator (gross/net, accrued interest, cash flows); rivals give a formula or a short example only.",
  "competitors": [
   {
    "url": "https://www.test-achats.be/invest/investir/obligations/news/2024/08/rendement-actuariel-moyen-calcul",
    "title": "C'est quoi au juste le rendement actuariel ?"
   },
   {
    "url": "https://epargne.pagesjaunes.fr/astuce/voir/625021/rendement-actuariel",
    "title": "Rendement actuariel"
   },
   {
    "url": "https://www.iotafinance.com/Formule-Taux-de-Rendement-avec-Periodes-Annuelles.html",
    "title": "Formule de calcul: Taux de rendement actuariel (périodes annuelles)"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "meilleur courtier obligations",
  "landingPath": "/fr/courtiers-obligations",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 8,
  "depth": 7,
  "relevance": 9,
  "richness": 9,
  "note": "Bond-specific costs for 5k/10k/50k from official tariffs beat a general broker guide and a 2018 forum thread. Only 7 brokers covered.",
  "competitors": [
   {
    "url": "https://www.cafedelabourse.com/dossiers/article/dix-conseils-pour-bien-choisir-courtier-en-ligne",
    "title": "Courtier en ligne : comparatif meilleur courtier Bourse 2026"
   },
   {
    "url": "https://www.investortrip.com/fr/brokers/best-brokers-for-bonds",
    "title": "Meilleurs courtiers pour obligations 2026 : plateformes comparées"
   },
   {
    "url": "https://www.investisseurs-heureux.fr/t3314-8",
    "title": "Courtier obligations : quel est le meilleur courtier obligations ?"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "obligations ou etf",
  "landingPath": "/fr/guides/obligations-ou-etf",
  "checkedAt": "2026-10-19",
  "status": "draft",
  "score": null,
  "depth": null,
  "relevance": null,
  "richness": null,
  "note": "Unpublished draft (404).",
  "competitors": [
   {
    "url": "https://extraetf.com/fr/ressources/etf-obligataires",
    "title": "Les ETF obligataires"
   },
   {
    "url": "https://www.auguste-patrimoine.fr/epargne/etf-obligataire",
    "title": "ETF obligataire : définition et conseils en investissement"
   },
   {
    "url": "https://www.xtb.com/fr/formation/etf-obligataire",
    "title": "ETF obligataire : comment investir et lequel choisir"
   }
  ]
 },
 {
  "market": "fr",
  "keyword": "acheter des oat",
  "landingPath": "/fr/guides/acheter-des-oat",
  "checkedAt": "2026-10-19",
  "status": "draft",
  "score": null,
  "depth": null,
  "relevance": null,
  "richness": null,
  "note": "Unpublished draft (404).",
  "competitors": [
   {
    "url": "https://www.meilleurtaux.com/credit-immobilier/le-guide-de-l-emprunteur/questions-reponses-credit-immobilier/oat.html",
    "title": "Qu'est-ce qu'une OAT ? Tout ce qu'il faut savoir - Meilleurtaux"
   },
   {
    "url": "https://www.cafedelabourse.com/produits-financiers/oat-francais",
    "title": "OAT français : pourquoi et comment investir ?"
   },
   {
    "url": "https://www.moneyvox.fr/bourse/actualites/103832/placement-comment-acheter-directement-des-obligations-de-etat-francais",
    "title": "Placement : « Comment acheter directement des obligations de l'Etat français ? »"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp",
  "landingPath": "/it/obbligazioni/btp",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 4,
  "depth": 3,
  "relevance": 6,
  "richness": 5,
  "note": "Live per-maturity table is a plus, but competitors list named BTPs with prices, ISINs and picks; our 240-word article is thin.",
  "competitors": [
   {
    "url": "https://www.money.it/i-10-btp-migliori-tra-quelli-in-circolazione-rendimento-netto-fino-al-4-83",
    "title": "I 10 BTP migliori tra quelli in circolazione. Rendimento netto fino al 4,83%"
   },
   {
    "url": "https://www.trend-online.com/economia/btp-da-comprare-adesso/",
    "title": "I 5 migliori BTP da comprare adesso, ecco i consigli di investimento per gennaio 2024"
   },
   {
    "url": "https://www.finanzadigitale.com/investimenti/btp-rendimenti-e-quotazioni-aggiornate/",
    "title": "Btp: rendimenti e quotazioni aggiornate"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp da comprare oggi sotto 100 e quali da acquistare",
  "landingPath": "/it/obbligazioni/btp",
  "checkedAt": "2026-10-19",
  "status": "gap",
  "score": 2,
  "depth": 3,
  "relevance": 2,
  "richness": 4,
  "note": "No prices, so we cannot show below-par BTPs; competitors list sub-100 bonds with ISIN, price and yield.",
  "competitors": [
   {
    "url": "https://www.risparmioggi.it/migliori-btp-da-comprare-oggi-investire-nel-2025/",
    "title": "la lista dei migliori BTP da acquistare in ottica 2025"
   },
   {
    "url": "https://www.money.it/btp-quali-comprare-oggi-per-guadagnare-da-subito",
    "title": "BTP, quali comprare oggi per guadagnare da subito"
   },
   {
    "url": "https://rankia.it/migliori-btp-da-comprare-per-rendimento/",
    "title": "Miglior BTP da comprare oggi: quali scegliere e come valutarli"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp da comprare",
  "landingPath": "/it/obbligazioni/btp",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 3,
  "depth": 2,
  "relevance": 5,
  "richness": 4,
  "note": "Rankia (updated 14 Oct 2026) has an ISIN and price table plus a 17-section guide; we have no ISIN, price, tax or how-to-buy content.",
  "competitors": [
   {
    "url": "https://rankia.it/migliori-btp-da-comprare-per-rendimento/",
    "title": "Miglior BTP da comprare oggi: quali scegliere e come valutarli"
   },
   {
    "url": "https://www.trend-online.com/economia/btp-da-comprare-adesso/",
    "title": "I 5 migliori BTP da comprare adesso, ecco i consigli di investimento per gennaio 2024"
   },
   {
    "url": "https://www.finanzadigitale.com/investimenti/migliori-btp-comprare/",
    "title": "Migliori BTP da comprare: su quali titoli di Stato conviene investire?"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp a 5 anni da comprare oggi",
  "landingPath": "/it/obbligazioni/btp",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 4,
  "depth": 2,
  "relevance": 5,
  "richness": 5,
  "note": "We show only one live 2031 bond; competitors compare several 5-year BTPs on price, net yield and coupon, with no section on the 5-year bucket.",
  "competitors": [
   {
    "url": "https://www.finanzadigitale.com/migliori-btp-comprare/",
    "title": "Migliori BTP da comprare: su quali titoli di Stato conviene investire?"
   },
   {
    "url": "https://www.money.it/btp-ecco-dove-il-mercato-sta-sbagliando-ecco-i-titoli-di-stato-piu-convenienti-ora",
    "title": "BTP, ecco dove il mercato sta sbagliando. Ecco i titoli di Stato più convenienti ora"
   },
   {
    "url": "https://www.trend-online.com/economia/btp-da-comprare-adesso/",
    "title": "I 5 migliori BTP da comprare adesso, ecco i consigli di investimento per gennaio 2024"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp europei",
  "landingPath": "/it/calcolatori/curva-rendimenti-titoli-di-stato",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 5,
  "relevance": 7,
  "richness": 9,
  "note": "Results are 2018-2023 news pieces; our live cross-country yield curve answers the comparison far better. It lacks explanatory text and named bond picks.",
  "competitors": [
   {
    "url": "https://www.finanzaonline.com/notizie/btp-migliori-eurozona-tassi-minimo-anno-commerzbank-incredibile-italia-percepita-come-asset-rifugio",
    "title": "Btp migliori eurozona, tassi al minimo di un anno (Commerzbank)"
   },
   {
    "url": "https://www.money.it/i-3-btp-migliori-da-comprare-oggi",
    "title": "I 3 BTP migliori da comprare oggi"
   },
   {
    "url": "https://www.wallstreetitalia.com/?p=623664",
    "title": "Titoli di Stato: BTP, migliore investimento europeo del 2020"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp scadenza 2028",
  "landingPath": "/it/obbligazioni/scadenza-2028",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 4,
  "relevance": 6,
  "richness": 7,
  "note": "Competitors are stale 2022-2023 single-bond articles. Our live 2028 list beats them but mixes in corporates and has no BTP-only filter, ISIN or price.",
  "competitors": [
   {
    "url": "https://www.investireoggi.it/collocamento-btp-italia-2028-dati-migliori-di-novembre/",
    "title": "Collocamento BTp Italia 2028, primo giorno col botto: ecco i dati, migliori di novembre"
   },
   {
    "url": "https://www.money.it/bond-oggi-investire-btp-2028",
    "title": "Bond oggi, Btp, adesso il più opportuno è un 2028"
   },
   {
    "url": "https://www.investireoggi.it/investire-btp-futura-2028-portafoglio-scadenza/",
    "title": "Investire nel BTp Futura 2028? Solo se lo tieni in portafoglio fino alla scadenza"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp da acquistare",
  "landingPath": "/it/obbligazioni/btp",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 3,
  "depth": 2,
  "relevance": 5,
  "richness": 5,
  "note": "Affarimiei (Sept 2026) analyses 106 BTPs with ISIN, price and net-yield tables by maturity; our short text and priceless table are far behind.",
  "competitors": [
   {
    "url": "https://www.risparmioggi.it/migliori-btp-da-comprare-oggi-investire-nel-2025/",
    "title": "la lista dei migliori BTP da acquistare in ottica 2025"
   },
   {
    "url": "https://quifinanza.it/economia/calendario-emissioni-btp-ottobre-2024/856372/amp/",
    "title": "Calendario emissioni Btp ottobre 2024 medio e lungo termine"
   },
   {
    "url": "https://www.affarimiei.biz/?p=27767",
    "title": "Migliori BTP da Comprare Oggi: Quali Titoli di Stato pagano le Cedole più alte? Idee per il 2026"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp scadenza 2027",
  "landingPath": "/it/obbligazioni/scadenza-2027",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 3,
  "relevance": 6,
  "richness": 7,
  "note": "Our live 2027 list beats 2024-2025 snapshots on freshness, but it is not BTP-only and shows no ISIN or price; the intro text is generic.",
  "competitors": [
   {
    "url": "https://www.businessonline.it/news/quali-sono-i-btp-migliori-ad-1-2-5-anni-e-quali-a-7-10-anni-confronto-titoli-aggiornato-ora-maggio-2024_n74117.html",
    "title": "Quali sono i BTP migliori ad 1, 2, 5 anni e quali a 7, 10 anni"
   },
   {
    "url": "https://www.risparmioggi.it/miglior-btp-a-5-anni-scadenza-1-novembre-2027/",
    "title": "miglior btp a 5 anni scadenza 1 novembre 2027"
   },
   {
    "url": "https://borsaefinanza.it/btp-3-anni-ecco-quali-sono-i-migliori-titoli-di-stato-per-investire-oggi/",
    "title": "Btp 3 anni, ecco quali sono i migliori titoli di Stato per investire oggi"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp a 1 anno",
  "landingPath": "/it/obbligazioni/btp",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 4,
  "depth": 2,
  "relevance": 4,
  "richness": 5,
  "note": "Businessonline ranks several 1-year BTPs with price and net yield; we show one live 2027 row and no short-term section.",
  "competitors": [
   {
    "url": "https://www.businessonline.it/news/quali-sono-i-btp-migliori-ad-1-2-5-anni-e-quali-a-7-10-anni-confronto-titoli-aggiornato-ora-maggio-2024_n74117.html",
    "title": "Quali sono i BTP migliori ad 1, 2, 5 anni e quali a 7, 10 anni"
   },
   {
    "url": "https://www.trend-online.com/economia/btp-da-comprare-adesso/",
    "title": "I 5 migliori BTP da comprare adesso, ecco i consigli di investimento per gennaio 2024"
   },
   {
    "url": "https://www.businessonline.it/news/btp-a-breve-o-lunga-scadenza-la-miglior-scelta-la-media-durata-di-5-7-anni-al-momento-ecco-perch-secondo-gli-esperti_n81581.html",
    "title": "BTP a breve o lunga scadenza: la miglior scelta la media durata di 5-7 anni"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori btp scadenza 3 anni",
  "landingPath": "/it/obbligazioni/btp",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 4,
  "depth": 2,
  "relevance": 4,
  "richness": 5,
  "note": "Competitors are weak or off-target, but we offer only one live 2029 row and no 3-year discussion; a dedicated 2029 page would win.",
  "competitors": [
   {
    "url": "https://www.money.it/i-3-btp-migliori-per-guadagnare-e-incassare-un-rendimento-del-3-netto-all-anno",
    "title": "I 3 BTP migliori per guadagnare e incassare un rendimento del 3% netto all'anno"
   },
   {
    "url": "https://borsaefinanza.it/btp-3-anni-ecco-quali-sono-i-migliori-titoli-di-stato-per-investire-oggi/",
    "title": "Btp 3 anni, ecco quali sono i migliori titoli di Stato per investire oggi"
   },
   {
    "url": "https://quifinanza.it/economia/investimenti/video/btp-migliori-quali-sono-e-su-quali-investire/709894/amp/",
    "title": "Btp migliore: ecco quale ti farà guadagnare di più"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "rendimenti btp",
  "landingPath": "/it/obbligazioni/btp",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 4,
  "relevance": 8,
  "richness": 8,
  "note": "Live BTP curve beats dated news articles (2016, 2023); but only one BTP per year, no prices or ISINs, thin text.",
  "competitors": [
   {
    "url": "https://quifinanza.it/economia/investimenti/btp-rendimenti-cosa-conviene-fare/751336/amp/",
    "title": "Btp: rendimenti al top, cosa conviene fare adesso"
   },
   {
    "url": "https://www.ilrestodelcarlino.it/economia/btp-conviene-quanto-rendono-eys5i2j1",
    "title": "btp conviene quanto rendono (Il Resto del Carlino)"
   },
   {
    "url": "https://www.bluerating.com/?p=720537",
    "title": "Btp, i rendimenti tornano a salire tra i 3 e i 15 anni"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "btp rendimento netto",
  "landingPath": "/it/calcolatori/rendimento-netto-btp",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 5,
  "relevance": 8,
  "richness": 9,
  "note": "Working net-YTM calculator with tax presets beats static articles; competitors list specific BTPs with net yields, ours lists none.",
  "competitors": [
   {
    "url": "https://www.money.it/i-10-btp-migliori-tra-quelli-in-circolazione-rendimento-netto-fino-al-4-83",
    "title": "I 10 BTP migliori tra quelli in circolazione. Rendimento netto fino al 4,83%"
   },
   {
    "url": "https://www.money.it/dimenticate-il-btp-valore-questi-rendono-piu-del-4",
    "title": "Dimenticate il Btp Valore. Questi Btp rendono più del 4% netto"
   },
   {
    "url": "https://www.we-wealth.com/?p=120066",
    "title": "Btp: come si calcola il rendimento netto"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "btp",
  "landingPath": "/it/guide/btp",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 6,
  "relevance": 7,
  "richness": 4,
  "note": "Search engine returned mostly non-Italian results; Italian ones are short glossaries. Ours is slightly fuller but has no data or examples.",
  "competitors": [
   {
    "url": "https://www.altroconsumo.it/investi/lexicon/b/btp",
    "title": "BTp (Altroconsumo glossario)"
   },
   {
    "url": "https://www.websim.it/formazione/nozioni-di-base/glossario/btp/",
    "title": "BTP (Websim glossario)"
   },
   {
    "url": "https://www.altroconsumo.it/investi/lexicon/b/btp-italia",
    "title": "BTp Italia (from query 'btp italia')"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "btp o etf obbligazionari",
  "landingPath": "/it/guide/btp-o-etf-obbligazionari",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 3,
  "depth": 2,
  "relevance": 7,
  "richness": 2,
  "note": "About 190 words, no example; competitors offer a break-even calculator (Rivaluta) and 1,000+ word comparisons with worked rate-shock examples.",
  "competitors": [
   {
    "url": "https://www.rivaluta.it/investimenti/confronto-btp-etf-obbligazionari.asp",
    "title": "Meglio BTP o ETF obbligazionario? Calcolo del punto di pareggio"
   },
   {
    "url": "https://www.money.it/meglio-investire-in-btp-o-su-un-etf-obbligazionario",
    "title": "Meglio investire in BTP o su un ETF obbligazionario?"
   },
   {
    "url": "https://www.we-wealth.com/news/non-solo-btp-valore-anche-gli-etf-attratti-dai-titoli-di-stato-italiani",
    "title": "Non solo Btp Valore, anche gli Etf attratti dai titoli di Stato italiani"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "btp o obbligazioni corporate",
  "landingPath": "/it/guide/btp-o-obbligazioni-corporate",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 5,
  "depth": 4,
  "relevance": 7,
  "richness": 3,
  "note": "Competitors are dated (2019) bond lists or off-topic ETFs; ours covers tax 12.5% vs 26% but gives no concrete bond-vs-BTP yield example.",
  "competitors": [
   {
    "url": "https://www.investireoggi.it/ecco-5-obbligazioni-corporate-solide-dellftse-mib-che-battono-il-btp/",
    "title": "Ecco 5 obbligazioni corporate solide del FTSE MIB che battono il BTP"
   },
   {
    "url": "https://www.money.it/5-tipi-di-etf-diversi-dal-btp-per-creare-una-rendita",
    "title": "5 tipi di ETF diversi dal BTP per creare una rendita"
   },
   {
    "url": "https://www.investireoggi.it/corporate-italia-batte-btp-se-aziende-e-banche-sindebitano-a-costi-piu-bassi-dello-stato/",
    "title": "Corporate Italia batte BTP: aziende e banche s'indebitano a costi più bassi dello Stato"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "come calcolare rendimento a scadenza",
  "landingPath": "/it/guide/rendimento-a-scadenza",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 3,
  "depth": 2,
  "relevance": 7,
  "richness": 3,
  "note": "Competitors give formulas, Excel functions, several worked examples and a YTM calculator; ours has one example, no formula, no embedded calculator.",
  "competitors": [
   {
    "url": "https://www.money.it/rendimento-obbligazionario-cos-e-come-si-calcola",
    "title": "Rendimento obbligazionario, cos'è e come si calcola?"
   },
   {
    "url": "https://www.rivaluta.it/investimenti/simulatore-rendimento-btp.asp",
    "title": "Questo strumento calcola il rendimento effettivo a scadenza (YTM)"
   },
   {
    "url": "https://rankia.it/come-calcolare-lo-yeld-to-maturity-o-rendimento-a-scadenza-ytm",
    "title": "Come calcolare lo yield to maturity o rendimento a scadenza (YTM) - Rankia"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "duration obbligazioni",
  "landingPath": "/it/guide/duration-obbligazioni",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 4,
  "depth": 3,
  "relevance": 8,
  "richness": 3,
  "note": "Clear and correct but about 220 words; competitors (500-900 words) show Macaulay/modified formulas, tables and FAQs.",
  "competitors": [
   {
    "url": "https://blog.moneyfarm.com/it/finanza-personale/duration-cos-e-come-si-calcola-perche-e-importante/",
    "title": "Duration: cos'è, come si calcola e perché è importante"
   },
   {
    "url": "https://borsaefinanza.it/duration-obbligazioni-cose-e-perche-e-importante-redazione/",
    "title": "Duration obbligazioni: cos'è e perché è importante"
   },
   {
    "url": "https://www.borsaitaliana.it/notizie/sotto-la-lente/duration-durata-del-debito157.htm",
    "title": "Duration: spiegazione, formula e utilizzo nelle obbligazioni"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori broker obbligazioni",
  "landingPath": "/it/broker-obbligazioni",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 8,
  "depth": 6,
  "relevance": 9,
  "richness": 9,
  "note": "Ten brokers with costs at 5k/10k/50k from official tariffs, dated; beats Rankia and IBKR. BrokerChooser has deeper tested reviews.",
  "competitors": [
   {
    "url": "https://brokerchooser.com/it/best-brokers/best-brokers-for-bonds",
    "title": "Migliori broker per obbligazioni nel 2026"
   },
   {
    "url": "https://rankia.it/migliori-broker-per-obbligazioni/",
    "title": "Migliori broker per obbligazioni - Rankia"
   },
   {
    "url": "https://www.interactivebrokers.co.uk/it/trading/products-bonds.php",
    "title": "Bonds Marketplace - Interactive Brokers"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori obbligazioni 2026",
  "landingPath": "/it/obbligazioni/migliori-obbligazioni",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 5,
  "depth": 3,
  "relevance": 7,
  "richness": 7,
  "note": "Live table is a plus, but competitors name specific bonds with ISINs and run 2,000+ word guides; ours has thin text, no ISIN.",
  "competitors": [
   {
    "url": "https://www.altroconsumo.it/investi/investire/obbligazioni",
    "title": "Obbligazioni - Altroconsumo Investi"
   },
   {
    "url": "https://qualebroker.com/blog/trading-online/migliori-obbligazioni-2026",
    "title": "Migliori obbligazioni 2026"
   },
   {
    "url": "https://rankia.it/migliori-obbligazioni-da-comprare/",
    "title": "Migliori obbligazioni da comprare - Rankia"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "migliori obbligazioni a 5 anni",
  "landingPath": "/it/obbligazioni/duration-5-anni",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 4,
  "relevance": 8,
  "richness": 8,
  "note": "Competitors are dated (2022-2023) single-BTP or commentary pieces; our live table of ~5-year bonds is clearly more useful, text is thin.",
  "competitors": [
   {
    "url": "https://www.trend-online.com/bond/bond-oggi-cedola-serve-vivere/",
    "title": "Bond oggi: la cedola serve per vivere? Meglio scadenze 5-8 anni"
   },
   {
    "url": "https://www.risparmioggi.it/miglior-btp-a-5-anni-scadenza-1-novembre-2027/",
    "title": "Miglior BTP a 5 anni scadenza 1 novembre 2027"
   },
   {
    "url": "https://rankiapro.com/it/insights/tassi-inflazione-calo-2024-bond-investment-grade-attraenti/",
    "title": "Tassi e inflazione in calo nel 2024: bond investment grade attraenti"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "obbligazioni alto rendimento",
  "landingPath": "/it/guide/obbligazioni-alto-rendimento",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 5,
  "depth": 4,
  "relevance": 6,
  "richness": 2,
  "note": "Competitors are asset-manager commentary, mostly dated; ours explains risks well but has no default data, examples or bond list.",
  "competitors": [
   {
    "url": "https://www.bluerating.com/?p=812929",
    "title": "Asset allocation: contesto favorevole per l'alto rendimento"
   },
   {
    "url": "https://www.troweprice.com/financial-intermediary/it/it/prospettive/articles/2023/q3/case-for-strategic-allocation-to-high-yield-bonds.html",
    "title": "T. Rowe Price - allocazione strategica alle obbligazioni high yield"
   },
   {
    "url": "https://www.investireoggi.it/obbligazioni-junk-alto-rendimento-cedola-12-stigma/",
    "title": "Obbligazioni junk ad alto rendimento con cedola al 12%"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "obbligazioni corporate euro",
  "landingPath": "/it/obbligazioni/corporate",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 4,
  "relevance": 8,
  "richness": 8,
  "note": "Competitors are market commentary without bond lists; our live euro corporate table is a real edge, though article text is short.",
  "competitors": [
   {
    "url": "https://borsaefinanza.it/obbligazioni-corporate-euro-3-ragioni-per-averle-in-portafoglio/",
    "title": "Obbligazioni corporate euro, 3 ragioni per averle in portafoglio"
   },
   {
    "url": "https://www.we-wealth.com/?p=131736",
    "title": "Credito corporate Europa, equilibrio tra rendimento e responsabilità"
   },
   {
    "url": "https://www.troweprice.com/financial-intermediary/it/it/prospettive/articles/2024/q3/how-euro-corporate-bonds-offer-stability-in-volatile-markets.html",
    "title": "T. Rowe Price - obbligazioni corporate in euro e stabilità"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "obbligazioni investment grade",
  "landingPath": "/it/guide/obbligazioni-investment-grade",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 6,
  "depth": 4,
  "relevance": 8,
  "richness": 6,
  "note": "Competitors are fund marketing and commentary; ours has a rating-scale table and links to S&P default rates, but is short.",
  "competitors": [
   {
    "url": "https://www.invesco.com/it/it/competenze/obbligazionario/investment-grade.html",
    "title": "Fixed Income Obbligazioni investment grade - Invesco"
   },
   {
    "url": "https://www.bluerating.com/?p=817834",
    "title": "Obbligazioni: investment grade, fondamentali solidi e rendimenti appetibili"
   },
   {
    "url": "https://www.bluerating.com/?p=806992",
    "title": "Asset allocation, obbligazioni: su quali è meglio puntare in questa fase"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "obbligazioni rendimento 5%",
  "landingPath": "/it/obbligazioni/rendimento-5-percento",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 7,
  "depth": 4,
  "relevance": 8,
  "richness": 8,
  "note": "Competitors are dated single-bond stories (2022-2023) or macro notes; our live table of ~5% yielders is more useful; no ISINs or prices.",
  "competitors": [
   {
    "url": "https://www.investireoggi.it/?p=98927",
    "title": "Investireoggi - bond perpetuo Poste Italiane con rendimento oltre 5%"
   },
   {
    "url": "https://www.home.saxo/it-it/content/articles/macro/bond-yields-at-5-questions-investors-should-ask-now-15092026",
    "title": "Bond yields at 5%: questions investors should ask now (Saxo)"
   },
   {
    "url": "https://www.investireoggi.it/cassa-depositi-prestiti-dopo-aggiornamento-dei-tassi-dei-bfp-lancia-nuove-obbligazioni-con-rendimento-al-5/",
    "title": "Cassa Depositi e Prestiti lancia nuove obbligazioni con rendimento al 5%"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "obbligazioni scadenza 2031",
  "landingPath": "/it/obbligazioni/scadenza-2031",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 8,
  "depth": 5,
  "relevance": 9,
  "richness": 8,
  "note": "Top results are 100-200 word news on single issues; our live list of 2031 maturities fits intent far better. No prices/ISINs.",
  "competitors": [
   {
    "url": "https://www.soldionline.it/?p=160545",
    "title": "Soldionline - doValue tap senior secured notes 2031"
   },
   {
    "url": "https://www.milanofinanza.it/news/oddo-bhp-amplia-il-portafoglio-di-fondi-obbligazionari-202509231800217928",
    "title": "Oddo BHF amplia il portafoglio di fondi obbligazionari"
   },
   {
    "url": "https://www.soldionline.it/notizie/azioni-italia/lottomatica-definito-pricing-bond-senior-garantiti-scandenza-2031",
    "title": "Lottomatica: definito pricing bond senior garantiti scadenza 2031"
   }
  ]
 },
 {
  "market": "it",
  "keyword": "rischio credito obbligazioni",
  "landingPath": "/it/guide/rischio-di-credito-obbligazioni",
  "checkedAt": "2026-10-19",
  "status": "scored",
  "score": 5,
  "depth": 4,
  "relevance": 8,
  "richness": 5,
  "note": "PD x LGD example and S&P default-table link are strengths; competitors are longer (1,000-1,800 words) and cover more risk types.",
  "competitors": [
   {
    "url": "https://www.money.it/corporate-bond-cosa-sono-le-obbligazioni-societarie",
    "title": "Corporate bond, cosa sono le obbligazioni societarie"
   },
   {
    "url": "https://www.altroconsumo.it/investi/investire/certificate/analisi/2025/01/evento-credito",
    "title": "Evento di credito - Altroconsumo Investi"
   },
   {
    "url": "https://blog.moneyfarm.com/it/investire/tutti-i-miti-da-sfatare-sulle-obbligazioni/",
    "title": "Tutti i miti da sfatare sulle obbligazioni"
   }
  ]
 }
];

export const contentScoreFor = (market: string, keyword: string): ContentScore | null =>
  CONTENT_SCORES.find((s) => s.market === market && s.keyword.toLowerCase() === keyword.toLowerCase()) ?? null;
