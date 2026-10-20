// Words of the "Price drops" page in each site language. Information only: never "good buys" or "opportunities".

export type DropsLang = "en" | "it" | "fr" | "de";

export const DROPS_PATH: Record<DropsLang, string> = { en: "/price-drops", it: "/it/ribassi", fr: "/fr/baisses", de: "/de/kursrueckgaenge" };

const en = {
  menu: "Price drops", menuShort: "Drops",
  title: "Biggest bond price drops · 10BONDS",
  description: "Rated bonds whose price is furthest below its 52-week high, by currency and risk score. Information only.",
  h1: "Biggest price drops",
  intro: "Rated bonds whose price is furthest below its 52-week high. Pick a risk score to see its 3 biggest drops, all maturities.",
  currency: "Currency", risk: "Risk", all: "All",
  issuer: "Issuer", bond: "Bond", maturity: "Maturity", price: "Price", high: "52-week high", highShort: "High", drop: "Drop",
  topAll: "10 biggest drops, one per issuer", topRisk: (r: number) => `3 biggest drops at risk ${r}, all maturities`,
  none: "No drops of more than 0.5% yet.",
  building: (d: string) => `We started recording prices on ${d}. Drops appear as prices move; the full 52-week view builds up over the year.`,
  indicative: "Prices are indicative, per 100, worked out from the daily yield.",
  note: "Information only, not investment advice or a buy signal. A falling price can mean the market sees more risk, and prices can keep falling.",
  locale: "en-GB",
};
export type DropsText = typeof en;

const it: DropsText = {
  menu: "Ribassi", menuShort: "Ribassi",
  title: "Obbligazioni con i maggiori ribassi · 10BONDS",
  description: "Obbligazioni con rating il cui prezzo è più lontano dal massimo a 52 settimane, per valuta e rischio. Solo informativo.",
  h1: "Maggiori ribassi di prezzo",
  intro: "Obbligazioni con rating il cui prezzo è più lontano dal massimo a 52 settimane. Scegli un livello di rischio per vedere i suoi 3 maggiori ribassi, tutte le scadenze.",
  currency: "Valuta", risk: "Rischio", all: "Tutti",
  issuer: "Emittente", bond: "Obbligazione", maturity: "Scadenza", price: "Prezzo", high: "Max 52 settimane", highShort: "Massimo", drop: "Ribasso",
  topAll: "I 10 maggiori ribassi, uno per emittente", topRisk: (r: number) => `I 3 maggiori ribassi con rischio ${r}, tutte le scadenze`,
  none: "Ancora nessun ribasso superiore allo 0,5%.",
  building: (d: string) => `Registriamo i prezzi dal ${d}. I ribassi compaiono quando i prezzi si muovono; la vista completa a 52 settimane si costruisce nel corso dell'anno.`,
  indicative: "Prezzi indicativi, per 100, calcolati dal rendimento giornaliero.",
  note: "Solo a scopo informativo, non è consulenza né un segnale di acquisto. Un prezzo in calo può indicare un rischio maggiore e i prezzi possono continuare a scendere.",
  locale: "it-IT",
};

const fr: DropsText = {
  menu: "Baisses", menuShort: "Baisses",
  title: "Plus fortes baisses de prix des obligations · 10BONDS",
  description: "Obligations notées dont le prix est le plus éloigné de son plus haut sur 52 semaines, par devise et par risque. Information uniquement.",
  h1: "Plus fortes baisses de prix",
  intro: "Obligations notées dont le prix est le plus éloigné de son plus haut sur 52 semaines. Choisissez un niveau de risque pour voir ses 3 plus fortes baisses, toutes échéances.",
  currency: "Devise", risk: "Risque", all: "Tous",
  issuer: "Émetteur", bond: "Obligation", maturity: "Échéance", price: "Prix", high: "Plus haut 52 sem.", highShort: "Plus haut", drop: "Baisse",
  topAll: "Les 10 plus fortes baisses, une par émetteur", topRisk: (r: number) => `Les 3 plus fortes baisses au risque ${r}, toutes échéances`,
  none: "Aucune baisse de plus de 0,5 % pour l'instant.",
  building: (d: string) => `Nous enregistrons les prix depuis le ${d}. Les baisses apparaissent quand les prix bougent ; la vue complète sur 52 semaines se construit au fil de l'année.`,
  indicative: "Prix indicatifs, pour 100, calculés à partir du rendement du jour.",
  note: "Information uniquement, ni conseil en investissement ni signal d'achat. Un prix en baisse peut signaler un risque plus élevé, et les prix peuvent continuer à baisser.",
  locale: "fr-FR",
};

const de: DropsText = {
  menu: "Kursrückgänge", menuShort: "Rückgänge",
  title: "Größte Kursrückgänge bei Anleihen · 10BONDS",
  description: "Anleihen mit Rating, deren Kurs am weitesten unter dem 52-Wochen-Hoch liegt, nach Währung und Risiko. Nur zur Information.",
  h1: "Größte Kursrückgänge",
  intro: "Anleihen mit Rating, deren Kurs am weitesten unter dem 52-Wochen-Hoch liegt. Wählen Sie eine Risikostufe für ihre 3 größten Rückgänge, alle Laufzeiten.",
  currency: "Währung", risk: "Risiko", all: "Alle",
  issuer: "Emittent", bond: "Anleihe", maturity: "Fälligkeit", price: "Kurs", high: "52-Wochen-Hoch", highShort: "Hoch", drop: "Rückgang",
  topAll: "Die 10 größten Rückgänge, einer je Emittent", topRisk: (r: number) => `Die 3 größten Rückgänge bei Risiko ${r}, alle Laufzeiten`,
  none: "Noch keine Rückgänge von mehr als 0,5 %.",
  building: (d: string) => `Wir zeichnen die Kurse seit dem ${d} auf. Rückgänge erscheinen, sobald sich die Kurse bewegen; die volle 52-Wochen-Sicht entsteht im Lauf des Jahres.`,
  indicative: "Indikative Kurse, je 100, aus der täglichen Rendite berechnet.",
  note: "Nur zur Information, keine Anlageberatung und kein Kaufsignal. Ein fallender Kurs kann auf höheres Risiko hindeuten, und Kurse können weiter fallen.",
  locale: "de-DE",
};

export const DROPS_TEXT: Record<DropsLang, DropsText> = { en, it, fr, de };
