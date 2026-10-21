// Words of the "Price drops" page in each site language. Information only: never "good buys" or "opportunities".

export type DropsLang = "en" | "it" | "fr" | "de";

export const DROPS_PATH: Record<DropsLang, string> = { en: "/price-drops", it: "/it/ribassi", fr: "/fr/baisses", de: "/de/kursrueckgaenge" };

const en = {
  menu: "Price drops", menuShort: "Drops",
  title: "Biggest bond price drops · 10BONDS",
  description: "Rated bonds whose price is furthest below the highest price we recorded, by currency and risk score. Information only.",
  h1: "Biggest price drops",
  intro: "Rated bonds whose price is furthest below the highest price we recorded. Pick a risk score to see its 3 biggest drops, all maturities.",
  currency: "Currency", risk: "Risk", all: "All",
  issuer: "Issuer", bond: "Bond", maturity: "Maturity", price: "Price", drop: "Drop",
  topAll: "10 biggest drops, one per issuer", topRisk: (r: number) => `3 biggest drops at risk ${r}, all maturities`,
  none: "No drops of more than 0.5% yet.",
  building: (d: string) => `We started recording prices on ${d}. Drops appear as prices move.`,
  indicative: "Prices are indicative, per 100, worked out from the daily yield.",
  locale: "en-GB",
};
export type DropsText = typeof en;

const it: DropsText = {
  menu: "Ribassi", menuShort: "Ribassi",
  title: "Obbligazioni con i maggiori ribassi · 10BONDS",
  description: "Obbligazioni con rating il cui prezzo è più lontano dal massimo da noi registrato, per valuta e rischio. Solo informativo.",
  h1: "Maggiori ribassi di prezzo",
  intro: "Obbligazioni con rating il cui prezzo è più lontano dal massimo da noi registrato. Scegli un livello di rischio per vedere i suoi 3 maggiori ribassi, tutte le scadenze.",
  currency: "Valuta", risk: "Rischio", all: "Tutti",
  issuer: "Emittente", bond: "Obbligazione", maturity: "Scadenza", price: "Prezzo", drop: "Ribasso",
  topAll: "I 10 maggiori ribassi, uno per emittente", topRisk: (r: number) => `I 3 maggiori ribassi con rischio ${r}, tutte le scadenze`,
  none: "Ancora nessun ribasso superiore allo 0,5%.",
  building: (d: string) => `Registriamo i prezzi dal ${d}. I ribassi compaiono quando i prezzi si muovono.`,
  indicative: "Prezzi indicativi, per 100, calcolati dal rendimento giornaliero.",
  locale: "it-IT",
};

const fr: DropsText = {
  menu: "Baisses", menuShort: "Baisses",
  title: "Plus fortes baisses de prix des obligations · 10BONDS",
  description: "Obligations notées dont le prix est le plus éloigné du plus haut que nous avons enregistré, par devise et par risque. Information uniquement.",
  h1: "Plus fortes baisses de prix",
  intro: "Obligations notées dont le prix est le plus éloigné du plus haut que nous avons enregistré. Choisissez un niveau de risque pour voir ses 3 plus fortes baisses, toutes échéances.",
  currency: "Devise", risk: "Risque", all: "Tous",
  issuer: "Émetteur", bond: "Obligation", maturity: "Échéance", price: "Prix", drop: "Baisse",
  topAll: "Les 10 plus fortes baisses, une par émetteur", topRisk: (r: number) => `Les 3 plus fortes baisses au risque ${r}, toutes échéances`,
  none: "Aucune baisse de plus de 0,5 % pour l'instant.",
  building: (d: string) => `Nous enregistrons les prix depuis le ${d}. Les baisses apparaissent quand les prix bougent.`,
  indicative: "Prix indicatifs, pour 100, calculés à partir du rendement du jour.",
  locale: "fr-FR",
};

const de: DropsText = {
  menu: "Kursrückgänge", menuShort: "Rückgänge",
  title: "Größte Kursrückgänge bei Anleihen · 10BONDS",
  description: "Anleihen mit Rating, deren Kurs am weitesten unter dem höchsten von uns erfassten Kurs liegt, nach Währung und Risiko. Nur zur Information.",
  h1: "Größte Kursrückgänge",
  intro: "Anleihen mit Rating, deren Kurs am weitesten unter dem höchsten von uns erfassten Kurs liegt. Wählen Sie eine Risikostufe für ihre 3 größten Rückgänge, alle Laufzeiten.",
  currency: "Währung", risk: "Risiko", all: "Alle",
  issuer: "Emittent", bond: "Anleihe", maturity: "Fälligkeit", price: "Kurs", drop: "Rückgang",
  topAll: "Die 10 größten Rückgänge, einer je Emittent", topRisk: (r: number) => `Die 3 größten Rückgänge bei Risiko ${r}, alle Laufzeiten`,
  none: "Noch keine Rückgänge von mehr als 0,5 %.",
  building: (d: string) => `Wir zeichnen die Kurse seit dem ${d} auf. Rückgänge erscheinen, sobald sich die Kurse bewegen.`,
  indicative: "Indikative Kurse, je 100, aus der täglichen Rendite berechnet.",
  locale: "de-DE",
};

export const DROPS_TEXT: Record<DropsLang, DropsText> = { en, it, fr, de };
