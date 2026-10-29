import type { Locale } from "./locales";

// Calculator pages, one per language for now (the brief's first wave). No tax rates are preset or stated (the owner,
// 26/10/2026): the visitor types their own rate.

export type CalculatorText = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  labels: {
    price: string; coupon: string; frequency: string; annual: string; semi: string; quarterly: string; maturity: string; settlement: string;
    tax: string; custom: string; gross: string; net: string; current: string; accrued: string; dirty: string; years: string; invalid: string;
    flows: string; date: string; grossFlow: string; netFlow: string;
  };
  how: { h2: string; paras: string[] };
};

export const CALCULATORS: Record<Locale, CalculatorText> = {
  it: {
    slug: "rendimento-netto-btp",
    title: "Calcolo rendimento netto BTP e obbligazioni · 10BONDS",
    description: "Calcola il rendimento a scadenza lordo e netto di un BTP o di un'obbligazione: inserisci tu l'aliquota.",
    h1: "Calcolo del rendimento netto di BTP e obbligazioni",
    intro: [
      "Inserisci prezzo, cedola e scadenza: il calcolatore mostra il rendimento a scadenza lordo e, se indichi la tua aliquota, quello netto dopo le tasse su cedole e plusvalenza.",
    ],
    labels: {
      price: "Prezzo (secco, per 100)", coupon: "Cedola annua (%)", frequency: "Pagamento cedola", annual: "Annuale", semi: "Semestrale", quarterly: "Trimestrale",
      maturity: "Scadenza", settlement: "Data di acquisto", tax: "Tassazione", custom: "Aliquota (%)", gross: "Rendimento lordo a scadenza", net: "Rendimento netto a scadenza",
      current: "Rendimento corrente", accrued: "Rateo cedola", dirty: "Prezzo tel quel", years: "Anni alla scadenza", invalid: "Controlla i dati inseriti.",
      flows: "Flussi di cassa", date: "Data", grossFlow: "Lordo", netFlow: "Netto",
    },
    how: {
      h2: "Come viene calcolato",
      paras: [
        "Il rendimento a scadenza è il tasso annuo che rende il prezzo pagato (prezzo secco più rateo) uguale al valore attuale di cedole e rimborso.",
        "Nel netto, ogni cedola è ridotta dell'aliquota scelta; a scadenza la differenza tra 100 e il prezzo di acquisto, se positiva, è tassata con la stessa aliquota. Le minusvalenze non sono compensate, perché dipendono dalla tua situazione.",
        "È una stima semplificata (date cedola calcolate a ritroso dalla scadenza; rendimento nominale annuo: tasso per periodo × cedole all'anno), non una consulenza.",
      ],
    },
  },
  fr: {
    slug: "rendement-actuariel",
    title: "Calculateur de rendement d'obligation : actuariel et net",
    description: "Calculateur gratuit de rendement d'obligation : rendement actuariel brut et net, rendement courant et coupon couru pour OAT, Bund, BTP et Treasuries.",
    h1: "Calcul du rendement actuariel d'une obligation",
    intro: [
      "Saisissez le prix, le coupon et l'échéance : le calculateur donne le rendement actuariel brut et, si vous indiquez un taux d'imposition, le rendement net.",
      "Le taux d'imposition est à saisir par vous.",
    ],
    labels: {
      price: "Prix (pied de coupon, pour 100)", coupon: "Coupon annuel (%)", frequency: "Paiement du coupon", annual: "Annuel", semi: "Semestriel", quarterly: "Trimestriel",
      maturity: "Échéance", settlement: "Date d'achat", tax: "Imposition", custom: "Taux (%)", gross: "Rendement actuariel brut", net: "Rendement actuariel net",
      current: "Rendement courant", accrued: "Coupon couru", dirty: "Prix coupon couru inclus", years: "Années jusqu'à l'échéance", invalid: "Vérifiez les données saisies.",
      flows: "Flux", date: "Date", grossFlow: "Brut", netFlow: "Net",
    },
    how: {
      h2: "Méthode de calcul",
      paras: [
        "Le rendement actuariel est le taux annuel qui égalise le prix payé (prix plus coupon couru) et la valeur actuelle des coupons et du remboursement.",
        "En net, chaque coupon est réduit du taux choisi ; à l'échéance, l'écart positif entre 100 et le prix d'achat est imposé au même taux. Les moins-values ne sont pas imputées.",
        "Estimation simplifiée (dates de coupon calculées à rebours depuis l'échéance, taux par période × coupons par an), pas un conseil.",
      ],
    },
  },
  de: {
    slug: "anleihen-rendite-berechnen",
    title: "Anleihe Rendite Rechner: Rendite bis Fälligkeit",
    description: "Kostenloser Anleihe-Rendite-Rechner: Rendite bis Fälligkeit brutto und nach Steuern, laufende Rendite und Stückzinsen für Bundesanleihen, OAT, BTP und Treasuries.",
    h1: "Anleihen-Rendite berechnen",
    intro: [
      "Kurs, Kupon und Fälligkeit eingeben: Der Rechner zeigt die Rendite bis Fälligkeit vor und nach Steuern.",
      "Den Steuersatz geben Sie selbst ein.",
    ],
    labels: {
      price: "Kurs (clean, je 100)", coupon: "Kupon p. a. (%)", frequency: "Kuponzahlung", annual: "Jährlich", semi: "Halbjährlich", quarterly: "Vierteljährlich",
      maturity: "Fälligkeit", settlement: "Kaufdatum", tax: "Steuer", custom: "Steuersatz (%)", gross: "Rendite bis Fälligkeit (brutto)", net: "Rendite bis Fälligkeit (nach Steuern)",
      current: "Laufende Rendite", accrued: "Stückzinsen", dirty: "Kurs inkl. Stückzinsen", years: "Jahre bis Fälligkeit", invalid: "Bitte prüfen Sie die Eingaben.",
      flows: "Zahlungen", date: "Datum", grossFlow: "Brutto", netFlow: "Netto",
    },
    how: {
      h2: "So wird gerechnet",
      paras: [
        "Die Rendite bis Fälligkeit ist der jährliche Zinssatz, bei dem der gezahlte Kurs (plus Stückzinsen) dem Barwert aller Kupons und der Rückzahlung entspricht.",
        "Nach Steuern wird jeder Kupon um den gewählten Satz gekürzt; bei Fälligkeit wird ein Kursgewinn (100 minus Kaufkurs) mit demselben Satz besteuert. Verluste werden nicht verrechnet.",
        "Vereinfachte Schätzung (Kupontermine rückwärts ab Fälligkeit, Rendite je Periode × Kupons pro Jahr), keine Anlageberatung.",
      ],
    },
  },
};

export const TOOLS_HUB: Record<Locale, { title: string; description: string; h1: string; lead: string }> = {
  it: { title: "Calcolatori per obbligazioni · 10BONDS", description: "Calcolatori gratuiti per obbligazioni: rendimento a scadenza lordo e netto di BTP e obbligazioni societarie.", h1: "Calcolatori per obbligazioni", lead: "Strumenti semplici per fare i conti prima di scegliere un'obbligazione." },
  fr: { title: "Calculateurs obligataires · 10BONDS", description: "Calculateurs gratuits pour les obligations : rendement actuariel brut et net.", h1: "Calculateurs obligataires", lead: "Des outils simples pour faire les calculs avant de choisir une obligation." },
  de: { title: "Anleihen-Rechner · 10BONDS", description: "Kostenlose Anleihen-Rechner: Rendite bis Fälligkeit brutto und nach Steuern.", h1: "Anleihen-Rechner", lead: "Einfache Werkzeuge, um vor der Anleihen-Auswahl nachzurechnen." },
};
