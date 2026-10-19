import type { Locale } from "./locales";

// Calculator pages, one per language for now (the brief's first wave). Tax presets cite an official source; where a
// rate could not be confirmed from an official source it is not preset and the visitor types it.

export type TaxPreset = { label: string; rate: number };
export type CalculatorText = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  presets: TaxPreset[];
  defaultRate: number;
  taxNote: string; // where the rates come from
  labels: {
    price: string; coupon: string; frequency: string; annual: string; semi: string; quarterly: string; maturity: string; settlement: string;
    tax: string; custom: string; gross: string; net: string; current: string; accrued: string; dirty: string; years: string; invalid: string;
    flows: string; date: string; grossFlow: string; netFlow: string;
  };
  how: { h2: string; paras: string[] };
};

const IT_SOURCE =
  "Aliquote: 12,5% su titoli di Stato italiani ed equiparati (e Stati della white list), 26% sugli altri redditi finanziari, come le obbligazioni societarie (D.L. 66/2014; comunicato Agenzia delle Entrate del 27 giugno 2014). Verifica sempre la tua situazione con un consulente fiscale.";

export const CALCULATORS: Record<Locale, CalculatorText> = {
  it: {
    slug: "rendimento-netto-btp",
    title: "Calcolo rendimento netto BTP e obbligazioni · 10BONDS",
    description: "Calcola il rendimento a scadenza lordo e netto di un BTP o di un'obbligazione: tassazione 12,5% sui titoli di Stato, 26% sulle obbligazioni societarie.",
    h1: "Calcolo del rendimento netto di BTP e obbligazioni",
    intro: [
      "Inserisci prezzo, cedola e scadenza: il calcolatore mostra il rendimento a scadenza lordo e quello netto dopo le tasse su cedole e plusvalenza.",
      "Per i BTP e gli altri titoli di Stato si applica il 12,5%; per le obbligazioni societarie il 26%.",
    ],
    presets: [{ label: "BTP e titoli di Stato 12,5%", rate: 12.5 }, { label: "Obbligazioni societarie 26%", rate: 26 }, { label: "Lordo 0%", rate: 0 }],
    defaultRate: 12.5,
    taxNote: IT_SOURCE,
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
        "È una stima semplificata (date cedola calcolate a ritroso dalla scadenza, capitalizzazione annua), non una consulenza.",
      ],
    },
  },
  fr: {
    slug: "rendement-actuariel",
    title: "Calcul du rendement actuariel d'une obligation · 10BONDS",
    description: "Calculez le rendement actuariel brut et net d'une obligation ou d'une OAT à partir du prix, du coupon et de l'échéance.",
    h1: "Calcul du rendement actuariel d'une obligation",
    intro: [
      "Saisissez le prix, le coupon et l'échéance : le calculateur donne le rendement actuariel brut et, si vous indiquez un taux d'imposition, le rendement net.",
      "Pour un résident fiscal français en compte-titres, le prélèvement forfaitaire unique est de 31,4 % en 2026 (12,8 % d'impôt sur le revenu et 18,6 % de prélèvements sociaux). Choisissez 0 % pour le rendement brut ou saisissez votre propre taux si vous optez pour le barème.",
    ],
    presets: [{ label: "PFU 31,4 %", rate: 31.4 }, { label: "Brut 0 %", rate: 0 }],
    defaultRate: 31.4,
    taxNote: "Taux : prélèvement forfaitaire unique de 12,8 % plus 18,6 % de prélèvements sociaux depuis le 1er janvier 2026, soit 31,4 % (impots.gouv.fr, « Les revenus mobiliers », mis à jour le 8 avril 2026). Certains revenus restent à 17,2 % de prélèvements sociaux et l'option pour le barème progressif est possible : vérifiez votre situation.",
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
        "Estimation simplifiée (dates de coupon calculées à rebours depuis l'échéance, capitalisation annuelle), pas un conseil.",
      ],
    },
  },
  de: {
    slug: "anleihen-rendite-berechnen",
    title: "Anleihen-Rendite berechnen: Rendite bis Fälligkeit · 10BONDS",
    description: "Rendite bis Fälligkeit einer Anleihe brutto und nach Abgeltungsteuer berechnen: Kurs, Kupon und Fälligkeit eingeben.",
    h1: "Anleihen-Rendite berechnen",
    intro: [
      "Kurs, Kupon und Fälligkeit eingeben: Der Rechner zeigt die Rendite bis Fälligkeit vor und nach Steuern.",
      "Voreingestellt ist die Abgeltungsteuer von 25 % plus 5,5 % Solidaritätszuschlag darauf (26,375 %), ohne Kirchensteuer und ohne Sparer-Pauschbetrag.",
    ],
    presets: [{ label: "Abgeltungsteuer + Soli 26,375 %", rate: 26.375 }, { label: "Brutto 0 %", rate: 0 }],
    defaultRate: 26.375,
    taxNote: "Abgeltungsteuer 25 % (§ 32d EStG) zuzüglich 5,5 % Solidaritätszuschlag auf die Steuer. Kirchensteuer und Sparer-Pauschbetrag sind nicht berücksichtigt; geben Sie bei Bedarf Ihren eigenen Satz ein.",
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
        "Vereinfachte Schätzung (Kupontermine rückwärts ab Fälligkeit, jährliche Verzinsung), keine Anlageberatung.",
      ],
    },
  },
};

export const TOOLS_HUB: Record<Locale, { title: string; description: string; h1: string; lead: string }> = {
  it: { title: "Calcolatori per obbligazioni · 10BONDS", description: "Calcolatori gratuiti per obbligazioni: rendimento a scadenza lordo e netto di BTP e obbligazioni societarie.", h1: "Calcolatori per obbligazioni", lead: "Strumenti semplici per fare i conti prima di scegliere un'obbligazione." },
  fr: { title: "Calculateurs obligataires · 10BONDS", description: "Calculateurs gratuits pour les obligations : rendement actuariel brut et net.", h1: "Calculateurs obligataires", lead: "Des outils simples pour faire les calculs avant de choisir une obligation." },
  de: { title: "Anleihen-Rechner · 10BONDS", description: "Kostenlose Anleihen-Rechner: Rendite bis Fälligkeit brutto und nach Steuern.", h1: "Anleihen-Rechner", lead: "Einfache Werkzeuge, um vor der Anleihen-Auswahl nachzurechnen." },
};
