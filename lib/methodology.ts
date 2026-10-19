/**
 * The Rating methodology page (/methodology): a plain-words summary of Livio's sovereign rating manual
 * ("Livio Rating for sovereign credit", v1.0, 12 October 2026). Scores run 0..100, higher = safer.
 * Country values are rounded, indicative examples for illustration only, not live data.
 */
export type MethodLang = "en" | "it" | "fr" | "de";
export const METHOD_LANGS: MethodLang[] = ["en", "it", "fr", "de"];

export function methodLang(v: string | string[] | undefined): MethodLang {
  const s = Array.isArray(v) ? v[0] : v;
  return METHOD_LANGS.includes(s as MethodLang) ? (s as MethodLang) : "en";
}

const clip = (z: number) => Math.min(1, Math.max(0, z));
/** Lower is safer: a scores 100, b scores 0. */
export const L = (x: number, a: number, b: number) => 100 * clip((b - x) / (b - a));
/** Higher is safer: a scores 0, b scores 100. */
export const U = (x: number, a: number, b: number) => 100 * clip((x - a) / (b - a));

export const COUNTRIES = ["DE", "IT", "RO"] as const;
export type Country = (typeof COUNTRIES)[number];

type Factor = {
  weight: number; // % of the total
  score: (x: number) => number;
  /** Rounded example raw inputs, in the manual's units (composites use their 0..100 sub-score directly). */
  examples: Record<Country, number>;
};

const id = (x: number) => Math.min(100, Math.max(0, x));

// Order and weights follow the manual's table (14+10+7+9+6+5+5+8+6 = 70 solvency, 5+5+5+4+4+4+3 = 30 repayment).
export const FACTORS: Factor[] = [
  { weight: 14, score: (x) => L(x, 30, 130), examples: { DE: 63, IT: 135, RO: 55 } },
  { weight: 10, score: (x) => L(x, -10, 20), examples: { DE: 3, IT: 3, RO: 10 } },
  { weight: 7, score: (x) => U(x, -5, 5), examples: { DE: -1, IT: 0.9, RO: -6 } },
  { weight: 9, score: (x) => L(x, 5, 30), examples: { DE: 2.5, IT: 8.3, RO: 7.3 } },
  { weight: 6, score: (x) => U(x, -2, 6), examples: { DE: 1, IT: 0.7, RO: 2 } },
  { weight: 5, score: (x) => U(x, 10, 45), examples: { DE: 46.5, IT: 47, RO: 33 } },
  { weight: 5, score: (x) => U(x, -100, 50), examples: { DE: 75, IT: 15, RO: -42 } },
  { weight: 8, score: id, examples: { DE: 79, IT: 67, RO: 58 } },
  { weight: 6, score: id, examples: { DE: 70, IT: 70, RO: 71 } },
  { weight: 5, score: (x) => U(x, 2, 12), examples: { DE: 7, IT: 7, RO: 7.5 } },
  { weight: 5, score: (x) => L(x, 10, 60), examples: { DE: 35, IT: 33, RO: 30 } },
  { weight: 5, score: (x) => L(x, 5, 30), examples: { DE: 9, IT: 22, RO: 14 } },
  { weight: 4, score: (x) => L(x, 0, 80), examples: { DE: 0, IT: 1, RO: 50 } },
  { weight: 4, score: id, examples: { DE: 30, IT: 12, RO: 53 } },
  { weight: 4, score: id, examples: { DE: 100, IT: 97, RO: 92 } },
  { weight: 3, score: (x) => U(x, 0, 1), examples: { DE: 0, IT: 0.05, RO: 0.1 } },
];

export const SOLVENCY_COUNT = 9; // factors 1..9 are solvency, 10..16 repayment

/** Weighted core score 0..100 of a country's examples (before the default-history deduction). */
export function coreScore(c: Country): number {
  return FACTORS.reduce((s, f) => s + (f.weight * f.score(f.examples[c])) / 100, 0);
}

/** Default-history deduction: each episode weighs 1 at cure, fading linearly to 0.25 after 30 years; 2 points each, max 10. */
export function historyDeduction(yearsSinceCure: number[]): number {
  const e = yearsSinceCure.reduce((s, a) => s + Math.max(0.25, 1 - Math.max(0, a) / 40), 0);
  return Math.min(10, 2 * e);
}

type Text = {
  title: string;
  intro: string;
  legend: string; // "Indicative examples:"
  countries: Record<Country, string>;
  riskier: string;
  safer: string;
  solvency: string;
  repayment: string;
  factors: [string, string][]; // [name, one line]
  history: [string, string];
  historyMarks: string[]; // labels for 0, 10, 20, 30+ years since cure
  total: string;
  note: string;
};

export const METHOD: Record<MethodLang, Text> = {
  en: {
    title: "Rating methodology",
    intro: "How 10BONDS assesses a country: 16 parameters, each scored 0 to 100 (higher is safer), weighted and added up, minus a deduction for past defaults.",
    legend: "Indicative examples",
    countries: { DE: "Germany", IT: "Italy", RO: "Romania" },
    riskier: "riskier",
    safer: "safer",
    solvency: "Solvency · 70%",
    repayment: "Repayment · 30%",
    factors: [
      ["Debt / GDP", "What the state owes vs. what the economy produces."],
      ["Debt trend", "Change in debt / GDP over the next three years."],
      ["Primary balance", "Budget surplus or deficit before paying interest."],
      ["Interest burden", "Share of tax and other revenue spent on interest."],
      ["Growth", "Expected real growth over the next three years."],
      ["Revenue / GDP", "How much the state can collect to pay its bills."],
      ["External position", "What the country owns abroad minus what it owes."],
      ["Institutions", "Effective government, rule of law, stability."],
      ["Diversification", "Varied exports, small bonus for resource income."],
      ["Debt maturity", "Average years until the debt must be repaid."],
      ["Debt due soon", "Share of debt to repay within three years."],
      ["Financing needs", "Money to raise next year, vs. GDP."],
      ["Foreign-currency debt", "Share of debt in a currency it does not issue."],
      ["Liquidity", "Cash or reserves vs. the next 12 months' needs."],
      ["Market access", "Whether the state borrows from markets as planned."],
      ["Official support", "Approved, unused IMF or EU loans it can draw."],
    ],
    history: ["Default history", "Each default since 1946: −2 points, fading. Max −10."],
    historyMarks: ["now", "10y", "20y", "30y+"],
    total: "Total score",
    note: "Information only, not a credit rating or investment advice. Country values are rounded, indicative examples, not live data.",
  },
  it: {
    title: "Metodologia del rating",
    intro: "Come 10BONDS valuta un Paese: 16 parametri, ciascuno con un punteggio da 0 a 100 (più alto è più sicuro), pesati e sommati, meno una detrazione per i default passati.",
    legend: "Esempi indicativi",
    countries: { DE: "Germania", IT: "Italia", RO: "Romania" },
    riskier: "più rischio",
    safer: "più sicuro",
    solvency: "Solvibilità · 70%",
    repayment: "Rimborso · 30%",
    factors: [
      ["Debito / PIL", "Quanto deve lo Stato rispetto al PIL."],
      ["Andamento del debito", "Variazione del debito / PIL nei prossimi tre anni."],
      ["Saldo primario", "Avanzo o disavanzo di bilancio prima degli interessi."],
      ["Peso degli interessi", "Quota delle entrate spesa in interessi."],
      ["Crescita", "Crescita reale attesa nei prossimi tre anni."],
      ["Entrate / PIL", "Quanto lo Stato riesce a incassare per pagare i conti."],
      ["Posizione estera", "Attività estere del Paese meno i debiti."],
      ["Istituzioni", "Governo efficace, stato di diritto, stabilità."],
      ["Diversificazione", "Export vari, piccolo bonus per le risorse."],
      ["Scadenza del debito", "Anni medi prima di rimborsare il debito."],
      ["Debito in scadenza", "Quota del debito da rimborsare entro tre anni."],
      ["Fabbisogno", "Denaro da raccogliere l'anno prossimo / PIL."],
      ["Debito in valuta estera", "Quota del debito in una valuta non propria."],
      ["Liquidità", "Cassa o riserve disponibili per i prossimi 12 mesi."],
      ["Accesso al mercato", "Se lo Stato si finanzia sul mercato come previsto."],
      ["Sostegno ufficiale", "Prestiti FMI o UE approvati e non ancora usati."],
    ],
    history: ["Storia dei default", "Ogni default dal 1946: −2 punti, a scalare. Max −10."],
    historyMarks: ["oggi", "10a", "20a", "30a+"],
    total: "Punteggio totale",
    note: "Solo informazione, non è un rating né una consulenza. I valori dei Paesi sono esempi indicativi e arrotondati, non dati in tempo reale.",
  },
  fr: {
    title: "Méthodologie de notation",
    intro: "Comment 10BONDS évalue un pays : 16 paramètres notés de 0 à 100 (plus haut = plus sûr), pondérés et additionnés, moins une déduction pour les défauts passés.",
    legend: "Exemples indicatifs",
    countries: { DE: "Allemagne", IT: "Italie", RO: "Roumanie" },
    riskier: "plus risqué",
    safer: "plus sûr",
    solvency: "Solvabilité · 70 %",
    repayment: "Remboursement · 30 %",
    factors: [
      ["Dette / PIB", "Ce que doit l'État rapporté au PIB."],
      ["Tendance de la dette", "Évolution de la dette / PIB sur trois ans."],
      ["Solde primaire", "Excédent ou déficit budgétaire avant les intérêts."],
      ["Charge d'intérêts", "Part des recettes consacrée aux intérêts."],
      ["Croissance", "Croissance réelle attendue sur trois ans."],
      ["Recettes / PIB", "Ce que l'État peut collecter pour payer ses factures."],
      ["Position extérieure", "Avoirs du pays à l'étranger moins ses dettes."],
      ["Institutions", "Gouvernement efficace, droit, stabilité."],
      ["Diversification", "Exportations variées, petit bonus ressources."],
      ["Maturité de la dette", "Nombre moyen d'années avant remboursement."],
      ["Dette à court terme", "Part de la dette à rembourser sous trois ans."],
      ["Besoins de financement", "Montant à lever l'an prochain, rapporté au PIB."],
      ["Dette en devises", "Part de la dette en monnaie étrangère."],
      ["Liquidité", "Trésorerie ou réserves face aux 12 mois à venir."],
      ["Accès au marché", "L'État emprunte-t-il sur les marchés comme prévu ?"],
      ["Soutien officiel", "Prêts FMI ou UE approuvés et non utilisés."],
    ],
    history: ["Historique de défaut", "Chaque défaut depuis 1946 : −2 points, dégressif. Max −10."],
    historyMarks: ["auj.", "10a", "20a", "30a+"],
    total: "Score total",
    note: "Information uniquement, ni notation de crédit ni conseil. Les valeurs des pays sont des exemples indicatifs et arrondis, pas des données en direct.",
  },
  de: {
    title: "Rating-Methodik",
    intro: "So bewertet 10BONDS ein Land: 16 Kennzahlen, jeweils 0 bis 100 Punkte (höher ist sicherer), gewichtet und addiert, abzüglich eines Abzugs für frühere Zahlungsausfälle.",
    legend: "Beispielwerte",
    countries: { DE: "Deutschland", IT: "Italien", RO: "Rumänien" },
    riskier: "riskanter",
    safer: "sicherer",
    solvency: "Solvenz · 70 %",
    repayment: "Rückzahlung · 30 %",
    factors: [
      ["Schulden / BIP", "Staatsschulden im Verhältnis zum BIP."],
      ["Schuldentrend", "Änderung von Schulden / BIP in drei Jahren."],
      ["Primärsaldo", "Haushaltsüberschuss oder -defizit vor Zinsen."],
      ["Zinslast", "Anteil der Einnahmen für Zinsen."],
      ["Wachstum", "Erwartetes reales Wachstum, drei Jahre."],
      ["Einnahmen / BIP", "Was der Staat einnehmen kann."],
      ["Auslandsposition", "Auslandsvermögen minus Auslandsschulden."],
      ["Institutionen", "Effektive Regierung, Rechtsstaat, Stabilität."],
      ["Diversifizierung", "Vielfältige Exporte, kleiner Rohstoffbonus."],
      ["Laufzeit der Schulden", "Durchschnittliche Jahre bis zur Rückzahlung."],
      ["Bald fällige Schulden", "Anteil der Schulden, fällig innerhalb von drei Jahren."],
      ["Finanzierungsbedarf", "Kreditbedarf im nächsten Jahr / BIP."],
      ["Fremdwährungsschulden", "Anteil der Schulden in einer fremden Währung."],
      ["Liquidität", "Kasse oder Reserven für 12 Monate Bedarf."],
      ["Marktzugang", "Ob sich der Staat wie geplant am Markt finanziert."],
      ["Offizielle Hilfe", "Genehmigte, ungenutzte IWF- oder EU-Kredite."],
    ],
    history: ["Ausfallhistorie", "Jeder Ausfall seit 1946: −2 Punkte, abnehmend. Max. −10."],
    historyMarks: ["jetzt", "10J", "20J", "30J+"],
    total: "Gesamtwert",
    note: "Nur Information, kein Kreditrating und keine Anlageberatung. Länderwerte sind gerundete Beispielwerte, keine Live-Daten.",
  },
};

/** Shared labels of the summary page: the Countries / Companies switch and the link to the full text. */
export const METHOD_UI: Record<MethodLang, { countries: string; companies: string; full: string; fullNote: string; summary: string }> = {
  en: { countries: "Countries", companies: "Companies", full: "Read the full methodology →", fullNote: "Full text in English.", summary: "← Summary" },
  it: { countries: "Paesi", companies: "Aziende", full: "Leggi la metodologia completa →", fullNote: "Testo completo in inglese.", summary: "← Sintesi" },
  fr: { countries: "Pays", companies: "Entreprises", full: "Lire la méthodologie complète →", fullNote: "Texte complet en anglais.", summary: "← Résumé" },
  de: { countries: "Länder", companies: "Unternehmen", full: "Vollständige Methodik lesen →", fullNote: "Volltext auf Englisch.", summary: "← Übersicht" },
};

type CorpText = {
  title: string;
  intro: string;
  base: string; // card title of the 5 pillars
  pillars: [string, string][]; // [name, components]
  how: string;
  flow: [string, string][]; // A..D [title, line]
  stress: string;
  stressRows: [string, string];
  stressNote: string;
  overrides: string;
  note: string;
};

/** Pillar weights of the corporate LR Base score (Livio's corporate methodology v2.0). */
export const CORP_WEIGHTS = [35, 20, 20, 10, 15];

export const CORP: Record<MethodLang, CorpText> = {
  en: {
    title: "Rating methodology",
    intro: "How 10BONDS assesses a company: can it repay today, will it stay competitive over the life of the bond, and can it survive plausible shocks?",
    base: "LR Base · 100 points",
    pillars: [
      ["Financial strength", "Leverage, interest coverage, FFO/debt, free cash flow, profitability, leverage trend"],
      ["Liquidity and repayment", "24-month liquidity, maturity profile, refinancing flexibility, covenants"],
      ["Business model resilience", "Competitive position, industry outlook, concentration, tech and China disruption, diversification"],
      ["Management and governance", "Governance, financial policy, key-person risk and succession, execution"],
      ["Structural and external exposure", "Geopolitics, commodities and energy, financial system, climate, legal and regulatory"],
    ],
    how: "How it works",
    flow: [
      ["Base credit assessment", "Financial strength, business resilience, management, exposures"],
      ["Scenario engine", "Cash flow, liquidity and leverage recalculated under 16 defined shocks"],
      ["Event-risk overlay", "Governance failures, litigation, extraordinary transactions"],
      ["Final assessment", "With scenario results, confidence indicators and critical-risk flags"],
    ],
    stress: "Same base score, different resilience",
    stressRows: ["Manufacturer", "Utility"],
    stressNote: "Combined stress: the utility stays stronger despite a lower base score.",
    overrides: "Critical risks (no 12-month liquidity, covenant breach, no refinancing access, fraud, sanctions) trigger a mandatory review, not just a few points.",
    note: "Information only, not a credit rating or investment advice. Weights are research hypotheses still to be validated; example scores are hypothetical.",
  },
  it: {
    title: "Metodologia del rating",
    intro: "Come 10BONDS valuta un'azienda: può rimborsare oggi, resterà competitiva per tutta la vita del bond, può superare shock plausibili?",
    base: "LR Base · 100 punti",
    pillars: [
      ["Solidità finanziaria", "Leva, copertura interessi, FFO/debito, flusso di cassa libero, redditività, andamento della leva"],
      ["Liquidità e rimborso", "Liquidità a 24 mesi, profilo delle scadenze, flessibilità di rifinanziamento, covenant"],
      ["Resilienza del modello di business", "Posizione competitiva, prospettive del settore, concentrazione, disruption tecnologica e cinese, diversificazione"],
      ["Management e governance", "Governance, politica finanziaria, persone chiave e successione, esecuzione"],
      ["Esposizioni strutturali ed esterne", "Geopolitica, materie prime ed energia, sistema finanziario, clima, aspetti legali e normativi"],
    ],
    how: "Come funziona",
    flow: [
      ["Valutazione di base", "Solidità finanziaria, resilienza del business, management, esposizioni"],
      ["Motore di scenari", "Cassa, liquidità e leva ricalcolate con 16 shock definiti"],
      ["Rischi di evento", "Problemi di governance, contenziosi, operazioni straordinarie"],
      ["Valutazione finale", "Con risultati degli scenari, indicatori di affidabilità e segnali di rischio critico"],
    ],
    stress: "Stesso punteggio, resilienza diversa",
    stressRows: ["Industria", "Utility"],
    stressNote: "Stress combinato: la utility resta più solida pur partendo da un punteggio più basso.",
    overrides: "I rischi critici (liquidità insufficiente a 12 mesi, violazione dei covenant, nessun accesso al rifinanziamento, frodi, sanzioni) attivano una revisione obbligatoria, non solo qualche punto in meno.",
    note: "Solo informazione, non è un rating né una consulenza. I pesi sono ipotesi di ricerca ancora da validare; i punteggi di esempio sono ipotetici.",
  },
  fr: {
    title: "Méthodologie de notation",
    intro: "Comment 10BONDS évalue une entreprise : peut-elle rembourser aujourd'hui, restera-t-elle compétitive pendant la vie de l'obligation, peut-elle survivre à des chocs plausibles ?",
    base: "LR Base · 100 points",
    pillars: [
      ["Solidité financière", "Levier, couverture des intérêts, FFO/dette, flux de trésorerie disponible, rentabilité, tendance du levier"],
      ["Liquidité et remboursement", "Liquidité à 24 mois, profil des échéances, flexibilité de refinancement, covenants"],
      ["Résilience du modèle économique", "Position concurrentielle, perspectives du secteur, concentration, disruption technologique et chinoise, diversification"],
      ["Direction et gouvernance", "Gouvernance, politique financière, personnes clés et succession, exécution"],
      ["Expositions structurelles et externes", "Géopolitique, matières premières et énergie, système financier, climat, juridique et réglementaire"],
    ],
    how: "Fonctionnement",
    flow: [
      ["Évaluation de base", "Solidité financière, résilience, direction, expositions"],
      ["Moteur de scénarios", "Trésorerie, liquidité et levier recalculés sous 16 chocs définis"],
      ["Risques d'événement", "Défaillances de gouvernance, litiges, opérations exceptionnelles"],
      ["Évaluation finale", "Avec résultats des scénarios, indicateurs de confiance et alertes de risque critique"],
    ],
    stress: "Même score de base, résilience différente",
    stressRows: ["Industriel", "Utility"],
    stressNote: "Stress combiné : l'utility reste plus solide malgré un score de base plus bas.",
    overrides: "Les risques critiques (liquidité insuffisante à 12 mois, bris de covenant, pas d'accès au refinancement, fraude, sanctions) déclenchent une revue obligatoire, pas seulement quelques points.",
    note: "Information uniquement, ni notation de crédit ni conseil. Les pondérations sont des hypothèses de recherche à valider ; les scores d'exemple sont hypothétiques.",
  },
  de: {
    title: "Rating-Methodik",
    intro: "So bewertet 10BONDS ein Unternehmen: Kann es heute zurückzahlen, bleibt es über die Laufzeit der Anleihe wettbewerbsfähig, übersteht es plausible Schocks?",
    base: "LR Base · 100 Punkte",
    pillars: [
      ["Finanzkraft", "Verschuldung, Zinsdeckung, FFO/Schulden, freier Cashflow, Profitabilität, Verschuldungstrend"],
      ["Liquidität und Rückzahlung", "24-Monats-Liquidität, Fälligkeitsprofil, Refinanzierungsspielraum, Covenants"],
      ["Widerstandskraft des Geschäftsmodells", "Wettbewerbsposition, Branchenausblick, Konzentration, Technologie- und China-Disruption, Diversifizierung"],
      ["Management und Governance", "Governance, Finanzpolitik, Schlüsselpersonen und Nachfolge, Umsetzung"],
      ["Strukturelle und externe Risiken", "Geopolitik, Rohstoffe und Energie, Finanzsystem, Klima, Recht und Regulierung"],
    ],
    how: "So funktioniert es",
    flow: [
      ["Basisbewertung", "Finanzkraft, Widerstandskraft, Management, Risiken"],
      ["Szenario-Engine", "Cashflow, Liquidität und Verschuldung unter 16 definierten Schocks neu berechnet"],
      ["Ereignisrisiken", "Governance-Versagen, Rechtsstreite, außergewöhnliche Transaktionen"],
      ["Endbewertung", "Mit Szenarioergebnissen, Vertrauensindikatoren und Warnsignalen"],
    ],
    stress: "Gleicher Basiswert, andere Widerstandskraft",
    stressRows: ["Industrie", "Versorger"],
    stressNote: "Kombinierter Stress: Der Versorger bleibt trotz niedrigerem Basiswert stärker.",
    overrides: "Kritische Risiken (keine Liquidität für 12 Monate, Covenant-Bruch, kein Refinanzierungszugang, Betrug, Sanktionen) lösen eine Pflichtprüfung aus, nicht nur ein paar Punkte Abzug.",
    note: "Nur Information, kein Kreditrating und keine Anlageberatung. Die Gewichte sind noch zu validierende Forschungshypothesen; Beispielwerte sind hypothetisch.",
  },
};
