// First-use agreement for the portfolio builder. Changing any wording means raising CONSENT_VERSION, so everyone is asked again.
export const CONSENT_VERSION = "2026-10-29.1";

export type ConsentLang = "en" | "it" | "fr" | "de";

export const CONSENT_TEXT: Record<ConsentLang, { title: string; points: string[]; link: string; agree: string; button: string }> = {
  en: {
    title: "Before you explore",
    points: [
      "Our model selects 10 bonds based on your chosen criteria and our methodology.",
      "The portfolio is an illustrative model output, not a recommendation to buy. It does not assess your personal financial circumstances or investment suitability.",
    ],
    link: "How we select the 10 bonds ↗",
    agree: "I understand this is a research tool, not investment advice.",
    button: "I understand — show the portfolio",
  },
  it: {
    title: "Prima di esplorare",
    points: [
      "Il nostro modello seleziona 10 obbligazioni in base ai criteri scelti e alla nostra metodologia.",
      "Il portafoglio è un risultato illustrativo del modello, non una raccomandazione all'acquisto. Non valuta la tua situazione finanziaria personale né l'idoneità dell'investimento.",
    ],
    link: "Come selezioniamo le 10 obbligazioni ↗",
    agree: "Capisco che questo è uno strumento di ricerca, non una consulenza in materia di investimenti.",
    button: "Ho capito — mostra il portafoglio",
  },
  fr: {
    title: "Avant d'explorer",
    points: [
      "Notre modèle sélectionne 10 obligations selon les critères choisis et notre méthodologie.",
      "Le portefeuille est un résultat illustratif du modèle, pas une recommandation d'achat. Il n'évalue ni votre situation financière personnelle ni l'adéquation de l'investissement.",
    ],
    link: "Comment nous sélectionnons les 10 obligations ↗",
    agree: "Je comprends qu'il s'agit d'un outil de recherche, et non d'un conseil en investissement.",
    button: "J'ai compris — afficher le portefeuille",
  },
  de: {
    title: "Bevor Sie erkunden",
    points: [
      "Unser Modell wählt 10 Anleihen anhand der gewählten Kriterien und unserer Methodik aus.",
      "Das Portfolio ist ein illustratives Modellergebnis, keine Kaufempfehlung. Es berücksichtigt weder Ihre persönliche finanzielle Situation noch die Eignung der Anlage.",
    ],
    link: "Wie wir die 10 Anleihen auswählen ↗",
    agree: "Ich verstehe, dass dies ein Recherche-Tool ist und keine Anlageberatung.",
    button: "Verstanden — Portfolio anzeigen",
  },
};
