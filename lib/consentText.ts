// First-use agreement for the portfolio builder. Changing any wording means raising CONSENT_VERSION, so everyone is asked again.
export const CONSENT_VERSION = "2026-10-25.1";

export type ConsentLang = "en" | "it" | "fr" | "de";

export const CONSENT_TEXT: Record<ConsentLang, { title: string; points: string[]; link: string; agree: string; button: string }> = {
  en: {
    title: "Before you start",
    points: [
      "The portfolio comes from mathematical formulas that pick one portfolio out of the many possible.",
      "It is only an illustration of what the formula produces. We do not recommend buying any of the bonds shown.",
      "You accept our formula.",
    ],
    link: "How we pick the top 10",
    agree: "I understand and agree.",
    button: "Continue",
  },
  it: {
    title: "Prima di iniziare",
    points: [
      "Il portafoglio nasce da formule matematiche che scelgono un portafoglio tra i tanti possibili.",
      "È solo un'illustrazione di ciò che produce la formula. Non consigliamo l'acquisto di nessuna delle obbligazioni mostrate.",
      "Accetti la nostra formula.",
    ],
    link: "Come scegliamo le 10",
    agree: "Ho capito e accetto.",
    button: "Continua",
  },
  fr: {
    title: "Avant de commencer",
    points: [
      "Le portefeuille vient de formules mathématiques qui en choisissent un parmi tous ceux possibles.",
      "Ce n'est qu'une illustration de ce que produit la formule. Nous ne recommandons l'achat d'aucune des obligations affichées.",
      "Vous acceptez notre formule.",
    ],
    link: "Comment nous choisissons les 10",
    agree: "J'ai compris et j'accepte.",
    button: "Continuer",
  },
  de: {
    title: "Bevor Sie starten",
    points: [
      "Das Portfolio stammt aus mathematischen Formeln, die aus vielen möglichen ein Portfolio auswählen.",
      "Es ist nur eine Veranschaulichung dessen, was die Formel ergibt. Wir empfehlen den Kauf keiner der gezeigten Anleihen.",
      "Sie akzeptieren unsere Formel.",
    ],
    link: "Wie wir die 10 auswählen",
    agree: "Ich habe verstanden und stimme zu.",
    button: "Weiter",
  },
};
