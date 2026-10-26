// Words of the admin-only "Price drops" page in each site language. Information only: never "good buys" or "opportunities".

export type DropsLang = "en" | "it" | "fr" | "de";

export const DROPS_PATH: Record<DropsLang, string> = { en: "/price-drops", it: "/it/ribassi", fr: "/fr/baisses", de: "/de/kursrueckgaenge" };

const en = {
  menu: "Price drops", menuShort: "Drops",
  title: "Price drops · 10BONDS",
  h1: "Price drops",
  intro: "Rated bonds by price move. Click a column to sort; pick a risk score to see its 3 bonds, all maturities.",
  currency: "Currency", risk: "Risk", all: "All",
  issuer: "Issuer", maturity: "Maturity", price: "Price", ytm: "YTM", min: "52w min", max: "52w max",
  vsMax: "vs 52w max", vsMin: "vs 52w min", d1w: "1 week", d1m: "1 month", gain1y: "1y gain",
  topAll: (n: number, col: string) => `${n} bonds, one per issuer, sorted by ${col}`, topRisk: (r: number, col: string) => `3 bonds at risk ${r}, all maturities, sorted by ${col}`,
  none: "No history for this column yet.",
  building: (d: string) => `Prices recorded since ${d}; "–" until a column has enough history.`,
  indicative: "Prices are indicative, per 100, worked out from the daily yield.",
  gainNote: "1y gain = (52w max − price + one year of coupon) ÷ price.",
  rankBy: "Rank by", rankDrop: "Price drop", page: "Page", pages: "Pages", prev: "Previous page", next: "Next page",
  locale: "en-GB",
};
export type DropsText = typeof en;

const it: DropsText = {
  menu: "Ribassi", menuShort: "Ribassi",
  title: "Ribassi di prezzo · 10BONDS",
  h1: "Ribassi di prezzo",
  intro: "Obbligazioni con rating per variazione di prezzo. Clicca una colonna per ordinare; scegli un rischio per vedere le sue 3 obbligazioni, tutte le scadenze.",
  currency: "Valuta", risk: "Rischio", all: "Tutti",
  issuer: "Emittente", maturity: "Scadenza", price: "Prezzo", ytm: "YTM", min: "Min 52s", max: "Max 52s",
  vsMax: "vs max 52s", vsMin: "vs min 52s", d1w: "1 settimana", d1m: "1 mese", gain1y: "Guadagno 1a",
  topAll: (n: number, col: string) => `${n} obbligazioni, una per emittente, ordinate per ${col}`, topRisk: (r: number, col: string) => `3 obbligazioni con rischio ${r}, tutte le scadenze, ordinate per ${col}`,
  none: "Ancora nessuno storico per questa colonna.",
  building: (d: string) => `Prezzi registrati dal ${d}; "–" finché una colonna non ha abbastanza storico.`,
  indicative: "Prezzi indicativi, per 100, calcolati dal rendimento giornaliero.",
  gainNote: "Guadagno 1a = (max 52s − prezzo + un anno di cedola) ÷ prezzo.",
  rankBy: "Ordina per", rankDrop: "Ribasso", page: "Pagina", pages: "Pagine", prev: "Pagina precedente", next: "Pagina successiva",
  locale: "it-IT",
};

const fr: DropsText = {
  menu: "Baisses", menuShort: "Baisses",
  title: "Baisses de prix · 10BONDS",
  h1: "Baisses de prix",
  intro: "Obligations notées par variation de prix. Cliquez sur une colonne pour trier ; choisissez un risque pour voir ses 3 obligations, toutes échéances.",
  currency: "Devise", risk: "Risque", all: "Tous",
  issuer: "Émetteur", maturity: "Échéance", price: "Prix", ytm: "YTM", min: "Min 52s", max: "Max 52s",
  vsMax: "vs max 52s", vsMin: "vs min 52s", d1w: "1 semaine", d1m: "1 mois", gain1y: "Gain 1 an",
  topAll: (n: number, col: string) => `${n} obligations, une par émetteur, triées par ${col}`, topRisk: (r: number, col: string) => `3 obligations au risque ${r}, toutes échéances, triées par ${col}`,
  none: "Pas encore d'historique pour cette colonne.",
  building: (d: string) => `Prix enregistrés depuis le ${d} ; « – » tant qu'une colonne n'a pas assez d'historique.`,
  indicative: "Prix indicatifs, pour 100, calculés à partir du rendement du jour.",
  gainNote: "Gain 1 an = (max 52s − prix + un an de coupon) ÷ prix.",
  rankBy: "Classer par", rankDrop: "Baisse", page: "Page", pages: "Pages", prev: "Page précédente", next: "Page suivante",
  locale: "fr-FR",
};

const de: DropsText = {
  menu: "Kursrückgänge", menuShort: "Rückgänge",
  title: "Kursrückgänge · 10BONDS",
  h1: "Kursrückgänge",
  intro: "Anleihen mit Rating nach Kursbewegung. Spalte anklicken zum Sortieren; Risikostufe wählen für ihre 3 Anleihen, alle Laufzeiten.",
  currency: "Währung", risk: "Risiko", all: "Alle",
  issuer: "Emittent", maturity: "Fälligkeit", price: "Kurs", ytm: "YTM", min: "52W-Tief", max: "52W-Hoch",
  vsMax: "vs 52W-Hoch", vsMin: "vs 52W-Tief", d1w: "1 Woche", d1m: "1 Monat", gain1y: "Gewinn 1J",
  topAll: (n: number, col: string) => `${n} Anleihen, eine je Emittent, sortiert nach ${col}`, topRisk: (r: number, col: string) => `3 Anleihen bei Risiko ${r}, alle Laufzeiten, sortiert nach ${col}`,
  none: "Für diese Spalte gibt es noch keine Historie.",
  building: (d: string) => `Kurse erfasst seit ${d}; „–“, bis eine Spalte genug Historie hat.`,
  indicative: "Indikative Kurse, je 100, aus der täglichen Rendite berechnet.",
  gainNote: "Gewinn 1J = (52W-Hoch − Kurs + ein Jahr Kupon) ÷ Kurs.",
  rankBy: "Sortieren nach", rankDrop: "Kursrückgang", page: "Seite", pages: "Seiten", prev: "Vorherige Seite", next: "Nächste Seite",
  locale: "de-DE",
};

export const DROPS_TEXT: Record<DropsLang, DropsText> = { en, it, fr, de };
